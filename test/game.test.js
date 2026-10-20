import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';
import { level, newPlayer, tick, isComplete } from '../game.js';

test('cooperative victory requires at least two players and every player at the flag',()=>{
  assert.equal(isComplete([]),false);
  assert.equal(isComplete([{finished:true}]),false);
  assert.equal(isComplete([{finished:true},{finished:false}]),false);
  assert.equal(isComplete([{finished:true},{finished:true}]),true);
  assert.equal(isComplete([{finished:true},{finished:true},{finished:false}]),false);
});

test('physics: landing, edge-triggered jump, falling, checkpoint and finish',()=>{
  const p=newPlayer('test','Cubito','#fff');
  for(let i=0;i<30;i++)tick(p);
  assert.equal(p.y,568);assert.equal(p.grounded,true);
  p.input.jump=true;tick(p);assert.ok(p.y<568);
  for(let i=0;i<90;i++)tick(p);
  assert.equal(p.y,568,'holding jump must not auto-jump');
  p.x=470;p.y=850;tick(p);assert.equal(p.deaths,1);assert.equal(p.x,90);
  p.x=1250;p.y=508;tick(p);assert.equal(p.checkpoint,true);
  p.y=850;tick(p);assert.equal(p.x,1250);assert.equal(p.deaths,2);
  p.x=level.goal.x;p.y=568;tick(p);assert.equal(p.finished,true);
});

test('the complete route is traversable with the actual physics',()=>{
  const p=newPlayer('route','Runner','#fff');
  for(let i=0;i<30;i++)tick(p);
  // Walk and jump over each gap and spike. Jump is released between obstacles.
  for(const [takeoff,landing] of [[350,535],[650,850],[865,1015],[1070,1220],[1310,1530],[1535,1685],[1740,1900],[2015,2220],[2245,2400]]){
    p.input={left:false,right:true,jump:false};
    let steps=0;
    while(p.x<takeoff&&steps++<200)tick(p);
    assert.equal(p.grounded,true,`grounded at ${takeoff}`);
    p.input.jump=true;tick(p);p.input.jump=false;
    while((p.x<landing||!p.grounded)&&steps++<300)tick(p);
    assert.equal(p.deaths,0,`safe route past ${takeoff}`);
    assert.ok(steps<300);
  }
  while(!p.finished&&p.x<2550)tick(p);
  assert.equal(p.finished,true);
});

test('real server: shared rooms, authoritative input, isolation, capacity, cleanup and HTTP',async t=>{
  const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  const sockets=[];
  t.after(async()=>{for(const ws of sockets)ws.terminate();proc.kill('SIGTERM');await once(proc,'exit');});
  const port=await new Promise((resolve,reject)=>{
    proc.stdout.on('data',data=>{const match=String(data).match(/escuchando en (\d+)/);if(match)resolve(Number(match[1]));});
    proc.once('error',reject);proc.once('exit',code=>reject(new Error(`Server exited ${code}`)));
  });
  const base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(`${base}/health`)).status,200);
  assert.match(await (await fetch(base)).text(),/Super Cubito/);
  assert.equal((await fetch(`${base}/missing`)).status,404);
  async function client(room=''){
    const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);ws.inbox=[];
    ws.on('message',raw=>{ws.inbox.push(JSON.parse(raw));});await once(ws,'open');
    ws.send(JSON.stringify({type:'join',name:'Test',room}));return ws;
  }
  async function wait(ws,predicate){
    const deadline=Date.now()+3000;
    while(Date.now()<deadline){const index=ws.inbox.findIndex(predicate);if(index>=0)return ws.inbox.splice(index,1)[0];await new Promise(r=>setTimeout(r,10));}
    throw new Error('Timed out waiting for expected server message');
  }
  const a=await client(),welcome=await wait(a,m=>m.type==='welcome');
  const b=await client(welcome.room);await wait(b,m=>m.type==='welcome');
  const initial=await wait(b,m=>m.type==='state'&&m.players.length===2);
  assert.equal(initial.complete,false);
  a.send(JSON.stringify({type:'input',right:true,x:2400,finished:true}));
  const moved=await wait(b,m=>m.type==='state'&&m.players.find(p=>p.id===welcome.id)?.x>110);
  assert.ok(moved.players.find(p=>p.id===welcome.id).x<2400,'client cannot teleport');
  a.send(JSON.stringify({type:'input'}));
  const isolated=await client();await wait(isolated,m=>m.type==='welcome');
  assert.equal((await wait(isolated,m=>m.type==='state')).players.length,1);
  const c=await client(welcome.room);await wait(c,m=>m.type==='welcome');
  const d=await client(welcome.room);await wait(d,m=>m.type==='welcome');
  const four=await wait(a,m=>m.type==='state'&&m.players.length===4);
  assert.equal(new Set(four.players.map(p=>p.color)).size,4);
  const overflow=await client(welcome.room);assert.match((await wait(overflow,m=>m.type==='error')).message,/completa/);
  d.close();await once(d,'close');await wait(a,m=>m.type==='state'&&m.players.length===3);
  const missing=await client('ZZZZZZ');assert.match((await wait(missing,m=>m.type==='error')).message,/no existe/);
});
