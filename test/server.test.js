import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

test('real WebSocket rooms: synchronization, authoritative limits, isolation, capacity, cleanup and HTTP',{timeout:12000},async t=>{
  const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  const sockets=[];
  t.after(async()=>{for(const ws of sockets)ws.terminate();const exited=once(proc,'exit');proc.kill('SIGTERM');await exited;});
  const port=await new Promise((resolve,reject)=>{
    proc.stdout.on('data',data=>{const m=String(data).match(/escuchando en (\d+)/);if(m)resolve(Number(m[1]));});
    proc.once('error',reject);proc.once('exit',code=>reject(new Error(`Server exited ${code}`)));
  });
  const base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(`${base}/health`)).status,200);
  assert.match(await (await fetch(base)).text(),/Super Cubito/);
  for(const file of ['/game.js','/levels.js','/netcode.js','/renderer.js','/encounters.js','/exploration.js','/solo.js','/art.js','/combat.js'])assert.equal((await fetch(base+file)).status,200);
  assert.equal((await fetch(`${base}/missing`)).status,404);
  const png=await fetch(base+'/assets/meme-atlas.png');assert.equal(png.status,200);
  for(const asset of ['boss-atlas','creatures','landscapes','residents','powerups'])assert.equal((await fetch(base+'/assets/'+asset+'.png')).status,200);
  assert.equal((await fetch(base+'/assets/creatures.png',{headers:{'If-None-Match':(await fetch(base+'/assets/creatures.png')).headers.get('etag')}})).status,304);
  const signature=new Uint8Array(await png.arrayBuffer()).slice(0,8);assert.deepEqual([...signature],[137,80,78,71,13,10,26,10]);
  async function client(room=''){
    const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);ws.inbox=[];
    ws.on('message',raw=>ws.inbox.push(JSON.parse(raw)));await once(ws,'open');
    ws.send(JSON.stringify({type:'join',name:'Test',room}));return ws;
  }
  async function wait(ws,predicate){
    const deadline=Date.now()+3000;
    while(Date.now()<deadline){const i=ws.inbox.findIndex(predicate);if(i>=0)return ws.inbox.splice(i,1)[0];await new Promise(r=>setTimeout(r,10));}
    throw new Error('Timed out waiting for server message');
  }
  const a=await client(),welcome=await wait(a,m=>m.type==='welcome');
  assert.equal(welcome.player.lives,3);assert.equal(welcome.totalLevels,4);assert.ok(welcome.level.width>6000);
  const b=await client(welcome.room);await wait(b,m=>m.type==='welcome');
  assert.equal((await wait(b,m=>m.type==='state'&&m.players.length===2)).phase,'playing');
  a.send(JSON.stringify({type:'next',revision:0}));
  a.send(JSON.stringify({type:'input',seq:1,revision:99,right:true}));
  assert.equal((await wait(a,m=>m.type==='state')).revision,0);
  const start=await wait(a,m=>m.type==='state'&&m.players.length===2);
  const initialX=start.players.find(p=>p.id===welcome.id).x;
  // Flooded frames cannot move a player faster than the server's fixed simulation.
  for(let seq=1;seq<=200;seq++)a.send(JSON.stringify({type:'input',seq,revision:0,right:true,x:6000,finished:true}));
  const moved=await wait(b,m=>m.type==='state'&&m.players.find(p=>p.id===welcome.id)?.x>initialX+2);
  const p=moved.players.find(p=>p.id===welcome.id);
  assert.ok(p.x<300);assert.equal(p.finished,false);assert.ok(p.seq>0);
  a.send(JSON.stringify({type:'input',seq:1,revision:0,left:true}));
  a.send(JSON.stringify({type:'ping',sent:123}));assert.equal((await wait(a,m=>m.type==='pong')).sent,123);
  const isolated=await client();await wait(isolated,m=>m.type==='welcome');assert.equal((await wait(isolated,m=>m.type==='state')).players.length,1);
  const c=await client(welcome.room);await wait(c,m=>m.type==='welcome');
  const d=await client(welcome.room);await wait(d,m=>m.type==='welcome');
  const four=await wait(a,m=>m.type==='state'&&m.players.length===4);assert.equal(new Set(four.players.map(p=>p.color)).size,4);
  const overflow=await client(welcome.room);assert.match((await wait(overflow,m=>m.type==='error')).message,/completa/);
  d.close();await once(d,'close');await wait(a,m=>m.type==='state'&&m.players.length===3);
  const missing=await client('ZZZZZZ');assert.match((await wait(missing,m=>m.type==='error')).message,/no existe/);
  const jumper=await client();const joined=await wait(jumper,m=>m.type==='welcome');
  await wait(jumper,m=>m.type==='state'&&m.players[0].grounded);
  for(let seq=1;seq<=200;seq++)jumper.send(JSON.stringify({type:'input',revision:0,seq,jump:seq===1}));
  const jump=await wait(jumper,m=>m.type==='state'&&m.players[0].y<joined.player.y-10);
  assert.ok(jump.players[0].seq>=197,'burst backlog was discarded while its short jump survived');
  const forbidden=new WebSocket(`ws://127.0.0.1:${port}`,{origin:'https://different.example'});sockets.push(forbidden);
  assert.equal((await once(forbidden,'close'))[0],1008);
});

test('solo WebSocket room provides adapted maps and refuses other players',{timeout:8000},async t=>{
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 const sockets=[];t.after(async()=>{for(const s of sockets)s.terminate();const exited=once(proc,'exit');proc.kill();await exited;});
 const port=await new Promise((resolve,reject)=>{proc.stdout.on('data',d=>{const m=String(d).match(/escuchando en (\d+)/);if(m)resolve(+m[1]);});proc.once('error',reject);proc.once('exit',()=>reject(new Error('Server exited')));});
 async function join(data){const s=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(s);await once(s,'open');const reply=once(s,'message');s.send(JSON.stringify({type:'join',name:'Solo',...data}));return JSON.parse((await reply)[0]);}
 const first=await join({mode:'solo'});assert.equal(first.mode,'solo');assert.equal(first.level.mode,'solo');assert.equal(first.level.villagers.length,3);assert.equal(first.level.plates.length,1);
 const intruder=await join({room:first.room});assert.equal(intruder.type,'error');assert.match(intruder.message,/individual/);
 const second=await join({mode:'solo'});assert.notEqual(first.room,second.room);
});

test('authoritative interaction: burst E enters a real house and cannot teleport through forged input',{timeout:8000},async t=>{
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 const sockets=[];t.after(async()=>{for(const s of sockets)s.terminate();const exited=once(proc,'exit');proc.kill();await exited;});
 const port=await new Promise((resolve,reject)=>{proc.stdout.on('data',d=>{const m=String(d).match(/escuchando en (\d+)/);if(m)resolve(+m[1]);});proc.once('error',reject);proc.once('exit',()=>reject(new Error('Server exited')));});
 const s=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(s);const inbox=[];s.on('message',d=>inbox.push(JSON.parse(d)));await once(s,'open');s.send(JSON.stringify({type:'join',mode:'solo',name:'Explorer'}));
 async function wait(fn){for(let i=0;i<250;i++){const n=inbox.findIndex(fn);if(n>=0)return inbox.splice(n,1)[0];await new Promise(r=>setTimeout(r,10));}throw new Error('Missing authoritative state');}
 const welcome=await wait(m=>m.type==='welcome'),h=welcome.level.houses[0];await wait(m=>m.type==='state'&&m.players[0].grounded);
 for(let seq=1;seq<=200;seq++)s.send(JSON.stringify({type:'input',revision:0,seq,interact:seq===1,x:999999,zone:'boss',bossDefeated:true}));
 const entered=await wait(m=>m.type==='state'&&m.players[0].zone===h.id),p=entered.players[0];
 assert.ok(p.x>=h.room.x&&p.x<h.room.x+h.room.w);assert.equal(p.lives,3);assert.equal(p.finished,false);assert.equal(entered.world.boss.hp,3);assert.notEqual(entered.world.bossDefeated,true);
 assert.equal(p.checkpoint,-1);assert.ok(p.seq>=197);
});

test('online charged shotgun is authoritative and its explosion does not hurt a nearby teammate',{timeout:10000},async t=>{
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 const sockets=[];t.after(async()=>{for(const s of sockets)s.terminate();const exited=once(proc,'exit');proc.kill();await exited;});
 const port=await new Promise((resolve,reject)=>{proc.stdout.on('data',d=>{const m=String(d).match(/escuchando en (\d+)/);if(m)resolve(+m[1]);});proc.once('error',reject);proc.once('exit',()=>reject(new Error('Server exited')));});
 async function connect(room=''){const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);ws.seq=0;ws.events=[];ws.on('message',d=>{const m=JSON.parse(d);ws.events.push(m);if(m.type==='state')ws.state=m;});await once(ws,'open');ws.send(JSON.stringify({type:'join',room,name:'Power'}));return ws;}
 async function wait(ws,fn){for(let i=0;i<400;i++){const n=ws.events.findIndex(fn);if(n>=0)return ws.events.splice(n,1)[0];await new Promise(r=>setTimeout(r,10));}throw new Error('Missing online combat event');}
 const a=await connect(),welcome=await wait(a,m=>m.type==='welcome'),b=await connect(welcome.room),joined=await wait(b,m=>m.type==='welcome');await wait(a,m=>m.type==='state'&&m.players.length===2);
 function input(ws,data){ws.send(JSON.stringify({type:'input',revision:0,seq:++ws.seq,power:1,...data}));}
 const move=setInterval(()=>{const p=b.state?.players.find(p=>p.id===joined.id);input(b,{right:!p||p.x<296});},16);try{await wait(b,m=>m.type==='state'&&m.players.find(p=>p.id===joined.id).x>=296);}finally{clearInterval(move);}input(b,{right:false});
 const charge=setInterval(()=>input(a,{use:true,fuel:999999,damage:999,team:'enemy'}),16);try{await wait(a,m=>m.type==='state'&&m.players.find(p=>p.id===welcome.id).charge>=65);}finally{clearInterval(charge);}input(a,{use:false});
 const blast=await wait(a,m=>m.type==='state'&&m.world.explosions?.length);const ally=blast.players.find(p=>p.id===joined.id),shooter=blast.players.find(p=>p.id===welcome.id);
 assert.equal(ally.lives,3);assert.equal(shooter.lives,3);assert.equal(ally.deaths,0);assert.equal(shooter.fuel,180);assert.ok(Math.abs(ally.x+16-blast.world.explosions[0].x)<88,'teammate was inside the explosion radius');
});
