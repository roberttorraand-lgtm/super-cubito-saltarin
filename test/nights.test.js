import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NIGHTS,nightRules,powerState,campaignProgress,completeNight} from '../shared/nights.js';
import {newWorld,newPlayer,step,snapshot,restore,DT} from '../shared/simulation.js';
import {HostSession} from '../shared/host-session.js';

test('five nights escalate actual speed, wake times, hearing and resource pressure',()=>{
 assert.equal(NIGHTS.length,5);
 for(let i=1;i<5;i++){
  assert.ok(NIGHTS[i].speed>NIGHTS[i-1].speed);
  assert.ok(NIGHTS[i].drain>NIGHTS[i-1].drain);
  assert.ok(NIGHTS[i].breathing<NIGHTS[i-1].breathing);
  NIGHTS[i].awake.forEach((time,j)=>assert.ok(time<=NIGHTS[i-1].awake[j]));
 }
 const results=NIGHTS.map(n=>{
  const w=newWorld(n.id),p=newPlayer('p','P');w.enemies=[];p.x=0;p.z=0;p.phone=true;w.doors.security.closed=true;step(w,[p],1);return {battery:p.battery,door:w.doors.security.power};
 });
 for(let i=1;i<5;i++){assert.ok(results[i].battery<results[i-1].battery);assert.ok(results[i].door<results[i-1].door);}
});
test('every night keeps the full preparation; night five wakes all four at midnight',()=>{
 for(const n of NIGHTS){const w=newWorld(n.id),p=newPlayer('p','P'),positions=w.enemies.map(e=>[e.x,e.z]);w.elapsed=119;step(w,[p]);assert.deepEqual(w.enemies.map(e=>[e.x,e.z]),positions);assert.ok(w.enemies.every(e=>e.state==='dormant'));assert.equal(w.power.active,false);}
 const w=newWorld(5),p=newPlayer('p','P');w.elapsed=120;step(w,[p]);assert.ok(w.enemies.every(e=>e.state!=='dormant'));assert.equal(p.alive,true);
});
test('blackouts warn first, have bounded duration and disable charging without opening powered doors',()=>{
 assert.equal(powerState(3,291).warning,false);assert.equal(powerState(3,292).warning,true);
 assert.equal(powerState(3,300).active,true);assert.equal(powerState(3,315).remaining,1);assert.equal(powerState(3,316).active,false);
 for(const n of [1,2])assert.equal(powerState(n,600).active,false);
 const w=newWorld(3),p=newPlayer('p','P');w.enemies=[];w.elapsed=299.99;p.x=-11;p.z=-8.8;p.battery=25;p.flashlight=false;p.input={interact:true};w.doors.security={closed:true,power:50};w.doors.manager.power=50;
 step(w,[p]);assert.equal(w.power.active,true);assert.equal(p.battery,25);assert.equal(w.doors.security.closed,true);assert.equal(w.doors.manager.power,50);
 w.elapsed=315.99;p.input={};step(w,[p]);assert.equal(w.power.active,false);assert.ok(p.battery>25);assert.ok(w.doors.manager.power>50);
});
test('later nights produce faster pursuit and shorter flashlight stuns in the simulation',()=>{
 function chase(n){const w=newWorld(n),p=newPlayer('p','P');w.elapsed=500;w.enemies=w.enemies.filter(e=>e.id==='welder');const e=w.enemies[0];e.x=0;e.z=0;p.x=0;p.z=3;p.flashlight=false;step(w,[p]);return Math.hypot(e.x,e.z);}
 assert.ok(chase(5)>chase(1));
 function stun(n){const w=newWorld(n),p=newPlayer('p','P');w.elapsed=500;w.enemies=w.enemies.filter(e=>e.id==='prisma');const e=w.enemies[0];e.x=0;e.z=0;p.x=0;p.z=3;p.yaw=0;step(w,[p]);assert.equal(e.state,'stunned');return e.stun-w.elapsed;}
 assert.ok(stun(5)<stun(1));
});
test('the welder shares a last seen position only on nights four and five',()=>{
 for(const night of [3,4,5]){const w=newWorld(night),p=newPlayer('p','P');w.elapsed=500;const e=w.enemies.find(e=>e.id==='welder');e.x=0;e.z=0;p.x=0;p.z=3;p.flashlight=false;step(w,[p]);assert.equal(!!w.alert,night>=4);if(w.alert)assert.deepEqual([w.alert.x,w.alert.z],[p.x,p.z]);}
});
test('saves preserve the chosen night, blackout phase and refill cooldown; old saves remain night one',()=>{
 const w=newWorld(5),p=newPlayer('p','P');w.elapsed=365;p.refillAt=410;p.stamina=37;const copy=restore(snapshot(w,[p]));assert.equal(copy.world.night,5);assert.equal(copy.world.power.active,true);assert.equal(copy.players[0].refillAt,410);assert.equal(copy.players[0].stamina,37);
 const old=snapshot(newWorld(),[p]);delete old.world.night;assert.equal(restore(old).world.night,1);
 old.world.night=6;assert.throws(()=>restore(old),/Noche/);
});
test('campaign unlocks one night per victory, retains replays and completes at five',()=>{
 let p=campaignProgress(null);assert.equal(p.unlocked,1);
 for(let n=1;n<=5;n++){p=completeNight(p,n);assert.equal(p.unlocked,Math.min(5,n+1));assert.equal(p.completed.length,n);p=campaignProgress(JSON.parse(JSON.stringify(p)));}
 assert.equal(completeNight(p,5).completed.length,5);
 assert.deepEqual(campaignProgress({completed:[-1,0,1,1,9,'2']}),{version:1,completed:[1],unlocked:2});
 assert.equal(campaignProgress({completed:[5]}).unlocked,1);
});
test('host choice is authoritative for all guests and survives a co-op save',()=>{
 const game=new HostSession('NIGHTS',null,4);game.join('host','H');game.join('guest','G');game.command('guest',{type:'night',night:1});assert.equal(game.state().world.night,4);game.command('host',{type:'start'});game.tick();const save=game.command('host',{type:'save'}).data;assert.equal(new HostSession('RESUME',save,1).world.night,4);assert.equal(nightRules(game.state().world.night).teamwork,true);
});
