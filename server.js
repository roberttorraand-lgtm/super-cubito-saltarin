import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { levels, newPlayer, tickGroup, STEP_MS } from './game.js';
import { takeInput, queueInput } from './transport.js';
import { createRoom, checkCompletion, voteNext, voteRestart } from './rooms.js';

const files=new Map([['/encounters.js',['encounters.js','text/javascript']],['/assets/boss-atlas.png',['public/assets/boss-atlas.png','image/png']],['/',['public/index.html','text/html']],['/app.js',['public/app.js','text/javascript']],['/style.css',['public/style.css','text/css']],['/game.js',['game.js','text/javascript']],['/levels.js',['levels.js','text/javascript']],['/netcode.js',['public/netcode.js','text/javascript']],['/renderer.js',['public/renderer.js','text/javascript']],['/assets/meme-atlas.png',['public/assets/meme-atlas.png','image/png']]]);
const server=http.createServer(async(req,res)=>{
  let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);return res.end();}
  if(path==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"ok":true,"version":"0.7.0"}');}
  const file=files.get(path);
  if(!file){res.writeHead(404);return res.end('No encontrado');}
  try{
    const data=await readFile(new URL(`./${file[0]}`,import.meta.url));
    res.writeHead(200,{'Content-Type':file[1]+'; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(data);
  }catch{res.writeHead(500);res.end('Error al cargar el juego');}
});
const wss=new WebSocketServer({server,maxPayload:4096});
const rooms=new Map();
const colors=['#b4f669','#92bbff','#ffb591','#d3a6ff'];
// Control messages (especially level changes) must arrive even when old states are skipped.
const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
function sendLevel(ws,type='level'){
  send(ws,{type,id:ws.player.id,room:ws.room.code,level:levels[ws.room.levelIndex],levelIndex:ws.room.levelIndex,totalLevels:levels.length,revision:ws.room.revision,world:ws.room.world,player:ws.player});
}
wss.on('connection',(ws,req)=>{
  req.socket.setNoDelay(true);
  ws.on('error',()=>{});
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return ws.close(1008,'Origen no permitido');}catch{return ws.close(1008);}}
  ws.alive=true;ws.on('pong',()=>{ws.alive=true;});
  ws.queue=[];ws.lastSeq=0;ws.receivedSeq=0;ws.lastInput=performance.now();
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw);}catch{return;}
    if(!m||typeof m!=='object')return;
    if(m.type==='ping'){return send(ws,{type:'pong',sent:m.sent});}
    if(m.type==='input'&&ws.player){
      if(m.revision!==ws.room.revision||ws.room.phase!=='playing')return;
      if(!Number.isSafeInteger(m.seq)||m.seq<=ws.receivedSeq||m.seq>ws.receivedSeq+300)return;
      ws.receivedSeq=m.seq;ws.lastInput=performance.now();
      // A client supplies intentions, never coordinates. At most one input is simulated per server step.
      queueInput(ws.queue,{seq:m.seq,left:m.left===true,right:m.right===true,jump:m.jump===true},ws.player.jumpHeld);return;
    }
    if(m.type==='restart'&&ws.player){
      if(m.revision!==ws.room.revision)return;
      if(voteRestart(ws.room,ws.player.id))for(const c of ws.room.clients)sendLevel(c);
      return;
    }
    if(m.type==='next'&&ws.player){
      if(m.revision!==ws.room.revision)return;
      if(voteNext(ws.room,ws.player.id))for(const c of ws.room.clients)sendLevel(c);
      return;
    }
    if(m.type!=='join'||ws.player)return;
    const requested=typeof m.room==='string'?m.room.toUpperCase().trim():'';
    let room;
    if(requested){
      room=rooms.get(requested);
      if(!room)return send(ws,{type:'error',message:'Esa sala no existe. Revisa el código.'});
      if(room.clients.size>=4)return send(ws,{type:'error',message:'Sala completa: máximo 4 jugadores.'});
    }else{
      if(rooms.size>=100)return send(ws,{type:'error',message:'Servidor ocupado. Inténtalo más tarde.'});
      let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
      room=createRoom(code);rooms.set(code,room);
    }
    const used=new Set([...room.clients].map(c=>c.player.color));
    const name=(typeof m.name==='string'?m.name:'').replace(/[\x00-\x1f]/g,'').trim().slice(0,18)||'Cubito';
    const color=colors.find(c=>!used.has(c));
    ws.player=newPlayer(randomUUID(),name,color,levels[room.levelIndex],colors.indexOf(color));ws.room=room;
    // A late joiner can play the current level, including after the others reached its flag.
    if(room.phase!=='playing'){room.phase='playing';room.ready.clear();}
    room.clients.add(ws);sendLevel(ws,'welcome');
  });
  ws.on('close',()=>{
    if(!ws.room)return;
    const room=ws.room;room.clients.delete(ws);room.ready.delete(ws.player.id);room.restartReady.delete(ws.player.id);
    if(!room.clients.size)rooms.delete(room.code);
    else{
      checkCompletion(room);
      if(room.ready.size&&voteNext(room,[...room.ready][0]))for(const c of room.clients)sendLevel(c);
      else if(room.restartReady.size&&voteRestart(room,[...room.restartReady][0]))for(const c of room.clients)sendLevel(c);
    }
  });
});
let frame=0,previous=performance.now(),accumulator=0;
const loop=setInterval(()=>{
  const now=performance.now();accumulator+=Math.min(now-previous,100);previous=now;
  while(accumulator>=STEP_MS){
    accumulator-=STEP_MS;frame++;
    for(const room of rooms.values()){
      if(room.phase==='playing'){
        for(const ws of room.clients){
          const input=takeInput(ws.queue,ws.player.jumpHeld);
          if(input){ws.player.input=input;ws.lastSeq=input.seq;}
          else if(now-ws.lastInput>250)ws.player.input={left:false,right:false,jump:false};
        }
        tickGroup([...room.clients].map(ws=>ws.player),levels[room.levelIndex],room.world);
      }
      checkCompletion(room);
      if(frame%2!==0)continue;
      const players=[...room.clients].map(c=>({...c.player,seq:c.lastSeq}));
      const state=JSON.stringify({type:'state',frame,revision:room.revision,players,phase:room.phase,ready:[...room.ready],restartReady:[...room.restartReady],world:room.world});
      for(const ws of room.clients)if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<32768)ws.send(state);
    }
  }
},4);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},30000);
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log(`Super Cubito Saltarín escuchando en ${server.address().port}`));
function shutdown(){clearInterval(loop);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();server.close();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
