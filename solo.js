// Separate map objects: solo adaptations never mutate the cooperative campaign.
export function makeSoloLevels(levels){
 return levels.map(original=>{
  const m=structuredClone(original);m.mode='solo';m.name+=' · Solitario';
  m.enemies=m.enemies.map(e=>e.id.startsWith('patrol-')?{...e,y:e.y-130}:e);
  m.subtitle=['Sendero de troncos, pueblo Doge y escalones secretos','Palancas individuales, cintas y barrancos del dank','Deshielo por interruptor y aldea del congelador','Saltos lunares, ruinas Illuminati y resortes'][m.id];
  // One pad per puzzle, with a permanent latch, replaces simultaneous teamwork.
  m.plates=m.plates.filter((p,i,all)=>all.findIndex(q=>q.group===p.group)===i);
  m.objectives=m.objectives.map(o=>({...o,type:'plates',hint:'Pisa el interruptor para abrir el camino. Puedes completarlo sin ayuda.'}));
  if(m.id===0){m.plates[0].x=230;m.gates[0].rect=[370,500,42,100];m.blocks.push({rect:[285,568,52,32],type:'log'});}
  if(m.id===1)m.belts=(m.belts??[]).map((b,i)=>({...b,speed:i?1.2:-.8}));
  if(m.id===2)m.crumble=m.crumble.map(t=>({...t,delay:66}));
  if(m.id===3)m.lasers=m.lasers.map(l=>({...l,on:55}));
  const hints=['Activa los dos espejos por separado; luego salta sobre el retrato.','Salta hasta lo más alto sobre cada válvula; luego pisa al jefe.','Salta cuando diga ¡YA! para romper el aura; luego pisa al jefe.','Usa el resorte para tocar el sello elevado; luego pisa al jefe.'];
  m.boss.hint=hints[m.id];
  if(m.id===3)m.springs.push({x:m.boss.x+250,y:600,w:60});
  const residents=[
   ['Doge del hipotecón','wow. una casa. mucho euríbor. 2016 nunca terminó.','doge'],
   ['Pepe el panadero','Aquí amasamos feels. El jefe tiene escudo: lee la pista de arriba.','frog'],
   ['Señor 404','Mi vecino es un triángulo. No le mires los tres ojos.','troll']
  ];
  m.villagers=[0,3,6].map((island,i)=>{const [x,y,w]=m.platforms[island];const r=residents[(i+m.id)%3];return {id:`npc-${m.id}-${i}`,x:x+(i?100:150),y,name:r[0],dialogue:r[1],kind:r[2],color:['#efc17b','#9bd498','#cbaff3'][i]};});
  const captions=['DORITOS CONFIRMADOS · ILLUMINATI','MUCHO WOW. TAN PLATAFORMEO.','ERROR 2016: HUMOR NO ENCONTRADO','NYAN NYAN · EL WIFI ES UN GATO'];
  m.easterEggs=[1,4,7,8].map((island,i)=>{const [x,y]=m.platforms[island];return {id:`egg-${m.id}-${i}`,x:x+100,y:y-35,kind:['triangle','doge','troll','nyan'][i],caption:captions[(i+m.id)%4]};});
  return m;
 });
}
export function updateVillage(players,map,world){
 if(map.mode!=='solo')return;
 world.eggs??=[];
 for(const p of players){
  if(p.eliminated||p.finished)continue;
  for(const egg of map.easterEggs)if(!world.eggs.includes(egg.id)&&Math.abs(p.x+16-egg.x)<48&&Math.abs(p.y+16-egg.y)<75){world.eggs.push(egg.id);world.lastEgg={caption:egg.caption,until:world.frame+240};}
 }
}
