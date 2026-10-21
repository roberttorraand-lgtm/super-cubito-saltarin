import {test} from 'node:test';
import assert from 'node:assert/strict';
import {levels,newPlayer,createWorld,tickGroup,enemyPositions} from '../game.js';
import {damageEnemy,damageBoss,bossRect,segmentHit} from '../combat.js';
import {bossView} from '../encounters.js';
import {prediction} from '../public/netcode.js';
import {queueInput,takeInput} from '../transport.js';
const flat={...levels[0],width:3000,overworldWidth:3000,platforms:[[0,600,3000,120]],ledges:[],spikes:[],blocks:[],gates:[],plates:[],bridges:[],saws:[],lasers:[],crumble:[],iceRegions:[],springs:[],enemies:[],houses:[],villagers:[],easterEggs:[],boss:null,checkpoints:[],goal:{x:2900,y:600}};
const player=(id='a',x=100)=>({...newPlayer(id,id,'#fff',flat),x,y:568,grounded:true});
function step(ps,w,input={},n=1,map=flat){for(const p of ps)p.input={left:false,right:false,jump:false,interact:false,use:false,power:p.power,...(p.id==='a'?input:{})};for(let i=0;i<n;i++)tickGroup(ps,map,w);}
const target={id:'enemy',kind:'capy',x:300,y:568,w:34,h:32,range:0,offset:0,period:240,combat:{type:'charger',hp:3}};
test('shotgun tap, 59 frames and 60 frames use the correct projectile and fire on release',()=>{
 for(const n of [1,59,60,90]){const p=player(),w=createWorld();step([p],w,{use:true},n);assert.equal(w.projectiles.length,0);step([p],w);assert.equal(w.projectiles.length,1);assert.equal(w.projectiles[0].kind,n>=60?'explosive':'pellet');assert.equal(p.charge,0);step([p],w,{},10);assert.equal(w.projectiles.length,1);}
});
test('weak shots damage multi-hit enemies and charged explosions defeat them',()=>{
 for(const charged of [false,true]){const m={...flat,enemies:[structuredClone(target)]},p=player(),w=createWorld();step([p],w,{use:true},charged?60:1,m);step([p],w,{},25,m);assert.equal(w.defeatedEnemies.includes('enemy'),charged);if(!charged)assert.equal(w.enemyStates.enemy.hp,2);}
});
test('friendly pellets and explosive splash never damage allies or the shooter',()=>{
 const m={...flat,blocks:[{rect:[300,350,30,250],type:'wall'}]};
 for(const n of [1,60]){const p=player(),ally=player('ally',230),w=createWorld();step([p,ally],w,{use:true},n,m);step([p,ally],w,{},40,m);assert.equal(p.lives,3);assert.equal(ally.lives,3);assert.equal(ally.deaths,0);}
});
test('jetpack consumes finite fuel, cannot be refilled by switching and recharges only while resting',()=>{
 const p=player(),w=createWorld();step([p],w,{power:2,use:true},90);assert.equal(p.fuel,90);assert.ok(p.y<400);step([p],w,{power:1});step([p],w,{power:2,use:true});assert.equal(p.fuel,89);step([p],w,{power:2,use:true},100);assert.equal(p.fuel,0);assert.equal(p.thrust,false);assert.ok(p.y>=100);step([p],w,{power:2},180);assert.equal(p.fuel,180);assert.equal(p.y,568);
});
test('banana throw lands as a finite slippery zone affecting allies without damage',()=>{
 const p=player(),w=createWorld();step([p],w,{power:3,use:true});assert.equal(w.projectiles[0].kind,'banana');step([p],w,{},80);assert.equal(w.puddles.length,1);const a=w.puddles[0];assert.equal(a.y,600);const ally=player('ally',a.x+20),normal=player('normal',a.x+20);ally.vx=normal.vx=5;const plain=createWorld();step([ally],w,{},10);step([normal],plain,{},10);assert.ok(ally.vx>normal.vx+2);assert.equal(ally.lives,3);step([p],w,{},430);assert.equal(w.puddles.length,0);
});
test('banana cancels enemy windups, causes a skid and opens a boss vulnerability window',()=>{
 const m={...flat,enemies:[structuredClone(target)]},p=player(),w=createWorld();w.puddles=[{id:9,x:290,y:600,w:150,until:1000}];step([p],w,{},1,m);assert.equal(w.enemyStates.enemy.phase,'slipping');assert.ok(w.enemyStates.enemy.x!==target.x);
 const b={...levels[0],enemies:[]},q={...player(),x:b.boss.x+300,zone:'boss'},v=createWorld();v.boss={started:true,hp:3,tick:10,open:0,charge:0};v.puddles=[{id:3,x:b.boss.x+470,y:600,w:160,until:1000}];step([q],v,{},1,b);assert.ok(v.boss.open>0);assert.ok(v.boss.slideX!==0);assert.equal(bossView(b,v).hazards.length,0);assert.equal(bossRect(b,v)[0],b.boss.x+498+v.boss.slideX);
});
test('boss shields block bullets, exposed bosses accept damage with a shared hit cooldown',()=>{
 const w=createWorld();w.boss={started:true,hp:3,open:0};assert.equal(damageBoss(w,1),false);w.boss.open=100;assert.equal(damageBoss(w,.25),true);assert.equal(w.boss.hp,2.75);assert.equal(damageBoss(w,1),false);w.frame=16;assert.equal(damageBoss(w,1),true);assert.equal(w.boss.hp,1.75);
});
test('guardian front armor blocks weak shots while recovery and explosions bypass it',()=>{
 const e={...target,combat:{type:'guardian',hp:3},facing:-1},w=createWorld();w.enemyStates={enemy:{hp:3,phase:'windup',facing:-1}};assert.equal(damageEnemy(w,e,1,{vx:13}),false);assert.equal(damageEnemy(w,e,1,{vx:-13}),true);w.frame=12;w.enemyStates.enemy.phase='recover';assert.equal(damageEnemy(w,e,1,{vx:13}),true);w.frame=24;assert.equal(damageEnemy(w,e,3,{explosive:true}),true);assert.ok(w.defeatedEnemies.includes(e.id));
});
test('advanced enemies telegraph before attacking and recover between distinct attack patterns',()=>{
 for(const type of ['charger','guardian','gunner']){const e={...target,combat:{type,hp:3}},m={...flat,enemies:[e]},p=player(),w=createWorld();step([p],w,{},44,m);assert.equal(w.enemyStates.enemy.phase,'patrol');assert.equal(w.projectiles.length,0);step([p],w,{},1,m);assert.equal(w.enemyStates.enemy.phase,'windup');step([p],w,{},60,m);assert.equal(w.enemyStates.enemy.phase,'attack');step([p],w,{},2,m);if(type==='gunner')assert.equal(w.projectiles.length,3);if(type==='guardian')assert.equal(w.projectiles.length,2);if(type==='charger')assert.ok(w.enemyStates.enemy.x>300||w.enemyStates.enemy.x<300);step([p],w,{},58,m);assert.equal(w.enemyStates.enemy.phase,'recover');}
});
test('prediction replays charge, selection, flying and grenade physics identically to authority',()=>{
 for(const power of [1,2,3]){const a=player(),w=createWorld(),pending=[];for(let seq=1;seq<=80;seq++)pending.push({seq,power,use:seq<70,left:false,right:seq<40,jump:false});const predicted=prediction(a,pending,flat,w,[]),server=structuredClone(a),state=structuredClone(w);for(const input of pending){server.input=input;tickGroup([server],flat,state);}assert.deepEqual(predicted.state,server);assert.deepEqual(predicted.world.projectiles,state.projectiles);assert.deepEqual(predicted.world.puddles,state.puddles);}
});
test('short use presses and releases survive network bursts',()=>{
 for(const held of [false,true]){const q=[];for(let seq=1;seq<=200;seq++)queueInput(q,{seq,use:seq===1?!held:held},false,false,held);assert.equal(takeInput(q,false,false,held).use,!held);}
});
test('swept projectile collision prevents tunneling through a narrow wall',()=>{
 assert.ok(segmentHit(100,580,160,580,[125,500,3,100],4)<1);assert.equal(segmentHit(100,480,160,480,[125,500,3,100],4),Infinity);
});
test('banana also makes ordinary ground enemies skid instead of only affecting advanced enemies',()=>{
 const e={...target,combat:undefined},m={...flat,enemies:[e]},p=player(),w=createWorld();w.puddles=[{id:2,x:290,y:600,w:150,until:1000}];step([p],w,{},1,m);assert.equal(w.enemyStates.enemy.phase,'slipping');assert.ok(enemyPositions(m,w)[0].x>e.x);assert.equal(w.defeatedEnemies.length,0);
});
test('projectiles, banana pools and explosions remain bounded during sustained combat',()=>{
 const p=player(),w=createWorld();for(let i=0;i<2500;i++)step([p],w,{power:i%180<90?1:3,use:i%4<2});assert.ok(w.projectiles.length<=48);assert.ok(w.puddles.length<=8);assert.ok(w.explosions.length<=12);
});
