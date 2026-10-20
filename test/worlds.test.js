import {test} from 'node:test';
import assert from 'node:assert/strict';
import {levels,newPlayer,tick,tickGroup,createWorld,solidRects,crumbleActive,updateCrumble,laserRects,hitsHazard} from '../game.js';
import {prediction} from '../public/netcode.js';

test('four authored worlds have distinct layouts and exclusive obstacle families',()=>{
 assert.equal(new Set(levels.map(m=>JSON.stringify(m.platforms))).size,4);
 assert.ok(levels[0].blocks.length>0);assert.equal(levels[0].saws.length,0);
 assert.equal(levels[1].bridges.length,2);assert.ok(levels[1].saws.length>0);
 assert.ok(levels[2].crumble.length>0&&levels[2].iceRegions.length>0);
 assert.ok(levels[3].gravity<levels[0].gravity&&levels[3].lasers.length>0);
 for(const map of levels){
  for(const cp of map.checkpoints){assert.ok(map.platforms.some(([x,y,w])=>cp.x>=x&&cp.x+32<=x+w&&cp.y===y));}
  for(const [x,y,w,h] of [...map.platforms,...map.blocks.map(b=>b.rect)])assert.ok(x>=0&&x+w<=map.width&&w>0&&h>0&&y>=0);
 }
});
const flat={...levels[0],width:3000,platforms:[[0,600,3000,120]],gates:[],plates:[],blocks:[],spikes:[],saws:[],bridges:[],checkpoints:[],crumble:[],lasers:[],goal:{x:2900,y:600}};
function grounded(map){const p=newPlayer('p','p','#fff',map);p.y=568;p.grounded=true;return p;}
test('ice changes braking and traction, while safe ground remains responsive',()=>{
 const normal=grounded(flat),icy=grounded(flat),ice={...flat,iceRegions:[{x:0,w:3000}]};normal.vx=icy.vx=5;
 for(let i=0;i<10;i++){tick(normal,flat);tick(icy,ice);}
 assert.ok(icy.x-normal.x>20);assert.ok(icy.vx>3);assert.ok(normal.vx<.3);
 normal.vx=icy.vx=0;normal.input.right=icy.input.right=true;tick(normal,flat);tick(icy,ice);
 assert.ok(normal.vx>icy.vx);
});
test('lunar gravity produces a longer and higher jump with identical inputs',()=>{
 const earth=grounded(flat),moon=grounded(flat),lunar={...flat,gravity:levels[3].gravity};
 earth.input.jump=moon.input.jump=true;let minEarth=568,minMoon=568;
 for(let i=0;i<70;i++){tick(earth,flat);tick(moon,lunar);minEarth=Math.min(minEarth,earth.y);minMoon=Math.min(minMoon,moon.y);}
 assert.ok(minMoon<minEarth-80);assert.equal(earth.grounded,true);assert.ok(moon.y<568);
});
test('fragile ice breaks after contact, removes its collision and regrows safely',()=>{
 const map=levels[2],tile=map.crumble[0],[x,y]=tile.rect,w=createWorld();
 const p={...grounded(map),x:x+10,y:y-32};
 updateCrumble([p],map,w);assert.ok(w.crumble[tile.id]);
 w.frame=tile.delay-1;assert.equal(crumbleActive(tile,w),true);
 w.frame=tile.delay;assert.equal(crumbleActive(tile,w),false);assert.equal(solidRects(map,w).includes(tile.rect),false);
 tick(p,map,w);assert.equal(p.grounded,false);assert.ok(p.y>y-32);
 w.frame=tile.delay+tile.restore;updateCrumble([{...p,y:y-15}],map,w);
 assert.equal(crumbleActive(tile,w),false,'do not materialize inside a cube');
 updateCrumble([],map,w);assert.equal(crumbleActive(tile,w),true);
 updateCrumble([{...p,y:y-32,grounded:true}],map,w);assert.equal(w.crumble[tile.id].breakAt,w.frame+tile.delay,'can break again');
});
test('lunar energy barriers alternate collision with the same server clock used for display',()=>{
 const map=levels[3],barrier=map.lasers[0],w=createWorld();w.frame=barrier.period-barrier.offset;
 const p={...grounded(map),x:barrier.x,y:barrier.y+20};
 assert.ok(laserRects(map,w).some(r=>r[0]===barrier.x));assert.equal(hitsHazard(p,map,w),true);
 w.frame+=barrier.on;assert.equal(hitsHazard(p,map,w),false);
});
test('server and client replay agree on the new environmental physics',()=>{
 for(const original of [levels[2],levels[3]]){
  const map={...flat,gravity:original.gravity,iceRegions:original.iceRegions.length?[{x:0,w:3000}]:[]};
  const auth=grounded(map),w=createWorld(),pending=[];
  for(let seq=1;seq<=20;seq++)pending.push({seq,left:false,right:true,jump:seq>=8});
  const result=prediction(auth,pending,map,w,[]),server=structuredClone(auth),world=structuredClone(w);
  for(const frame of pending){server.input=frame;tickGroup([server],map,world,{mechanisms:false});}
  assert.equal(result.state.x,server.x);assert.equal(result.state.y,server.y);
 }
});
