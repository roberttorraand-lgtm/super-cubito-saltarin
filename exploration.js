// Authored extensions and explorable interiors. All coordinates are shared by
// authority and prediction; an interaction is an input, never a client teleport.
export function extendRoutes(maps){
 const layouts=[
  [[640,540,90],[560,470,100],[760,550,80],[580,600,100],[680,520,90],[880,580,0]],
  [[720,550,110],[560,590,100],[800,520,120],[620,580,100],[740,540,100],[900,600,0]],
  [[700,570,130],[640,600,140],[780,540,130],[600,590,140],[740,550,130],[920,600,0]],
  [[700,460,220],[600,530,200],[780,420,230],[620,500,210],[760,440,220],[960,500,0]]
 ];
 for(const m of maps){
  m.originalRouteWidth=m.width;m.routePlatformCount=m.platforms.length;
  const last=m.platforms.at(-1),gap=m.id===3?220:100;
  m.gaps.push([last[0]+last[2],last[1],gap,24]);let x=m.width+gap;
  m.regions=[{x:0,name:['Las raíces despiertas','Paso de las pasarelas','Valle del deshielo','Órbita de los susurros'][m.id]}];
  for(const [i,[w,y,g]] of layouts[m.id].entries()){
   m.platforms.push([x,y,w,m.id===3?32:720-y]);
   if(g)m.gaps.push([x+w,y,g,24]);
   m.checkpoints.push({x:x+65,y});
   if(i===0||i===3)m.regions.push({x,name:(m.id===0?['Jardines colgantes','El bosque antiguo']:m.id===1?['Acueductos del ocaso','Las minas olvidadas']:m.id===2?['Catedral de cristal','El refugio polar']:['Jardín de meteoritos','Archivo de las estrellas'])[i===0?0:1]});
   // Obstacles stay away from checkpoints and blind landings.
   if(m.id===0&&[1,4].includes(i))m.blocks.push({rect:[x+280,y-45,65,45],type:'log'});
   if(m.id===1&&i===2)m.saws.push({x:x+440,y:y-28,range:50,radius:18,period:240,offset:91});
   if(m.id===2&&i===3)m.spikes.push([x+300,y-20,55,20]);
   if(m.id===3&&i===4)m.lasers.push({id:'ancient-pulse',x:x+390,y:y-110,w:20,h:110,period:210,on:65,offset:40});
   if(i===2||i===4)m.enemies.push({id:`ancient-${m.id}-${i}`,kind:i===2?'capy':'toaster',x:x+(i===2?400:Math.min(600,w-100)),y:y-(i===2?32:m.id===3?330:230),w:34,h:32,range:25,period:300,offset:i*40});
   x+=w+g;
  }
  m.width=x;m.overworldWidth=x;m.goal={x:x-140,y:m.platforms.at(-1)[1]};
  if(m.id===2)m.iceRegions[0].w=x-m.iceRegions[0].x;
  m.routePlatformCount=m.platforms.length;
 }
}
const residents=[
 {name:'Doge del hipotecón',kind:'doge',color:'#dba76b',lines:['wow. una casa de verdad. mucho interior.','Dicen que hay raíces que crecen hacia arriba. Prueba a subir por las repisas de los jardines antiguos.']},
 {name:'Pepe el panadero',kind:'frog',color:'#8cba9a',lines:['Horneamos pan y crisis existenciales desde 2016.','No todos los libros son libros. Mira la estantería de la primera casa del camino.']},
 {name:'Señor 404',kind:'troll',color:'#aca1ce',lines:['Bienvenido. Aquí dentro no hay enemigos. El alquiler ya es bastante peligroso.','Los objetos antiguos solo responden si te acercas y los examinas. Las luces pequeñas suelen contar algo.']}
];
export function addExploration(maps){
 for(const m of maps){
  // A high alcove reached by three intentional jumps replaces the obvious door.
  const [bx,by]=m.platforms[m.routePlatformCount-6];
  m.branch={x:bx+130,y:by};
  const steps=[[bx+130,by-80,100,18],[bx+270,by-160,100,18],[bx+410,by-240,140,18]];
  m.ledges??=[];m.ledges.push(...steps);
  m.secret.door={x:bx+475,y:by-240};m.secret.return={x:bx+110,y:by-32};
  m.secret.hidden=true;
  m.villagers=[];m.houses=[];
  for(const [i,island] of [0,6,m.routePlatformCount-3].entries()){
   const [x,y,w]=m.platforms[island],r=structuredClone(residents[(i+m.id)%3]);
   if(r.kind==='doge')r.lines[1]=['En los jardines colgantes hay raíces que suben por las cornisas. Sigue las luces pequeñas.','Sobre los acueductos del ocaso hay cornisas que no llevan al castillo. Las grietas guardan algo.','La catedral de cristal tiene un camino hacia arriba. Busca las grietas lejos del suelo.','En el jardín de meteoritos hay tres cornisas y una marca que solo se ve de cerca.'][m.id];
   const hx=x+(i===0?130:140),rx=m.width+600;
   const house={id:`home-${m.id}-${i}`,x:hx,y,w:190,room:{x:rx,y:600,w:1000},style:i,owner:r.name,return:{x:hx-16,y:y-32}};
   m.houses.push(house);
   m.platforms.push([rx,600,1000,120],[rx+440,500,105,18],[rx+610,410,170,18]);
   m.blocks.push({rect:[rx-24,70,24,650],type:'wall'},{rect:[rx+1000,70,24,650],type:'wall'});
   m.villagers.push({...r,id:`npc-${m.id}-${i}`,houseId:house.id,x:rx+700,y:600});
   m.width=rx+1050;
  }
  const h=m.houses[0],p=m.platforms[m.routePlatformCount-2];
  m.ledges.push([p[0]+180,p[1]-85,100,18],[p[0]+320,p[1]-170,150,18]);
  m.easterEggs=[
   {id:`egg-${m.id}-0`,x:bx+500,y:by-265,kind:'triangle',caption:'DORITOS CONFIRMADOS · ILLUMINATI',hint:'Una marca triangular entre las raíces.'},
   {id:`egg-${m.id}-1`,x:m.secret.x+530,y:385,kind:'nyan',caption:'NYAN NYAN · EL WIFI ES UN GATO',hint:'Un ronroneo sale del cristal.'},
   {id:`egg-${m.id}-2`,x:h.room.x+705,y:385,kind:'doge',caption:'MUCHO WOW. TAN BUHARDILLA.',hint:'Este libro tiene pelo.'},
   {id:`egg-${m.id}-3`,x:p[0]+405,y:p[1]-195,kind:'troll',caption:'ERROR 2016: HUMOR NO ENCONTRADO',hint:'La estatua parece estar aguantándose la risa.'}
  ];
 }
}
export function teleport(p,x,y,zone){
 p.x=x;p.y=y;p.vx=p.vy=0;p.supportId=null;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.zone=zone;p.portalCooldown=30;
}
export function houseFor(map,p){return (map.houses??[]).find(h=>p?.zone===h.id);}
export function nearbyInteraction(p,map,world={}){
 if(!p||p.eliminated||p.finished)return null;
 const near=(x,y,r=55)=>Math.abs(p.x+16-x)<r&&Math.abs(p.y+32-y)<48;
 const house=houseFor(map,p);
 if(house){
  if(near(house.room.x+90,600,65))return {type:'exit',house,label:'Salir de la casa'};
  const npc=map.villagers.find(n=>n.houseId===house.id);
  if(npc&&near(npc.x,600,80))return {type:'talk',npc,label:`Hablar con ${npc.name}`};
 }
 for(const egg of map.easterEggs??[])if(!(world.eggs??[]).includes(egg.id)&&Math.abs(p.x+16-egg.x)<48&&Math.abs(p.y+16-egg.y)<52)return {type:'egg',egg,label:'Examinar',hint:egg.hint};
 if(!p.zone){
  if(map.secret&&near(map.secret.door.x,map.secret.door.y,45))return {type:'secret',label:'Examinar las grietas'};
  for(const h of map.houses??[])if(near(h.x,h.y,50))return {type:'house',house:h,label:`Entrar · ${h.owner}`};
  if(map.overworldEnd&&near(map.overworldEnd.x,map.overworldEnd.y,75))return {type:'castle',label:'Entrar al castillo'};
 }
 if(p.zone==='secret'&&near(map.secret.x+825,600,65))return {type:'secretExit',label:'Volver al exterior'};
 if(p.zone==='boss'&&!world.boss?.started&&near(map.boss.x+90,600,55))return {type:'retreat',label:'Volver al exterior'};
 return null;
}
export function updateExploration(players,map,world){
 world.eggs??=[];
 for(const p of players){
  if(p.dialogue&&p.dialogue.until<=world.frame)p.dialogue=null;
  if(!p.interactPressed||p.portalCooldown>0)continue;
  const action=nearbyInteraction(p,map,world);if(!action)continue;
  if(action.type==='house'){p.returnPoint=action.house.return;teleport(p,action.house.room.x+120+(p.spawnSlot??0)*38,568,action.house.id);p.dialogue=null;}
  if(action.type==='exit'){teleport(p,action.house.return.x,action.house.return.y,null);p.returnPoint=null;p.dialogue=null;}
  if(action.type==='talk'){
   p.conversations??={};const index=p.conversations[action.npc.id]??0;
   p.dialogue={name:action.npc.name,text:action.npc.lines[index%action.npc.lines.length],until:world.frame+480};p.conversations[action.npc.id]=index+1;
  }
  if(action.type==='egg'){
   world.eggs.push(action.egg.id);world.lastEgg={caption:action.egg.caption,until:world.frame+240};
   p.dialogue={name:'Archivo recuperado',text:action.egg.caption,until:world.frame+300};
  }
 }
}
export function zoneBounds(map,p){
 const h=houseFor(map,p);if(h)return {x:h.room.x,w:h.room.w,title:h.owner};
 if(p?.zone==='secret')return {x:map.secret.x,w:map.secret.w,title:map.secret.name};
 if(p?.zone==='boss')return {x:map.boss.x,w:map.boss.w,title:map.boss.name};
 return {x:0,w:Math.min(map.overworldWidth??map.width,map.width),title:map.name};
}
