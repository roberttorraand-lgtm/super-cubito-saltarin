import { bossRect, damageBoss } from './combat.js';
import { teleport, nearbyInteraction } from './exploration.js';
// Shared deterministic encounters: no client messages can award hits or rewards.
export function addEncounters(maps){
 const names=["That's la Peace",'Soldador Bai de Feis','Gigachad · Combo 67','Señor del Cubo Carmesí'];
 const hints=['Pisad ambos espejos para apagar los láseres; después saltad sobre el retrato.','Saltad sobre las dos válvulas para enfriar la soldadora; después pisad al jefe.','Saltad juntos cuando diga ¡YA! para romper su aura; después pisad al jefe.','Subid sobre un compañero hasta el sello elevado; después pisad al jefe.'];
 for(const m of maps){
  const end={...m.goal},sx=m.width+900,ax=m.width+2500;
  m.overworldEnd=end;m.castle={x:end.x-120,y:end.y,name:m.id%2?'MANSIÓN DEL CAOS':'CASTILLO DEL MEME'};
  const [px,py,pw]=m.platforms[3];
  m.secret={door:{x:px+pw-100,y:py},x:sx,y:600,w:900,return:{x:px+pw-180,y:py-32},name:['Cripta del capibara','Taller prohibido','Nevera dimensional','Archivo lunar'][m.id]};
  m.boss={x:ax,w:1100,y:600,name:names[m.id],hint:hints[m.id],portrait:m.id};
  m.platforms.push([sx,600,900,120],[sx+280,495,110,18],[sx+480,410,110,18],[ax,600,1100,120]);
  m.blocks.push({rect:[ax-35,0,35,720],type:'stone'},{rect:[ax+1100,0,35,720],type:'stone'});
  m.goal={x:ax+1030,y:600};m.width=ax+1140;
  for(let i=0;i<3;i++)m.enemies.push({id:`secret-${m.id}-${i}`,kind:['capy','banana','duck'][i],x:sx+220+i*220,y:568,w:34,h:32,range:30,period:240,offset:i*60});
  // Extra air patrols leave safe ground beneath them.
  for(const i of [1,4,6]){const [x,y,w]=m.platforms[i];m.enemies.push({id:`patrol-${m.id}-${i}`,kind:'toaster',x:x+w*.7,y:y-(m.id===3?330:155),w:34,h:32,range:55,period:270,offset:i*45});}
 }
}
const overlaps=(p,r)=>p.x+32>r[0]&&p.x<r[0]+r[2]&&p.y+32>r[1]&&p.y<r[1]+r[3];
export function bossView(map,world){
 const b=map.boss,s=world?.boss;if(!b||!s?.started||s.hp<=0)return null;
 const t=s.tick%240,center=b.x+550,rect=bossRect(map,world),hazards=[],warnings=[];
 if(s.open<=0&&(s.slipUntil??0)<=(world?.frame??0)){
  if(map.id===0){const xs=[b.x+260,b.x+800];for(const x of xs)(t>=100&&t<140?hazards:t>=40&&t<100?warnings:[]).push([x,230,28,370]);}
  if(map.id===1){const x=b.x+(Math.floor(s.tick/240)%2?570:30);(t>=110&&t<150?hazards:t>=50&&t<110?warnings:[]).push([x,580,500,20]);}
  if(map.id===2)(t>=120&&t<135?hazards:t>=60&&t<120?warnings:[]).push([b.x+30,576,1040,24]);
  if(map.id===3){const x=b.x+200+(Math.floor(s.tick/240)%3)*280;(t>=120&&t<155?hazards:t>=50&&t<120?warnings:[]).push([x,120,65,480]);}
 }
 return {rect,hazards,warnings,beat:t>=60&&t<120,open:s.open>0};
}
export function updateEncounters(players,previous,map,world,respawn){
 if(!map.boss)return;
 const active=players.filter(p=>!p.eliminated&&!p.finished),b=map.boss;
 world.secrets??=[];world.boss??={hp:3,started:false,tick:0,open:0,charge:0,cycle:0};const s=world.boss;
 for(const p of active){
  p.portalCooldown=Math.max(0,(p.portalCooldown??0)-1);
  if(p.portalCooldown)continue;
  const action=p.interactPressed?nearbyInteraction(p,map,world):null;
  if(action?.type==='secret'){p.returnPoint=map.secret.return;teleport(p,map.secret.x+50+(p.spawnSlot??0)*38,568,'secret');}
  else if(action?.type==='secretExit'){
   if(!world.secrets.includes(p.id)){world.secrets.push(p.id);p.invulnerable=180;}
   teleport(p,map.secret.return.x,map.secret.return.y,null);p.returnPoint=null;
  }else if(action?.type==='retreat'){teleport(p,map.overworldEnd.x-75,map.overworldEnd.y-32,null);
  }else if(action?.type==='castle'){p.returnPoint=null;teleport(p,b.x+90+(p.spawnSlot??0)*48,568,'boss');}
 }
 const team=active.filter(p=>p.zone==='boss');
 if(!s.started&&team.length&&team.length===active.length)s.started=true;
 if(!s.started||s.hp<=0)return;
 s.tick++;s.open=Math.max(0,s.open-1);
 const t=s.tick%240,center=b.x+550;
 const pad=(p,x)=>p.grounded&&Math.abs(p.x+16-x)<55&&Math.abs(p.y+32-600)<5;
 let trigger=false;
 if(map.id===0){
  if(map.mode==='solo'){s.mirrors??=[];for(const [i,x] of [b.x+180,b.x+900].entries())if(team.some(p=>pad(p,x))&&!s.mirrors.includes(i))s.mirrors.push(i);trigger=s.mirrors.length===2;}
  else trigger=team.some(p=>pad(p,b.x+180))&&team.some(p=>pad(p,b.x+900));
 }
 if(map.id===1){s.valves??=[];for(const [i,x] of [b.x+280,b.x+800].entries())if(team.some(p=>{const old=previous.get(p.id);return old&&old.vy<0&&p.vy>=0&&Math.abs(p.x+16-x)<60;} )&&!s.valves.includes(i))s.valves.push(i);trigger=s.valves.length===2;}
 if(map.id===2)trigger=t>=60&&t<120&&team.length>=Math.min(2,active.length)&&team.every(p=>p.y<510&&p.vy<0);
 if(map.id===3)trigger=team.some(p=>(map.mode==='solo'?p.y<465:p.supportId)&&Math.abs(p.x+16-(b.x+280))<65);
 if(s.open===0){s.charge=trigger?s.charge+1:0;if(s.charge>= (map.id===0?24:1)){s.open=210;s.charge=0;s.valves=[];}}
 const view=bossView(map,world);
 for(const p of team){
  const old=previous.get(p.id);
  if(view.open&&overlaps(p,view.rect)&&old&&old.y+32<=view.rect[1]+15&&p.vy>=0){damageBoss(world,1);p.vy=-12;p.invulnerable=75;if(s.hp===0)world.bossDefeated=true;break;}
 }
 // Recompute after a successful hit: never punish a player with an obsolete attack.
 const attack=bossView(map,world);
 if(attack)for(const p of team)if(!p.invulnerable&&attack.hazards.some(r=>overlaps(p,r)))respawn(p,map);
}
