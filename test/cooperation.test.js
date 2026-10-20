import { test } from 'node:test';
import assert from 'node:assert/strict';
import { level,levels,newPlayer,tickGroup,tick,createWorld,updateMechanisms,solidRects,sawPositions } from '../game.js';
import { prediction, predictFrame } from '../public/netcode.js';
const flat={...level,width:1200,platforms:[[0,600,1200,120]],spikes:[],saws:[],checkpoints:[],gates:[],plates:[],bridges:[],goal:{x:1100,y:600}};
function actor(id,x,y=568){return {...newPlayer(id,id,'#fff',flat),x,y,grounded:true};}
function steps(ps,map,w,n=60){for(let i=0;i<n;i++)tickGroup(ps,map,w);}
function overlapping(a,b){return a.x+32>b.x+.01&&a.x<b.x+32-.01&&a.y+32>b.y+.01&&a.y<b.y+32-.01;}
test('falling cube lands on a teammate and can jump from their head',()=>{
 const bottom=actor('b',200),top=actor('a',200,450),w=createWorld();top.grounded=false;
 steps([bottom,top],flat,w);
 assert.equal(top.y,bottom.y-32);assert.equal(top.supportId,bottom.id);assert.equal(top.grounded,true);
 top.input.jump=true;tickGroup([bottom,top],flat,w);assert.ok(top.vy<0);assert.equal(top.supportId,null);
});
test('four-cube tower remains stable and travels with its base',()=>{
 const ps=[actor('base',100),actor('second',100,536),actor('third',100,504),actor('fourth',100,472)],w=createWorld();
 steps(ps,flat,w,120);
 for(let i=1;i<4;i++){assert.equal(ps[i].y,568-i*32);assert.equal(ps[i].supportId,ps[i-1].id);}
 const before=ps.map(p=>p.x);ps[0].input.right=true;steps(ps,flat,w,30);
 for(let i=0;i<4;i++)assert.ok(ps[i].x>before[i]+80,JSON.stringify(ps));
 for(let i=1;i<4;i++)assert.ok(Math.abs(ps[i].x-ps[0].x)<1);
});
test('side contact and simultaneous respawns do not overlap or pass through a wall',()=>{
 const map={...flat,platforms:[...flat.platforms,[250,400,40,200]]},w=createWorld();
 const a=actor('a',185),b=actor('b',218);a.input.right=true;
 steps([a,b],map,w,90);
 assert.ok(a.x+32<=b.x+.01);assert.ok(b.x+32<=250+.01);assert.equal(overlapping(a,b),false);
 const c=actor('c',90),d=actor('d',90);steps([c,d],flat,createWorld(),30);assert.equal(overlapping(c,d),false);
});
test('support disappears cleanly when teammate leaves or respawns',()=>{
 const a=actor('a',200,536),b=actor('b',200),w=createWorld();steps([a,b],flat,w,5);assert.equal(a.supportId,'b');
 steps([a],flat,w,60);assert.equal(a.supportId,null);assert.equal(a.y,568);
});
test('solo full-height jump cannot clear the cooperative tower gate',()=>{
 for(const map of levels){
  const p=actor('solo',300);p.input.jump=true;p.input.right=true;
  const world=createWorld();for(let i=0;i<100;i++)tickGroup([p],map,world);
  assert.ok(p.x+32<=map.gates[0].rect[0]+.01);assert.equal(world.activated.includes('tower'),false);
 }
});
test('two separate plates need distinct teammates; mechanisms latch and reset with a new world',()=>{
 const map=levels[0],w=createWorld(),pads=map.plates.filter(p=>p.group==='bridge');
 const a=actor('a',pads[0].x,pads[0].y-32),b=actor('b',pads[0].x+5,pads[0].y-32);
 for(let i=0;i<20;i++)updateMechanisms([a,b],map,w);
 assert.equal(w.activated.includes('bridge'),false);
 b.x=pads[1].x;b.y=pads[1].y-32;
 for(let i=0;i<11;i++)updateMechanisms([a,b],map,w);assert.equal(w.activated.includes('bridge'),false);
 updateMechanisms([a,b],map,w);assert.equal(w.activated.includes('bridge'),true);
 updateMechanisms([],map,w);assert.equal(w.activated.includes('bridge'),true);
 assert.ok(solidRects(map,w).includes(map.bridges[0].rect));
 assert.equal(solidRects(map,createWorld()).includes(map.bridges[0].rect),false);
});
test('plate occupation is physical: airborne cubes do not activate a pad',()=>{
 const map=levels[0],plate=map.plates[0],w=createWorld(),a=actor('a',plate.x,plate.y-32);a.grounded=false;
 for(let i=0;i<20;i++)updateMechanisms([a],map,w);assert.deepEqual(w.activated,[]);
 a.grounded=true;for(let i=0;i<12;i++)updateMechanisms([a],map,w);assert.deepEqual(w.activated,['tower']);
 assert.equal(solidRects(map,w).includes(map.gates[0].rect),false);
});
test('moving saws change position and cause authoritative respawns',()=>{
 const map=levels[0],w=createWorld(),a=actor('a',0),saw=sawPositions(map,w)[0];
 assert.notEqual(saw.x,sawPositions(map,{...w,frame:60})[0].x);
 a.x=saw.x-16;a.y=saw.y-16;tick(a,map,w);assert.equal(a.deaths,1);
});
test('network replay preserves teammate support without opening unconfirmed mechanisms',()=>{
 const map=levels[0],w=createWorld(),base=actor('b',300),top=actor('a',300,536);steps([base,top],map,w,5);
 const result=prediction(top,[],map,w,[base]);assert.equal(result.state.supportId,'b');
 result.state.input={left:false,right:false,jump:false};predictFrame(result.state,result.ghosts,map,result.world);
 assert.equal(result.state.y,536);assert.equal(result.state.supportId,'b');assert.deepEqual(result.world.activated,[]);
});
test('jumping under a low ceiling does not push a stacked cube inside scenery',()=>{
 const map={...flat,platforms:[...flat.platforms,[160,490,120,10]]},w=createWorld();
 const top=actor('a',200,536),base=actor('b',200);base.input.jump=true;
 for(let i=0;i<90;i++){
  tickGroup([top,base],map,w);
  for(const p of [top,base])assert.equal(map.platforms.some(([x,y,width,height])=>p.x+32>x+.01&&p.x<x+width-.01&&p.y+32>y+.01&&p.y<y+height-.01),false);
 }
});
