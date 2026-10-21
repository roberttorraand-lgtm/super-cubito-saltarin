import {test} from 'node:test';
import assert from 'node:assert/strict';
import {levels,newPlayer,createWorld,tickGroup,respawn,tick} from '../game.js';
import {updateEncounters,bossView} from '../encounters.js';
const player=(m,id,x)=>({...newPlayer(id,id,'#fff',m),x,y:568,grounded:true,zone:'boss'});
function update(ps,m,w){updateEncounters(ps,new Map(ps.map(p=>[p.id,{...p}])),m,w,respawn);}
for(const m of levels){
 test(`${m.name}: secret entrance, reward and return preserve lives`,()=>{
  const p=player(m,'a',m.secret.door.x);p.zone=null;p.y=m.secret.door.y-32;const w=createWorld();update([p],m,w);
  assert.equal(p.zone,'secret');assert.equal(p.lives,3);
  p.x=m.secret.x+815;p.portalCooldown=0;update([p],m,w);
  assert.equal(p.zone,null);assert.equal(p.lives,3);assert.equal(p.invulnerable,180);assert.deepEqual(w.secrets,['a']);
 });
 test(`${m.name}: castle waits for team, locks exit and preserves arena respawn`,()=>{
  const a=player(m,'a',m.overworldEnd.x),b=player(m,'b',m.spawn.x);a.zone=b.zone=null;a.y=m.overworldEnd.y-32;
  const w=createWorld();update([a,b],m,w);assert.equal(a.zone,'boss');assert.equal(w.boss.started,false);
  b.x=m.overworldEnd.x;b.y=m.overworldEnd.y-32;update([a,b],m,w);assert.equal(w.boss.started,true);
  a.x=m.goal.x;a.grounded=true;tick(a,m,w);assert.equal(a.finished,false);
  respawn(a,m);assert.equal(a.zone,'boss');assert.equal(a.lives,2);assert.ok(a.x>=m.boss.x);
  w.bossDefeated=true;a.x=m.goal.x;a.y=568;a.vy=0;tick(a,m,w);assert.equal(a.finished,true);
 });
 test(`${m.name}: telegraphs precede deterministic damaging attacks`,()=>{
  const w=createWorld();w.boss={started:true,hp:3,tick:80,open:0};assert.ok(bossView(m,w).warnings.length);
  w.boss.tick=125;assert.ok(bossView(m,w).hazards.length);
  w.boss.open=100;assert.equal(bossView(m,w).hazards.length,0);
 });
 test(`${m.name}: exposed boss takes one stomp and three hits unlock exit`,()=>{
  const w=createWorld();w.boss={started:true,hp:3,tick:0,open:100,charge:0};const a=player(m,'a',m.boss.x+540);
  for(let hit=0;hit<3;hit++){
   w.boss.open=100;a.y=450;a.vy=3;
   updateEncounters([a],new Map([['a',{...a,y:440}]]),m,w,respawn);
   assert.equal(w.boss.hp,2-hit);
  }
  assert.equal(w.bossDefeated,true);assert.equal(a.lives,3);
 });
}
test('each shield has its own cooperative mechanism',()=>{
 for(const m of levels){
  const a=player(m,'a',m.boss.x+164),b=player(m,'b',m.boss.x+884),w=createWorld();
  w.boss={started:true,hp:3,tick:60,open:0,charge:0};
  if(m.id===0){for(let i=0;i<24;i++)update([a,b],m,w);}
  if(m.id===1){a.x=m.boss.x+264;b.x=m.boss.x+784;a.vy=b.vy=0;const prev=new Map([['a',{...a,vy:-1}],['b',{...b,vy:-1}]]);updateEncounters([a,b],prev,m,w,respawn);}
  if(m.id===2){a.y=b.y=490;a.vy=b.vy=-4;a.grounded=b.grounded=false;update([a,b],m,w);}
  if(m.id===3){a.x=m.boss.x+264;a.y=536;a.supportId=b.id;update([a,b],m,w);}
  assert.ok(w.boss.open>0,`${m.id} opens`);
 }
});
test('client prediction and authority agree across portal transitions',()=>{
 const m=levels[0],a=player(m,'a',m.secret.door.x);a.zone=null;a.y=m.secret.door.y-32;
 const b=structuredClone(a),w=createWorld(),v=createWorld();
 tickGroup([a],m,w);tickGroup([b],m,v,{mechanisms:false});assert.deepEqual(a,b);assert.deepEqual(w.boss,v.boss);assert.deepEqual(w.secrets,v.secrets);
});
test('a normal jump reaches and damages every exposed boss without position corrections',()=>{
 for(const m of levels){
  const a=player(m,'a',m.boss.x+530),w=createWorld();
  w.boss={started:true,hp:3,tick:0,open:210,charge:0};
  a.input.jump=true;
  for(let i=0;i<100&&w.boss.hp===3;i++)tickGroup([a],m,w);
  assert.equal(w.boss.hp,2,`ordinary jump reaches boss ${m.id}`);assert.equal(a.lives,3);
 }
});
