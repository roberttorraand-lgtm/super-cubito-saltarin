import * as T from '/vendor/three.module.js';
import {Art} from '/models.js';
import {walls,furniture,rooms,doors,hides,cameras,charger,dispenser,mascots} from '/shared/world.js';
export class Scene {
 constructor(canvas,feed){
  this.art=new Art();this.scene=new T.Scene();this.scene.background=new T.Color('#131513');this.scene.fog=new T.FogExp2('#131513',.032);this.camera=new T.PerspectiveCamera(74,1,.07,65);this.camera.rotation.order='YXZ';
  this.gpu=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});this.gpu.outputColorSpace=T.SRGBColorSpace;this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.15;this.gpu.shadowMap.enabled=true;this.gpu.shadowMap.type=T.PCFSoftShadowMap;
  this.feedGPU=new T.WebGLRenderer({canvas:feed,antialias:false});this.feedGPU.setSize(512,288,false);this.feedGPU.outputColorSpace=T.SRGBColorSpace;this.feedGPU.toneMapping=T.ACESFilmicToneMapping;this.feedGPU.toneMappingExposure=1.55;this.feedCamera=new T.PerspectiveCamera(80,16/9,.1,55);this.feedCamera.rotation.order='YXZ';
  this.scene.add(new T.HemisphereLight('#b4b6a1','#35352e',.65));this.models=new Map();this.players=new Map();this.panels=new Map();this.cameraModels=new Map();this.lights=[];this.quality='normal';this.reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  this.build();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();this.lastFeed=0;
  this.flash=new T.SpotLight('#e4e6cf',30,19,.53,.55,1.35);this.flash.castShadow=true;this.flash.shadow.mapSize.set(512,512);this.flash.shadow.bias=-.001;this.scene.add(this.flash,this.flash.target);
 }
 resize(){const c=this.gpu.domElement,w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;this.gpu.setPixelRatio(1);const factor=this.quality==='low'?.55:.8;this.gpu.setSize(Math.min(1600,w)*factor,Math.min(1000,h)*factor,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.gpu.shadowMap.enabled=this.quality!=='low';}
 build(){const a=this.art,s=this.scene;
  const floorTex=a.texture('floor');floorTex.repeat.set(15,12);const wallTex=a.texture('wall');wallTex.repeat.set(1,1);const steelTex=a.texture('steel');steelTex.repeat.set(10,8);
  const floor=new T.Mesh(new T.PlaneGeometry(30.5,24.5),new T.MeshStandardMaterial({map:floorTex,roughness:.94}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;s.add(floor);
  const ceiling=new T.Mesh(new T.PlaneGeometry(30.5,24.5),new T.MeshStandardMaterial({map:steelTex,color:'#77786f',roughness:1,side:T.DoubleSide}));ceiling.rotation.x=Math.PI/2;ceiling.position.y=3.35;s.add(ceiling);
  const wallMat=new T.MeshStandardMaterial({map:wallTex,roughness:.95});for(const [x,z,w,d] of walls){const m=a.box(s,x,1.65,z,w,3.3,d,'#a29a84');m.material=wallMat;a.box(s,x,.1,z,w+.03,.2,d+.03,'#343c35');a.box(s,x,2.9,z,w+.02,.08,d+.02,'#655d4a');}
  for(const r of rooms){a.box(s,r.x,3.19,r.z,1.6,.08,.3,'#bec9ae',.9);const light=new T.PointLight(r.color,4.2,12,1.8);light.position.set(r.x,2.8,r.z);s.add(light);this.lights.push(light);}
  for(const [x,z,w,d] of furniture){const table=Math.abs(x)===3&&z<4&&z>-4;const top=table?.8:Math.abs(z+10.2)<.1?.28:1.05;a.box(s,x,top/2,z,w,top,d,table?'#80664a':'#555e54');a.box(s,x,top+.03,z,w+.04,.06,d+.04,table?'#b79b6c':'#969a85');
   if(table){for(const dx of [-1,1]){a.box(s,x+dx*(w/2+.3),.38,z,.5,.08,.65,'#935d4e');a.box(s,x+dx*(w/2+.55),.65,z,.09,.6,.65,'#714e46');}a.cyl(s,x,top+.1,z,.15,.15,.15,'#bda976');a.box(s,x+.3,top+.07,z,.3,.04,.25,'#c7b684');}
  }
  // Stage curtains, signage, kitchen equipment and a bank of arcade cabinets.
  a.box(s,0,.14,-10.1,12,.28,2.4,'#584c44');a.box(s,0,2.8,-11.8,13,.65,.15,'#643d39');for(let x=-6.5;x<=6.5;x+=.28)a.box(s,x,1.65,-11.85,.22,2.7,.12,x%1>.5?'#7e4c42':'#533c37');
  a.sign(s,'BRASA BURGER',0,2.55,-11.7,6,.7,'#e1b46a','#502e24');a.sign(s,'LOS AMIGOS DEL TURNO',0,2,-11.67,4,.4);
  for(const [i,x] of [-4,0,4].entries())a.sign(s,['PRISMA','DON 67','EL ASADOR'][i],x,.48,-8.98,1.6,.33);
  a.sign(s,'COCINA',11,2.45,-11.95,2,.45);for(let x=9;x<=12;x+=1.4){a.box(s,x,1.25,-10.6,1,1.1,.8,'#84918a');for(let j=0;j<3;j++)a.box(s,x,1.1+j*.2,-10.15,.8,.04,.03,'#333e39');}
  for(let i=0;i<4;i++){const g=a.group(s,-13.85,0,-2.5+i*1.6);a.box(g,0,.85,0,.9,1.7,1,'#473f57');const screen=a.box(g,.48,1.3,0,.025,.55,.65,i%2?'#6e9b95':'#a77872',.65);a.box(g,.59,.94,0,.3,.08,.85,'#8b8061');for(let j=0;j<3;j++)a.ball(g,.62,1.02,(j-1)*.16,.07,.07,.07,'#ceac69');a.sign(g,'INSERT COIN',.52,1.7,0,.65,.18).rotation.y=Math.PI/2;}
  // Security desktop: lamps and CCTV screens stay legible at the retro render scale.
  a.sign(s,'SEGURIDAD',-11,2.5,-11.96,2.4,.45);for(let i=0;i<3;i++){a.box(s,-13+i*.85,1.45,-10,.65,.5,.18,'#343e37');a.box(s,-13+i*.85,1.45,-9.9,.54,.37,.02,'#7a9f85',.5);}a.box(s,charger.x,1.15,charger.z,.4,.1,.35,'#8fa98d');a.ball(s,charger.x,1.23,charger.z,.06,.06,.06,'#a8eb9f',1.5);a.sign(s,'CARGA / TELÉFONO',-11,1.85,-11.92,1.8,.3);
  a.sign(s,'SALIDA · 07:00',0,2.5,11.96,2.5,.4,'#91c6a0').rotation.y=Math.PI;
  a.box(s,dispenser.x,1.15,dispenser.z,1.1,2.3,.7,'#75534d');a.box(s,dispenser.x,1.4,dispenser.z-.37,.88,1.35,.03,'#547f74',.2);for(let i=0;i<3;i++)a.cyl(s,dispenser.x+(i-1)*.25,1.5,dispenser.z-.42,.14,.3,.14,'#d5af73');
  for(const h of hides){a.box(s,h.x,1,h.z,.85,2,.65,'#56665b');a.box(s,h.x,1,h.z+.34,.7,1.85,.035,'#727b69');for(let i=0;i<4;i++)a.box(s,h.x,1.6+i*.065,h.z+.365,.42,.022,.02,'#273c33');a.box(s,h.x+.24,.95,h.z+.38,.04,.2,.04,'#b1a98b');}
  for(const d of doors){const g=a.group(s,d.x,0,d.z);if(d.w<d.d)g.rotation.y=Math.PI/2;const width=Math.max(d.w,d.d);a.box(g,0,3,0,width+.3,.2,.5,'#454f49');for(const side of [-1,1])a.box(g,side*(width/2+.06),1.5,0,.13,3,.5,'#454f49');const panel=a.group(g,0,1.5,0);a.box(panel,0,0,0,width,3,.19,'#65766c');for(let y=-1.25;y<1.5;y+=.3)a.box(panel,0,y,.11,width-.04,.045,.025,'#a1a58a');this.panels.set(d.id,panel);a.box(g,width/2+.32,1.2,.26,.22,.42,.18,'#293e36');a.ball(g,width/2+.32,1.28,.37,.07,.07,.03,'#b3d99a',.6);}
  for(const c of cameras){const g=a.group(s,c.x,c.y,c.z);g.rotation.y=-c.yaw;this.cameraModels.set(c.id,g);a.box(g,0,0,0,.24,.17,.42,'#b4b8a6');a.cyl(g,0,-.13,0,.04,.2,.04,'#777f73');a.ball(g,0,0,-.22,.1,.1,.05,'#334a42');a.ball(g,.09,-.04,-.23,.025,.025,.025,'#b3e9b2',1);}
  // Emergency lighting and scattered papers add landmarks without blocking movement.
  for(let i=0;i<12;i++){const p=a.box(s,-5+(i*13)%13,.012,-3+(i*7)%12,.3,.012,.4,'#aeb19a');p.rotation.y=i*.8;}
  for(const m of mascots){const model=a.mascot(m.id);model.position.set(m.x,0,m.z);s.add(model);this.models.set(m.id,model);}
 }
 showScare(id){
  const a=this.art;this.scareScene=new T.Scene();this.scareScene.background=new T.Color('#120908');const m=a.mascot(id);this.scareScene.add(m,new T.HemisphereLight('#e4c9ad','#562b2a',2.3));m.userData.arms.forEach(x=>x.rotation.x=-1.1);m.userData.head.rotation.z=.12;const light=new T.PointLight('#de9d7e',8,6);light.position.set(0,2,1);this.scareScene.add(light);this.scareCamera=new T.PerspectiveCamera(44,this.camera.aspect,.05,10);this.scareCamera.position.set(.06,2.03,1.08);this.scareCamera.lookAt(0,1.95,0);this.scareUntil=performance.now()/1000+1.05;
 }
 draw(state,me,look,dt,time){
  if(!me)return;const a=this.art,w=state.world;
  const eye=me.hidden?1.05:look.crouch?1:1.62;const bob=!this.reduced&&look.moving&&!me.hidden?Math.sin(time*(look.run?12:8))*.025:0;
  this.camera.position.set(me.x,eye+bob,me.z);this.camera.rotation.set(look.pitch,-look.yaw,0,'YXZ');
  this.flash.visible=me.flashlight&&me.alive&&!me.hidden;this.flash.position.copy(this.camera.position);const dir=new T.Vector3();this.camera.getWorldDirection(dir);this.flash.target.position.copy(this.camera.position).add(dir.multiplyScalar(8));
  for(const e of w.enemies){const m=this.models.get(e.id);m.position.x+=(e.x-m.position.x)*(1-Math.exp(-12*dt));m.position.z+=(e.z-m.position.z)*(1-Math.exp(-12*dt));const goal=e.state==='dormant'?0:Math.PI-(e.yaw??0);let delta=Math.atan2(Math.sin(goal-m.rotation.y),Math.cos(goal-m.rotation.y));m.rotation.y+=delta*(1-Math.exp(-9*dt));const d=m.userData,walking=!['dormant','watched','stunned'].includes(e.state),walk=this.reduced?0:Math.sin(time*6+e.x)*(walking?1:0);d.legs.forEach((l,i)=>l.rotation.x=walk*(i%2?.35:-.35));d.arms.forEach((l,i)=>l.rotation.x=walk*(i%2?-.2:.2));d.head.rotation.z=this.reduced?0:Math.sin(time*.8+e.z)*.035;d.body.position.y=1.1+Math.abs(walk)*.025;}
  for(const [id,panel] of this.panels){const target=w.doors[id].closed?1.5:4.4;panel.position.y+=(target-panel.position.y)*(1-Math.exp(-12*dt));}
  for(const p of state.players){if(p.id===me.id)continue;let model=this.players.get(p.id);if(!model){model=new T.Group();a.cyl(model,0,.8,0,.4,1.15,.4,'#637c71');a.ball(model,0,1.57,0,.32,.38,.32,'#aa9c7f');a.box(model,0,1.78,0,.4,.1,.38,'#2b3d38');this.scene.add(model);this.players.set(p.id,model);}model.visible=p.alive&&!p.hidden;model.position.lerp(new T.Vector3(p.x,0,p.z),1-Math.exp(-12*dt));}
  for(const [id,m] of this.players)if(!state.players.some(p=>p.id===id)){this.scene.remove(m);this.players.delete(id);}
  const danger=w.elapsed>=120;for(let i=0;i<this.lights.length;i++)this.lights[i].intensity=danger?2.6+(this.reduced?0:Math.sin(time*7+i)*.08):4.2;
  if(this.scareScene&&time<this.scareUntil){if(!this.reduced)this.scareCamera.position.x=Math.sin(time*39)*.012;this.gpu.render(this.scareScene,this.scareCamera);}else this.gpu.render(this.scene,this.camera);
  if(me.phone&&time-this.lastFeed>.1){const c=cameras[me.camera??0];this.feedCamera.position.set(c.x,c.y,c.z);this.feedCamera.rotation.set(-.22,-c.yaw,0,'YXZ');this.cameraModels.get(c.id).visible=false;this.feedGPU.render(this.scene,this.feedCamera);this.cameraModels.get(c.id).visible=true;this.lastFeed=time;}
 }
}
