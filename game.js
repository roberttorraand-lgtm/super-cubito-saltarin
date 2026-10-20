// The same deterministic 60 Hz simulation runs on the server and in the browser.
export const STEP_MS = 1000 / 60;
export const SIZE = 32;
const themes = [
  { sky: ['#bfe8ef','#f4f4d3'], hills: ['#b1d6b0','#82b390','#527f70'], ground:'#527d68', grass:'#abe179', dirt:'#729274', accent:'#f5d47c', glow:'#fff2b9' },
  { sky: ['#d1b6de','#ffdfb0'], hills: ['#c39cbd','#9c7d9e','#6f627f'], ground:'#76617b', grass:'#e6ac78', dirt:'#9e7c8e', accent:'#ffda8b', glow:'#fff0b4' },
  { sky: ['#a5c8ef','#e9f7ff'], hills: ['#b0cde5','#7fabc9','#537b9e'], ground:'#648da7', grass:'#e4faff', dirt:'#86a9bf', accent:'#88f1e4', glow:'#d9ffff' },
  { sky: ['#171e43','#61557f'], hills: ['#4e4b79','#3b3c67','#292d51'], ground:'#535078', grass:'#b7a5ef', dirt:'#71638d', accent:'#baf8dd', glow:'#e8daff' }
];
const specs = [
  ['Pradera de los encuentros','Entre hojas y pequeños comienzos',12,0],
  ['Cañón del atardecer','Un camino sobre el cielo naranja',14,1],
  ['Cumbres de cristal','Respira hondo. El cielo está cerca.',16,2],
  ['Jardines de la luna','El último salto se da en compañía',18,3]
];
export const levels = specs.map(([name,subtitle,count,theme],index)=>{
  const platforms=[],spikes=[],checkpoints=[{x:210,y:600}];
  let bridge;
  const saws=[];
  let x=0;
  for(let i=0;i<count;i++){
    const width=i===0?560:440+((i*7+index*3)%4)*40;
    const y=i===0?600:600-((i+index)%3)*25;
    platforms.push([x,y,width,720-y]);
    // Wide, distinct islands leave space to land before the next obstacle.
    if(i>0 && i!==4 && (i+index)%2===0)spikes.push([x+180,y-20,48+index*5,20]);
    if(i>0&&i%3===0)checkpoints.push({x:x+65,y});
    const gap=i===count-1?0:i===3?330:80+((i+index)%3)*15;
    if(i===3)bridge={id:'bridge',rect:[x+width,y,gap,24]};
    if(i===5||i===9)saws.push({x:x+width*.5,y:y-28,range:85,radius:17,period:210-index*15,offset:i*29});
    x+=width+gap;
  }
  const last=platforms.at(-1);
  const gates=[{id:'tower',rect:[370,444,42,156]}];
  const plates=[{id:'release',group:'tower',x:465,y:600,w:46},
    {id:'bridge-a',group:'bridge',x:bridge.rect[0]-170,y:bridge.rect[1],w:44},
    {id:'bridge-b',group:'bridge',x:bridge.rect[0]-85,y:bridge.rect[1],w:44}];
  return {id:index,name,subtitle,theme:themes[theme],width:x,height:720,spawn:{x:90,y:568},platforms,spikes,checkpoints,gates,plates,bridges:[bridge],saws,goal:{x:x-100,y:last[1]}};
});
export const level = levels[0];
export function newPlayer(id,name,color,map=level,spawnSlot=0){
  return {id,name,color,...map.spawn,x:map.spawn.x+spawnSlot*44,spawnSlot,vx:0,vy:0,grounded:false,checkpoint:-1,finished:false,deaths:0,
    input:{left:false,right:false,jump:false},jumpHeld:false,coyote:0,jumpBuffer:0,facing:1,supportId:null};
}
export function isComplete(players){return players.length>=2&&players.every(p=>p.finished);}
export function respawn(p,map){
  const point=map.checkpoints[p.checkpoint];
  p.x=point?.x??(map.spawn.x+(p.spawnSlot??0)*44);p.y=point?point.y-SIZE:map.spawn.y;
  p.vx=p.vy=0;p.supportId=null;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.deaths++;
}
export function tick(p,map=level,world=null){
  if(p.finished)return;
  const direction=Number(p.input.right)-Number(p.input.left);
  const acceleration=p.grounded?0.95:0.6;
  if(direction){p.vx+=direction*acceleration;p.facing=direction;}
  else {p.vx*=p.grounded?0.72:0.96;if(Math.abs(p.vx)<0.05)p.vx=0;}
  p.vx=Math.max(-5.8,Math.min(5.8,p.vx));
  p.coyote=p.grounded?6:Math.max(0,p.coyote-1);
  p.jumpBuffer=p.input.jump&&!p.jumpHeld?7:Math.max(0,p.jumpBuffer-1);
  if(p.jumpBuffer>0&&p.coyote>0){p.vy=-13.5;p.grounded=false;p.coyote=0;p.jumpBuffer=0;}
  // Releasing early produces a shorter hop; a held jump gives full height.
  if(!p.input.jump&&p.jumpHeld&&p.vy < -5)p.vy=-5;
  p.jumpHeld=p.input.jump;
  p.vy=Math.min(p.vy+0.62,17);
  const solids=solidRects(map,world);
  p.supportId=null;
  p.x=Math.max(0,Math.min(map.width-SIZE,p.x+p.vx));
  for(const [x,y,w,h] of solids){
    if(p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h){
      if(p.vx>0)p.x=x-SIZE;else if(p.vx<0)p.x=x+w;
      p.vx=0;
    }
  }
  const oldY=p.y;p.y+=p.vy;p.grounded=false;
  for(const [x,y,w,h] of solids){
    if(p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h){
      if(p.vy>=0&&oldY+SIZE<=y+1){p.y=y-SIZE;p.vy=0;p.grounded=true;}
      else if(p.vy<0&&oldY>=y+h-1){p.y=y+h;p.vy=0;}
    }
  }
  if(p.y>map.height+100||map.spikes.some(([x,y,w,h])=>p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h)||sawPositions(map,world).some(h=>circleHits(p,h)))respawn(p,map);
  map.checkpoints.forEach((point,i)=>{
    if(i>p.checkpoint&&p.x>point.x-25&&p.x<point.x+70&&Math.abs(p.y+SIZE-point.y)<12)p.checkpoint=i;
  });
  if(p.x>map.goal.x-20&&Math.abs(p.y+SIZE-map.goal.y)<45){p.finished=true;p.vx=p.vy=0;}
}

export function createWorld(){return {frame:0,activated:[],charge:{},pressed:[]};}
export function solidRects(map,world){
  const active=world?.activated??[];
  return [...map.platforms,...(map.gates??[]).filter(g=>!active.includes(g.id)).map(g=>g.rect),
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
    const ids=players.filter(p=>!p.finished&&p.grounded&&Math.abs(p.y+SIZE-plate.y)<3&&p.x+SIZE>plate.x+3&&p.x<plate.x+plate.w-3).map(p=>p.id);
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
  return x>=0&&x+SIZE<=map.width&&!solids.some(([sx,sy,w,h])=>x+SIZE>sx+.01&&x<sx+w-.01&&y+SIZE>sy+.01&&y<sy+h-.01);
}
export function resolvePlayers(players,previous,map,world){
  const solids=solidRects(map,world),ordered=[...players].sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id));
  // Transport a supported teammate horizontally; vertical motion is resolved below.
  for(const p of ordered){
    const old=previous.get(p.id),support=players.find(other=>other.id===old?.supportId);
    if(!support||p.finished||p.deaths!==old.deaths||p.vy<0)continue;
    const before=previous.get(support.id);
    if(!before||support.deaths!==before.deaths)continue;
    const x=p.x+support.x-before.x;
    if(fits(p,x,p.y,solids,map))p.x=x;
  }
  for(let pass=0;pass<4;pass++)for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
    const a=ordered[i],b=ordered[j];
    if(a.finished||b.finished||a.x+SIZE<=b.x+.001||b.x+SIZE<=a.x+.001||a.y+SIZE<=b.y+.001||b.y+SIZE<=a.y+.001)continue;
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
  for(const p of players)tick(p,map,world);
  resolvePlayers(players,previous,map,world);
  // Collision displacement can move a cube onto a hazard too.
  for(const p of players)if(!p.finished&&(map.spikes.some(([x,y,w,h])=>p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h)||sawPositions(map,world).some(h=>circleHits(p,h))))respawn(p,map);
  if(mechanisms)updateMechanisms(players,map,world);
}
