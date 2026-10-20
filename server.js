import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { level, newPlayer, tick, isComplete } from './game.js';

const files = new Map([['/', ['index.html','text/html']], ['/app.js',['app.js','text/javascript']], ['/style.css',['style.css','text/css']]]);
const server = http.createServer(async (req,res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/health') { res.writeHead(200, {'Content-Type':'application/json'}); return res.end('{"ok":true}'); }
  const file = files.get(path);
  if (!file) { res.writeHead(404); return res.end('No encontrado'); }
  try { const data = await readFile(new URL(`./public/${file[0]}`,import.meta.url)); res.writeHead(200, {'Content-Type':file[1]+'; charset=utf-8', 'X-Content-Type-Options':'nosniff'}); res.end(data); }
  catch { res.writeHead(500); res.end('Error al cargar el juego'); }
});
const wss = new WebSocketServer({ server, maxPayload: 2048 });
const rooms = new Map();
const colors = ['#b4f669','#92bbff','#ffb591','#d3a6ff'];
const send = (ws,data) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
wss.on('connection', (ws,req) => {
  // Browser clients must come from this host; non-browser test clients have no Origin.
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return ws.close(1008,'Origen no permitido'); }
    catch { return ws.close(1008); }
  }
  ws.alive = true;
  ws.on('pong',()=>{ ws.alive=true; });
  ws.on('message',raw=>{
    let m; try { m=JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.type==='input' && ws.player) {
      ws.player.input={left:m.left===true,right:m.right===true,jump:m.jump===true}; return;
    }
    if (m.type!=='join' || ws.player) return;
    const requested = typeof m.room==='string' ? m.room.toUpperCase().trim() : '';
    let room;
    if (requested) {
      room=rooms.get(requested);
      if (!room) return send(ws,{type:'error',message:'Esa sala no existe. Revisa el código.'});
      if (room.clients.size>=4) return send(ws,{type:'error',message:'Sala completa: máximo 4 jugadores.'});
    } else {
      if (rooms.size>=100) return send(ws,{type:'error',message:'Servidor ocupado. Inténtalo más tarde.'});
      let code; do { code=randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
      room={code,clients:new Set()}; rooms.set(code,room);
    }
    const used=new Set([...room.clients].map(c=>c.player.color));
    const name=(typeof m.name==='string' ? m.name : '').replace(/[\x00-\x1f]/g,'').trim().slice(0,18)||'Cubito';
    ws.player=newPlayer(randomUUID(),name,colors.find(c=>!used.has(c))); ws.room=room;
    room.clients.add(ws);
    send(ws,{type:'welcome',id:ws.player.id,room:room.code,level});
  });
  ws.on('error',()=>{});
  ws.on('close',()=>{
    if (!ws.room) return;
    ws.room.clients.delete(ws);
    if (!ws.room.clients.size) rooms.delete(ws.room.code);
  });
});
let frame=0;
const loop=setInterval(()=>{
  frame++;
  for (const room of rooms.values()) {
    for (const ws of room.clients) tick(ws.player);
    if (frame%3!==0) continue;
    const players=[...room.clients].map(({player:p})=>({id:p.id,name:p.name,color:p.color,x:p.x,y:p.y,checkpoint:p.checkpoint,finished:p.finished,deaths:p.deaths}));
    const state={type:'state',players,complete:isComplete(players)};
    for (const ws of room.clients) send(ws,state);
  }
},1000/60);
const heartbeat=setInterval(()=>{
  for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive=false; ws.ping(); } }
},30000);
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log(`Super Cubito Saltarín escuchando en ${server.address().port}`));
function shutdown() { clearInterval(loop); clearInterval(heartbeat); for (const ws of wss.clients) ws.terminate(); wss.close(); server.close(); }
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
