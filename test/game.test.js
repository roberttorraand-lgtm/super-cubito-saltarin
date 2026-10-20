import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levels, level, newPlayer, tick, isComplete, respawn, createWorld, tickGroup } from '../game.js';
import { teamController } from '../support/team-route.js';
import { createRoom, checkCompletion, voteNext } from '../rooms.js';
import { reconcile, interpolate } from '../public/netcode.js';
const flat={...level,width:5000,platforms:[[0,600,5000,120]],spikes:[],checkpoints:[],gates:[],plates:[],bridges:[],saws:[],goal:{x:4900,y:600}};
function settle(p,map=flat){for(let i=0;i<30;i++)tick(p,map);}

test('cooperative victory requires at least two players and every player at the flag',()=>{
  assert.equal(isComplete([]),false);assert.equal(isComplete([{finished:true}]),false);
  assert.equal(isComplete([{finished:true},{finished:false}]),false);
  assert.equal(isComplete([{finished:true},{finished:true}]),true);
});
test('acceleration, friction and variable-height jump',()=>{
  const p=newPlayer('p','p','#fff');settle(p);p.input.right=true;tick(p,flat);
  assert.ok(p.vx>0&&p.vx<5.8);for(let i=0;i<10;i++)tick(p,flat);assert.equal(p.vx,5.8);
  p.input.right=false;for(let i=0;i<20;i++)tick(p,flat);assert.ok(p.vx<.1);
  const full=newPlayer('full','',''),short=newPlayer('short','','');settle(full);settle(short);
  full.input.jump=short.input.jump=true;tick(full,flat);tick(short,flat);short.input.jump=false;
  let fullMin=full.y,shortMin=short.y;
  for(let i=0;i<100;i++){tick(full,flat);tick(short,flat);fullMin=Math.min(fullMin,full.y);shortMin=Math.min(shortMin,short.y);}
  assert.ok(fullMin<shortMin-60);assert.equal(full.y,568,'holding jump does not auto-jump');
});
test('coyote time and buffered jump tolerate slightly early or late input',()=>{
  const p=newPlayer('p','','');p.grounded=false;p.coyote=4;p.vy=1;p.input.jump=true;tick(p,flat);assert.ok(p.vy<0);
  const q=newPlayer('q','','');q.y=566;q.vy=3;q.input.jump=true;
  tick(q,flat);assert.equal(q.grounded,true);tick(q,flat);assert.ok(q.vy<0,'buffered jump fires just after landing');
});
test('checkpoint respawn is safe and preserves the latest checkpoint',()=>{
  for(const map of levels){
    const p=newPlayer('p','','',map);
    map.checkpoints.forEach((cp,i)=>{p.x=cp.x;p.y=cp.y-32;p.vy=0;tick(p,map);assert.equal(p.checkpoint,i);p.y=850;tick(p,map);assert.equal(p.x,cp.x);assert.equal(p.y,cp.y-32);});
    assert.equal(p.deaths,map.checkpoints.length);
    const spike=map.spikes[0];p.x=spike[0];p.y=spike[1]-20;tick(p,map);assert.equal(p.deaths,map.checkpoints.length+1);
  }
});
for(const map of levels)test(`two players can solve every mechanism and finish: ${map.name}`,()=>{
  const players=[newPlayer('a','Climber','#fff',map),newPlayer('b','Base','#fff',map)];
  const world=createWorld(),control=teamController();
  for(let i=0;i<15000&&!players.every(p=>p.finished);i++){
    const inputs=control(players,map,world);players.forEach((p,j)=>p.input=inputs[j]);tickGroup(players,map,world);
  }
  assert.deepEqual(world.activated,['tower','bridge'],JSON.stringify(players.map(p=>({x:p.x,y:p.y,support:p.supportId}))));
  assert.equal(players.every(p=>p.finished),true,JSON.stringify(players.map(p=>({x:p.x,y:p.y,deaths:p.deaths}))));
  assert.ok(players.every(p=>p.checkpoint===map.checkpoints.length-1));
});
test('room progression waits for everybody, advances four levels and restarts together',()=>{
  const room=createRoom('TEST');
  const a={player:newPlayer('a','','')},b={player:newPlayer('b','','')};room.clients.add(a);room.clients.add(b);
  assert.equal(voteNext(room,'a'),false);assert.equal(room.levelIndex,0);
  for(let i=0;i<levels.length;i++){
    room.world.activated=['tower','bridge'];
    a.player.finished=true;checkCompletion(room);assert.equal(room.phase,'playing');
    b.player.finished=true;checkCompletion(room);assert.equal(room.phase,i===3?'complete':'cleared');
    assert.equal(voteNext(room,'outsider'),false);assert.equal(voteNext(room,'a'),false);
    assert.equal(voteNext(room,'a'),false);assert.equal(voteNext(room,'b'),true);
    assert.equal(room.levelIndex,(i+1)%4);assert.equal(room.phase,'playing');assert.equal(a.player.finished,false);assert.equal(a.player.checkpoint,-1);
    assert.equal(a.lastSeq,0);assert.deepEqual(a.queue,[]);
    assert.deepEqual(room.world.activated,[]);assert.equal(room.world.frame,0);
  }
});
test('prediction reconciliation replays only pending input using shared physics',()=>{
  const server=newPlayer('a','','');settle(server);const input={left:false,right:true,jump:false};
  for(let i=0;i<12;i++){server.input=input;tick(server,flat);}
  const snapshot={...server};const pending=[];
  for(let seq=13;seq<=20;seq++){const frame={...input,seq,jump:seq>=16};pending.push(frame);server.input=frame;tick(server,flat);}
  const result=reconcile(snapshot,pending,flat);
  for(const key of ['x','y','vx','vy','grounded','jumpHeld'])assert.equal(result[key],server[key]);
  assert.equal(snapshot.x<result.x,true,'snapshot is not mutated');
});
test('remote interpolation smooths snapshots and snaps respawns safely',()=>{
  const a={time:100,player:{x:20,y:40,deaths:0}},b={time:150,player:{x:50,y:70,deaths:0}};
  assert.equal(interpolate([a,b],125).x,35);assert.equal(interpolate([a,b],200).x,50);
  assert.equal(interpolate([a,b],0).x,20);
  assert.equal(interpolate([a,{time:150,player:{x:1000,y:0,deaths:1}}],125).x,1000);
});
