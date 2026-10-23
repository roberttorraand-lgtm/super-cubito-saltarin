import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {attachSignaling} from './signaling.js';
import {newWorld,newPlayer,step,snapshot,restore,DT} from './shared/simulation.js';
const files=new Map([['/shared/nights.js',['shared/nights.js','text/javascript']],['/lighting.js',['public/lighting.js','text/javascript']],['/environment.js',['public/environment.js','text/javascript']],['/transport.js',['public/transport.js','text/javascript']],['/host-worker.js',['public/host-worker.js','text/javascript']],['/shared/host-session.js',['shared/host-session.js','text/javascript']],
 ['/',['public/index.html','text/html']],['/style.css',['public/style.css','text/css']],['/app.js',['public/app.js','text/javascript']],['/scene.js',['public/scene.js','text/javascript']],['/models.js',['public/models.js','text/javascript']],['/sound.js',['public/sound.js','text/javascript']],
 ['/shared/world.js',['shared/world.js','text/javascript']],['/shared/simulation.js',['shared/simulation.js','text/javascript']],
 ['/vendor/babylon.js',['node_modules/babylonjs/babylon.js','text/javascript']],['/vendor/babylon-loaders.js',['node_modules/babylonjs-loaders/babylonjs.loaders.min.js','text/javascript']],
]);
export function createGameServer({allowSolo=true}={}){
 const server=http.createServer(async(req,res)=>{let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);return res.end();}
  const headers={'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
  if(path==='/health'){res.writeHead(200,{...headers,'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,version:'0.5.0',game:'turno-cero',simulationRooms:rooms.size,linkRooms:signaling.rooms.size}));}
  const asset=/^\/assets\/(models\/(prisma|welder|gold|ember)\.glb|textures\/(tile|plaster|steel|wood|fabric|rubber|enamel)(-normal)?\.png)$/.test(path);
  const file=files.get(path)??(asset?['public'+path,path.endsWith('.glb')?'model/gltf-binary':'image/png']:null);if(!file){res.writeHead(404,headers);return res.end('No encontrado');}
  try{const data=await readFile(new URL(file[0],import.meta.url));res.writeHead(200,{...headers,'Content-Type':file[1]+(file[1].startsWith('text/')?'; charset=utf-8':'')});res.end(data);}catch{res.writeHead(500,headers);res.end('No se pudo cargar el juego.');}
 });
 const rooms=new Map(),wss=new WebSocketServer({noServer:true,maxPayload:160000}),signaling=attachSignaling(server);
 server.on('upgrade',(req,socket,head)=>{let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{return socket.destroy();}if(path==='/ws')wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));else if(path!=='/signal')socket.destroy();});
 const send=(c,m)=>{if(c.readyState===WebSocket.OPEN)c.send(JSON.stringify(m));};
 const players=r=>[...r.clients].map(c=>c.player),host=r=>[...r.clients][0]?.player.id;
 const state=r=>({type:'state',code:r.code,host:host(r),mode:r.mode,started:r.started,world:r.world,players:players(r)});
 wss.on('connection',(ws,req)=>{
  if(req.headers.origin){try{const o=new URL(req.headers.origin);if(o.host!==req.headers.host&&!['127.0.0.1','localhost'].includes(o.hostname)){ws.close(1008);return;}}catch{ws.close(1008);return;}}
  req.socket.setNoDelay(true);ws.queue=[];ws.seq=0;ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});ws.rate={at:Date.now(),n:0};
  ws.on('message',raw=>{if(Date.now()-ws.rate.at>1000)ws.rate={at:Date.now(),n:0};if(++ws.rate.n>100)return;
   let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;
   const r=ws.room;
   if(m.type==='join'&&!r){
    if(!allowSolo)return send(ws,{type:'error',text:'El individual se ejecuta en tu ordenador. Abre el programa de Windows.'});
    if(m.mode==='coop')return send(ws,{type:'error',text:'Actualiza el juego: el cooperativo ahora se ejecuta en el ordenador del anfitrión.'});
    let room;const code=typeof m.code==='string'?m.code.toUpperCase().trim():'';
    if(code){room=rooms.get(code);if(!room||room.mode==='solo')return send(ws,{type:'error',text:'La sala no existe o es individual.'});if(room.clients.size>=4)return send(ws,{type:'error',text:'La sala ya tiene cuatro guardias.'});}
    else{if(rooms.size>=100)return send(ws,{type:'error',text:'Servidor ocupado.'});let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));room={code,mode:m.mode==='coop'?'coop':'solo',started:false,world:newWorld(m.night),clients:new Set(),saved:[]};
     if(m.save){try{const data=restore(m.save);room.world=data.world;room.saved=data.players;}catch{return send(ws,{type:'error',text:'La partida guardada no es válida.'});}}
     rooms.set(code,room);
    }
    const slots=new Set(players(room).map(p=>p.slot));let slot=0;while(slots.has(slot))slot++;const id=randomUUID(),name=String(m.name??'Guardia').replace(/[\x00-\x1f]/g,'').trim().slice(0,18)||'Guardia';
    ws.player={...newPlayer(id,name,slot),...(room.saved[slot]??{}),id,name,slot,seq:0,input:{},held:{},alive:room.saved[slot]?.alive??true,hidden:null};ws.room=room;room.clients.add(ws);send(ws,{type:'welcome',id,...state(room),type:'welcome'});return;
   }
   if(!r)return;
   if(m.type==='input'){
    if(!Number.isSafeInteger(m.seq)||m.seq<=ws.seq||m.seq>ws.seq+300)return;ws.seq=m.seq;const p=ws.player,input={seq:m.seq};
    for(const key of ['forward','back','left','right','run','crouch','interact','phone','flashlight','lure'])input[key]=m[key]===true;
    input.yaw=Number.isFinite(m.yaw)?m.yaw%(Math.PI*2):p.yaw;input.pitch=Number.isFinite(m.pitch)?Math.max(-1.25,Math.min(1.25,m.pitch)):p.pitch;input.camera=Number.isInteger(m.camera)?Math.max(0,Math.min(5,m.camera)):p.camera;
    ws.queue.push(input);if(ws.queue.length>4)ws.queue.splice(0,ws.queue.length-4);ws.lastInput=Date.now();
   }
   if(m.type==='start'&&host(r)===ws.player.id&&(r.mode==='solo'||r.clients.size>=2))r.started=true;
   if(m.type==='pause'&&r.mode==='solo'){r.world.paused=m.paused===true;ws.queue=[];ws.player.input={};}
   if(m.type==='save'&&host(r)===ws.player.id&&r.started&&r.world.status==='playing')send(ws,{type:'save',data:snapshot(r.world,players(r))});
  });
  ws.on('close',()=>{const r=ws.room;if(r){r.clients.delete(ws);if(!r.clients.size)rooms.delete(r.code);}});
 });
 let last=performance.now(),acc=0,frame=0;
 const loop=setInterval(()=>{const now=performance.now();acc+=Math.min(.2,(now-last)/1000);last=now;while(acc>=DT){acc-=DT;frame++;for(const r of rooms.values()){
  for(const c of r.clients){const i=c.queue.shift();if(i){c.player.input=i;c.player.seq=i.seq;}else if(Date.now()-(c.lastInput??0)>200)c.player.input={yaw:c.player.yaw,pitch:c.player.pitch,camera:c.player.camera};}
  if(r.started)step(r.world,players(r));if(frame%3===0){const data=JSON.stringify(state(r));for(const c of r.clients)if(c.readyState===WebSocket.OPEN&&c.bufferedAmount<131072)c.send(data);}
 }}},5);
 const heartbeat=setInterval(()=>{for(const c of wss.clients){if(!c.alive){c.terminate();continue;}c.alive=false;c.ping();}},15000);
 server.on('close',()=>{clearInterval(loop);clearInterval(heartbeat);});
 return {server,rooms,signaling,close:()=>{signaling.close();for(const c of wss.clients)c.terminate();wss.close();server.close();clearInterval(loop);clearInterval(heartbeat);}};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){const app=createGameServer({allowSolo:process.env.RENDER!=='true'});app.server.listen(Number(process.env.PORT??3000),process.env.HOST??'0.0.0.0',()=>console.log(`Turno Cero escuchando en ${app.server.address().port}`));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.close();});}
