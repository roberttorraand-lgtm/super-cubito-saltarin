import {test} from 'node:test';
import assert from 'node:assert/strict';
import {levels,soloLevels,newPlayer,tickGroup,createWorld,respawn} from '../game.js';
import {nearbyInteraction,zoneBounds} from '../exploration.js';
import {takeInput,queueInput} from '../transport.js';
const idle={left:false,right:false,jump:false,interact:false};
function step(p,m,w,input=idle,n=1){p.input={...idle,...input};for(let i=0;i<n;i++)tickGroup([p],m,w);}
function climb(p,m,w,x,y){
 for(let i=0;i<150;i++){
  const dx=x-p.x,desired=Math.max(-4.5,Math.min(4.5,dx*.25));
  step(p,m,w,{left:p.vx>desired+.4,right:p.vx<desired-.4,jump:p.grounded?!p.jumpHeld:p.jumpHeld});
  if(p.grounded&&Math.abs(p.y-y)<1&&Math.abs(p.x-x)<20){step(p,m,w,idle,5);return;}
 }
 assert.fail(`cannot reach ledge at ${x},${y}: ${JSON.stringify({x:p.x,y:p.y,lives:p.lives})}`);
}
for(const m of [...levels,...soloLevels]){
 test(`${m.name}: larger route, houses are safe explorable spaces with NPCs inside`,()=>{
  assert.ok(m.overworldWidth>m.originalRouteWidth*1.45);
  for(const h of m.houses){
   const n=m.villagers.find(n=>n.houseId===h.id);assert.ok(n.x>h.room.x&&n.x<h.room.x+h.room.w);
   const p={...newPlayer('a','a','#fff',m),x:h.x-16,y:h.y-32,grounded:true},w=createWorld();
   step(p,m,w,idle,2);assert.equal(p.zone,undefined,'walking past never enters');
   step(p,m,w,{interact:true});assert.equal(p.zone,h.id);assert.equal(p.lives,3);
   step(p,m,w,{interact:true},60);assert.equal(p.zone,h.id,'holding E cannot bounce through a door');
   p.x=n.x-16;p.y=n.y-32;step(p,m,w);step(p,m,w,{interact:true});assert.equal(p.dialogue.name,n.name);const first=p.dialogue.text;
   step(p,m,w);step(p,m,w,{interact:true});assert.notEqual(p.dialogue.text,first);
   p.x=h.room.x+75;p.y=568;step(p,m,w);step(p,m,w,{interact:true});assert.equal(p.zone,null);assert.equal(p.lives,3);assert.ok(Math.abs(p.x-h.return.x)<1);
  }
 });
 test(`${m.name}: hidden alcove and first archive require climbing and examination`,()=>{
  const p={...newPlayer('a','a','#fff',m),x:m.branch.x-70,y:m.branch.y-32,grounded:true},w=createWorld();
  assert.equal(nearbyInteraction(p,m,w),null);
  for(const ledge of m.ledges.slice(0,3))climb(p,m,w,ledge[0]+45,ledge[1]-32);
  // No reward is granted by simply walking through an invisible trigger.
  assert.deepEqual(w.eggs,[]);p.x=m.secret.door.x-16;step(p,m,w);
  step(p,m,w,{interact:true});assert.deepEqual(w.eggs,[m.easterEggs[0].id]);assert.equal(p.zone,undefined);
  step(p,m,w);step(p,m,w,{interact:true});assert.equal(p.zone,'secret');assert.equal(p.lives,3);
 });
}
test('bookcase archive is reachable via the physical loft platforms',()=>{
 for(const m of soloLevels){const h=m.houses[0],w=createWorld(),p={...newPlayer('a','','',m),zone:h.id,x:h.room.x+300,y:568,grounded:true};
  climb(p,m,w,h.room.x+470,468);climb(p,m,w,h.room.x+665,378);
  p.x=h.room.x+690;step(p,m,w);step(p,m,w,{interact:true});assert.ok(w.eggs.includes(m.easterEggs[2].id));assert.equal(p.lives,3);
 }
});
test('falling in a house returns to its own exterior without skipping checkpoints or resetting lives',()=>{
 const m=soloLevels[0],h=m.houses[0],p={...newPlayer('a','','',m),zone:h.id,returnPoint:h.return,checkpoint:0,x:h.room.x+400,y:900},w=createWorld();
 step(p,m,w);assert.equal(p.zone,null);assert.equal(p.x,h.return.x);assert.equal(p.y,h.return.y);assert.equal(p.lives,2);assert.equal(p.checkpoint,0);
});
test('being inside a house after defeating a boss never counts as finishing the level',()=>{
 const m=soloLevels[0],h=m.houses[0],p={...newPlayer('a','','',m),zone:h.id,x:h.room.x+700,y:568,grounded:true},w=createWorld();w.bossDefeated=true;
 step(p,m,w,idle,10);assert.equal(p.finished,false);assert.deepEqual(zoneBounds(m,p),{x:h.room.x,w:1000,title:h.owner});
});
test('a brief interaction survives a burst while held interactions stay edge triggered',()=>{
 const q=[];for(let seq=1;seq<=200;seq++)queueInput(q,{seq,interact:seq===1},false,false);
 assert.equal(takeInput(q,false,false).interact,true);assert.ok(q.length<=3);
 const held=[];for(let seq=1;seq<=200;seq++)queueInput(held,{seq,interact:seq===1},false,true);
 assert.equal(Boolean(takeInput(held,false,true).interact),false);
});

test('the lobby camera can render before any local player exists',()=>{
 const m=levels[0];assert.equal(zoneBounds(m,undefined).w,m.overworldWidth);assert.equal(nearbyInteraction(undefined,m,{}),null);
});

test('secret chamber archives can be reached by climbing around its guardians',()=>{
 for(const m of soloLevels){const w=createWorld(),p={...newPlayer('a','','',m),zone:'secret',x:m.secret.x+150,y:568,grounded:true,returnPoint:m.secret.return};
  climb(p,m,w,m.secret.x+310,463);climb(p,m,w,m.secret.x+520,378);
  step(p,m,w,{interact:true});assert.ok(w.eggs.includes(m.easterEggs[1].id));assert.ok(p.lives>0);
 }
});

test('the ancient statue archive requires the optional upper path and can be examined safely',()=>{
 for(const m of soloLevels){const base=m.platforms[m.routePlatformCount-2],p={...newPlayer('a','','',m),x:base[0]+60,y:base[1]-32,grounded:true},w=createWorld();
  for(const ledge of m.ledges.slice(3))climb(p,m,w,ledge[0]+45,ledge[1]-32);
  const egg=m.easterEggs[3];p.x=egg.x-16;step(p,m,w);step(p,m,w,{interact:true});assert.ok(w.eggs.includes(egg.id));assert.equal(p.lives,3);
 }
});
