import { updateEncounters } from './encounters.js';
// The same deterministic 60 Hz simulation runs on the server and in the browser.
export const STEP_MS = 1000 / 60;
export const SIZE = 32;
import { levels, soloLevels } from './levels.js';
import { updateExploration, zoneBounds } from './exploration.js';
export { levels, soloLevels };
export const level = levels[0];
export function newPlayer(id,name,color,map=level,spawnSlot=0){
  return {id,name,color,...map.spawn,x:map.spawn.x+spawnSlot*44,spawnSlot,vx:0,vy:0,grounded:false,checkpoint:-1,finished:false,deaths:0,lives:3,eliminated:false,invulnerable:0,
    input:{left:false,right:false,jump:false,interact:false},jumpHeld:false,interactHeld:false,coyote:0,jumpBuffer:0,facing:1,supportId:null};
}
export function isComplete(players){return players.length>=2&&players.some(p=>p.finished)&&players.every(p=>p.finished||p.eliminated);}
export function respawn(p,map){
  if(p.eliminated)return;
  p.deaths++;p.lives=Math.max(0,(p.lives??3)-1);
  p.vx=p.vy=0;p.supportId=null;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.dialogue=null;
  if(p.lives===0){p.eliminated=true;p.y=Math.min(map.height-40,p.y);return;}
  if(p.zone==='boss'&&map.boss){p.x=map.boss.x+90+(p.spawnSlot??0)*48;p.y=568;p.invulnerable=120;return;}
  if(p.zone&&p.returnPoint){p.x=p.returnPoint.x;p.y=p.returnPoint.y;p.zone=null;p.returnPoint=null;p.invulnerable=90;return;}
  p.zone=null;p.dialogue=null;
  const point=map.checkpoints[p.checkpoint];
  p.x=point?.x??(map.spawn.x+(p.spawnSlot??0)*44);p.y=point?point.y-SIZE:map.spawn.y;
  p.invulnerable=90;
}
export function tick(p,map=level,world=null){
  if(p.finished||p.eliminated)return;
  p.invulnerable=Math.max(0,(p.invulnerable??0)-1);
  const direction=Number(p.input.right)-Number(p.input.left);
  const icy=p.grounded&&!p.supportId&&(map.iceRegions??[]).some(r=>p.x+16>=r.x&&p.x+16<r.x+r.w);
  const acceleration=p.grounded?(icy?.3:.95):.6;
  if(direction){p.vx+=direction*acceleration;p.facing=direction;}
  else {p.vx*=p.grounded?(icy?.965:.72):.96;if(Math.abs(p.vx)<0.05)p.vx=0;}
  p.vx=Math.max(-5.8,Math.min(5.8,p.vx));
  p.coyote=p.grounded?6:Math.max(0,p.coyote-1);
  p.jumpBuffer=p.input.jump&&!p.jumpHeld?7:Math.max(0,p.jumpBuffer-1);
  if(p.jumpBuffer>0&&p.coyote>0){p.vy=-13.5;p.grounded=false;p.coyote=0;p.jumpBuffer=0;}
  // Releasing early produces a shorter hop; a held jump gives full height.
  if(!p.input.jump&&p.jumpHeld&&p.vy < -5)p.vy=-5;
  p.jumpHeld=p.input.jump;
  p.vy=Math.min(p.vy+(map.gravity??.62),17);
  const solids=solidRects(map,world);
  p.supportId=null;
  const moveX=p.vx+(p.grounded?beltSpeed(p,map):0);
  const bounds=zoneBounds(map,p);
  p.x=Math.max(bounds.x,Math.min(bounds.x+bounds.w-SIZE,p.x+moveX));
  const oneWay=new Set(map.ledges??[]);
  for(const rect of solids){
    if(oneWay.has(rect))continue;
    const [x,y,w,h]=rect;
    if(p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h){
      if(moveX>0)p.x=x-SIZE;else if(moveX<0)p.x=x+w;
      p.vx=0;
    }
  }
  const oldY=p.y;p.y+=p.vy;p.grounded=false;
  for(const rect of solids){
    const [x,y,w,h]=rect;
    if(p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h){
      if(p.vy>=0&&oldY+SIZE<=y+1){p.y=y-SIZE;p.vy=0;p.grounded=true;}
      else if(p.vy<0&&oldY>=y+h-1&&!oneWay.has(rect)){p.y=y+h;p.vy=0;}
    }
  }
  if(p.y>map.height+100||!p.invulnerable&&hitsHazard(p,map,world))respawn(p,map);
  if(p.eliminated)return;
  for(const spring of map.springs??[])if(p.grounded&&p.x+SIZE>spring.x&&p.x<spring.x+spring.w&&Math.abs(p.y+SIZE-spring.y)<3){p.vy=-17;p.grounded=false;p.coyote=0;}
  map.checkpoints.forEach((point,i)=>{
    if(i>p.checkpoint&&p.x>point.x-25&&p.x<point.x+70&&Math.abs(p.y+SIZE-point.y)<12)p.checkpoint=i;
  });
  if((!map.boss||world?.bossDefeated&&p.zone==='boss')&&p.grounded&&p.x>map.goal.x-20&&p.x<map.goal.x+100&&Math.abs(p.y+SIZE-map.goal.y)<45){p.finished=true;p.vx=p.vy=0;}
}

export function createWorld(){return {frame:0,activated:[],charge:{},pressed:[],crumble:{},defeatedEnemies:[]};}
export function solidRects(map,world){
  const active=world?.activated??[];
  return [...map.platforms,...(map.ledges??[]),...(map.blocks??[]).map(b=>b.rect),...(map.crumble??[]).filter(b=>crumbleActive(b,world)).map(b=>b.rect),...(map.gates??[]).filter(g=>!active.includes(g.id)).map(g=>g.rect),
    ...(map.bridges??[]).filter(b=>active.includes(b.id)).map(b=>b.rect)];
}
export function sawPositions(map,world){
  return (map.saws??[]).map(h=>({...h,x:h.x+Math.sin(((world?.frame??0)+h.offset)/h.period*Math.PI*2)*h.range}));
}
function circleHits(p,h){
  const x=Math.max(p.x,Math.min(h.x,p.x+SIZE)),y=Math.max(p.y,Math.min(h.y,p.y+SIZE));
  return (x-h.x)**2+(y-h.y)**2<h.radius**2;
}
export function updateMechanisms(players,map,world){
  const plates=map.plates??[];world.pressed=[];
  const occupants=new Map();
  for(const plate of plates){
    const ids=players.filter(p=>!p.finished&&!p.eliminated&&p.grounded&&Math.abs(p.y+SIZE-plate.y)<3&&p.x+SIZE>plate.x+3&&p.x<plate.x+plate.w-3).map(p=>p.id);
    occupants.set(plate.id,ids);if(ids.length)world.pressed.push(plate.id);
  }
  for(const group of new Set(plates.map(p=>p.group))){
    if(world.activated.includes(group))continue;
    const required=plates.filter(p=>p.group===group);
    // Match a distinct cube to each plate; stacking on one pad never counts twice.
    function match(i,used){if(i===required.length)return true;return occupants.get(required[i].id).some(id=>!used.has(id)&&match(i+1,new Set([...used,id])));}
    world.charge[group]=match(0,new Set())?(world.charge[group]??0)+1:0;
    if(world.charge[group]>=12)world.activated.push(group);
  }
}
function fits(p,x,y,solids,map){
  const bounds=zoneBounds(map,p);
  return x>=bounds.x&&x+SIZE<=bounds.x+bounds.w&&!solids.some(([sx,sy,w,h])=>x+SIZE>sx+.01&&x<sx+w-.01&&y+SIZE>sy+.01&&y<sy+h-.01);
}
export function resolvePlayers(players,previous,map,world){
  const solids=solidRects(map,world),ordered=[...players].sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id));
  // Transport a supported teammate horizontally; vertical motion is resolved below.
  for(const p of ordered){
    const old=previous.get(p.id),support=players.find(other=>other.id===old?.supportId);
    if(!support||support.eliminated||support.finished||p.finished||p.eliminated||p.deaths!==old.deaths||p.vy<0)continue;
    const before=previous.get(support.id);
    if(!before||support.deaths!==before.deaths)continue;
    const x=p.x+support.x-before.x;
    if(fits(p,x,p.y,solids,map))p.x=x;
  }
  for(let pass=0;pass<4;pass++)for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
    const a=ordered[i],b=ordered[j];
    if(a.finished||b.finished||a.eliminated||b.eliminated||a.x+SIZE<=b.x+.001||b.x+SIZE<=a.x+.001||a.y+SIZE<=b.y+.001||b.y+SIZE<=a.y+.001)continue;
    const pa=previous.get(a.id)??a,pb=previous.get(b.id)??b;
    const land=(top,bottom,oldTop,oldBottom)=>{
      if(oldTop.deaths!==top.deaths||oldBottom.deaths!==bottom.deaths||oldTop.y+SIZE>oldBottom.y+3||top.vy<bottom.vy)return false;
      if(!fits(top,top.x,bottom.y-SIZE,solids,map))return false;
      top.y=bottom.y-SIZE;top.vy=Math.min(0,bottom.vy);top.grounded=true;top.supportId=bottom.id;return true;
    };
    if(land(a,b,pa,pb)||land(b,a,pb,pa))continue;
    const [left,right]=a.x<b.x||a.x===b.x&&a.id<b.id?[a,b]:[b,a];
    const overlap=left.x+SIZE-right.x;
    if(overlap<=0)continue;
    const lx=left.x-overlap/2,rx=right.x+overlap/2;
    if(fits(left,lx,left.y,solids,map)&&fits(right,rx,right.y,solids,map)){left.x=lx;right.x=rx;}
    else if(fits(right,right.x+overlap,right.y,solids,map))right.x+=overlap;
    else if(fits(left,left.x-overlap,left.y,solids,map))left.x-=overlap;
    if(left.vx>0)left.vx=0;if(right.vx<0)right.vx=0;
  }
}
export function tickGroup(players,map,world,{mechanisms=true}={}){
  const previous=new Map(players.map(p=>[p.id,{...p}]));world.frame++;
  for(const p of players){p.interactPressed=Boolean(p.input.interact)&&!p.interactHeld;p.interactHeld=Boolean(p.input.interact);tick(p,map,world);}
  resolvePlayers(players,previous,map,world);
  // Collision displacement can move a cube onto a hazard too.
  for(const p of players)if(!p.finished&&!p.eliminated&&!p.invulnerable&&hitsHazard(p,map,world))respawn(p,map);
  updateEnemies(players,previous,map,world);
  updateEncounters(players,previous,map,world,respawn);
  updateExploration(players,map,world);
  if(mechanisms){updateMechanisms(players,map,world);updateCrumble(players,map,world);}
}

export function crumbleActive(tile,world){
 const state=world?.crumble?.[tile.id],frame=world?.frame??0;
 return !state||frame<state.breakAt;
}
export function updateCrumble(players,map,world){
 world.crumble??={};
 for(const tile of map.crumble??[]){
  const state=world.crumble[tile.id];
  if(state&&world.frame>=state.restoreAt){
   const [x,y,w,h]=tile.rect;
   if(!players.some(p=>!p.eliminated&&p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h))delete world.crumble[tile.id];
  }
  if(world.crumble[tile.id])continue;
  const [x,y,w]=tile.rect;
  if(players.some(p=>!p.finished&&!p.eliminated&&p.grounded&&Math.abs(p.y+SIZE-y)<3&&p.x+SIZE>x&&p.x<x+w)){
   world.crumble[tile.id]={breakAt:world.frame+tile.delay,restoreAt:world.frame+tile.delay+tile.restore};
  }
 }
}
export function laserRects(map,world){
 const frame=world?.frame??0;
 return (map.lasers??[]).filter(l=>(frame+l.offset)%l.period<l.on).map(l=>[l.x,l.y,l.w,l.h]);
}

export function hitsHazard(p,map,world){
 return map.spikes.some(([x,y,w,h])=>p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h)
  ||sawPositions(map,world).some(h=>circleHits(p,h))
  ||laserRects(map,world).some(([x,y,w,h])=>p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h);
}

export function beltSpeed(p,map){
 const belt=(map.belts??[]).find(b=>p.x+16>b.x&&p.x+16<b.x+b.w&&Math.abs(p.y+SIZE-b.y)<3);
 return belt?.speed??0;
}
export function enemyPositions(map,world){
 const frame=world?.frame??0,defeated=world?.defeatedEnemies??[];
 return (map.enemies??[]).filter(e=>!defeated.includes(e.id)).map(e=>{
  const phase=(frame+e.offset)/e.period*Math.PI*2;
  return {...e,x:e.x+Math.sin(phase)*e.range,y:e.y+(e.kind==='toaster'?Math.sin(phase*1.5)*12:e.kind==='banana'?-Math.abs(Math.sin(phase))*45:0),facing:Math.cos(phase)>0?1:-1};
 });
}
export function updateEnemies(players,previous,map,world){
 world.defeatedEnemies??=[];
 for(const enemy of enemyPositions(map,world))for(const p of players){
  if(p.finished||p.eliminated||world.defeatedEnemies.includes(enemy.id))continue;
  if(p.x+SIZE<=enemy.x||p.x>=enemy.x+enemy.w||p.y+SIZE<=enemy.y||p.y>=enemy.y+enemy.h)continue;
  const old=previous.get(p.id);
  if(old&&old.deaths===p.deaths&&p.vy>=0&&old.y+SIZE<=enemy.y+12){
   world.defeatedEnemies.push(enemy.id);p.y=enemy.y-SIZE;p.vy=-9;p.grounded=false;p.supportId=null;
  }else if(!p.invulnerable)respawn(p,map);
 }
}
