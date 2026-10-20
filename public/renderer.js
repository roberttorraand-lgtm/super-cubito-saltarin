import { sawPositions } from '/game.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Renderer {
  constructor(canvas){
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
    const t=level.theme;
    this.layers=t.hills.map((color,n)=>{
      const c=document.createElement('canvas');c.width=2048;c.height=720;const ctx=c.getContext('2d');
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,720);
      for(let x=0;x<=2048;x+=8){
        const wave=Math.cos(x/2048*Math.PI*4+n)*55+Math.sin(x/2048*Math.PI*2)*45;
        ctx.lineTo(x,420+n*72+wave);
      }
      ctx.lineTo(2048,720);ctx.fill();
      return c;
    });
  }
  burst(x,y,color,count=10){
    if(this.reduced)return;
    for(let i=0;i<count&&this.particles.length<120;i++)this.particles.push({x,y,vx:(Math.random()-.5)*150,vy:-Math.random()*140-10,life:.4+Math.random()*.35,color,size:2+Math.random()*4});
  }
  draw(players,localId,time,dt,world={frame:0,activated:[],pressed:[],charge:{}}){
    const l=this.level;if(!l||this.w<1||this.h<1)return;
    const ctx=this.ctx,t=l.theme,scale=this.h/720,view=this.w/scale;
    const me=players.find(p=>p.id===localId);
    const target=clamp((me?.x??120)-view*.36+(me?.vx??0)*12,0,Math.max(0,l.width-view));
    if(me&&Math.abs(target-this.camera)>view*1.2)this.camera=target;
    else this.camera+=(target-this.camera)*(1-Math.exp(-7*dt));
    const left=this.camera-100,right=this.camera+view+100;
    ctx.setTransform(this.dpr*scale,0,0,this.dpr*scale,0,0);
    if(!this.skyCache){
      const c=document.createElement('canvas');c.width=Math.ceil(view);c.height=720;const bg=c.getContext('2d');
      const sky=bg.createLinearGradient(0,0,0,720);sky.addColorStop(0,t.sky[0]);sky.addColorStop(1,t.sky[1]);bg.fillStyle=sky;bg.fillRect(0,0,view,720);
      bg.fillStyle=t.glow;bg.shadowColor=t.glow;bg.shadowBlur=35;bg.beginPath();bg.arc(view-110,115,l.id===3?29:40,0,Math.PI*2);bg.fill();this.skyCache=c;
    }
    ctx.drawImage(this.skyCache,0,0);
    if(l.id===3){
      for(let i=0;i<65;i++){const x=((i*173.31-this.camera*.05)%(view+100)+view+100)%(view+100);ctx.globalAlpha=.35+(Math.sin(time*.8+i)*.5+.5)*.5;ctx.fillStyle='#f4eaff';ctx.fillRect(x,30+(i*83)%350,2,2);}ctx.globalAlpha=1;
    }
    // Cached scenery layers are composited instead of rebuilding hill geometry each frame.
    this.layers.forEach((layer,i)=>{
      const offset=-(this.camera*(.07+i*.08)%2048);
      for(let x=offset-2048;x<view;x+=2048)ctx.drawImage(layer,x,0);
    });
    if(l.id!==3){
      ctx.fillStyle='#ffffff66';
      for(let i=0;i<5;i++){
        const x=((i*330-this.camera*.12+time*(this.reduced?0:3))%(view+250)+view+250)%(view+250)-100,y=105+i%3*48;
        ctx.beginPath();ctx.ellipse(x,y,45,12,0,0,Math.PI*2);ctx.ellipse(x+22,y-8,25,18,0,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.save();ctx.translate(-this.camera,0);
    for(const [x,y,w,h] of l.platforms){
      if(x+w<left||x>right)continue;
      // Trees, crystals or lunar mushrooms adapt to each world's palette.
      for(let dx=80;dx<w-50;dx+=170){
        const xx=x+dx;
        ctx.fillStyle=t.ground;ctx.fillRect(xx-4,y-83,8,83);
        ctx.fillStyle=t.hills[1];ctx.beginPath();
        if(l.id===2){ctx.moveTo(xx,y-142);ctx.lineTo(xx-30,y-60);ctx.lineTo(xx+30,y-60);}
        else if(l.id===3){ctx.ellipse(xx,y-85,35,15,0,0,Math.PI*2);}
        else{ctx.arc(xx,y-96,33,0,Math.PI*2);ctx.arc(xx+20,y-80,26,0,Math.PI*2);}
        ctx.fill();
      }
      ctx.fillStyle=t.dirt;ctx.fillRect(x,y,w,h);
      ctx.fillStyle=t.ground;ctx.fillRect(x,y+14,w,10);ctx.fillRect(x+w-9,y+24,9,h-24);
      ctx.fillStyle=t.grass;ctx.beginPath();ctx.roundRect(x,y,w,16,[6,6,0,0]);ctx.fill();
      ctx.fillStyle='#ffffff22';ctx.fillRect(x+5,y+2,w-10,3);
      for(let dx=18;dx<w;dx+=41){ctx.fillStyle='#00000012';ctx.fillRect(x+dx,y+42+(dx%3)*13,7,4);}
      // Tiny grass and flowers sit on the ledge, away from collision geometry.
      for(let dx=28;dx<w-10;dx+=65){ctx.strokeStyle=t.grass;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+dx,y);ctx.lineTo(x+dx-3,y-8);ctx.moveTo(x+dx,y);ctx.lineTo(x+dx+4,y-11);ctx.stroke();if(dx%2){ctx.fillStyle=t.accent;ctx.fillRect(x+dx+2,y-14,4,4);}}
    }
    for(const [x,y,w,h] of l.spikes){
      if(x+w<left||x>right)continue;
      for(let dx=0;dx<w;dx+=16){ctx.fillStyle='#d76e78';ctx.beginPath();ctx.moveTo(x+dx,y+h);ctx.lineTo(x+dx+8,y);ctx.lineTo(x+dx+16,y+h);ctx.fill();ctx.fillStyle='#ffc3b0';ctx.beginPath();ctx.moveTo(x+dx+8,y);ctx.lineTo(x+dx+8,y+h);ctx.lineTo(x+dx,y+h);ctx.fill();}
    }
    this.mechanisms(l,world,time,left,right);
    l.checkpoints.forEach((point,i)=>{if(point.x>left&&point.x<right)this.flag(point.x,point.y,i<=(me?.checkpoint??-1)?'#b4f669':'#ffffffaa',time,'GUARDAR PROGRESO');});
    if(l.goal.x>left&&l.goal.x<right)this.flag(l.goal.x,l.goal.y,t.accent,time,'META DEL EQUIPO',true);
    const alive=new Set(players.map(p=>p.id));for(const key of this.visuals.keys())if(!alive.has(key))this.visuals.delete(key);
    for(const p of players){
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
      ctx.save();ctx.translate(p.x+16,p.y+32);
      if(!this.reduced){const stretch=p.grounded?0:clamp(-p.vy*.009,-.07,.11);ctx.scale(a.sx-stretch,a.sy+stretch);ctx.rotate(p.vx*.012);}
      const breathe=this.reduced?0:Math.sin(time*3+p.x*.01)*.6;
      ctx.translate(0,breathe);ctx.fillStyle=p.color;ctx.beginPath();ctx.roundRect(-16,-32,32,32,7);ctx.fill();
      ctx.fillStyle='#ffffff66';ctx.beginPath();ctx.roundRect(-13,-30,26,6,3);ctx.fill();ctx.fillStyle='#00000017';ctx.fillRect(-12,-5,24,4);
      const blink=!this.reduced&&Math.sin(time*.6+p.color.charCodeAt(2))>.998;
      const eye=p.facing*1.5;ctx.fillStyle='#293e41';ctx.fillRect(-9+eye,-22,4,blink?2:6);ctx.fillRect(4+eye,-22,4,blink?2:6);ctx.fillRect(-3+eye,-11,6,2);
      ctx.restore();
      ctx.textAlign='center';ctx.font='600 12px sans-serif';ctx.fillStyle=l.id===3?'#eee5ff':'#294d50';ctx.fillText(p.name+(p.id===localId?' · TÚ':''),p.x+16,p.y-15);
      if(p.id===localId){ctx.fillStyle=t.accent;ctx.beginPath();ctx.moveTo(p.x+12,p.y-34);ctx.lineTo(p.x+20,p.y-34);ctx.lineTo(p.x+16,p.y-28);ctx.fill();}
    }
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}
      p.vy+=260*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);
    }
    ctx.globalAlpha=1;ctx.restore();
    // A lightweight map shows the full course and every connected teammate.
    const mw=Math.min(view-40,320),mx=(view-mw)/2;
    ctx.fillStyle='#102c3844';ctx.beginPath();ctx.roundRect(mx-12,18,mw+24,32,12);ctx.fill();
    ctx.fillStyle='#ffffff44';ctx.fillRect(mx,33,mw,3);
    for(const cp of l.checkpoints){ctx.fillStyle='#ffffff66';ctx.fillRect(mx+cp.x/l.width*mw,29,2,11);}
    for(const p of players){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(mx+p.x/l.width*mw,34,p.id===localId?5:3.5,0,Math.PI*2);ctx.fill();}
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
        ctx.fillStyle='#f6d477';ctx.fillRect(x+w/2-5,y+h/2-8,10,16);
      }else{
        ctx.strokeStyle='#b8f58d';ctx.setLineDash([4,7]);ctx.strokeRect(x+5,y+7,w-10,h-9);ctx.setLineDash([]);
      }
      label(open?'PASO ABIERTO':'TORRE DE DOS CUBITOS',x+20,y-20);
      if(!open){
        ctx.strokeStyle='#edfbd5';ctx.lineWidth=2;ctx.strokeRect(x-64,y+h-26,22,22);ctx.strokeRect(x-64,y+h-50,22,22);
        ctx.fillStyle='#edfbd5';ctx.fillText('↑',x-53,y+h-58);
      }
    }
    for(const bridge of map.bridges??[]){
      const [x,y,w,h]=bridge.rect;if(x+w<left||x>right)continue;
      const open=active.includes(bridge.id);
      if(open){
        ctx.fillStyle='#674f65';ctx.fillRect(x,y+8,w,h-8);
        for(let dx=0;dx<w;dx+=24){ctx.fillStyle=dx%48?'#c8a17c':'#e7c89a';ctx.fillRect(x+dx,y,22,12);}
        ctx.strokeStyle='#ffe7b3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-24);ctx.quadraticCurveTo(x+w/2,y+5,x+w,y-24);ctx.stroke();
        for(const xx of [x+4,x+w-8]){ctx.fillStyle='#8b6e6b';ctx.fillRect(xx,y-32,5,42);}
      }else{
        ctx.strokeStyle='#fff0b488';ctx.setLineDash([10,9]);ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
        label('DOS PLACAS · DOS COMPAÑEROS',x+w/2,y-46);
        const charge=world.charge?.[bridge.id]??0;
        ctx.fillStyle='#1f394966';ctx.fillRect(x+w/2-40,y-30,80,5);ctx.fillStyle='#b6f596';ctx.fillRect(x+w/2-40,y-30,Math.min(1,charge/12)*80,5);
      }
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
      ctx.save();ctx.translate(saw.x,saw.y);ctx.rotate(this.reduced?0:time*5);ctx.fillStyle='#f27a80';ctx.strokeStyle='#ffe4c2';ctx.lineWidth=2;ctx.beginPath();
      for(let i=0;i<32;i++){const angle=i/32*Math.PI*2,r=i%2?saw.radius-4:saw.radius+2;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#4e6274';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.restore();
    }
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
