import * as T from '/vendor/three.module.js';
// All models are authored in game pixels. The playable lane is z=0.
// Shared geometry/materials and static batching keep the scene inexpensive.
export class ModelKit {
 constructor(){this.materials=new Map();this.geometries=new Map();this.batches=[];this.textures=[];}
 mat(color,glow=0,metal=0){const key=`${color}/${glow}/${metal}`;if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,roughness:metal?.38:.83,metalness:metal,emissive:color,emissiveIntensity:glow,flatShading:true}));return this.materials.get(key);}
 geo(kind){if(!this.geometries.has(kind)){const gs={box:()=>new T.BoxGeometry(1,1,1),ball:()=>new T.SphereGeometry(.5,10,7),rock:()=>new T.IcosahedronGeometry(.5,0),cone:()=>new T.ConeGeometry(.5,1,7),cylinder:()=>new T.CylinderGeometry(.5,.5,1,10),torus:()=>new T.TorusGeometry(.5,.07,5,24)};this.geometries.set(kind,gs[kind]());}return this.geometries.get(kind);}
 shape(g,kind,x,y,z,w,h,d,color,glow=0,metal=0){const m=new T.Mesh(this.geo(kind),this.mat(color,glow,metal));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 box(g,x,y,z,w,h,d,c,glow=0,metal=0){return this.shape(g,'box',x,y,z,w,h,d,c,glow,metal);}
 ball(g,x,y,z,w,h,d,c,glow=0){return this.shape(g,'ball',x,y,z,w,h,d,c,glow);}
 cone(g,x,y,z,w,h,d,c){return this.shape(g,'cone',x,y,z,w,h,d,c);}
 cylinder(g,x,y,z,w,h,d,c,metal=0){return this.shape(g,'cylinder',x,y,z,w,h,d,c,0,metal);}
 ring(g,x,y,z,r,c,glow=0){return this.shape(g,'torus',x,y,z,r,r,r,c,glow,.35);}
 group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent?.add(g);return g;}
 rod(g,a,b,r,c){const av=new T.Vector3(...a),bv=new T.Vector3(...b),m=this.cylinder(g,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,av.distanceTo(bv),r,c);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;}
 freeze(group){
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),buckets=new Map();
  group.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld));const bucket=buckets.get(m.material)??[];bucket.push(geo);buckets.set(m.material,bucket);});
  const points=group.children.filter(o=>o.isPoints);group.clear();if(points.length)group.add(...points);for(const [mat,list] of buckets){const merged=new T.BufferGeometry();for(const key of ['position','normal','uv']){const size=key==='uv'?2:3,total=list.reduce((n,g)=>n+(g.attributes[key]?.array.length??0),0),data=new Float32Array(total);let n=0;for(const geo of list){if(!geo.attributes[key])continue;data.set(geo.attributes[key].array,n);n+=geo.attributes[key].array.length;}merged.setAttribute(key,new T.BufferAttribute(data,size));}for(const geo of list)geo.dispose();merged.computeBoundingSphere();this.batches.push(merged);const mesh=new T.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}return group;
 }
 clearBatches(){for(const g of this.batches)g.dispose();this.batches=[];}
 label(text,color='#fff3d0',size=20){const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d');ctx.font='700 42px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=7;ctx.strokeStyle='#172936';ctx.strokeText(text,256,32,500);ctx.fillStyle=color;ctx.fillText(text,256,32,500);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;this.textures.push(texture);const material=new T.SpriteMaterial({map:texture,depthTest:true,transparent:true});const sprite=new T.Sprite(material);sprite.scale.set(size*8,size,1);return sprite;}
 dispose(){this.clearBatches();for(const m of this.materials.values())m.dispose();for(const g of this.geometries.values())g.dispose();for(const t of this.textures)t.dispose();}
}
const skin=['#6a9165','#bd866b','#83acc5','#69668a'],cap=['#b3dc72','#edbd83','#e1fbff','#b9a8ef'];
export function terrain(k,g,rect,id,kind='ground'){
 const [x,y,w,h]=rect,top=720-y,depth=kind==='ledge'?72:150;
 const color=kind==='wood'||kind==='room'?'#97704e':kind==='dungeon'?'#596276':kind==='ice'?'#9ed8e5':skin[id];
 k.box(g,x+w/2,top-h/2,0,w,h,depth,color);
 k.box(g,x+w/2,top-4,0,w,8,depth+4,kind==='wood'||kind==='room'?'#d5ac75':kind==='dungeon'?'#969da7':kind==='ice'?'#defbff':cap[id]);
 if(kind==='ledge'||kind==='room'||kind==='dungeon'){for(let dx=10;dx<w;dx+=48)k.box(g,x+dx,top-12,38,4,8,7,'#d3c598');return;}
 for(let dx=22;dx<w;dx+=74){
  if(id===0){k.shape(g,'rock',x+dx,top-28-dx%27,78,39,28,5,'#a7b780');k.rod(g,[x+dx,top-10,78],[x+dx+13,top-Math.min(h-8,90),78],5,'#567655');}
  if(id===1){k.box(g,x+dx,top-27,77,65,3,4,'#e2b091');k.box(g,x+dx+17,top-63,77,54,4,4,'#a96b66');}
  if(id===2){const m=k.shape(g,'rock',x+dx,top-30,78,46,49,6,'#b8e4ed');m.rotation.z=.4;k.cone(g,x+dx,top-23,83,8,34,8,'#ebffff').rotation.z=Math.PI;}
  if(id===3){k.box(g,x+dx,top-17,78,39,3,2,'#9b8ab7');k.box(g,x+dx,top-16,79,3,9,2,'#c3f8de',.35);}
 }
 if(id===3){for(const xx of [x+30,x+w-30]){k.cone(g,xx,top-h-15,0,34,36,50,'#4e4a6b').rotation.z=Math.PI;k.ring(g,xx,top-h-38,0,14,'#b1efef',.6).rotation.x=Math.PI/2;}}
}
export function tree(k,g,x,y,z,variant=0){
 const scale=.85+(variant%4)*.12,t=k.group(g,x,y,z);t.scale.setScalar(scale);
 k.cylinder(t,0,75,0,20,150,20,'#6b6550');k.rod(t,[0,75,0],[-43,143,0],9,'#6b6550');k.rod(t,[0,95,0],[40,168,-10],8,'#6b6550');
 for(const [xx,yy,zz,s] of [[0,195,0,110],[-48,155,8,85],[48,181,-3,92],[0,245,-12,78]])k.shape(t,'rock',xx,yy,zz,s,s*.8,s,['#83af7d','#9dc38b','#6c9d79'][variant%3]);
 k.ball(t,-24,210,36,15,12,13,'#e9b978');return t;
}
export function crystal(k,g,x,y,z,size=65,id=2){const c=k.group(g,x,y,z);for(let i=0;i<3;i++){const p=k.cone(c,(i-1)*size*.23,size*.45+(i===1?10:0),i%2*-13,size*.3,size*(i===1?1.1:.7),size*.3,id===2?'#c3f7ff':'#aa8add');p.rotation.z=(i-1)*-.22;}return c;}
export function scenery(k,g,rect,id,index){
 const [x,y,w]=rect,ground=720-y;
 for(let i=0;i<Math.max(1,Math.floor(w/220));i++){
  const xx=x+70+i*220+(index*37)%80,z=-160-(i%2)*75;
  if(id===0){tree(k,g,xx,ground-10,z,index+i);k.ball(g,xx+55,ground+7,45,13,13,13,'#c8d88d');k.cylinder(g,xx+55,ground+5,45,4,10,4,'#b0ab85');}
  if(id===1){const r=k.shape(g,'rock',xx,ground+55,z,82,155,90,i%2?'#b88a84':'#cd9e8c');r.rotation.z=.15;for(let j=0;j<3;j++)k.box(g,xx,ground+15+j*37,z+46,65-j*9,5,4,'#ecc09a');k.cylinder(g,xx+52,ground+34,-95,8,66,8,'#6b997f');k.rod(g,[xx+52,ground+40,-95],[xx+72,ground+57,-95],7,'#6b997f');}
  if(id===2){crystal(k,g,xx,ground,z,90+(i%3)*30);k.shape(g,'rock',xx+60,ground+14,-95,65,30,50,'#dceff0');}
  if(id===3){k.shape(g,'rock',xx,ground+65,z,68,90,65,'#655e8d').rotation.z=.4;k.ring(g,xx,ground+95,z+40,36,'#b0f5df',.8);k.box(g,xx,ground+29,z+39,8,36,10,'#b6a5d8');}
 }
 // Distant peaks have their own depth: they move with genuine camera parallax.
 for(let i=0;i<2;i++){const xx=x+i*w*.55;const height=360+(index%3)*100;const mountain=k.shape(g,id===0?'ball':id===3?'rock':'cone',xx,100,-900,w*1.35,height,520,['#83b49b','#a17f9e','#92b4d3','#403d67'][id]);mountain.rotation.y=index*.7;}
 if(index%3===1&&id===0)k.box(g,x+w+35,ground-100,-110,24,220,4,'#7fcbd1',.12);
}
export function house(k,g,h,id){
 const p=k.group(g,h.x,720-h.y,-108),colors=['#c8a272','#bd8c9b','#a8c6d1'];
 k.box(p,0,63,0,174,126,118,colors[h.style%3]??colors[id%3]);
 k.box(p,0,7,8,194,14,142,'#776c63');
 const roof=k.cone(p,0,160,0,244,92,195,['#667d68','#875976','#6b98af','#7569a2'][id]);roof.rotation.y=Math.PI/4;
 k.box(p,52,178,-13,19,78,23,'#7c7576');
 // The door projects to the exact interaction x on the playable lane.
 k.box(p,0,43,63,43,86,7,'#273842');k.box(p,0,43,69,32,73,4,'#71604f');k.ball(p,11,43,73,5,5,4,'#ffdd96',.5);
 for(const xx of [-58,58]){k.box(p,xx,75,62,29,36,5,'#464c53');k.box(p,xx,75,66,22,29,3,'#ffe3a5',.5);k.box(p,xx,75,68,3,31,3,'#f4e2b4');k.box(p,xx,75,68,25,3,3,'#f4e2b4');k.box(p,xx,52,72,40,8,13,'#667c5e');}
 k.box(p,0,111,66,88,15,4,'#f0dab0');
 return p;
}
export function castle(k,g,c,id,entranceX){
 const p=k.group(g,c.x+50,720-c.y,-190),stone=['#697a7b','#6e516c','#729ab0','#4f466c'][id],roof=['#536d61','#80506c','#769fc4','#725b9b'][id];
 k.box(p,0,120,0,320,240,180,stone);k.box(p,0,246,0,338,15,190,'#a7a18e');
 for(const xx of [-180,180]){k.cylinder(p,xx,157,0,92,314,92,stone);k.cone(p,xx,356,0,130,100,130,roof);k.ring(p,xx,292,0,94,'#bfb899').rotation.x=Math.PI/2;for(let j=0;j<3;j++)k.box(p,xx,88+j*75,48,18,32,4,'#f6d38b',.5);}
 for(let xx=-140;xx<160;xx+=47)k.box(p,xx,263,0,24,30,184,stone);
 for(const xx of [-100,-42,42,100])k.box(p,xx,150,95,20,42,5,'#ffdf97',.5);
 const dx=entranceX-(c.x+50);k.box(p,dx,52,101,70,104,12,'#202e3a');k.box(p,dx,53,109,51,90,5,'#584d5a');k.box(p,dx,104,109,84,13,15,'#baa78b');k.ball(p,dx+18,51,113,6,6,4,'#ffdc84',.9);
 k.cylinder(p,180,429,0,4,57,4,'#eadcba');k.box(p,199,440,0,36,23,3,'#edb77b');return p;
}
export function interior(k,g,h,id){
 const x=h.room.x,w=h.room.w,ground=120,z=-95;
 k.box(g,x+w/2,ground+235,z-70,w,470,14,['#6f7d6b','#8d6e79','#718b9c','#69617e'][id]);
 for(let dx=30;dx<w;dx+=92){k.box(g,x+dx,ground+235,z-58,8,470,8,'#4b5c58');k.box(g,x+dx,ground+95,z-55,78,4,3,'#c5b18d');}
 k.box(g,x+w/2,ground-3,0,w,6,153,'#b49975');for(let xx=x+15;xx<x+w;xx+=50)k.box(g,xx,ground+.25,0,2,.5,140,'#7b725e');
 // Door, glowing window, reading nook, bookshelves and a loft.
 k.box(g,x+60,ground+58,-72,63,116,20,'#374545');k.box(g,x+60,ground+58,-59,47,99,7,'#897359');k.ball(g,x+76,ground+58,-53,6,6,6,'#ffdf8b',.7);
 k.box(g,x+300,ground+258,-150,148,165,13,'#e5c695');k.box(g,x+300,ground+258,-140,124,142,4,'#b9dfed',.55);k.box(g,x+300,ground+258,-136,8,150,4,'#e5c695');k.box(g,x+300,ground+258,-136,130,8,4,'#e5c695');
 for(let row=0;row<3;row++){k.box(g,x+w-110,ground+50+row*57,-103,125,7,70,'#b09670');for(let i=0;i<6;i++)k.box(g,x+w-160+i*18,ground+70+row*57,-101,12,33+(i%3)*6,30,['#c28a7f','#9eb9a6','#d9bf78'][i%3]);}
 k.box(g,x+420,ground+1,-15,150,2,91,'#b37c87');k.box(g,x+420,ground+2,-15,128,1,72,'#e0bc94');
 k.box(g,x+520,ground+55,-70,100,8,68,'#92775b');for(const dx of [-38,38])k.box(g,x+520+dx,ground+27,-70,7,54,50,'#78634e');
 k.box(g,x+530,ground+65,-64,28,13,22,'#d6b37b');k.cylinder(g,x+510,ground+70,-51,12,20,12,'#e3e4cb');
 k.box(g,x+80,ground+1,54,70,2,28,'#dfbb7d');
}
export function actor(k,kind,color='#c9a373'){
 const root=new T.Group(),body=k.group(root),limbs=[],eyes=[],accent=[];
 const eye=(x,y,z,w=4)=>{eyes.push(k.ball(body,x,y,z,w,w*1.3,w*.5,'#202f39'));};
 if(kind==='cube'){
  // Layered chamfers read as a soft cuboid without a high-poly mesh.
  k.box(body,0,0,0,27,32,27,color);k.box(body,0,0,0,32,26,27,color);k.box(body,0,0,0,27,26,32,color);
  k.box(body,0,12,0,24,3,26,'#edf6cf');eye(-7,4,16);eye(7,4,16);k.box(body,0,-6,16,7,2,2,'#3b4c4a');
 }else if(kind==='capy'){
  k.ball(body,-3,-2,0,35,26,27,'#a78464');k.ball(body,8,5,1,26,23,25,'#bd9a73');k.box(body,14,1,12,17,10,11,'#cdb38b');
  for(const xx of [-10,8])for(const zz of [-9,10])limbs.push(k.box(body,xx,-13,zz,8,12,8,'#796d59'));
  k.ball(body,2,16,3,8,9,8,'#997352');k.ball(body,15,15,0,8,8,8,'#997352');eye(6,9,13,3);eye(17,8,12,3);k.ball(body,19,1,18,5,4,3,'#504e40');
  k.box(body,-4,13,0,24,7,22,'#71846f');k.cone(body,-4,20,0,16,13,16,'#9bab72');
 }else if(kind==='toaster'){
  k.box(body,0,0,0,32,24,24,'#bad2d3',0,.7);k.box(body,0,-10,0,35,7,26,'#526d7a',0,.5);k.box(body,0,13,0,22,6,13,'#6b6a63');k.box(body,0,17,0,19,8,10,'#e8bb7d');k.box(body,0,16,1,12,5,9,'#d79c60');
  for(const xx of [-8,8]){eye(xx,3,13,4);k.box(body,xx,-14,0,5,5,8,'#49616c');}
  for(const xx of [-1,1]){const wing=k.group(body,xx*18,2,0);k.box(wing,xx*7,0,0,17,4,17,'#8ac3c4');k.box(wing,xx*15,4,-1,6,12,12,'#dce6d8');limbs.push(wing);}
  accent.push(k.ball(body,0,-14,-1,8,9,8,'#80f0ed',1.4));k.cylinder(body,17,0,0,4,13,4,'#e3bf81');
 }else if(kind==='banana'){
  for(let i=0;i<5;i++){const a=(i-2)*.36;k.ball(body,Math.sin(a)*18,Math.cos(a)*23-15,0,12,13,17,'#f4d15d');}
  k.box(body,-13,2,0,6,7,10,'#88734e');k.box(body,0,-12,9,15,4,3,'#9e763f');eye(-5,1,9,3);eye(5,1,9,3);
  for(const side of [-1,1]){const arm=k.group(body,side*10,-3,0);k.box(arm,side*7,-2,0,16,5,7,'#dbc35a');k.ball(arm,side*14,-2,0,8,8,8,'#e6db9f');limbs.push(arm);k.box(body,side*7,-17,2,10,6,13,'#796450');}
 }else{
  k.ball(body,-2,-2,0,34,27,27,'#e8d17b');k.ball(body,9,11,0,23,22,23,'#f5e39f');k.box(body,18,8,10,20,7,13,'#d99452');eye(7,15,11,3);eye(17,14,8,3);
  k.ball(body,-7,0,13,22,14,7,'#c9af66');for(const xx of [-9,8]){limbs.push(k.box(body,xx,-16,4,13,5,15,'#d58a4f'));}k.cone(body,-21,0,0,16,20,16,'#e9cc78').rotation.z=-1.2;
  k.box(body,7,22,0,26,6,24,'#576b70');k.cone(body,7,29,0,22,13,22,'#748782');
 }
 // A very soft contact disc, in addition to the real directional shadow.
 const disc=new T.Mesh(new T.CircleGeometry(17,16),new T.MeshBasicMaterial({color:'#182c3d',transparent:true,opacity:.16,depthWrite:false}));disc.userData.privateGeometry=true;disc.userData.privateMaterial=true;disc.rotation.x=-Math.PI/2;disc.position.set(0,-15.7,0);root.add(disc);
 root.userData={body,limbs,eyes,accent,disc,kind};return root;
}
export function equipment(k,root){
 const gun=k.group(root,15,-4,11);k.box(gun,10,0,0,23,7,7,'#3d5765',0,.6);k.cylinder(gun,20,0,0,7,12,7,'#b5d0ca',.7).rotation.z=Math.PI/2;k.box(gun,0,-5,0,7,10,5,'#ad8268');const charge=k.ball(gun,22,0,0,7,7,7,'#ffad74',1);charge.visible=false;
 const pack=k.group(root,0,0,-18);for(const xx of [-9,9]){k.cylinder(pack,xx,0,0,10,27,10,'#d8b78a',.6);k.cone(pack,xx,-16,0,8,10,8,'#77e8ed').rotation.z=Math.PI;}k.box(pack,0,2,2,15,20,10,'#6e7a8b');const flame=k.cone(pack,0,-25,0,15,23,13,'#8ef3ff');flame.rotation.z=Math.PI;
 const banana=k.group(root,19,-4,13);for(let i=0;i<3;i++)k.ball(banana,i*3,Math.sin(i*.8)*10,0,7,8,7,'#f4d96a');
 return {gun,pack,flame,banana,charge};
}
export function resident(k,n){const r=actor(k,n.kind==='doge'?'capy':n.kind==='frog'?'duck':'cube',n.color);r.scale.setScalar(1.65);if(n.kind==='doge'){k.cone(r.userData.body,-7,22,0,13,23,11,'#b98f62');k.cone(r.userData.body,12,22,0,13,23,11,'#b98f62');}if(n.kind==='frog'){for(const xx of [-9,9]){k.ball(r.userData.body,xx,19,7,14,13,12,'#94bb77');k.ball(r.userData.body,xx,21,13,5,6,3,'#283b35');}}return r;}
export function landmark(k,g,p,id){
 const a=k.group(g,p.x,720-p.y,-170);
 if(id===0){for(const xx of [-70,70]){k.cylinder(a,xx,80,0,29,160,29,'#767b62');k.rod(a,[xx,0,0],[xx*.5,82,0],18,'#7f8c65');}k.box(a,0,168,0,181,24,70,'#aeb28a');k.cone(a,0,201,0,210,50,110,'#779874');k.ring(a,0,95,10,73,'#eac77e',.15);k.ball(a,0,95,18,29,40,22,'#d8e3a2',.4);}
 if(id===1){k.box(a,0,60,0,140,120,70,'#8b6b6c');k.cylinder(a,0,163,0,40,90,40,'#b69778');k.cone(a,0,220,0,105,45,100,'#d2a481');for(const xx of [-60,60])k.box(a,xx,100,30,22,180,27,'#ae8d81');const wheel=k.ring(a,0,120,75,154,'#e0b57a');for(let i=0;i<8;i++){const a=i*Math.PI/4;k.rod(wheel,[0,0,0],[Math.cos(a)*.45,Math.sin(a)*.45,0],.012,'#d9b18b');}return {root:a,wheel};}
 if(id===2){k.box(a,0,17,0,173,34,100,'#799db2');for(let i=0;i<7;i++)k.cylinder(a,(i-3)*21,65+Math.sin(i)*30,0,15,100+Math.sin(i)*60,15,'#b5edfa');k.ring(a,0,130,15,145,'#e3ffff',.2);crystal(k,a,0,30,50,90);}
 if(id===3){k.cylinder(a,0,22,0,160,44,100,'#655b81');k.cylinder(a,0,80,0,18,110,18,'#bfa980');const orb=k.ball(a,0,160,0,60,60,60,'#bcf4dd',.65),ring=k.ring(a,0,160,0,166,'#d9bc85');ring.rotation.x=.65;k.ring(a,0,160,0,130,'#9bb7e3',.2).rotation.y=.85;return {root:a,ring,orb};}
 return {root:a};
}
