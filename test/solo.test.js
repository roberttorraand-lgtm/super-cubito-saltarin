import {test} from 'node:test';
import assert from 'node:assert/strict';
import {levels,soloLevels,newPlayer,createWorld,tickGroup,respawn} from '../game.js';
import {createRoom,checkCompletion,voteNext,voteRestart,roomLevels} from '../rooms.js';
import {soloController} from '../support/team-route.js';
import {updateEncounters} from '../encounters.js';
for(const original of soloLevels)test(`solo route can reach castle with three lives: ${original.name}`,()=>{
 const map={...original,boss:null,goal:original.overworldEnd},p=newPlayer('a','Solo','#fff',map),w=createWorld();
 for(let i=0;i<15000&&!p.finished&&!p.eliminated;i++){p.input=soloController(p,map,w);tickGroup([p],map,w);}
 assert.equal(p.finished,true,JSON.stringify({x:p.x,y:p.y,lives:p.lives}));assert.ok(p.lives>0);
 assert.deepEqual(w.activated,map.objectives.map(o=>o.group));
});
test('solo variants preserve cooperative puzzles and add villages and collectibles to every world',()=>{
 for(let i=0;i<4;i++){
  assert.equal(soloLevels[i].mode,'solo');assert.equal(levels[i].mode,undefined);
  assert.equal(soloLevels[i].villagers.length,3);assert.equal(soloLevels[i].easterEggs.length,4);
  assert.notEqual(soloLevels[i].plates,levels[i].plates);
 }
 assert.equal(levels[2].plates.length,2);assert.equal(soloLevels[2].plates.length,1);
});
test('one solo player advances, finishes campaign, retries and restores three lives',()=>{
 const r=createRoom('SOLO','solo'),c={player:newPlayer('a','Solo','#fff',roomLevels(r)[0])};r.clients.add(c);
 for(let i=0;i<4;i++){c.player.finished=true;checkCompletion(r);assert.equal(r.phase,i===3?'complete':'cleared');assert.equal(voteNext(r,'a'),true);assert.equal(c.player.lives,3);}
 assert.equal(r.levelIndex,0);for(let i=0;i<3;i++)respawn(c.player,roomLevels(r)[0]);checkCompletion(r);assert.equal(r.phase,'defeated');assert.equal(voteRestart(r,'a'),true);assert.equal(c.player.lives,3);
 const coop=createRoom('COOP');coop.clients.add({player:{id:'a',finished:true}});checkCompletion(coop);assert.equal(coop.phase,'playing');
});
test('2016 discoveries are collected once without spending or restoring lives',()=>{
 const m=soloLevels[0],e=m.easterEggs[0],p=newPlayer('a','Solo','#fff',m),w=createWorld();p.x=e.x;p.y=e.y-16;p.lives=2;
 p.input.interact=true;tickGroup([p],m,w);tickGroup([p],m,w);assert.deepEqual(w.eggs,[e.id]);assert.equal(p.lives,2);assert.equal(w.lastEgg.caption,e.caption);
});
test('solo blue mirrors latch sequentially and solo red seal needs no teammate',()=>{
 const m=soloLevels[0],p={...newPlayer('a','','',m),zone:'boss',x:m.boss.x+164,y:568,grounded:true},w=createWorld();
 const update=()=>updateEncounters([p],new Map([['a',{...p}]]),m,w,respawn);
 update();assert.equal(w.boss.open,0);p.x=m.boss.x+884;for(let i=0;i<24;i++)update();assert.ok(w.boss.open>0);
 const red=soloLevels[3],q={...p,x:red.boss.x+264,y:430,grounded:false,supportId:null},v=createWorld();updateEncounters([q],new Map([['a',{...q}]]),red,v,respawn);assert.ok(v.boss.open>0);
});
