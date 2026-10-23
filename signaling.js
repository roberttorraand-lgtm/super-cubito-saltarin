import {randomBytes,randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
export const LINK_PROTOCOL=4;
export function attachSignaling(server){
 const rooms=new Map(),wss=new WebSocketServer({noServer:true,maxPayload:160000});
 const send=(ws,m)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<512000)ws.send(JSON.stringify(m));};
 server.on('upgrade',(request,socket,head)=>{
  let path;try{path=new URL(request.url,'http://localhost').pathname;}catch{return socket.destroy();}
  if(path!=='/signal')return;
  wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));
 });
 const end=ws=>{
  const r=ws.room;if(!r)return;ws.room=null;
  if(r.host===ws){rooms.delete(r.code);for(const g of r.guests.values()){g.room=null;send(g,{type:'host-left',text:'El anfitrión ha cerrado el enlace de la sala.'});g.close(1000);}}
  else {r.guests.delete(ws.peer);send(r.host,{type:'peer-left',peer:ws.peer});}
 };
 wss.on('connection',(ws,req)=>{
  req.socket.setNoDelay(true);ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});ws.rate={at:Date.now(),n:0};
  ws.on('message',raw=>{
   if(Date.now()-ws.rate.at>=1000)ws.rate={at:Date.now(),n:0};if(++ws.rate.n>130)return;
   let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;
   if(!ws.room){
    if(m.protocol!==LINK_PROTOCOL)return send(ws,{type:'error',text:'Actualiza el juego: la versión de conexión no coincide.'});
    if(m.type==='host'){
     if(rooms.size>=100)return send(ws,{type:'error',text:'Servicio de enlace ocupado.'});
     let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
     const room={code,host:ws,guests:new Map()};rooms.set(code,room);ws.room=room;return send(ws,{type:'hosted',code});
    }
    if(m.type==='join'){
     const r=rooms.get(String(m.code??'').toUpperCase().trim());if(!r)return send(ws,{type:'error',text:'La sala no existe o su anfitrión ha salido.'});
     if(r.guests.size>=3)return send(ws,{type:'error',text:'La sala ya tiene cuatro guardias.'});
     ws.peer=randomUUID();ws.room=r;r.guests.set(ws.peer,ws);send(ws,{type:'joined',peer:ws.peer});return send(r.host,{type:'peer-joined',peer:ws.peer});
    }
    return;
   }
   const r=ws.room,isHost=r.host===ws,target=isHost?r.guests.get(m.peer):r.host;
   if(!target)return;
   if(m.type==='signal'){
    const description=m.description,candidate=m.candidate;
    if(description&&(!['offer','answer'].includes(description.type)||typeof description.sdp!=='string'||description.sdp.length>50000))return;
    if(candidate&&JSON.stringify(candidate).length>4096)return;
    send(target,{type:'signal',peer:isHost?undefined:ws.peer,description,candidate});
   }
   if(m.type==='fallback')send(target,{type:'fallback',peer:isHost?undefined:ws.peer});
   if(m.type==='relay-ready'&&isHost)send(target,{type:'relay-ready'});
   if(m.type==='relay'&&typeof m.data==='string'&&m.data.length<145000)send(target,{type:'relay',peer:isHost?undefined:ws.peer,data:m.data});
  });
  ws.on('close',()=>end(ws));
 });
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
 let closed=false;const close=()=>{if(closed)return;closed=true;clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();};
 server.on('close',close);
 return {rooms,close};
}
