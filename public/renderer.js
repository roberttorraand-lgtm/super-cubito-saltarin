import { WorldArt } from '/art.js';
import { zoneBounds } from '/exploration.js';
import { bossView } from '/encounters.js';
import { sawPositions, crumbleActive, enemyPositions } from '/game.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Renderer {
  constructor(canvas){
    this.art=new WorldArt();
    this.bossAtlas=new Image();
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera=0;
    this.visuals=new Map();this.particles=[];this.layers=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.w=1;this.h=1;
    new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();
  }
  resize(){
    this.w=this.canvas.clientWidth;this.h=this.canvas.clientHeight;
    if(this.w<1||this.h<1)return;
    const dpr=Math.min(devicePixelRatio||1,2);this.dpr=dpr;
    this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);
    this.skyCache=null;
  }
  setLevel(level){
    this.level=level;this.skyCache=null;this.camera=0;this.visuals.clear();this.particles=[];
  }
  burst(x,y,color,count=10){
    if(this.reduced)return;
    for(let i=0;i<count&&this.particles.length<120;i++)this.particles.push({x,y,vx:(Math.random()-.5)*150,vy:-Math.random()*140-10,life:.4+Math.random()*.35,color,size:2+Math.random()*4});
  }
  draw(players,localId,time,dt,world={frame:0,activated:[],pressed:[],charge:{}}){
    const l=this.level;if(!l||this.w<1||this.h<1)return;
    const ctx=this.ctx,t=l.theme,scale=this.h/720,view=this.w/scale;
    const own=players.find(p=>p.id===localId);
    const me=own?.eliminated?(players.find(p=>!p.eliminated&&!p.finished)??players.find(p=>!p.eliminated)??own):own;
    const bounds=zoneBounds(l,me),minCamera=bounds.x-Math.max(0,(view-bounds.w)/2),maxCamera=bounds.x+Math.max(0,bounds.w-view);
    const target=clamp((me?.x??120)-view*.4+(me?.vx??0)*8,minCamera,maxCamera);
    if(this.lastZone!==me?.zone){this.camera=target;this.lastZone=me?.zone;this.particles=[];}
    if(me&&Math.abs(target-this.camera)>view*1.2)this.camera=target;
    else this.camera+=(target-this.camera)*(1-Math.exp(-7*dt));
    const left=this.camera-100,right=this.camera+view+100;
    ctx.setTransform(this.dpr*scale,0,0,this.dpr*scale,0,0);
    this.art.background(ctx,l,this.camera,view,time,this.reduced);
    ctx.save();ctx.translate(-this.camera,0);
    this.art.terrain(ctx,l,left,right);
    for(const [x,y,w,h] of l.spikes){
      if(x+w<left||x>right)continue;
      for(let dx=0;dx<w;dx+=16){ctx.fillStyle='#d76e78';ctx.beginPath();ctx.moveTo(x+dx,y+h);ctx.lineTo(x+dx+8,y);ctx.lineTo(x+dx+16,y+h);ctx.fill();ctx.fillStyle='#ffc3b0';ctx.beginPath();ctx.moveTo(x+dx+8,y);ctx.lineTo(x+dx+8,y+h);ctx.lineTo(x+dx,y+h);ctx.fill();}
    }
    this.mechanisms(l,world,time,left,right);
    this.encounters(l,world,left,right);
    this.village(l,world,time,left,right,me);
    this.chaos(l,world,time,left,right);
    this.art.combat(ctx,l,world,time,left,right);
    if(me&&l.secret)this.art.secretMark(ctx,l,me,time,this.reduced);
    l.checkpoints.forEach((point,i)=>{if(point.x>left&&point.x<right)this.flag(point.x,point.y,i<=(me?.checkpoint??-1)?'#b4f669':'#ffffffaa',time,'GUARDAR PROGRESO');});
    if(world.bossDefeated&&l.goal.x>left&&l.goal.x<right)this.flag(l.goal.x,l.goal.y,t.accent,time,l.mode==='solo'?'MUNDO SUPERADO':'META DEL EQUIPO',true);
    const alive=new Set(players.map(p=>p.id));for(const key of this.visuals.keys())if(!alive.has(key))this.visuals.delete(key);
    for(const p of players){
      if(p.eliminated)continue;
      let a=this.visuals.get(p.id);
      if(!a){a={grounded:p.grounded,deaths:p.deaths,checkpoint:p.checkpoint,sx:1,sy:1,trail:0};this.visuals.set(p.id,a);}
      if(p.deaths!==a.deaths){this.burst(p.x+16,p.y+16,p.color,18);a.sx=.65;a.sy=1.3;}
      if(p.grounded&&!a.grounded){this.burst(p.x+16,p.y+32,t.grass,8);a.sx=1.28;a.sy=.74;}
      if(!p.grounded&&a.grounded&&p.vy<0)this.burst(p.x+16,p.y+32,'#ffffffaa',5);
      if(p.checkpoint>a.checkpoint)this.burst(p.x+16,p.y,t.accent,22);
      a.grounded=p.grounded;a.deaths=p.deaths;a.checkpoint=p.checkpoint;
      a.sx+=(1-a.sx)*(1-Math.exp(-14*dt));a.sy+=(1-a.sy)*(1-Math.exp(-14*dt));
      a.trail+=dt;if(p.grounded&&Math.abs(p.vx)>2&&a.trail>.09){this.burst(p.x+16,p.y+32,'#ffffff88',1);a.trail=0;}
      if(p.x+32<left||p.x>right)continue;
      ctx.fillStyle='#172f3826';ctx.beginPath();ctx.ellipse(p.x+16,p.y+35,19,4,0,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(p.x+16,p.y+32);if(p.invulnerable>0&&Math.floor(time*12)%2)ctx.globalAlpha=.4;
      if(!this.reduced){const stretch=p.grounded?0:clamp(-p.vy*.009,-.07,.11);ctx.scale(a.sx-stretch,a.sy+stretch);ctx.rotate(p.vx*.012);}
      const breathe=this.reduced?0:Math.sin(time*3+p.x*.01)*.6;
      ctx.translate(0,breathe);ctx.fillStyle=p.color;ctx.beginPath();ctx.roundRect(-16,-32,32,32,7);ctx.fill();
      ctx.fillStyle='#ffffff66';ctx.beginPath();ctx.roundRect(-13,-30,26,6,3);ctx.fill();ctx.fillStyle='#00000017';ctx.fillRect(-12,-5,24,4);
      const blink=!this.reduced&&Math.sin(time*.6+p.color.charCodeAt(2))>.998;
      const eye=p.facing*1.5;ctx.fillStyle='#293e41';ctx.fillRect(-9+eye,-22,4,blink?2:6);ctx.fillRect(4+eye,-22,4,blink?2:6);ctx.fillRect(-3+eye,-11,6,2);
      ctx.restore();
      this.art.equipment(ctx,p,time);
      ctx.textAlign='center';ctx.font='600 12px sans-serif';ctx.fillStyle=l.id===3?'#eee5ff':'#294d50';ctx.fillText(p.name+(p.id===localId?' · TÚ':''),p.x+16,p.y-15);
      if(p.id===localId){ctx.fillStyle=t.accent;ctx.beginPath();ctx.moveTo(p.x+12,p.y-34);ctx.lineTo(p.x+20,p.y-34);ctx.lineTo(p.x+16,p.y-28);ctx.fill();}
    }
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}
      p.vy+=260*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);
    }
    ctx.globalAlpha=1;ctx.restore();
    // A lightweight map shows the full course and every connected teammate.
    const mw=Math.min(view-200,280),mx=(view-mw)/2;
    ctx.fillStyle='#102c3844';ctx.beginPath();ctx.roundRect(mx-12,18,mw+24,32,12);ctx.fill();
    ctx.fillStyle='#ffffff44';ctx.fillRect(mx,33,mw,3);
    for(const cp of l.checkpoints){if(cp.x<bounds.x||cp.x>bounds.x+bounds.w)continue;ctx.fillStyle='#ffffff66';ctx.fillRect(mx+(cp.x-bounds.x)/bounds.w*mw,29,2,11);}
    for(const p of players){if(p.zone!==me?.zone||p.eliminated)continue;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(mx+(p.x-bounds.x)/bounds.w*mw,34,p.id===localId?5:3.5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=t.accent;ctx.fillRect(mx+mw-2,27,3,12);
  }
  mechanisms(map,world,time,left,right){
    const ctx=this.ctx,active=world.activated??[],pressed=world.pressed??[];
    const label=(text,x,y)=>{ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillStyle=map.id===3?'#f0e4ff':'#274853';ctx.fillText(text,x,y);};
    for(const gate of map.gates??[]){
      const [x,y,w,h]=gate.rect;if(x+w<left||x>right)continue;
      const open=active.includes(gate.id);
      ctx.fillStyle='#263f5b';ctx.fillRect(x-5,y-5,w+10,7);ctx.fillRect(x-5,y-5,5,h+5);ctx.fillRect(x+w,y-5,5,h+5);
      if(!open){
        const gradient=ctx.createLinearGradient(x,0,x+w,0);gradient.addColorStop(0,'#547b8a');gradient.addColorStop(.5,'#91bec0');gradient.addColorStop(1,'#45667e');ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);
        for(let yy=y+15;yy<y+h;yy+=25){ctx.fillStyle='#d4eded88';ctx.fillRect(x+4,yy,w-8,4);}
        if(gate.material==='wood'){ctx.fillStyle='#9c7956';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#d8b777';ctx.lineWidth=3;for(let yy=y+12;yy<y+h;yy+=27){ctx.beginPath();ctx.moveTo(x+4,yy);ctx.lineTo(x+w-5,yy+5);ctx.stroke();}}
        if(gate.material==='ice'){ctx.fillStyle='#b7f4ff';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#ffffffbb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+4,y+15);ctx.lineTo(x+w-5,y+h*.5);ctx.lineTo(x+9,y+h-15);ctx.stroke();}
        ctx.fillStyle='#f6d477';ctx.fillRect(x+w/2-5,y+h/2-8,10,16);
      }else{
        ctx.strokeStyle='#b8f58d';ctx.setLineDash([4,7]);ctx.strokeRect(x+5,y+7,w-10,h-9);ctx.setLineDash([]);
      }
      label(open?'PASO ABIERTO':map.mode==='solo'?'ESCALÓN + INTERRUPTOR':gate.material==='ice'?'DOS PLACAS · DESHIELO':'TORRE DE DOS CUBITOS',x+20,y-20);
      if(!open&&gate.material!=='ice'){
        ctx.strokeStyle='#edfbd5';ctx.lineWidth=2;ctx.strokeRect(x-64,y+h-26,22,22);ctx.strokeRect(x-64,y+h-50,22,22);
        ctx.fillStyle='#edfbd5';ctx.fillText('↑',x-53,y+h-58);
      }
    }
    for(const bridge of map.bridges??[]){
      const [x,y,w,h]=bridge.rect;if(x+w<left||x>right)continue;
      const open=active.includes(bridge.id);
      if(open){
        if(bridge.material==='stars'){
          ctx.fillStyle='#9288d799';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#baf8dd';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
          for(let dx=10;dx<w;dx+=34){ctx.fillStyle='#c8ffeb';ctx.beginPath();ctx.arc(x+dx,y+6,3,0,Math.PI*2);ctx.fill();}
        }else{
          ctx.fillStyle='#674f65';ctx.fillRect(x,y+8,w,h-8);
          for(let dx=0;dx<w;dx+=24){ctx.fillStyle=dx%48?'#c8a17c':'#e7c89a';ctx.fillRect(x+dx,y,22,12);}
          ctx.strokeStyle='#ffe7b3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-24);ctx.quadraticCurveTo(x+w/2,y+5,x+w,y-24);ctx.stroke();
          for(const xx of [x+4,x+w-8]){ctx.fillStyle='#8b6e6b';ctx.fillRect(xx,y-32,5,42);}
        }
      }else{
        ctx.strokeStyle='#fff0b488';ctx.setLineDash([10,9]);ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
        label(map.mode==='solo'?'ACTIVA EL INTERRUPTOR':'DOS PLACAS · DOS COMPAÑEROS',x+w/2,y-46);
        const charge=world.charge?.[bridge.id]??0;
        ctx.fillStyle='#1f394966';ctx.fillRect(x+w/2-40,y-30,80,5);ctx.fillStyle='#b6f596';ctx.fillRect(x+w/2-40,y-30,Math.min(1,charge/12)*80,5);
      }
    }
    for(const block of map.blocks??[]){
      const [x,y,w,h]=block.rect;if(x+w<left||x>right)continue;
      if(block.type==='wall'||block.type==='stone'){ctx.fillStyle='#38354b';ctx.fillRect(x,y,w,h);continue;}
      ctx.fillStyle='#92714f';ctx.beginPath();ctx.roundRect(x,y,w,h,9);ctx.fill();ctx.strokeStyle='#d1b278';ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(x+w-12,y+h/2,8,h/2-5,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x+8,y+10);ctx.lineTo(x+w-25,y+8);ctx.moveTo(x+8,y+h-9);ctx.lineTo(x+w-25,y+h-12);ctx.stroke();
    }
    for(const tile of map.crumble??[]){
      const [x,y,w,h]=tile.rect;if(x+w<left||x>right)continue;
      const present=crumbleActive(tile,world),state=world.crumble?.[tile.id];
      ctx.globalAlpha=present?1:.2;ctx.fillStyle=present?'#c7f4ff':'#8cb4cc';ctx.fillRect(x,y,w,h);
      ctx.strokeStyle='#538daf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w*.3,y);ctx.lineTo(x+w*.42,y+h*.6);ctx.lineTo(x+w*.6,y+3);ctx.lineTo(x+w*.74,y+h);ctx.stroke();ctx.globalAlpha=1;
      if(present&&state&&world.frame<state.breakAt){ctx.fillStyle='#ed9b8a';ctx.fillRect(x,y-4,w*(1-(state.breakAt-world.frame)/tile.delay),3);}
      label(present?'HIELO FRÁGIL · SIGUE MOVIÉNDOTE':'EL HIELO VOLVERÁ',x+w/2,y-17);
    }
    for(const laser of map.lasers??[]){
      if(laser.x>right||laser.x+laser.w<left)continue;
      const phase=(world.frame+laser.offset)%laser.period,on=phase<laser.on;
      ctx.fillStyle='#7c6b9b';ctx.fillRect(laser.x-9,laser.y-9,laser.w+18,9);ctx.fillRect(laser.x-9,laser.y+laser.h,laser.w+18,7);
      ctx.fillStyle=on?'#f08ede':'#baf8dd44';ctx.globalAlpha=on?.75+.2*Math.sin(time*20):.3;ctx.fillRect(laser.x,laser.y,laser.w,laser.h);ctx.globalAlpha=1;
      if(on){ctx.fillStyle='#fff2fe';ctx.fillRect(laser.x+laser.w/2-2,laser.y,4,laser.h);}
      label(on?'PULSO ACTIVO':'PASO LIBRE',laser.x+laser.w/2,laser.y-22);
    }
    for(const plate of map.plates??[]){
      if(plate.x+plate.w<left||plate.x>right)continue;
      const on=pressed.includes(plate.id)||active.includes(plate.group);
      ctx.fillStyle='#35566a';ctx.fillRect(plate.x-3,plate.y-5,plate.w+6,5);
      ctx.fillStyle=on?'#baf394':'#ffd886';ctx.beginPath();ctx.roundRect(plate.x,plate.y-(on?4:9),plate.w,on?4:9,[3,3,0,0]);ctx.fill();
      label(active.includes(plate.group)?'✓':plate.group==='tower'?'ABRIR PARA TODOS':plate.id.endsWith('a')?'1':'2',plate.x+plate.w/2,plate.y-18);
    }
    if(this.lastWorldFrame!==world.frame){this.lastWorldFrame=world.frame;this.worldTime=time;}
    const visualWorld={...world,frame:world.frame+Math.min(3,(time-(this.worldTime??time))*60)};
    for(const saw of sawPositions(map,visualWorld)){
      if(saw.x+saw.radius<left||saw.x-saw.radius>right)continue;
      const original=map.saws.find(h=>h.offset===saw.offset);
      ctx.strokeStyle='#314a6066';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(original.x-original.range,original.y);ctx.lineTo(original.x+original.range,original.y);ctx.stroke();
      ctx.save();ctx.translate(saw.x,saw.y);ctx.rotate(this.reduced?0:time*5);const metal=ctx.createRadialGradient(-6,-7,2,0,0,saw.radius+2);metal.addColorStop(0,'#f1ecdb');metal.addColorStop(.55,'#a6b6bd');metal.addColorStop(1,'#526b79');ctx.fillStyle=metal;ctx.strokeStyle='#e1e7de';ctx.lineWidth=1.5;ctx.beginPath();
      for(let i=0;i<32;i++){const angle=i/32*Math.PI*2,r=i%2?saw.radius-4:saw.radius+2;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#526b79';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,saw.radius*.62,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d5a06e';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  chaos(map,world,time,left,right){
    const ctx=this.ctx;
    for(const belt of map.belts??[]){
      if(belt.x+belt.w<left||belt.x>right)continue;
      ctx.fillStyle='#35495b';ctx.fillRect(belt.x,belt.y-6,belt.w,8);ctx.fillStyle='#ffc56f';
      for(let dx=0;dx<belt.w;dx+=23){const xx=belt.x+((dx+time*belt.speed*24)%belt.w+belt.w)%belt.w;ctx.beginPath();ctx.moveTo(xx+7,belt.y-13);ctx.lineTo(xx,belt.y-8);ctx.lineTo(xx+7,belt.y-3);ctx.fill();}
    }
    for(const spring of map.springs??[]){
      if(spring.x+spring.w<left||spring.x>right)continue;
      ctx.strokeStyle='#6c5b9b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(spring.x+8,spring.y);ctx.lineTo(spring.x+30,spring.y-5);ctx.lineTo(spring.x+8,spring.y-10);ctx.lineTo(spring.x+30,spring.y-15);ctx.stroke();
      ctx.fillStyle='#ff9dde';ctx.fillRect(spring.x,spring.y-19,spring.w,5);ctx.fillStyle='#345368';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('BOING.EXE',spring.x+spring.w/2,spring.y-28);
    }
    for(const enemy of enemyPositions(map,world)){
      if(enemy.x+enemy.w<left||enemy.x>right)continue;
      this.art.creature(ctx,enemy,time,this.reduced);
      this.art.enemyIntent(ctx,enemy,world.enemyStates?.[enemy.id]);
    }
  }

  memeFace(kind,x,y,size=32){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(size/32,size/32);
    if(kind==='triangle'){c.fillStyle='#c4f279';c.beginPath();c.moveTo(0,-24);c.lineTo(-23,17);c.lineTo(23,17);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.ellipse(0,1,12,7,0,0,Math.PI*2);c.fill();c.fillStyle='#222';c.beginPath();c.arc(0,1,4,0,Math.PI*2);c.fill();}
    else if(kind==='nyan'){for(let i=0;i<6;i++){c.fillStyle=['#f77','#fb6','#ff8','#8e9','#8bf','#c9f'][i];c.fillRect(-53,-15+i*5,40,5);}c.fillStyle='#eeb5cc';c.fillRect(-18,-17,36,30);c.fillStyle='#a6aabd';c.fillRect(9,-12,20,25);c.fillRect(9,-20,6,10);c.fillRect(24,-20,5,10);c.fillStyle='#222';c.fillRect(14,-4,3,3);c.fillRect(23,-4,3,3);}
    else{c.fillStyle=kind==='doge'?'#ddb578':kind==='frog'?'#88b76f':'#faf9ee';c.beginPath();c.ellipse(0,0,22,18,0,0,Math.PI*2);c.fill();c.strokeStyle='#29333c';c.lineWidth=2;if(kind==='doge'){c.beginPath();c.moveTo(-20,-8);c.lineTo(-16,-29);c.lineTo(-5,-16);c.moveTo(5,-16);c.lineTo(17,-29);c.lineTo(20,-7);c.stroke();}c.fillStyle='#29333c';c.fillRect(-12,-6,5,4);c.fillRect(7,-6,5,4);c.beginPath();c.arc(0,2,12,0,Math.PI);c.stroke();if(kind==='troll')for(let x=-9;x<=9;x+=5)c.fillRect(x,3,2,6);}
    c.restore();
  }
  village(map,world,time,left,right,me){
    if(!map.houses)return;const c=this.ctx;
    for(const h of map.houses){
      if(h.x+130>left&&h.x-130<right)this.art.house(c,h,time,this.reduced);
      if(h.room.x+h.room.w<left||h.room.x>right)continue;
      this.art.room(c,map,h,time,this.reduced);
      const n=map.villagers.find(v=>v.houseId===h.id),bob=this.reduced?0:Math.sin(time*2)*1.5;
      if(!this.art.resident(c,n,time,this.reduced)){c.fillStyle=n.color;c.beginPath();c.roundRect(n.x-17,n.y-38,34,36,[10,10,6,6]);c.fill();
      c.fillStyle='#3b3c45';c.fillRect(n.x-14,n.y-7,10,7);c.fillRect(n.x+4,n.y-7,10,7);
      c.fillStyle='#e6d7ac';c.fillRect(n.x-11,n.y-30,22,21);
      this.memeFace(n.kind,n.x,n.y-54+bob,25);}
      c.font='600 12px sans-serif';c.textAlign='center';c.fillStyle='#fff0d0';c.fillText(n.name,n.x,n.y-101);
    }
    for(const e of map.easterEggs??[]){
      if(e.x+40<left||e.x-40>right||(world.eggs??[]).includes(e.id))continue;
      const near=me&&Math.hypot(me.x+16-e.x,me.y+16-e.y)<95;
      // Only environmental clues at a distance. No floating meme or label gives the secret away.
      c.fillStyle='#c1b18b';if(e.kind==='troll'){c.beginPath();c.roundRect(e.x-13,e.y-5,26,30,6);c.fill();c.fillStyle='#455351';c.fillRect(e.x-7,e.y+2,4,3);c.fillRect(e.x+4,e.y+2,4,3);}
      if(near){c.fillStyle='#f5e3ad';c.globalAlpha=.65+(this.reduced?0:Math.sin(time*3)*.25);c.beginPath();c.arc(e.x,e.y-10,2,0,Math.PI*2);c.fill();c.globalAlpha=1;}
    }
  }
  encounters(map,world,left,right){
    if(!map.boss)return;
    const c=this.ctx,b=map.boss,s=world.boss;
    const text=(str,x,y,size=14)=>{c.font=`bold ${size}px sans-serif`;c.textAlign='center';c.fillStyle='#fff6d7';c.fillText(str,x,y);};
    const door=(x,y,title,color)=>{if(x+180<left||x-180>right)return;c.fillStyle='#b5a18c';c.beginPath();c.roundRect(x-40,y-115,80,115,[38,38,0,0]);c.fill();c.fillStyle='#242337';c.beginPath();c.roundRect(x-30,y-105,60,105,[28,28,0,0]);c.fill();c.fillStyle=color;c.fillRect(x+14,y-44,5,5);text(title,x,y-135,11);};
    const castle=map.castle;
    if(castle.x+340>left&&castle.x-160<right){
      c.fillStyle=map.id%2?'#47324c':'#525873';c.fillRect(castle.x-100,castle.y-265,340,265);
      for(const x of [castle.x-125,castle.x+195]){c.fillRect(x,castle.y-330,70,330);c.fillStyle='#9e70a8';c.beginPath();c.moveTo(x-12,castle.y-330);c.lineTo(x+35,castle.y-390);c.lineTo(x+82,castle.y-330);c.fill();c.fillStyle='#525873';}
      for(let i=0;i<4;i++){c.fillStyle='#ffda86';c.fillRect(castle.x-65+i*72,castle.y-230,22,35);}
    }
    door(map.overworldEnd.x,castle.y,castle.name,'#ffd382');

    if(map.secret.x+900>left&&map.secret.x<right){
      c.fillStyle='#241e3bcc';c.fillRect(map.secret.x,60,900,530);text(map.secret.name,map.secret.x+450,130,26);
      text('Tres guardianes, una salida y un escudo secreto',map.secret.x+450,180);
      door(map.secret.x+825,600,'E · VOLVER AL EXTERIOR','#a2f4cf');
    }
    if(b.x+b.w<left||b.x>right)return;
    if(!this.bossAtlas.src)this.bossAtlas.src='/assets/boss-atlas.png';
    c.fillStyle='#19162cf5';c.fillRect(b.x,0,b.w,600);
    for(let x=b.x+20;x<b.x+b.w;x+=180){c.fillStyle='#3d3252';c.fillRect(x,120,26,480);c.fillStyle='#ffd584';c.fillRect(x+8,190,10,30);}
    text(b.name,b.x+550,100,28);text(b.hint,b.x+550,140,13);
    if(!s?.started)text('ESPERANDO AL EQUIPO EN EL INTERIOR',b.x+550,200);
    const hp=s?.hp??3;c.fillStyle='#4f344f';c.fillRect(b.x+350,165,400,15);c.fillStyle='#f38b9e';c.fillRect(b.x+350,165,400*hp/3,15);
    const view=bossView(map,world);
    if(view){
      for(const r of view.warnings){c.fillStyle='#ffd35d55';c.fillRect(...r);c.strokeStyle='#ffdb70';c.strokeRect(...r);}
      for(const r of view.hazards){c.fillStyle=['#75cfff','#84ff74','#ffe87b','#ff6262'][map.id];c.fillRect(...r);}
      const [x,y,w,h]=view.rect;
      if(this.bossAtlas.complete&&this.bossAtlas.naturalWidth){c.save();c.beginPath();c.roundRect(x,y,w,h,12);c.clip();const aw=this.bossAtlas.width/2,ah=this.bossAtlas.height/2;c.drawImage(this.bossAtlas,map.id%2*aw,Math.floor(map.id/2)*ah,aw,ah,x,y,w,h);c.restore();}
      c.strokeStyle=view.open?'#b8ff8a':'#ff8eaf';c.lineWidth=4;c.beginPath();c.roundRect(x-3,y-3,w+6,h+6,13);c.stroke();
      text(view.open?'¡SALTA ENCIMA!':'ESCUDO ACTIVO',x+w/2,y-22,12);
      if(map.id===2)text(view.beat?'¡YA! · SALTAD JUNTOS':'ESPERAD LA SEÑAL',b.x+550,240,24);
    }
    if(map.id===0||map.id===1)for(const x of (map.id===0?[180,900]:[280,800])){c.fillStyle=map.id===0?'#8ee3ff':'#8dff9d';c.fillRect(b.x+x-45,592,90,8);text(map.id===0?'ESPEJO':'SALTA AQUÍ',b.x+x,570,11);}
    if(map.id===3){c.strokeStyle='#ff9a78';c.strokeRect(b.x+230,500,100,35);text(map.mode==='solo'?'RESORTE → SELLO':'TORRE DE CUBITOS',b.x+280,475,12);}
    if(s?.hp===0)text('JEFE DERROTADO · SALIDA ABIERTA →',b.x+720,300,23);
  }
  flag(x,y,color,time,label,goal=false){
    const ctx=this.ctx;if(this.reduced)time=0;
    ctx.fillStyle='#304c5c';ctx.fillRect(x,y-100,4,100);ctx.fillStyle=color;
    ctx.beginPath();ctx.moveTo(x+4,y-100);ctx.bezierCurveTo(x+25,y-110+Math.sin(time*4)*4,x+35,y-81,x+58,y-91+Math.sin(time*4+1)*5);ctx.lineTo(x+55,y-62);ctx.bezierCurveTo(x+28,y-57,x+20,y-81,x+4,y-73);ctx.fill();
    ctx.fillStyle='#ffffff88';ctx.beginPath();ctx.arc(x+2,y-104,5,0,Math.PI*2);ctx.fill();
    if(goal){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+18,y-45,38,Math.PI,0);ctx.stroke();}
    ctx.textAlign='center';ctx.font='bold 9px sans-serif';ctx.fillStyle=this.level.id===3?'#eee5ff':'#345b58';ctx.fillText(label,x+15,y-124);
  }
}
