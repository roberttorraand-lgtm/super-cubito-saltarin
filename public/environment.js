import {walls,furniture,rooms,doors,hides,cameras,charger,dispenser} from '/shared/world.js';
const B=globalThis.BABYLON;
// All substantial geometry follows the shared collision rectangles. Extra detail
// sits on furniture, walls or the ceiling, leaving every navigable opening clear.
export function buildRestaurant(view){const {art:a,scene:s}=view,r=a.group('Restaurant'),steel='#94aaa5',paint='#9eaa98',wood='#96704c',dark='#202c2b',red='#7f3430',gold='#c7a15c';
 const floorMat=a.mat('#d6ccad','tile',0,15);const floor=B.MeshBuilder.CreateGround('Tiled restaurant',{width:30.5,height:24.5,subdivisions:12},s);floor.material=floorMat;floor.receiveShadows=true;floor.isPickable=false;a.staticMeshes.push(floor);
 a.box(r,0,3.42,0,30.5,.12,24.5,'#838c80','plaster');
 for(const [x,z,w,d] of walls){a.box(r,x,1.65,z,w,3.3,d,paint,'plaster').metadata={castShadow:true};a.box(r,x,.38,z,w+.022,.76,d+.022,'#385750','wood');a.box(r,x,.79,z,w+.035,.055,d+.035,gold,'steel');a.box(r,x,.07,z,w+.04,.14,d+.04,dark,'rubber');a.box(r,x,3.14,z,w+.04,.10,d+.04,'#4f655e','steel');}
 // Consistent overhead conduits follow the central service corridor.
 for(const x of [-6.6,6.6]){a.box(r,x,3.18,0,.09,.09,23,'#576c66','steel');for(let z=-10;z<12;z+=3)a.box(r,x,3.21,z,.22,.16,.05,'#7c8e81','steel');}
 for(const room of rooms){const fixture=a.group('Luminaire');a.box(fixture,room.x,3.26,room.z,1.85,.12,.43,dark,'steel');a.box(fixture,room.x,3.18,room.z,1.61,.035,.31,'#d4dab6','',.65);a.box(fixture,room.x,3.15,room.z,.035,.025,.34,dark);view.fixtures.push(fixture);
  const l=new B.PointLight(room.name,new B.Vector3(room.x,2.9,room.z),s);l.diffuse=B.Color3.FromHexString(room.name==='COCINA'?'#a4c9c2':room.name==='RECREATIVAS'?'#ac9bbe':'#e4ce9b');l.range=11;l.intensity=1.4;view.lights.push(l);
  // Readable zone signage on the outer wall of each room.
  const side=room.z<0?-1:1,z=side*11.97;a.sign(r,room.name,room.x,2.55,z,Math.min(room.w-1,2.5),.38,'#dccb99','#213b35',side>0?Math.PI:0);
 }
 for(const [x,z,w,d] of furniture){const table=Math.abs(x)===3&&Math.abs(z)<4,stage=z===-10.2,height=table?.80:stage?.28:1.05;
  a.box(r,x,height/2,z,w,height,d,table?wood:stage?dark:'#445d56',table?'wood':'steel').metadata={castShadow:true};a.box(r,x,height+.035,z,w+.03,.07,d+.03,table?'#b99b6c':steel,table?'wood':'steel');
  if(table){for(const side of [-1,1]){a.box(r,x+side*.5,.43,z,.35,.09,.58,red,'fabric');a.box(r,x+side*.67,.65,z,.07,.46,.58,red,'fabric');}placeMeal(a,r,x,height+.09,z);}
  else if(!stage){for(let i=0;i<Math.max(1,Math.floor(w/.8));i++){const xx=x-w/2+.4+i*.8;a.box(r,xx,height*.55,z-d/2-.011,.63,height*.65,.025,'#536a60','steel');a.box(r,xx,height*.75,z-d/2-.045,.26,.025,.045,steel,'steel');}}
 }
 // Stage: scalloped curtain, carved proscenium and an original illuminated logo.
 a.box(r,0,.006,-10.1,12,.012,2.4,'#3a3930','wood');a.box(r,0,2.94,-11.80,13,.50,.18,red,'fabric');for(let x=-6.45;x<6.5;x+=.32)a.cyl(r,x,1.68,-11.79,.31,2.65,.16,x%1>.4?'#703e35':'#542e30','fabric');
 a.sign(r,'BRASA BURGER',0,2.50,-11.62,5.8,.66,'#f1cb78','#422d22');a.sign(r,'CADA TURNO, UNA SONRISA',0,1.98,-11.60,3.6,.27,'#ccba92','#292f2b');
 for(const [i,x] of [-4,0,4].entries()){a.sign(r,['PADRE PRISMA','DON 67','EL ASADOR'][i],x,.43,-8.98,1.8,.24);for(let j=0;j<3;j++)a.box(r,x+(j-1)*.23,.31,-8.95,.045,.045,.06,['#6eace6','#d8ba67','#d87b4a'][i],'',.5);}
 // Industrial kitchen: hobs, extraction hood, tiled backsplash and storage.
 for(let i=0;i<3;i++){const x=9+i*1.25;for(const side of [-1,1]){a.cyl(r,x+side*.23,1.13,-10.6,.28,.025,.28,dark,'steel');a.cyl(r,x+side*.23,1.15,-10.6,.17,.025,.17,'#4b4b3a','steel');}a.box(r,x,1.40,-10.95,1.05,.42,.06,'#8b9e92','steel');}
 a.box(r,10.4,2.72,-10.6,4.6,.36,1.25,'#72877f','steel');for(let i=0;i<12;i++)a.box(r,8.4+i*.35,2.50,-10.7,.18,.025,.90,dark,'steel');a.box(r,10.4,3.13,-10.9,.8,.5,.64,steel,'steel');
 for(let i=0;i<4;i++){a.box(r,14,1.1+i*.38,-8,1.12,.035,4.7,steel,'steel');for(let j=0;j<3;j++)a.cyl(r,13.9,1.25+i*.38,-9.5+j*1.25,.27,.25,.27,i%2?'#b39b75':'#6a7e6b','steel');}
 a.sign(r,'LAVAR / PREPARAR / COCINAR',11,2.25,-11.94,2.6,.27);
 // Service counter equipment stays inside its existing footprint.
 for(let i=0;i<3;i++){const x=9+i*1.45;placeMeal(a,r,x,1.14,1.9);a.sign(r,['DOBLE BRASA','PATATAS','MENÚ DEL TURNO'][i],9+i*1.8,2.5,-4.82,1.6,.60,'#edc98b','#1d3730',0);}
 // Security desk: meters, telephone dock and a physical map of the restaurant.
 for(let i=0;i<3;i++){const x=-13+i*.85;a.box(r,x,1.42,-10,.69,.49,.20,dark,'steel');a.sign(r,['CAM 01','ENLACE','RESERVA'][i],x,1.43,-9.885,.56,.34,'#94c0a1','#112d28');a.box(r,x,1.13,-9.85,.25,.10,.24,dark,'steel');}
 a.box(r,-12,1.13,-9.78,1.55,.035,.32,'#424c45','rubber');for(let j=0;j<12;j++)a.box(r,-12.65+j*.115,1.16,-9.78,.08,.018,.18,'#829080','rubber');
 a.box(r,charger.x,1.13,charger.z,.43,.07,.34,'#758c78','steel');a.box(r,charger.x,1.18,charger.z,.24,.035,.25,dark);a.ball(r,charger.x+.17,1.2,charger.z,.035,.035,.035,'#b4df9d','',1);
 a.sign(r,'BASE / GUARDAR TELÉFONO',-11,1.95,-11.94,2.5,.29);a.sign(r,'PLAN DE EVACUACIÓN',-13.5,2.2,-11.94,1.9,.35,'#c6d6b5','#183d35');
 // Arcade cabinets have individual original artwork and illuminated controls.
 for(let i=0;i<4;i++){const g=a.group('Arcade '+i);g.position.set(-13.85,0,-2.45+i*1.6);g.rotation.y=-Math.PI/2;const colors=['#72454d','#2c6965','#756841','#4e536f'];a.box(g,0,.78,0,.85,1.56,.84,colors[i],'steel');a.box(g,0,1.15,.435,.66,.53,.03,dark);a.sign(g,['NOCHE 67','BURGER RUN','NEON SHIFT','NO SIGNAL'][i],0,1.19,.46,.57,.40,'#a6c0a1','#172d30',0);a.sign(g,'BRASA PLAY',0,1.70,.42,.83,.22,'#d7b677',colors[i],0);a.box(g,0,.88,.52,.85,.08,.32,dark);for(let j=0;j<3;j++)a.ball(g,(j-1)*.16,.95,.56,.075,.04,.075,j%2?'#d1ad5d':'#b76f58','',.15);}
 // Hideable lockers, supply machine and authored room details.
 for(const h of hides){a.box(r,h.x,1,h.z,.85,2,.65,'#627b6c','steel');a.box(r,h.x,1,h.z+.334,.72,1.85,.025,'#8b9b80','steel');for(let i=0;i<5;i++)a.box(r,h.x,1.52+i*.06,h.z+.35,.42,.018,.022,dark);a.box(r,h.x+.24,.96,h.z+.37,.04,.21,.04,steel,'steel');}
 a.box(r,dispenser.x,1.15,dispenser.z,1.1,2.3,.7,red,'steel');a.sign(r,'BRASA / REFRESCOS',dispenser.x,2.05,dispenser.z-.365,.94,.26,'#e8c890','#4a2527',Math.PI);a.box(r,dispenser.x,1.22,dispenser.z-.37,.85,1.12,.03,dark);for(let i=0;i<3;i++)a.cyl(r,dispenser.x+(i-1)*.25,1.45,dispenser.z-.40,.16,.31,.16,'#bea56c','steel');
 a.sign(r,'SALIDA / APERTURA 07:00',0,2.55,11.96,2.8,.35,'#b1d7ac','#18392d',Math.PI);
 for(const [name,x,z,yaw] of [['PERSONAL →',5.8,6.93,Math.PI],['← GERENCIA',-12,6.93,Math.PI],['SUMINISTROS',11,7.04,0]])a.sign(r,name,x,2.50,z,1.7,.30,'#d2c29a','#34433b',yaw);
 for(let i=0;i<9;i++)a.box(r,-6.8+(i%3)*.1,.15,8+(i%3)*.4,.018,.18,.06,'#b3c49a','',.35);
 for(const d of doors){const root=a.group('Armored door '+d.id,null,true);root.position.set(d.x,0,d.z);if(d.w<d.d)root.rotation.y=Math.PI/2;const width=Math.max(d.w,d.d);
  for(const side of [-1,1])a.box(root,side*(width/2+.055),1.5,0,.11,3,.45,dark,'steel');a.box(root,0,3.08,0,width+.3,.16,.5,dark,'steel');const panel=a.group('Moving shutter',root,true);panel.position.y=1.5;
  a.box(panel,0,0,0,width,3,.19,'#6c8377','steel');for(let y=-1.3;y<1.5;y+=.23)a.box(panel,0,y,.11,width-.04,.028,.028,'#b1b29a','steel');view.panels.set(d.id,panel);
  const lamp=a.box(root,width/2+.27,1.18,.27,.16,.12,.06,'#9ccc92','',.4);view.doorLamps.set(d.id,lamp);a.box(root,width/2+.27,1.18,.21,.22,.42,.12,dark,'steel');
 }
 for(const c of cameras){const root=a.group('Security camera '+c.id,null,true);root.position.set(c.x,c.y,c.z);root.rotation.y=Math.PI-c.yaw;a.box(root,0,0,0,.24,.17,.42,'#a9b3a3','steel');a.cyl(root,0,-.13,0,.04,.19,.04,dark,'steel');a.cyl(root,0,0,.25,.11,.09,.11,dark).rotation.x=Math.PI/2;view.cameraModels.set(c.id,root);}
 decorate(a,r);a.batch();return r;
}
function placeMeal(a,r,x,y,z){a.cyl(r,x,y,z,.43,.025,.43,'#d7c9a6');a.cyl(r,x,y+.045,z,.31,.07,.31,'#bd8a43');a.cyl(r,x,y+.09,z,.30,.045,.30,'#4a2d22');a.box(r,x,y+.12,z,.33,.018,.3,'#929e56');a.ball(r,x,y+.17,z,.32,.13,.32,'#c69a53');a.cyl(r,x+.43,y+.14,z,.13,.29,.13,'#ad6c46');a.box(r,x+.43,y+.34,z,.014,.14,.014,'#c8bd96');}

function decorate(a,r){
 // Staff floor plan uses the exact nine-zone layout of shared/world.js.
 a.print(r,'Employee floor plan',-13.5,1.65,-11.94,1.9,1.3,ctx=>{
  ctx.fillStyle='#d6d6b8';ctx.fillRect(0,0,768,768);ctx.fillStyle='#244238';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText('CONOCE TU TURNO',384,63);
  const names=['SEGURIDAD','ESCENARIO','COCINA','RECREATIVAS','COMEDOR','MOSTRADOR','GERENCIA','VESTUARIOS','ALMACÉN'];
  names.forEach((name,i)=>{const x=32+i%3*239,y=110+Math.floor(i/3)*170;ctx.fillStyle=i===0?'#6e997c':'#a0ad98';ctx.fillRect(x,y,226,151);ctx.strokeStyle='#325345';ctx.lineWidth=5;ctx.strokeRect(x,y,226,151);ctx.fillStyle='#213c32';ctx.font='bold 19px sans-serif';ctx.fillText(name,x+113,y+82);});
  ctx.fillStyle='#315443';ctx.font='24px sans-serif';ctx.fillText('BASE · SEGURIDAD / SALIDA · SUR',384,682);ctx.font='21px sans-serif';ctx.fillText('Mantén libres los pasos de servicio',384,724);
 });
 for(const [i,x] of [-4.6,4.6].entries())a.print(r,'Brasa original poster '+i,x,1.82,11.94,1.6,1.9,ctx=>{
  ctx.fillStyle=i?'#364f46':'#7c3d32';ctx.fillRect(0,0,768,768);ctx.strokeStyle='#d3b274';ctx.lineWidth=12;ctx.strokeRect(24,24,720,720);ctx.textAlign='center';ctx.fillStyle='#eed9a6';ctx.font='bold 68px Georgia';ctx.fillText(i?'FAMILIA':'BRASA',384,125);ctx.font='bold 44px Georgia';ctx.fillText(i?'DESDE 1987':'DOBLE TURNO',384,189);
  ctx.fillStyle='#c78c46';ctx.beginPath();ctx.ellipse(384,390,205,135,0,Math.PI,0);ctx.fill();ctx.fillRect(179,390,410,37);ctx.fillStyle='#83a06b';ctx.fillRect(169,437,430,26);ctx.fillStyle='#372c26';ctx.fillRect(179,470,410,45);ctx.fillStyle='#dab06a';ctx.fillRect(179,525,410,48);ctx.fillStyle='#ead9a8';for(let j=0;j<18;j++){ctx.beginPath();ctx.ellipse(240+j%6*56,320+Math.floor(j/6)*29,7,3,j*.5,0,Math.PI*2);ctx.fill();}ctx.font='27px sans-serif';ctx.fillText('EL SABOR SIEMPRE VUELVE',384,653);ctx.font='18px monospace';ctx.fillText('BRASA BURGER · NO CERRAMOS SOLOS',384,698);
 },Math.PI);
 // Minimal contact shading anchors furniture without extra live lights.
 const B=globalThis.BABYLON,t=new B.DynamicTexture('Contact shadow',{width:64,height:64},a.scene,false),ctx=t.getContext(),gradient=ctx.createRadialGradient(32,32,6,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.42)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);t.update(false);t.hasAlpha=true;
 const mat=new B.StandardMaterial('Baked contact shade',a.scene);mat.diffuseTexture=t;mat.useAlphaFromDiffuseTexture=true;mat.disableLighting=true;mat.emissiveColor=B.Color3.White();mat.backFaceCulling=false;mat.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
 for(const [x,z,w,d] of furniture){const mesh=B.MeshBuilder.CreateGround('Contact shade',{width:w+.55,height:d+.55},a.scene);mesh.position.set(x,.008,z);mesh.material=mat;mesh.isPickable=false;mesh.freezeWorldMatrix();}
}
