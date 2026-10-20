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
  for(const file of ['/game.js','/netcode.js','/renderer.js'])assert.equal((await fetch(base+file)).status,200);
  assert.equal((await fetch(`${base}/missing`)).status,404);
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
  assert.equal(welcome.totalLevels,4);assert.ok(welcome.level.width>7000);
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
  const forbidden=new WebSocket(`ws://127.0.0.1:${port}`,{origin:'https://different.example'});sockets.push(forbidden);
  assert.equal((await once(forbidden,'close'))[0],1008);
});
