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
  const platforms=[],spikes=[],checkpoints=[];
  let x=0;
  for(let i=0;i<count;i++){
    const width=i===0?560:440+((i*7+index*3)%4)*40;
    const y=i===0?600:600-((i+index)%3)*25;
    platforms.push([x,y,width,720-y]);
    // Wide, distinct islands leave space to land before the next obstacle.
    if(i>0 && (i+index)%2===0)spikes.push([x+180,y-20,48+index*5,20]);
    if(i>0&&i%3===0)checkpoints.push({x:x+65,y});
    x+=width+(i===count-1?0:80+((i+index)%3)*15);
  }
  const last=platforms.at(-1);
  return {id:index,name,subtitle,theme:themes[theme],width:x,height:720,spawn:{x:90,y:568},platforms,spikes,checkpoints,goal:{x:x-100,y:last[1]}};
});
export const level = levels[0];
export function newPlayer(id,name,color,map=level){
  return {id,name,color,...map.spawn,vx:0,vy:0,grounded:false,checkpoint:-1,finished:false,deaths:0,
    input:{left:false,right:false,jump:false},jumpHeld:false,coyote:0,jumpBuffer:0,facing:1};
}
export function isComplete(players){return players.length>=2&&players.every(p=>p.finished);}
export function respawn(p,map){
  const point=map.checkpoints[p.checkpoint];
  p.x=point?.x??map.spawn.x;p.y=point?point.y-SIZE:map.spawn.y;
  p.vx=p.vy=0;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.deaths++;
}
export function tick(p,map=level){
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
  p.x=Math.max(0,Math.min(map.width-SIZE,p.x+p.vx));
  for(const [x,y,w,h] of map.platforms){
    if(p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h){
      if(p.vx>0)p.x=x-SIZE;else if(p.vx<0)p.x=x+w;
      p.vx=0;
    }
  }
  const oldY=p.y;p.y+=p.vy;p.grounded=false;
  for(const [x,y,w,h] of map.platforms){
    if(p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h){
      if(p.vy>=0&&oldY+SIZE<=y+1){p.y=y-SIZE;p.vy=0;p.grounded=true;}
      else if(p.vy<0&&oldY>=y+h-1){p.y=y+h;p.vy=0;}
    }
  }
  if(p.y>map.height+100||map.spikes.some(([x,y,w,h])=>p.x+SIZE>x&&p.x<x+w&&p.y+SIZE>y&&p.y<y+h))respawn(p,map);
  map.checkpoints.forEach((point,i)=>{
    if(i>p.checkpoint&&p.x>point.x-25&&p.x<point.x+70&&Math.abs(p.y+SIZE-point.y)<12)p.checkpoint=i;
  });
  if(p.x>map.goal.x-20&&Math.abs(p.y+SIZE-map.goal.y)<45){p.finished=true;p.vx=p.vy=0;}
}
