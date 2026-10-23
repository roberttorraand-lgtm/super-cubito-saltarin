import * as T from '/vendor/three.module.js';
import {ModelKit,terrain,scenery,house,castle,interior,actor,equipment,resident,landmark,crystal} from '/models3d.js';
import {zoneBounds} from '/exploration.js';
import {bossView} from '/encounters.js';
import {enemyPositions,sawPositions,crumbleActive} from '/game.js';
import {enemyPose,landmarkPlan} from '/animation.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),Y=y=>720-y;
export class Renderer3D {
 constructor(canvas){
  this.canvas=canvas;this.kit=new ModelKit();this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(40,16/9,5,7000);this.focusX=250;
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.gpu=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.gpu.outputColorSpace=T.SRGBColorSpace;this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.13;
  this.gpu.shadowMap.type=T.PCFSoftShadowMap;this.gpu.setClearColor('#c2e5e8');
  this.hemi=new T.HemisphereLight('#fff5dc','#647e84',2.1);this.scene.add(this.hemi);
  this.sun=new T.DirectionalLight('#fff0cd',3.1);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-950;this.sun.shadow.camera.right=950;this.sun.shadow.camera.top=750;this.sun.shadow.camera.bottom=-650;this.sun.shadow.camera.near=20;this.sun.shadow.camera.far=2400;this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=1.1;this.scene.add(this.sun,this.sun.target);
  this.fill=new T.DirectionalLight('#b1d9ff',.65);this.fill.position.set(-300,250,400);this.scene.add(this.fill);
  this.root=new T.Group();this.scene.add(this.root);this.chunks=[];this.dynamic=[];this.actors=new Map();this.enemies=new Map();this.fx=new Map();this.landmarks=[];this.particles=[];this.particleMatrix=new T.Object3D();
  this.quality='auto';this.small=matchMedia('(pointer:coarse)').matches;this.adaptiveLow=this.small;this.slow=0;this.frames=0;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
  this.onLost=e=>{e.preventDefault();this.lost=true;this.onFailure?.('context-lost');};canvas.addEventListener('webglcontextlost',this.onLost);
  this.stats={mode:'2.5D',calls:0,triangles:0,quality:this.small?'ligera':'alta'};
 }
 setQuality(quality){this.quality=quality;this.adaptiveLow=quality==='low'||(quality==='auto'&&this.small);this.resize();}
 resize(){this.w=this.canvas.clientWidth;this.h=this.canvas.clientHeight;if(!this.w||!this.h)return;const low=this.quality==='low'||(this.quality==='auto'&&this.adaptiveLow);this.gpu.setPixelRatio(Math.min(devicePixelRatio||1,low?1:1.5));this.gpu.setSize(this.w,this.h,false);this.camera.aspect=this.w/this.h;this.camera.updateProjectionMatrix();this.gpu.shadowMap.enabled=!low;this.stats&&(this.stats.quality=low?'ligera':'alta');}
 chunk(x,w,build){const g=new T.Group();this.root.add(g);build(g);this.kit.freeze(g);this.chunks.push({g,x,w});return g;}
 label(parent,text,x,y,z=75,size=15,color='#fff1ce'){const s=this.kit.label(text,color,size);s.position.set(x,y,z);parent.add(s);return s;}
 clear(){
  this.root.traverse(o=>{if(o.isSprite){o.material.map?.dispose();o.material.dispose();}if(o.isInstancedMesh)o.dispose();if(o.userData.privateGeometry)o.geometry?.dispose();if(o.userData.privateMaterial)o.material?.dispose();});
  this.root.clear();this.kit.clearBatches();for(const t of this.kit.textures)t.dispose();this.kit.textures=[];this.sawModels=[];this.chunks=[];this.dynamic=[];this.actors.clear();this.enemies.clear();this.fx.clear();this.landmarks=[];this.particles=[];
 }
 setLevel(map){
  this.clear();this.level=map;this.shadowSurfaces=[...map.platforms,...(map.ledges??[]),...(map.blocks??[]).map(b=>b.rect)];this.lastZone=undefined;this.focusX=250;const k=this.kit,id=map.id;
  const sky=['#c3e5e6','#eed1c6','#badbee','#292b51'][id];this.scene.background=new T.Color(sky);this.scene.fog=new T.Fog(sky,1700,5200);
  this.hemi.color.set(id===3?'#d6ceff':'#fff3d9');this.hemi.groundColor.set(id===3?'#48406d':'#637e82');this.hemi.intensity=id===3?1.8:2.1;this.sun.color.set(id===3?'#d1c1ff':'#fff0d0');
  // Each island is batched independently, so distant worlds never submit draw calls.
  for(const [i,r] of map.platforms.entries())this.chunk(r[0],r[2],g=>{const home=map.houses?.some(h=>r[0]>=h.room.x&&r[0]<h.room.x+h.room.w);terrain(k,g,r,id,home?'room':r[0]>=(map.overworldWidth??map.width)?'dungeon':'ground');if(r[0]<(map.overworldWidth??map.width))scenery(k,g,r,id,i);});
  for(const r of map.ledges??[])this.chunk(r[0],r[2],g=>terrain(k,g,r,id,'ledge'));
  for(const b of map.blocks??[])this.chunk(b.rect[0],b.rect[2],g=>{
   const [x,y,w,h]=b.rect;
   if(b.type==='log'){const log=k.cylinder(g,x+w/2,Y(y+h/2),0,h,w,h,'#9b7955');log.rotation.z=Math.PI/2;k.cylinder(g,x+w,Y(y+h/2),0,h*.8,4,h*.8,'#d2b180').rotation.z=Math.PI/2;}
   else if(b.type==='stone'||b.type==='wall'){k.box(g,x+w/2,Y(y+h/2),0,w,h,145,['#657267','#766772','#6e8b9b','#5c5575'][id]);for(let yy=20;yy<h;yy+=62)k.box(g,x+w/2,Y(y+yy),74,w,3,3,'#9b9c94');}else terrain(k,g,b.rect,id,b.type==='wood'?'wood':'ledge');
  });
  for(const [x,y,w,h] of map.spikes)this.chunk(x,w,g=>{k.box(g,x+w/2,Y(y+h)-3,0,w,6,48,'#7b6774',0,.5);for(let dx=8;dx<w;dx+=15)k.cone(g,x+dx,Y(y+h/2),0,15,h,21,'#e99297');});
  for(const h of map.houses??[]){this.chunk(h.x-160,320,g=>house(k,g,h,id));const room=this.chunk(h.room.x,h.room.w,g=>interior(k,g,h,id));this.label(room,`CASA DE ${h.owner.toUpperCase()}`,h.room.x+h.room.w/2,538,-100,24);const n=map.villagers.find(n=>n.houseId===h.id);if(n){const model=resident(k,n);model.position.set(n.x,Y(n.y)+27,-65);this.root.add(model);this.dynamic.push({type:'npc',g:model,x:n.x,w:80});this.label(model,n.name,0,66,0,18);}}
  if(map.castle){const c=this.chunk(map.castle.x-230,600,g=>castle(k,g,map.castle,id,map.overworldEnd.x));this.label(c,map.castle.name,map.castle.x+50,Y(map.castle.y)+415,-130,20);}
  if(map.secret){const s=map.secret;const c=this.chunk(s.x,s.w,g=>{k.box(g,s.x+s.w/2,340,-165,s.w,450,20,'#31354d');for(let xx=s.x+60;xx<s.x+s.w;xx+=140){k.cylinder(g,xx,270,-100,22,300,22,'#596780');crystal(k,g,xx,125,-60,37,id);}this.door(g,s.x+825,600,'#b6f1d0');});this.label(c,s.name,s.x+s.w/2,570,-90,25);}
  if(map.boss)this.buildArena(map);
  if(map.secret){const d=map.secret.door;this.chunk(d.x-27,54,g=>{k.shape(g,'rock',d.x,Y(d.y)+24,-35,49,57,30,['#6f8a6a','#a3837f','#8cbdc9','#80749e'][id]);k.box(g,d.x,Y(d.y)+20,-17,4,29,2,'#475c5b');k.box(g,d.x+5,Y(d.y)+32,-17,12,3,2,'#778b77');});}
  const goal=map.goal;this.goalFlag=k.group(this.root);k.cylinder(this.goalFlag,goal.x,Y(goal.y)+65,0,5,130,5,'#d4c3a2');k.box(this.goalFlag,goal.x+27,Y(goal.y)+108,0,50,32,3,'#b6f496');k.ring(this.goalFlag,goal.x+14,Y(goal.y)+50,0,83,'#c9f6b2',.6);this.label(this.goalFlag,'SALIDA →',goal.x+20,Y(goal.y)+155,0,21);
  for(const p of landmarkPlan(map)){
   // Keep the moving ring outside its static batch.
   const g=new T.Group();this.root.add(g);const a=landmark(k,g,p,id);this.dynamic.push({type:'landmark',g,x:p.x-140,w:280});this.landmarks.push(a);if(!a.wheel&&!a.ring)k.freeze(g);
  }
  for(const cp of map.checkpoints){const g=new T.Group();this.root.add(g);k.cylinder(g,cp.x,Y(cp.y)+48,0,4,96,4,'#66716b');k.ball(g,cp.x,Y(cp.y)+100,0,9,9,9,'#f4dfa2',.3);const flag=k.box(g,cp.x+24,Y(cp.y)+81,0,44,25,3,'#fbefbb');this.dynamic.push({type:'checkpoint',g,flag,x:cp.x,w:55,index:map.checkpoints.indexOf(cp)});}
  for(const gate of map.gates??[]){const g=new T.Group(),[x,y,w,h]=gate.rect;this.root.add(g);const panel=k.group(g,x+w/2,Y(y+h/2),0);k.box(panel,0,0,0,w,h,100,gate.material==='ice'?'#aff0f4':gate.material==='wood'?'#9d8062':'#92a7b4');for(let yy=-h/2+12;yy<h/2;yy+=30)k.box(panel,0,yy,53,w+3,5,5,gate.material==='ice'?'#edffff':'#d3c6a0');k.box(g,x-5,Y(y+h/2),0,8,h+10,110,'#506571');k.box(g,x+w+5,Y(y+h/2),0,8,h+10,110,'#506571');k.box(g,x+w/2,Y(y)+5,0,w+18,10,110,'#506571');this.dynamic.push({type:'gate',g,panel,data:gate,x,w});}
  for(const p of map.plates??[]){const g=new T.Group();this.root.add(g);k.box(g,p.x+p.w/2,Y(p.y)-2,0,p.w+8,5,60,'#4d6168');const button=k.box(g,p.x+p.w/2,Y(p.y)+3,0,p.w,7,52,'#efc775');this.dynamic.push({type:'plate',g,button,data:p,x:p.x,w:p.w});}
  for(const b of map.bridges??[]){const g=new T.Group();this.root.add(g);terrain(k,g,b.rect,id,b.material==='stars'?'ice':'wood');k.freeze(g);this.dynamic.push({type:'bridge',g,data:b,x:b.rect[0],w:b.rect[2]});}
  for(const b of map.crumble??[]){const g=new T.Group();this.root.add(g);terrain(k,g,b.rect,id,'ice');k.freeze(g);this.dynamic.push({type:'crumble',g,data:b,x:b.rect[0],w:b.rect[2]});}
  for(const l of map.lasers??[]){const g=new T.Group();this.root.add(g);k.box(g,l.x+l.w/2,Y(l.y)+5,0,l.w+20,10,80,'#68617e');k.box(g,l.x+l.w/2,Y(l.y+l.h)-5,0,l.w+20,10,80,'#68617e');const beam=k.box(g,l.x+l.w/2,Y(l.y+l.h/2),0,l.w,l.h,26,'#f795e9',1.2);const core=k.box(g,l.x+l.w/2,Y(l.y+l.h/2),15,4,l.h,4,'#fff3ff',2);this.dynamic.push({type:'laser',g,beam,core,data:l,x:l.x,w:l.w});}
  for(const s of map.springs??[]){const g=new T.Group();this.root.add(g);k.box(g,s.x+s.w/2,Y(s.y)+3,0,s.w+4,6,55,'#56697d');for(let yy=8;yy<23;yy+=5)k.ring(g,s.x+s.w/2,Y(s.y)+yy,0,s.w*.65,'#b4a2de').rotation.x=Math.PI/2;k.box(g,s.x+s.w/2,Y(s.y)+24,0,s.w,6,48,'#e29bd2');k.freeze(g);this.dynamic.push({type:'spring',g,x:s.x,w:s.w});}
  for(const b of map.belts??[]){const g=new T.Group();this.root.add(g);k.box(g,b.x+b.w/2,Y(b.y)+1,0,b.w,6,110,'#55626e');const rollers=[];for(let dx=8;dx<b.w;dx+=19){const r=k.cylinder(g,b.x+dx,Y(b.y)+3,0,11,106,11,'#e2b67b');r.rotation.x=Math.PI/2;rollers.push(r);}this.dynamic.push({type:'belt',g,rollers,data:b,x:b.x,w:b.w});}
  for(const e of map.easterEggs??[]){const g=new T.Group();this.root.add(g);k.shape(g,'rock',e.x,Y(e.y)-8,-15,24,29,23,'#889180');this.dynamic.push({type:'egg',g,data:e,x:e.x,w:30});}
  this.createSky(map);
  const dustMat=new T.MeshBasicMaterial({color:0xffffff});this.dust=new T.InstancedMesh(k.geo('rock'),dustMat,120);this.dust.count=0;this.dust.frustumCulled=false;this.dust.userData.privateMaterial=true;this.root.add(this.dust);
  const moteMat=new T.MeshBasicMaterial({color:['#f4e8a2','#f7ddad','#e7fcff','#bdf3df'][id],transparent:true,opacity:.6,depthWrite:false});this.motes=new T.InstancedMesh(k.geo('ball'),moteMat,45);this.motes.frustumCulled=false;this.motes.userData.privateMaterial=true;this.root.add(this.motes);
 }
 door(g,x,y,color){const k=this.kit;k.box(g,x,Y(y)+52,-67,68,104,16,'#929d99');k.box(g,x,Y(y)+49,-56,49,98,5,'#2b4149');k.ball(g,x+16,Y(y)+48,-51,5,5,5,color,1);}
 buildArena(map){
  const k=this.kit,b=map.boss,id=map.id;
  const wall=this.chunk(b.x,b.w,g=>{k.box(g,b.x+b.w/2,370,-230,b.w,570,18,['#41576b','#365849','#685439','#553c4c'][id]);for(let x=b.x+50;x<b.x+b.w;x+=165){k.cylinder(g,x,330,-145,33,420,33,'#6b7381');k.box(g,x,545,-145,62,19,62,'#a7a592');k.ball(g,x,432,-115,13,24,12,['#94dcff','#91ffad','#ffe38b','#ff907c'][id],1);}for(let i=0;i<8;i++)k.box(g,b.x+i*145,155,-175,110,5,4,'#ac9c82');this.door(g,b.x+45,600,'#efca80');});
  this.label(wall,b.name,b.x+b.w/2,608,-80,30);this.label(wall,'EL ESCUDO SE ROMPE CON LA MECÁNICA DEL MUNDO',b.x+b.w/2,560,-80,13);
  if(id===0||id===1)for(const x of (id===0?[180,900]:[280,800]))this.chunk(b.x+x-50,100,g=>{k.box(g,b.x+x,124,0,90,8,95,id===0?'#a5dfeb':'#a7dea0');k.ring(g,b.x+x,128,0,55,id===0?'#cdf8ff':'#d0ffc0',.6).rotation.x=Math.PI/2;});
  if(id===3)this.chunk(b.x+230,100,g=>{k.ring(g,b.x+280,222,-45,80,'#e9b488',.6);k.cone(g,b.x+280,225,-45,22,27,22,'#f1d599');});
  // The original supplied boss portraits remain the face of the sculpted guardian.
  this.bossModel=new T.Group();this.root.add(this.bossModel);const c=['#9acbf0','#8dde93','#e8c86b','#de827a'][id];
  k.box(this.bossModel,0,0,-9,110,106,58,'#343e50',0,.5);k.box(this.bossModel,0,-47,8,120,13,65,c,0,.5);k.box(this.bossModel,0,47,8,120,13,65,c,0,.5);
  for(const xx of [-59,59]){k.box(this.bossModel,xx,0,8,13,108,65,c,0,.5);k.ball(this.bossModel,xx,54,3,22,22,22,c);}
  for(const side of [-1,1]){const hand=k.group(this.bossModel,side*76,-13,-3);k.ball(hand,0,0,0,31,41,35,c);k.cone(hand,0,26,0,24,25,24,'#f1d5a3');}
  this.bossShield=k.ring(this.bossModel,0,0,45,150,c,1);this.bossLabel=this.label(this.bossModel,'ESCUDO ACTIVO',0,89,40,17);this.bossOpenLabel=this.label(this.bossModel,'¡PUNTO DÉBIL!',0,89,40,18,'#d3ffae');this.bossOpenLabel.visible=false;
  const tex=new T.TextureLoader().load('/assets/boss-atlas.png');tex.colorSpace=T.SRGBColorSpace;tex.repeat.set(.5,.5);tex.offset.set((id%2)*.5,id<2?.5:0);k.textures.push(tex);
  const face=new T.Mesh(new T.PlaneGeometry(98,98),new T.MeshBasicMaterial({map:tex,toneMapped:false}));face.position.set(0,0,37);face.userData.privateGeometry=true;face.userData.privateMaterial=true;this.bossModel.add(face);
  this.bossEffects=new T.Group();this.root.add(this.bossEffects);
 }
 createSky(map){
  const k=this.kit;this.sky=new T.Group();this.root.add(this.sky);
  if(map.id===3){const stars=new Float32Array(160*3);for(let i=0;i<160;i++){stars[i*3]=(Math.sin(i*43.7)*.5+.5)*7000-3500;stars[i*3+1]=300+(Math.sin(i*17.3)*.5+.5)*2100;stars[i*3+2]=-2200-(i%7)*140;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(stars,3));const points=new T.Points(geo,new T.PointsMaterial({color:'#e0e7ff',size:6,sizeAttenuation:true}));points.userData.privateGeometry=true;points.userData.privateMaterial=true;this.sky.add(points);k.ball(this.sky,1000,970,-2600,740,740,740,'#a197c2',.08);k.ring(this.sky,1000,970,-2600,1180,'#8d82ae').rotation.x=1.05;}
  else{k.ball(this.sky,950,1120,-3000,480,480,200,map.id===1?'#ffe7be':'#fff2ce',.7);for(let i=0;i<9;i++){const cloud=k.group(this.sky,-2700+i*720,740+(i%3)*165,-1700-(i%2)*600);for(let j=0;j<3;j++)k.ball(cloud,j*105,Math.sin(j)*26,0,220,95,100,map.id===2?'#eef9ff':'#f2eee0');}}
  k.freeze(this.sky); // sky batching leaves no hundreds of cloud draw calls
 }
 updateDynamics(world,time,left,right,me){
  const active=world.activated??[],pressed=world.pressed??[];
  for(const o of this.dynamic){o.g.visible=o.x+o.w>=left&&o.x<=right;if(!o.g.visible)continue;
   if(o.type==='gate')o.panel.visible=!active.includes(o.data.id);
   if(o.type==='plate'){const on=pressed.includes(o.data.id)||active.includes(o.data.group);o.button.material=this.kit.mat(on?'#b6f398':'#efc775',on?.2:0);o.button.scale.y=on?3:7;}
   if(o.type==='bridge')o.g.visible=active.includes(o.data.id);
   if(o.type==='crumble')o.g.visible=crumbleActive(o.data,world);
   if(o.type==='laser'){const on=(world.frame+o.data.offset)%o.data.period<o.data.on;o.beam.visible=o.core.visible=on;}
   if(o.type==='checkpoint'){o.flag.material=this.kit.mat(o.index<=(me?.checkpoint??-1)?'#b9ee8e':'#fbefbb');o.flag.rotation.y=this.reduced?0:Math.sin(time*3+o.index)*.1;}
   if(o.type==='npc')o.g.rotation.y=this.reduced?0:Math.sin(time*.9)*.1;
   if(o.type==='egg')o.g.visible=!(world.eggs??[]).includes(o.data.id);
   if(o.type==='belt'&&!this.reduced)for(const r of o.rollers)r.rotation.y=time*o.data.speed*3;
  }
  for(const a of this.landmarks){if(a.wheel&&!this.reduced)a.wheel.rotation.z=time*.25;if(a.ring&&!this.reduced)a.ring.rotation.z=time*.2;}
 }
 animateActor(model,e,state,world,time){
  const pose=enemyPose(e,state,world.frame??0,this.reduced),d=model.userData;
  model.position.set(e.x+e.w/2,Y(e.y+e.h/2),0);d.body.scale.set(pose.sx,pose.sy,1);d.body.rotation.z=-pose.angle;d.body.position.y=-pose.lift;
  // Turn the volumetric model, while keeping both eyes readable from the camera.
  d.body.rotation.y=(e.facing??1)>0?-.18:-.6;
  const step=this.reduced?0:Math.sin((world.frame+(e.offset??0))*.17);d.limbs.forEach((l,i)=>{l.rotation.z=step*(i%2?-.2:.2);if(e.kind==='toaster')l.rotation.x=step*.55;});
  model.visible=pose.opacity>.5;this.placeShadow(model,e.x+e.w/2,e.y+e.h);
 }
 placeShadow(model,x,feet){let floor=Infinity;for(const [sx,sy,w] of this.shadowSurfaces)if(x>=sx&&x<=sx+w&&sy>=feet-3&&sy<floor)floor=sy;const d=model.userData.disc,distance=floor-feet;d.visible=Number.isFinite(floor)&&distance<500;if(d.visible){d.position.y=Y(floor)-model.position.y+.7;d.scale.setScalar(Math.max(.55,1-distance/850));d.material.opacity=Math.max(.04,.18-distance/1800);}}
 releaseActor(model){model.traverse(o=>{if(o.isSprite){o.material.map?.dispose();this.kit.textures=this.kit.textures.filter(t=>t!==o.material.map);o.material.dispose();}if(o.userData.privateGeometry)o.geometry?.dispose();if(o.userData.privateMaterial)o.material?.dispose();});this.root.remove(model);}
 drawActors(players,localId,world,time,dt,left,right){
  const k=this.kit,ids=new Set(players.map(p=>p.id));
  for(const [id,o] of this.actors)if(!ids.has(id)){this.releaseActor(o.model);this.actors.delete(id);}
  for(const p of players){let o=this.actors.get(p.id);if(!o){const model=actor(k,'cube',p.color);this.root.add(model);const eq=equipment(k,model.userData.body),label=this.label(model,p.name+(p.id===localId?' · TÚ':''),0,50,0,18,p.id===localId?'#eaffbc':'#fff5d8');o={model,eq,label,grounded:p.grounded,sx:1,sy:1,deaths:p.deaths};this.actors.set(p.id,o);}
   o.model.visible=!p.eliminated&&p.x+32>=left&&p.x<=right;if(!o.model.visible)continue;
   if(p.grounded&&!o.grounded){o.sx=1.22;o.sy=.78;this.burst(p.x+16,Y(p.y+32),'#c7d5ae',8);}if(p.deaths!==o.deaths){o.sx=.7;o.sy=1.3;this.burst(p.x+16,Y(p.y+16),p.color,14);}
   if(p.thrust&&this.frames%3===0)this.burst(p.x+16,Y(p.y+35),'#a5faff',1,-35);
   if(p.grounded&&Math.abs(p.vx)>2&&this.frames%6===0)this.burst(p.x+16,Y(p.y+32),'#dbd8bd',1);
   o.sx+=(1-o.sx)*(1-Math.exp(-15*dt));o.sy+=(1-o.sy)*(1-Math.exp(-15*dt));o.grounded=p.grounded;o.deaths=p.deaths;
   o.model.position.set(p.x+16,Y(p.y+16),0);this.placeShadow(o.model,p.x+16,p.y+32);const d=o.model.userData;d.body.scale.set(this.reduced?1:o.sx,this.reduced?1:o.sy,1);d.body.rotation.z=this.reduced?0:-p.vx*.012;d.body.rotation.y=p.facing>0?-.16:-.55;d.body.visible=!(p.invulnerable>0&&!this.reduced&&Math.floor(time*12)%2);
   o.eq.gun.visible=p.power===1;o.eq.pack.visible=p.power===2;o.eq.banana.visible=p.power===3;o.eq.flame.visible=p.power===2&&p.input?.use&&p.fuel>0;o.eq.flame.scale.y=this.reduced?23:23+Math.sin(time*45)*6;
   o.eq.gun.scale.x=p.facing<0?-1:1;o.eq.gun.position.x=p.facing<0?-15:15;o.eq.charge.visible=(p.charge??0)>5;o.eq.charge.scale.setScalar(p.charge>=60?10:5);o.eq.charge.material=k.mat(p.charge>=60?'#ffb17c':'#baf8e9',1.3);
   const stretch=p.grounded?0:clamp(-p.vy*.009,-.07,.11);if(!this.reduced){d.body.scale.x-=stretch;d.body.scale.y+=stretch;}
  }
  const living=enemyPositions(this.level,world),enemyIds=new Set(living.map(e=>e.id));for(const [id,o] of this.enemies)if(!enemyIds.has(id)){this.burst(o.model.position.x,o.model.position.y,'#f9d6a1',12);this.releaseActor(o.model);this.root.remove(o.intent);this.enemies.delete(id);}
  for(const e of living){if(e.x+e.w<left||e.x>right){const old=this.enemies.get(e.id);if(old){old.model.visible=false;old.intent.visible=false;}continue;}
   let o=this.enemies.get(e.id);if(!o){const model=actor(k,e.kind);this.root.add(model);const intent=k.group(this.root);const halo=k.ring(intent,0,0,0,47,'#f6bb7c',.65);const arrow=k.cone(intent,0,0,0,10,23,6,'#ffd389',.3);arrow.rotation.z=-Math.PI/2;arrow.position.set(28,-25,0);const aim=k.box(intent,0,0,-5,1,2,2,'#e5a8c9',.6);aim.visible=false;const hp=k.group(model,0,30,0),dots=[];for(let n=0;n<(e.combat?.hp??0);n++)dots.push(k.ball(hp,(n-1)*8,0,0,5,5,4,'#f2b79b',.3));o={model,intent,halo,arrow,aim,dots};if(e.combat){const armor=k.group(model.userData.body);if(e.combat.type==='guardian'){k.box(armor,0,0,17,31,19,5,'#7e8c92',0,.6);k.box(armor,0,0,21,5,17,2,'#f1d38b');}if(e.combat.type==='gunner'){k.box(armor,0,15,-1,23,7,24,'#4c717d');k.ball(armor,0,15,13,6,6,4,'#aaf7e8',1);}if(e.combat.type==='charger')k.box(armor,0,16,0,29,5,24,'#b26c65');}this.enemies.set(e.id,o);}
   if(o.hp!==undefined&&e.hp<o.hp)this.burst(e.x+e.w/2,Y(e.y+e.h/2),'#ffe6b5',7);o.hp=e.hp;
   this.animateActor(o.model,e,world.enemyStates?.[e.id]??{},world,time);o.intent.visible=e.phase==='windup'||e.phase==='attack'||e.phase==='slipping';o.intent.position.set(e.x+e.w/2,Y(e.y)-10,27);o.halo.material=k.mat(e.phase==='slipping'?'#f9df77':e.phase==='attack'?'#ff8b87':'#ffd98b',.8);o.halo.rotation.z=this.reduced?0:time*2;o.arrow.position.x=(e.facing??1)*28;o.arrow.rotation.z=-(e.facing??1)*Math.PI/2;o.arrow.visible=e.phase==='windup'||e.phase==='attack';o.dots.forEach((d,i)=>d.visible=i<e.hp);
   const state=world.enemyStates?.[e.id];o.aim.visible=e.combat?.type==='gunner'&&e.phase==='windup'&&state?.aimX!==undefined;if(o.aim.visible){const dx=state.aimX-(e.x+e.w/2),dy=Y(state.aimY)-o.intent.position.y;o.aim.scale.x=Math.min(240,Math.hypot(dx,dy));o.aim.position.set(dx*.5,dy*.5,0);o.aim.rotation.z=Math.atan2(dy,dx);}
  }
 }

 burst(x,y,color,count=6,velocity=65){
  if(this.reduced)return;for(let i=0;i<count&&this.particles.length<120;i++)this.particles.push({x,y:y+2,z:15,vx:(Math.random()-.5)*130,vy:velocity+Math.random()*65,vz:(Math.random()-.5)*55,life:.3+Math.random()*.35,total:.65,color:new T.Color(color),size:2+Math.random()*3});
 }
 drawParticles(time,dt){
  const m=this.particleMatrix;let count=0;
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.vy-=220*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;m.position.set(p.x,p.y,p.z);m.rotation.set(p.life*3,p.life*4,0);m.scale.setScalar(p.size*Math.min(1,p.life*5));m.updateMatrix();this.dust.setMatrixAt(count,m.matrix);this.dust.setColorAt(count,p.color);count++;}
  this.dust.count=count;this.dust.instanceMatrix.needsUpdate=true;if(this.dust.instanceColor)this.dust.instanceColor.needsUpdate=true;
  this.motes.visible=!this.reduced;if(this.reduced)return;for(let i=0;i<45;i++){m.position.set(this.focusX-950+((i*137+time*(this.level.id===2?10:4))%1900),130+((i*71-time*(this.level.id===2?16:2))%600+600)%600,-120-(i%4)*42);m.scale.setScalar(2+(i%3));m.rotation.set(0,0,0);m.updateMatrix();this.motes.setMatrixAt(i,m.matrix);}this.motes.instanceMatrix.needsUpdate=true;
 }
 effect(id,build){let g=this.fx.get(id);if(!g){g=new T.Group();this.root.add(g);build(g);this.fx.set(id,g);}return g;}
 drawEffects(world,time,left,right){
  const k=this.kit,alive=new Set();
  for(const p of world.projectiles??[]){const id=`p${p.id}`;alive.add(id);const g=this.effect(id,g=>{if(p.kind==='banana'){for(let i=0;i<3;i++)k.ball(g,i*3-3,Math.sin(i)*5,0,8,8,8,'#f2d76b');}else{k.ball(g,0,0,0,(p.r??4)*2,(p.r??4)*2,(p.r??4)*2,p.kind==='explosive'?'#ffad77':p.team==='enemy'?'#f4a0cb':'#fff2ba',1.2);k.cone(g,-8,0,0,5,17,5,p.kind==='explosive'?'#ffe5b3':'#bcffff').rotation.z=-Math.PI/2;}});g.visible=p.x>left&&p.x<right;g.position.set(p.x,Y(p.y),12);g.rotation.z=p.kind==='banana'?-time*9:Math.atan2(-p.vy,p.vx);}
  for(const p of world.puddles??[]){const id=`s${p.id}`;alive.add(id);const g=this.effect(id,g=>{k.ball(g,0,0,0,p.w,3,80,'#f0d16a',.12);for(let i=0;i<6;i++)k.box(g,(i-2.5)*p.w/7,1,((i%2)-.5)*27,12,2,5,'#fff0a5');});g.position.set(p.x+p.w/2,Y(p.y)+2,0);g.visible=p.x+p.w>left&&p.x<right;}
  for(const e of world.explosions??[]){const id=`e${e.id}`;alive.add(id);const g=this.effect(id,g=>{const m=k.ball(g,0,0,0,e.r*2,e.r*2,e.r*.8,'#ffd09a',1);m.material=new T.MeshBasicMaterial({color:'#ffd09a',transparent:true,opacity:.5,depthWrite:false});m.userData.privateMaterial=true;k.ring(g,0,0,0,e.r*2,'#fff0b9',1);});g.position.set(e.x,Y(e.y),0);g.visible=e.x+e.r>left&&e.x-e.r<right;const life=clamp((e.until-world.frame)/18,0,1);g.scale.setScalar(1+(1-life)*.6);g.children[0].material.opacity=life*.5;}
  for(const [id,g] of this.fx)if(!alive.has(id)){g.traverse(m=>{if(m.userData.privateMaterial)m.material.dispose();});this.root.remove(g);this.fx.delete(id);}
  if(!this.sawModels)this.sawModels=[];
  const saws=sawPositions(this.level,world);for(let i=0;i<saws.length;i++){const s=saws[i];let g=this.sawModels[i];if(!g){g=k.group(this.root);k.cylinder(g,0,0,0,s.radius*1.6,8,s.radius*1.6,'#b9cbd1',.8).rotation.x=Math.PI/2;for(let j=0;j<12;j++){const a=j*Math.PI/6,tooth=k.cone(g,Math.cos(a)*s.radius*.85,Math.sin(a)*s.radius*.85,0,10,12,9,'#e2d9bd');tooth.rotation.z=a-Math.PI/2;}k.ball(g,0,0,7,9,9,5,'#dba373');this.sawModels[i]=g;}g.visible=s.x+s.radius>left&&s.x-s.radius<right;g.position.set(s.x,Y(s.y),0);g.rotation.z=this.reduced?0:time*7;}
 }
 drawBoss(world,time,left,right){
  if(!this.bossModel)return;const b=this.level.boss,view=bossView(this.level,world);this.bossModel.visible=!!view&&b.x+b.w>left&&b.x<right;
  this.bossEffects.clear();if(!view||!this.bossModel.visible)return;const k=this.kit,[x,y,w,h]=view.rect;
  this.bossModel.position.set(x+w/2,Y(y+h/2),0);this.bossShield.visible=!view.open;this.bossLabel.visible=!view.open;this.bossOpenLabel.visible=view.open;this.bossShield.rotation.z=this.reduced?0:time*.5;
  this.bossModel.rotation.z=this.reduced?0:Math.sin(time*2)*.015;
  // Geometry is precisely aligned with the shared authoritative hazard rectangles.
  for(const r of view.warnings){const [xx,yy,ww,hh]=r;k.box(this.bossEffects,xx+ww/2,Y(yy+hh/2),-30,ww,hh,5,'#b79052',.15);k.box(this.bossEffects,xx+ww/2,Y(yy+hh)+2,0,ww,3,95,'#ffd584',.9);}
  for(const r of view.hazards){const [xx,yy,ww,hh]=r,c=['#8fe0ff','#9cff88','#ffe784','#ff8c7f'][this.level.id];k.box(this.bossEffects,xx+ww/2,Y(yy+hh/2),0,ww,hh,45,c,1.1);k.box(this.bossEffects,xx+ww/2,Y(yy+hh/2),25,Math.min(ww,7),hh,5,'#ffffff',1.8);}
 }
 draw(players,localId,time,dt,world={frame:0}){
  if(this.lost||!this.level||!this.w||!this.h)return;
  const own=players.find(p=>p.id===localId),me=own?.eliminated?(players.find(p=>!p.eliminated&&!p.finished)??own):own;
  const distance=1050,vertical=2*Math.tan(T.MathUtils.degToRad(20))*Math.hypot(distance,300),view=vertical*this.camera.aspect;
  const bounds=zoneBounds(this.level,me),min=bounds.x+Math.min(view*.48,bounds.w/2),max=bounds.x+bounds.w-Math.min(view*.48,bounds.w/2);
  const target=clamp((me?.x??110)+view*.12+(me?.vx??0)*9,min,max);
  if(this.lastZone!==me?.zone||Math.abs(target-this.focusX)>view*1.3){this.focusX=target;this.lastZone=me?.zone;this.particles=[];}else this.focusX+=(target-this.focusX)*(1-Math.exp(-7*dt));
  this.camera.position.set(this.focusX,650,distance);this.camera.lookAt(this.focusX,350,0);
  this.sun.position.set(this.focusX-380,1100,650);this.sun.target.position.set(this.focusX,150,0);this.sun.target.updateMatrixWorld();
  const left=this.focusX-view*.7-220,right=this.focusX+view*.7+220;
  for(const c of this.chunks)c.g.visible=c.x+c.w>=left&&c.x<=right;
  this.sky.position.x=this.focusX*.85;
  this.goalFlag.visible=!!world.bossDefeated&&this.level.goal.x>left&&this.level.goal.x<right;
  this.updateDynamics(world,time,left,right,me);this.drawActors(players,localId,world,time,dt,left,right);this.drawEffects(world,time,left,right);this.drawBoss(world,time,left,right);
  this.drawParticles(time,dt);this.gpu.render(this.scene,this.camera);this.frames++;this.stats.calls=this.gpu.info.render.calls;this.stats.triangles=this.gpu.info.render.triangles;
  // Reduce resolution and shadows once if a device cannot sustain the scene.
  if(this.quality==='auto'&&!this.adaptiveLow&&dt<.25){this.slow=dt>.029?this.slow+1:Math.max(0,this.slow-1);if(this.frames>60&&this.slow>40){this.adaptiveLow=true;this.resize();}}
 }
 dispose(){this.resizeObserver.disconnect();this.canvas.removeEventListener('webglcontextlost',this.onLost);this.clear();this.kit.dispose();this.gpu.dispose();}
}
