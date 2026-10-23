import * as T from '/vendor/three.module.js';
export class Art {
 constructor(){this.mats=new Map();this.geos={box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(.5,10,7),cyl:new T.CylinderGeometry(.5,.5,1,10),cone:new T.ConeGeometry(.5,1,7),ring:new T.TorusGeometry(.5,.07,6,16)};this.textures=[];}
 mat(color,glow=0,metal=.1){const key=`${color}/${glow}/${metal}`;if(!this.mats.has(key))this.mats.set(key,new T.MeshStandardMaterial({color,roughness:.8,metalness:metal,flatShading:true,emissive:color,emissiveIntensity:glow}));return this.mats.get(key);}
 mesh(parent,type,x,y,z,w,h,d,color,glow=0,metal=.1){const m=new T.Mesh(this.geos[type],this.mat(color,glow,metal));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 box(...a){return this.mesh(a[0],'box',...a.slice(1));}ball(...a){return this.mesh(a[0],'ball',...a.slice(1));}cyl(...a){return this.mesh(a[0],'cyl',...a.slice(1));}
 group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent?.add(g);return g;}
 texture(kind){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=kind==='floor'?'#95816a':kind==='wall'?'#ada184':'#343a3b';ctx.fillRect(0,0,128,128);
  if(kind==='floor'){for(let z=0;z<4;z++)for(let x=0;x<4;x++){ctx.fillStyle=(x+z)%2?'#383c39':'#a69a7d';ctx.fillRect(x*32,z*32,31,31);}}
  else if(kind==='wall'){ctx.fillStyle='#624841';ctx.fillRect(0,70,128,48);ctx.fillStyle='#bf925e';ctx.fillRect(0,70,128,5);for(let x=0;x<128;x+=16){ctx.strokeStyle='#332d2a55';ctx.strokeRect(x,76,16,48);}}
  else{ctx.strokeStyle='#7c858366';for(let i=0;i<128;i+=32){ctx.strokeRect(i,0,32,128);ctx.strokeRect(0,i,128,32);}}
  for(let i=0;i<600;i++){const x=(i*37)%128,y=(i*71+Math.floor(i/128)*17)%128;ctx.fillStyle=i%3?'#00000010':'#ffffff0c';ctx.fillRect(x,y,1+i%3,1);}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.wrapS=t.wrapT=T.RepeatWrapping;this.textures.push(t);return t;
 }
 sign(parent,text,x,y,z,w=2,h=.55,color='#c1b67e',background='#252b26'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.strokeRect(5,5,502,118);ctx.fillStyle=color;ctx.font='bold 45px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66,480);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;this.textures.push(tex);const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,toneMapped:false}));plane.position.set(x,y,z);parent.add(plane);return plane;
 }
 mascot(id){
  const root=new T.Group(),body=this.group(root,0,1.1,0),head=this.group(body,0,.9,0),arms=[],legs=[];
  const skin={prisma:'#b1a58a',welder:'#70877a',gold:'#bf9d51',ember:'#655451'}[id],glow={prisma:'#69baff',welder:'#71ff85',gold:'#ffe389',ember:'#ff6146'}[id];
  this.box(body,0,0,0,.72,.85,.44,skin);this.box(body,0,-.48,0,.55,.18,.36,'#3d4643');
  for(const side of [-1,1]){const a=this.group(body,side*.55,.32,0);this.ball(a,0,0,0,.26,.26,.26,'#41484a');this.cyl(a,0,-.24,0,.18,.48,.18,skin);this.ball(a,0,-.5,0,.2,.2,.2,'#333f42');this.box(a,0,-.73,0,.2,.4,.22,skin);for(let j=0;j<3;j++)this.box(a,(j-1)*.065,-1,0,.045,.2,.08,'#8b918b');arms.push(a);
   const l=this.group(root,side*.22,.65,0);this.cyl(l,0,-.15,0,.2,.45,.2,skin);this.ball(l,0,-.36,0,.21,.21,.21,'#323c3b');this.box(l,0,-.49,.02,.2,.28,.2,skin);this.box(l,0,-.63,.1,.29,.15,.46,'#343d3e');legs.push(l);}
  this.box(head,0,0,0,.58,.57,.52,skin);this.box(head,0,-.3,.12,.45,.14,.36,'#454d49');
  for(let i=0;i<6;i++)this.box(head,(i-2.5)*.065,-.24,.29,.05,.06,.04,'#e0d7b7');
  for(const side of [-1,1]){this.ball(head,side*.15,.04,.27,.16,.15,.08,'#202b2c');this.ball(head,side*.15,.04,.32,.055,.055,.04,glow,2);}
  if(id==='prisma'){
   for(let i=0;i<13;i++){const a=i/13*Math.PI*2;this.ball(head,Math.cos(a)*.31,.29+Math.sin(a)*.15,-.02,.22,.2,.25,'#3b302c');}
   for(const side of [-1,1]){const ring=this.mesh(head,'ring',side*.16,.045,.34,.31,.27,.1,'#4a6d89',.3,.6);this.box(head,side*.16,.045,.325,.23,.17,.025,'#5b90b9',.35);}this.box(head,0,.05,.34,.08,.045,.05,'#5a7f95');
   this.mesh(body,'cone',0,-.3,0,1.1,1.1,.76,'#b7b09b');this.box(body,-.16,.2,.26,.23,.66,.06,'#d4c8aa');this.mesh(body,'ring',0,.29,.28,.25,.25,.08,glow,.7);
  }
  if(id==='welder'){
   this.box(head,0,.3,0,.7,.14,.6,'#687960');this.box(head,0,.4,0,.48,.16,.43,'#83967b');this.box(body,0,-.05,.25,.62,.65,.08,'#2d5547');this.box(body,0,.11,.3,.36,.12,.025,glow,.15);
   this.cyl(body,0,.08,-.4,.39,.75,.39,'#394a43');for(let i=0;i<4;i++)this.box(body,0,-.16+i*.13,-.61,.28,.035,.025,'#7aa178');const tool=this.box(arms[1],0,-.9,.25,.21,.3,.5,'#3b5048');this.cyl(arms[1],0,-.9,.65,.12,.5,.12,'#9cc292').rotation.x=Math.PI/2;this.ball(arms[1],0,-.9,.92,.11,.11,.11,glow,2);
  }
  if(id==='gold'){
   this.box(body,0,.03,.26,.68,.75,.08,'#ddd4af');for(let i=0;i<6;i++){const p=this.box(body,(i%3-1)*.21,-.2+Math.floor(i/3)*.36,.315,.16,.2,.025,i%2?'#b27765':'#78977d');p.rotation.z=i*.7;}
   this.box(head,0,-.29,.11,.6,.25,.46,'#ad935d');for(const side of [-1,1])this.box(head,side*.16,.08,.31,.27,.14,.08,'#32352b',0,.5);this.box(head,0,.075,.35,.08,.035,.03,'#d9bd6c');for(let i=0;i<7;i++)this.ball(head,(i-3)*.08,.33,-.1,.18,.13,.33,'#453f2e');
   for(let i=0;i<7;i++)this.ball(body,Math.sin(i)*.29,.36-Math.abs(i-3)*.05,.32,.12,.12,.08,i%2?'#c7ad77':'#b68176');
  }
  if(id==='ember'){
   for(const side of [-1,1]){this.mesh(body,'cone',side*.52,.47,0,.42,.36,.5,'#534340');this.box(head,side*.29,.1,0,.12,.56,.5,'#3d3d3c');this.mesh(head,'cone',side*.23,.51,0,.18,.5,.18,'#765348').rotation.z=-side*.3;}
   this.box(head,0,.2,.23,.5,.1,.15,'#3c3c3a');for(let i=0;i<8;i++)this.box(body,(i%3-1)*.18,-.32+Math.floor(i/3)*.24,.25,.035,.17,.035,glow,1.1);this.box(body,0,-.05,-.34,.8,1,.28,'#373838');
   for(let i=0;i<5;i++)this.cyl(body,(i-2)*.13,.75,-.35,.06,.85,.06,'#5a4743').rotation.z=(i-2)*.15;
  }
  root.userData={body,head,arms,legs,id};return root;
 }
}
