import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levels,newPlayer,tickGroup,createWorld,respawn,enemyPositions,updateEnemies,updateMechanisms,isComplete,tick } from '../game.js';
import { createRoom,checkCompletion,voteNext,voteRestart } from '../rooms.js';
import { prediction } from '../public/netcode.js';
const flat={...levels[0],width:2000,platforms:[[0,600,2000,120]],blocks:[],spikes:[],saws:[],lasers:[],crumble:[],plates:[],gates:[],bridges:[],enemies:[],springs:[],belts:[],checkpoints:[],goal:{x:1900,y:600}};
function p(id='a'){return {...newPlayer(id,id,'#fff',flat),y:568,grounded:true};}
function room(){const r=createRoom('TEST');r.clients.add({player:p('a')});r.clients.add({player:p('b')});return r;}
test('exactly three deaths exhaust lives and a spectator cannot move or lose more lives',()=>{
 const a=p();assert.equal(a.lives,3);
 respawn(a,flat);assert.equal(a.lives,2);respawn(a,flat);assert.equal(a.lives,1);respawn(a,flat);
 assert.equal(a.lives,0);assert.equal(a.eliminated,true);assert.equal(a.deaths,3);
 const x=a.x,y=a.y;a.input={left:false,right:true,jump:true};for(let i=0;i<30;i++)tickGroup([a],flat,createWorld());
 respawn(a,flat);assert.equal(a.x,x);assert.equal(a.y,y);assert.equal(a.deaths,3);assert.equal(a.lives,0);
});
test('one hazard contact costs one life and respawn immunity prevents immediate repeated damage',()=>{
 const a=p(),w=createWorld(),map={...flat,spikes:[[90,580,80,20]]};tickGroup([a],map,w);
 assert.equal(a.lives,2);assert.ok(a.invulnerable>0);
 for(let i=0;i<20;i++)tickGroup([a],map,w);assert.equal(a.lives,2);
 for(let i=0;i<90;i++)tickGroup([a],map,w);assert.ok(a.lives<2);
});
test('knocked-out cubes do not occupy plates or support living players',()=>{
 const a=p(),b={...p('b'),y:536};a.eliminated=true;a.lives=0;
 const map={...flat,plates:[{id:'pad',group:'gate',x:90,y:600,w:50}]},w=createWorld();
 for(let i=0;i<60;i++)tickGroup([a,b],map,w);
 assert.equal(b.supportId,null);assert.equal(b.y,568);
 b.x=500;updateMechanisms([a,b],map,w);assert.equal(w.pressed.includes('pad'),false);
});
test('a survivor can finish for eliminated teammates but an all-KO team cannot win',()=>{
 assert.equal(isComplete([{finished:true},{eliminated:true}]),true);
 assert.equal(isComplete([{eliminated:true},{eliminated:true}]),false);
 const r=room();for(const c of r.clients){c.player.eliminated=true;c.player.lives=0;}
 checkCompletion(r);assert.equal(r.phase,'defeated');assert.equal(voteNext(r,'a'),false);
});
test('unanimous restart repeats the SAME world and restores three lives for everybody',()=>{
 const r=room();r.levelIndex=2;
 for(const c of r.clients){c.player.eliminated=true;c.player.lives=0;}
 checkCompletion(r);assert.equal(voteRestart(r,'outsider'),false);assert.equal(voteRestart(r,'a'),false);
 assert.equal(voteRestart(r,'b'),true);assert.equal(r.levelIndex,2);assert.equal(r.revision,1);assert.equal(r.phase,'playing');
 for(const c of r.clients){assert.equal(c.player.lives,3);assert.equal(c.player.eliminated,false);}
 assert.deepEqual(r.world.defeatedEnemies,[]);
});
test('a team can restart when one player is out and an unfinished cooperative puzzle needs them',()=>{
 const r=room();[...r.clients][0].player.eliminated=true;
 assert.equal(voteRestart(r,'a'),false);assert.equal(voteRestart(r,'a'),false);assert.equal(voteRestart(r,'b'),true);
 const fresh=room();assert.equal(voteRestart(fresh,'a'),false,'no grief restart before anybody loses all lives');
});
test('every world transition restores lives regardless of the previous remaining amount',()=>{
 const r=room();for(let index=0;index<4;index++){
  for(const c of r.clients){c.player.lives=1;c.player.finished=true;}
  checkCompletion(r);voteNext(r,'a');assert.equal(voteNext(r,'b'),true);
  for(const c of r.clients){assert.equal(c.player.lives,3);assert.equal(c.player.deaths,0);}
 }
});
const enemy={id:'duck',kind:'duck',x:300,y:564,w:40,h:36,range:0,period:200,offset:0};
test('enemies move deterministically and a downward stomp defeats one for the whole room',()=>{
 const map={...flat,enemies:[enemy]},w=createWorld(),a={...p(),x:304,y:535,vy:6,grounded:false};
 const before=new Map([[a.id,{...a,y:525}]]);updateEnemies([a],before,map,w);
 assert.equal(a.lives,3);assert.ok(a.vy<0);assert.deepEqual(w.defeatedEnemies,['duck']);assert.equal(enemyPositions(map,w).length,0);
 assert.equal(enemyPositions(levels[0],createWorld()).length,12);
});
test('side contact causes damage without killing the enemy and prediction replays the same collision',()=>{
 const map={...flat,enemies:[enemy]},w=createWorld(),a={...p(),x:302};
 const result=prediction(a,[{left:false,right:false,jump:false}],map,w,[]);
 tickGroup([a],map,w,{mechanisms:false});assert.equal(a.lives,2);assert.equal(result.state.lives,2);assert.equal(a.x,result.state.x);
 assert.deepEqual(w.defeatedEnemies,[]);
});
test('springs launch a player without costing a life, conveyor belts move grounded cubes',()=>{
 const a=p(),w=createWorld();tickGroup([a],{...flat,springs:[{x:80,y:600,w:50}]},w);
 assert.equal(a.lives,3);assert.equal(a.grounded,false);assert.equal(a.vy,-17);
 const b=p();tick(b,{...flat,belts:[{x:80,y:600,w:100,speed:-1.2}]},w);assert.ok(b.x<90);
 const c={...p(),x:100};const blocked={...flat,platforms:[...flat.platforms,[70,500,30,100]],belts:[{x:95,y:600,w:100,speed:-1.2}]};
 for(let i=0;i<20;i++)tick(c,blocked,w);assert.equal(c.x,100,'belt cannot push an idle cube through a wall');
});
