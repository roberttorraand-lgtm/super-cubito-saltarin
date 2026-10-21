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
  return m;
 });
}
