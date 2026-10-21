import {enemyPose,landmarkPlan,ENEMY_FRAMES} from '/animation.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class DetailArt{
 constructor(){this.actors=new Image();this.actors.src='/assets/enemy-motion.png';this.props=new Image();this.props.src='/assets/world-relics.png';this.plans=new WeakMap();}
 plan(map){if(!this.plans.has(map))this.plans.set(map,landmarkPlan(map));return this.plans.get(map);}
 scenery(c,map,left,right,time,reduced){
  const t=reduced?0:time;
  for(const p of this.plan(map)){
   if(p.x+p.w<left||p.x-p.w>right)continue;
   c.save();c.translate(p.x,p.y);c.globalAlpha=.9;
   if(this.props.complete&&this.props.naturalWidth){const frames=[[25,11,636,610],[657,12,572,630],[33,623,619,624],[703,643,521,598]],r=frames[map.id],sx=this.props.width/1254,sy=this.props.height/1254;c.drawImage(this.props,r[0]*sx,r[1]*sy,r[2]*sx,r[3]*sy,-p.w/2,-p.h,p.w,p.h);}
   c.globalAlpha=1;
   if(map.id===0){
    c.strokeStyle='#c6b78088';c.lineWidth=1;c.beginPath();c.moveTo(-p.w*.4,-100);c.quadraticCurveTo(0,-62,p.w*.4,-100);c.stroke();
    for(let i=0;i<4;i++){const x=-p.w*.31+i*p.w*.21,y=-82+Math.sin(i)*6,light=c.createRadialGradient(x,y,1,x,y,20);light.addColorStop(0,'#ffdb8b44');light.addColorStop(1,'#ffdb8b00');c.fillStyle=light;c.fillRect(x-20,y-20,40,40);c.fillStyle='#e7ba73';c.beginPath();c.roundRect(x-3,y-6,6,10,2);c.fill();}
   }else if(map.id===1){
    c.save();c.translate(0,-p.h*.49);c.rotate(t*.24+p.variant);c.strokeStyle='#d7ab7180';c.lineWidth=2;c.beginPath();c.arc(0,0,p.w*.19,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*8,Math.sin(a)*8);c.lineTo(Math.cos(a)*p.w*.18,Math.sin(a)*p.w*.18);c.stroke();}c.restore();
   }else if(map.id===2){
    for(let i=0;i<5;i++){const x=(i-2)*14,y=-p.h*.48-Math.sin(t*.7+i)*8;c.fillStyle='#defbff77';c.beginPath();c.arc(x,y,1.5,0,Math.PI*2);c.fill();}
   }else{
    c.save();c.translate(0,-p.h*.48);c.rotate(t*.25);c.strokeStyle='#d9c28b88';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,p.w*.29,p.w*.09,.4,0,Math.PI*2);c.stroke();c.fillStyle='#a4f5f1';c.beginPath();c.arc(p.w*.28,0,3,0,Math.PI*2);c.fill();c.restore();
   }
   c.restore();
  }
  // Depth cues stay behind traversable geometry and never disguise spikes.
  for(const [i,rect] of (map.gaps??[]).entries()){
   const [x,y,w]=rect;if(i%3!==1||x+w<left||x>right)continue;
   if(map.id===0){
    c.fillStyle='#97d4cd44';c.fillRect(x+w*.4,y+12,Math.min(28,w*.2),720-y);c.strokeStyle='#dcf2d75c';c.lineWidth=1;for(let j=0;j<3;j++){c.beginPath();const xx=x+w*.42+j*5;c.moveTo(xx,y+20);c.lineTo(xx+Math.sin(t+j)*2,710);c.stroke();}
   }else if(map.id===1){
    c.strokeStyle='#634b5288';c.lineWidth=2;c.beginPath();c.moveTo(x-10,y+12);c.quadraticCurveTo(x+w/2,y+100,x+w+10,y+12);c.stroke();
   }else if(map.id===3){
    c.strokeStyle='#bca7ee33';c.lineWidth=1;c.beginPath();for(let k=0;k<5;k++){const xx=x+w*k/4,yy=y+70+Math.sin(k*2)*20;if(k===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.stroke();
   }
  }
 }
 surface(c,map,left,right,time,reduced){
  const t=reduced?0:time;
  for(const [x,y,w,h] of [...map.platforms,...(map.ledges??[])]){
   if(x+w<left||x>right||x>=map.overworldWidth)continue;
   c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
   const start=Math.max(0,Math.floor((left-x)/85)*85);
   for(let dx=start;dx<w&&x+dx<right+85;dx+=85){
    const xx=x+dx;
    if(map.id===0){
     c.strokeStyle='#bf9c6633';c.lineWidth=3;c.beginPath();c.moveTo(xx+15,y+12);c.bezierCurveTo(xx+7,y+38,xx+55,y+25,xx+34,y+Math.min(h,110));c.stroke();
     c.fillStyle='#9ebd7922';c.beginPath();c.ellipse(xx+42,y+22,25,8,.3,0,Math.PI*2);c.fill();
    }else if(map.id===1){
     c.fillStyle='#efd0a218';c.beginPath();c.moveTo(xx,y+18);c.lineTo(xx+68,y+28);c.lineTo(xx+53,y+Math.min(h,125));c.lineTo(xx+16,y+Math.min(h,105));c.closePath();c.fill();
     c.strokeStyle='#edbb8b44';c.lineWidth=1;for(let k=0;k<3;k++){c.beginPath();c.moveTo(xx,y+27+k*23);c.lineTo(xx+80,y+36+k*23);c.stroke();}
    }else if(map.id===2){
     c.fillStyle=dx%170?'#c6f8ff1c':'#5c8cc51e';c.beginPath();c.moveTo(xx+6,y+15);c.lineTo(xx+73,y+32);c.lineTo(xx+32,y+Math.min(h,128));c.closePath();c.fill();c.strokeStyle='#f4ffff40';c.lineWidth=1;c.beginPath();c.moveTo(xx+6,y+15);c.lineTo(xx+32,y+Math.min(h,128));c.stroke();
    }else{
     c.strokeStyle='#d8c5ef33';c.lineWidth=1;c.strokeRect(xx+7,y+13,46,Math.min(12,h-14));c.beginPath();c.moveTo(xx+20,y+15);c.lineTo(xx+27,y+23);c.lineTo(xx+35,y+15);c.stroke();
    }
   }
   c.restore();
   if(h<40&&map.id===0){c.strokeStyle='#527d61';c.lineWidth=2;for(let k=0;k<3;k++){const xx=x+14+k*25;if(xx>x+w-10)break;c.beginPath();c.moveTo(xx,y+10);c.quadraticCurveTo(xx+Math.sin(t+k)*4,y+29,xx-4,y+43);c.stroke();}}
   if(h>=40&&map.id===2){c.fillStyle='#d3effaaa';for(let dx=22;dx<w;dx+=79){c.beginPath();c.moveTo(x+dx,y+12);c.lineTo(x+dx+4,y+25+dx%12);c.lineTo(x+dx+8,y+12);c.fill();}}
  }
 }
 actor(c,e,state,world,reduced,map){
  const a=this.actors;if(!a.complete||!a.naturalWidth)return false;
  const row={capy:0,toaster:1,banana:2,duck:3}[e.kind]??0,pose=enemyPose(e,state,world.frame??0,reduced);
  const w=e.w+20,h=e.h+24;
  const ground=map?.platforms.find(([x,y,width])=>e.x+e.w/2>=x&&e.x+e.w/2<=x+width&&y>=e.y+e.h-2);
  if(ground){const distance=Math.max(0,ground[1]-e.y-e.h);c.fillStyle=`rgba(12,28,36,${Math.max(.06,.2-distance/1200)})`;c.beginPath();c.ellipse(e.x+e.w/2,ground[1]+1,Math.max(7,e.w*.46-distance*.025),3,0,0,Math.PI*2);c.fill();}
  c.save();c.translate(e.x+e.w/2-pose.recoil*(e.facing??1),e.y+e.h+pose.lift);if(e.facing<0)c.scale(-1,1);c.rotate(pose.angle);c.scale(pose.sx,pose.sy);c.globalAlpha=pose.opacity;
  const r=ENEMY_FRAMES[row][pose.cell],base=ENEMY_FRAMES[row][0],scale=Math.min(w/base[2],h/base[3]);c.drawImage(a,r[0]*a.width/1269,r[1]*a.height/1240,r[2]*a.width/1269,r[3]*a.height/1240,(r[0]-r[4])*scale,(r[1]-r[5])*scale,r[2]*scale,r[3]*scale);c.restore();
  if(!reduced&&pose.phase==='attack'&&e.combat?.type==='charger'){
   c.fillStyle='#d6c8a544';for(let i=0;i<3;i++){const xx=e.x+e.w/2-e.facing*(17+i*10),r=2+((world.frame+i*7)%13)/4;c.beginPath();c.ellipse(xx,e.y+e.h-2,r,2,0,0,Math.PI*2);c.fill();}
  }
  if(pose.phase==='windup'&&e.kind==='toaster'){c.strokeStyle='#b1f5f0aa';c.lineWidth=1.5;c.beginPath();c.arc(e.x+e.w/2,e.y+e.h/2,8+pose.progress*5,0,Math.PI*2);c.stroke();}
  return true;
 }
}
