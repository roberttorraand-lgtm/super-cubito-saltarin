export const NIGHT_SECONDS=960,PREP_SECONDS=120,RADIUS=.28;
export const rooms=[
 {name:'SEGURIDAD',x:-11,z:-8.5,w:8,d:7,color:0x70877d},
 {name:'ESCENARIO',x:0,z:-8.5,w:14,d:7,color:0x957a57},
 {name:'COCINA',x:11,z:-8.5,w:8,d:7,color:0x789895},
 {name:'RECREATIVAS',x:-11,z:0,w:8,d:10,color:0x937495},
 {name:'COMEDOR',x:0,z:0,w:14,d:10,color:0xb18c5d},
 {name:'MOSTRADOR',x:11,z:0,w:8,d:10,color:0x9b6464},
 {name:'GERENCIA',x:-11,z:9.5,w:8,d:5,color:0x829383},
 {name:'VESTUARIOS',x:0,z:9.5,w:14,d:5,color:0x798697},
 {name:'ALMACÉN',x:11,z:9.5,w:8,d:5,color:0x969072},
];
// Rectangles are shared by visual geometry, player collision and enemy navigation.
export const walls=[
 [-15.2,0,.4,24.8],[15.2,0,.4,24.8],[0,-12.2,30.8,.4],[0,12.2,30.8,.4],
 [-7,-10.2,.25,4],[-7,-5.7,.25,1.4],[7,-10.2,.25,4],[7,-5.7,.25,1.4],
 [-11,-5,8,.25],[-4.5,-5,5,.25],[4.5,-5,5,.25],[11,-5,8,.25],
 [-7,-2.8,.25,4.4],[-7,2.8,.25,4.4],[7,-2.8,.25,4.4],[7,2.8,.25,4.4],
 [-13,5,4,.25],[-4,5,10,.25],[7.5,5,7,.25],[14,5,2,.25],
 [-13.1,7,4.2,.25],[-4,7,10,.25],[5,7,4,.25],[8.25,7,2.5,.25],[13.25,7,3.5,.25],
 [-7,9.5,.25,5],[7,9.5,.25,5],
];
export const furniture=[
 [-12,-10,3.2,.8],[-14,-7,1,2.5], // security desk and rack
 [-4,-10.2,2,2],[0,-10.2,2,2],[4,-10.2,2,2], // performance plinths
 [-3,-1.7,1.5,1.2],[3,-1.7,1.5,1.2],[-3,2,1.5,1.2],[3,2,1.5,1.2],
 [10.7,1.9,5.7,.7],[14,-8,1.2,5],[10,-10.6,3,.9],
 [-14,0,1.1,6],[-11,3.8,4,1],[-12,10.8,3,.9],[-8.2,10,1,2],
 [14,10,1,3],[9.1,10.7,2.5,1],[-3,10.9,4,.8],[4,10.9,3,.8],
];
export const doors=[{id:'security',name:'SEGURIDAD',x:-7,z:-7.25,w:.3,d:1.7},{id:'manager',name:'GERENCIA',x:-10,z:7,w:2,d:.3}];
export const hides=[{id:'locker',name:'Taquilla de personal',x:4.6,z:9.6},{id:'store',name:'Armario del almacén',x:12,z:10.8},{id:'desk',name:'Armario de gerencia',x:-12,z:9.5}];
export const cameras=[
 {id:0,name:'01 · COMEDOR',x:5.8,z:4.2,y:2.7,yaw:-.84},
 {id:1,name:'02 · ESCENARIO',x:-5.8,z:-5.7,y:2.8,yaw:.93},
 {id:2,name:'03 · COCINA',x:8,z:-5.8,y:2.7,yaw:.90},
 {id:3,name:'04 · RECREATIVAS',x:-8,z:3.8,y:2.6,yaw:-.81},
 {id:4,name:'05 · PASILLO',x:13.5,z:6,y:2.7,yaw:-Math.PI/2},
 {id:5,name:'06 · ALMACÉN',x:8,z:8,y:2.6,yaw:2.03},
];
export const charger={x:-11,z:-8.8},dispenser={x:11,z:3.8};
export const mascots=[
 {id:'prisma',name:'PADRE PRISMA',color:0x6bb4ee,x:-4,z:-8.7,speed:1.55,description:'Sus lentes detectan la vigilancia. La luz frontal lo frena brevemente.'},
 {id:'welder',name:'CHEF SOLDADOR',color:0x78c986,x:10,z:-8.8,speed:1.65,description:'Escucha las carreras y las latas. El ruido lo atrae.'},
 {id:'gold',name:'DON 67',color:0xe3bd63,x:0,z:-8.7,speed:2.1,description:'No le des la espalda. Se detiene cuando lo miras de frente.'},
 {id:'ember',name:'EL ASADOR',color:0xd26859,x:4,z:-8.7,speed:1.6,description:'Despierta a las 03:00. Sus golpes agotan las puertas blindadas.'},
];
export function solids(world,ignoreDoors=false,ignoreHides=false){return [...walls,...furniture,...(ignoreHides?[]:hides.map(h=>[h.x,h.z,.85,.65])),...(ignoreDoors?[]:doors.filter(d=>world.doors[d.id].closed).map(d=>[d.x,d.z,d.w,d.d]))];}
export function blocked(x,z,rects,r=RADIUS){return rects.some(([cx,cz,w,d])=>x+r>cx-w/2&&x-r<cx+w/2&&z+r>cz-d/2&&z-r<cz+d/2);}
export function move(body,dx,dz,rects,r=RADIUS){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));for(let i=0;i<steps;i++){if(!blocked(body.x+dx/steps,body.z,rects,r))body.x+=dx/steps;if(!blocked(body.x,body.z+dz/steps,rects,r))body.z+=dz/steps;}}
export function clearLine(ax,az,bx,bz,rects){const length=Math.hypot(bx-ax,bz-az),steps=Math.ceil(length/.12);for(let i=1;i<steps;i++){const f=i/steps;if(blocked(ax+(bx-ax)*f,az+(bz-az)*f,rects,.03))return false;}return true;}
export function near(p,o,d=1.7){return Math.hypot(p.x-o.x,p.z-o.z)<d;}
export function hourAt(elapsed){const mins=23*60+Math.floor(Math.min(elapsed,NIGHT_SECONDS)/NIGHT_SECONDS*480);return `${String(Math.floor(mins/60)%24).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;}
export function roomAt(p){return rooms.find(r=>Math.abs(p.x-r.x)<r.w/2&&Math.abs(p.z-r.z)<r.d/2)?.name??'PASILLO DE SERVICIO';}
export function interaction(p,world){
 if(!p.alive)return null;if(p.hidden)return {type:'hide',id:p.hidden,label:'Salir del escondite'};
 for(const d of doors)if(near(p,d,1.9))return {type:'door',id:d.id,label:`${world.doors[d.id].closed?'Abrir':'Cerrar'} puerta · ${Math.round(world.doors[d.id].power)}%`};
 for(const h of hides)if(near(p,h,1.4))return {type:'hide',id:h.id,label:`Esconderte · ${h.name}`};
 if(near(p,charger))return {type:'charge',label:'Recargar el teléfono'};
 if(near(p,dispenser))return {type:'refill',label:'Recoger latas para distraer'};
 return null;
}
export function pathTo(start,target,rects){
 const key=(x,z)=>`${x},${z}`,sx=Math.round(start.x),sz=Math.round(start.z),tx=Math.round(target.x),tz=Math.round(target.z);
 const open=[{x:sx,z:sz,g:0,f:0}],seen=new Map([[key(sx,sz),null]]),cost=new Map([[key(sx,sz),0]]);let last=null;
 for(let count=0;open.length&&count<850;count++){
  open.sort((a,b)=>a.f-b.f);const n=open.shift();last=n;if(Math.abs(n.x-tx)+Math.abs(n.z-tz)<=1)break;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=n.x+dx,z=n.z+dz,k=key(x,z);if(x<-14||x>14||z<-11||z>11||blocked(x,z,rects,.29))continue;const g=n.g+1;if((cost.get(k)??Infinity)<=g)continue;cost.set(k,g);seen.set(k,n);open.push({x,z,g,f:g+Math.abs(tx-x)+Math.abs(tz-z)});}
 }
 if(!last)return [];const path=[];for(let n=last;n;n=seen.get(key(n.x,n.z)))path.push({x:n.x,z:n.z});return path.reverse().slice(1);
}
