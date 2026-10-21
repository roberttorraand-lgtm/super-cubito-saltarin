// Deterministic combat shared by the authoritative server and input prediction.
export const FUEL_MAX=180;
const alive=p=>!p.eliminated&&!p.finished;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function initCombat(world){world.projectiles??=[];world.puddles??=[];world.explosions??=[];world.enemyStates??={};world.combatId??=0;world.defeatedEnemies??=[];}
export function slipperyAt(x,feet,world){return (world?.puddles??[]).some(a=>x>=a.x&&x<=a.x+a.w&&Math.abs(feet-a.y)<30);}
export function preparePower(p,map,world){
 p.power??=1;p.fuel??=FUEL_MAX;p.charge??=0;p.weaponCooldown=Math.max(0,(p.weaponCooldown??0)-1);p.thrust=false;p.fireRequest=null;
 if(!alive(p)){p.charge=0;p.useHeld=false;return;}
 const selected=p.input.power;
 if(Number.isInteger(selected)&&selected>=1&&selected<=3&&selected!==p.power){p.power=selected;p.charge=0;}
 const use=Boolean(p.input.use),pressed=use&&!p.useHeld,released=!use&&p.useHeld;

 if(p.power===1){
  if(use&&!p.weaponCooldown)p.charge=Math.min(120,p.charge+1);
  if(released&&p.charge&&!p.weaponCooldown){p.fireRequest=p.charge>=60?'explosive':'pellet';p.weaponCooldown=p.charge>=60?42:18;}
  if(!use)p.charge=0;
 }else p.charge=0;
 if(p.power===2&&use&&p.fuel>0){p.thrust=true;p.fuel=Math.max(0,p.fuel-1);}
 else if(p.grounded&&!use)p.fuel=Math.min(FUEL_MAX,p.fuel+1.5);
 if(p.power===3&&pressed&&!p.weaponCooldown){p.fireRequest='banana';p.weaponCooldown=120;}
 p.useHeld=use;
}
export function segmentHit(x,y,nx,ny,r,pad=0){
 let low=0,high=1;
 for(const [v,d,min,max] of [[x,nx-x,r[0]-pad,r[0]+r[2]+pad],[y,ny-y,r[1]-pad,r[1]+r[3]+pad]]){
  if(Math.abs(d)<1e-9){if(v<min||v>max)return Infinity;}
  else{let a=(min-v)/d,b=(max-v)/d;if(a>b)[a,b]=[b,a];low=Math.max(low,a);high=Math.min(high,b);if(low>high)return Infinity;}
 }
 return low;
}
export function bossRect(map,world){return map.boss?[map.boss.x+498+(world?.boss?.slideX??0),480,104,104]:null;}
export function damageBoss(world,damage){
 const s=world.boss;if(!s?.started||s.hp<=0||s.open<=0||(s.hurtUntil??0)>world.frame)return false;
 const before=s.hp;s.hp=Math.max(0,s.hp-damage);s.hurtUntil=world.frame+15;
 if(Math.ceil(s.hp)<Math.ceil(before)){s.open=0;s.charge=0;s.valves=[];s.mirrors=[];}
 if(s.hp<=0)world.bossDefeated=true;return true;
}
export function damageEnemy(world,enemy,amount,{vx=0,explosive=false}={}){
 initCombat(world);if(world.defeatedEnemies.includes(enemy.id))return false;
 const s=world.enemyStates[enemy.id]??={hp:enemy.combat?.hp??1};
 if((s.hurtUntil??0)>world.frame)return false;
 if(enemy.combat?.type==='guardian'&&s.phase!=='recover'&&s.phase!=='slipping'&&!explosive&&vx&&Math.sign(vx)===-(s.facing??enemy.facing))return false;
 s.hp=Math.max(0,s.hp-amount);s.hurtUntil=world.frame+10;
 if(s.hp<=0)world.defeatedEnemies.push(enemy.id);return true;
}
function projectile(world,data){
 if(world.projectiles.length>=48)return;
 world.projectiles.push({id:++world.combatId,ttl:120,r:5,...data});
}
function blocked(solids,x,y,nx,ny){return solids.some(r=>segmentHit(x,y,nx,ny,r)<1);}
function explode(shot,map,world,solids,enemies){
 const radius=88;world.explosions.push({id:shot.id,x:shot.x,y:shot.y,r:radius,until:world.frame+18});
 for(const e of enemies())if(Math.hypot(e.x+e.w/2-shot.x,e.y+e.h/2-shot.y)<radius+e.w/2&&!blocked(solids,shot.x,shot.y,e.x+e.w/2,e.y+e.h/2))damageEnemy(world,e,3,{explosive:true});
 const r=bossRect(map,world);if(r&&Math.hypot(r[0]+52-shot.x,r[1]+52-shot.y)<radius+52&&!blocked(solids,shot.x,shot.y,r[0]+52,r[1]+52))damageBoss(world,1);
}
function puddle(shot,world,solids){
 const floor=solids.filter(([x,y,w])=>shot.x>=x&&shot.x<=x+w&&y>=shot.y-12&&y<shot.y+400).sort((a,b)=>a[1]-b[1])[0];if(!floor)return;
 const w=Math.min(160,floor[2]);
 const same=world.puddles.filter(p=>p.owner===shot.owner);if(same.length>=2)world.puddles=world.puddles.filter(p=>p.id!==same[0].id);
 world.puddles.push({id:shot.id,owner:shot.owner,x:clamp(shot.x-w/2,floor[0],floor[0]+floor[2]-w),y:floor[1],w,until:world.frame+420});
 world.puddles=world.puddles.slice(-8);
}
function advanceAI(players,map,world){
 for(const e of map.enemies??[]){
  if(world.defeatedEnemies.includes(e.id))continue;
  if(!e.combat){
   const state=world.enemyStates[e.id],x=state?.x??e.x+Math.sin((world.frame+e.offset)/e.period*Math.PI*2)*e.range;
   const patch=world.puddles.find(a=>x+e.w>a.x&&x<a.x+a.w&&Math.abs(e.y+e.h-a.y)<42&&(a.id!==state?.slippedOn||(state?.slipReady??0)<=world.frame));
   if(patch){const q=world.enemyStates[e.id]??={hp:1};Object.assign(q,{slippedOn:patch.id,slipReady:world.frame+180,phase:'slipping',timer:0,x,vx:(q.facing??1)*5});}
   const q=world.enemyStates[e.id];if(q?.phase==='slipping'){q.x=clamp(q.x+q.vx,e.x-110,e.x+110);q.vx*=.96;if(++q.timer>=65){q.phase='recover';q.timer=0;}}
   else if(q?.phase==='recover'){const home=e.x+Math.sin((world.frame+e.offset)/e.period*Math.PI*2)*e.range;q.x+=clamp(home-q.x,-1.5,1.5);if(Math.abs(home-q.x)<2){q.phase='patrol';delete q.x;}}
   continue;
  }
  const s=world.enemyStates[e.id]??={hp:e.combat.hp,x:e.x,phase:'patrol',timer:0,facing:1};s.x??=e.x;s.phase??='patrol';s.timer??=0;s.facing??=1;
  const target=players.filter(alive).filter(p=>Math.abs(p.x-s.x)<240&&Math.abs(p.y-e.y)<220).sort((a,b)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];
  const patch=world.puddles.find(a=>s.x+e.w>a.x&&s.x<a.x+a.w&&Math.abs(e.y+e.h-a.y)<42&&(a.id!==s.slippedOn||(s.slipReady??0)<=world.frame));
  if(patch){s.slippedOn=patch.id;s.slipReady=world.frame+180;s.phase='slipping';s.timer=0;s.vx=s.facing*5;}
  if(s.phase==='slipping'){s.x=clamp(s.x+(s.vx??0),e.x-110,e.x+110);s.vx*=.96;if(++s.timer>=65){s.phase='recover';s.timer=0;}continue;}
  if(!target){s.phase='patrol';s.timer=0;s.x+=clamp(e.x+Math.sin((world.frame+e.offset)/e.period*Math.PI*2)*e.range-s.x,-1.5,1.5);continue;}
  s.timer++;
  if(s.phase==='patrol'){s.x+=clamp(e.x+Math.sin((world.frame+e.offset)/e.period*Math.PI*2)*e.range-s.x,-1.5,1.5);s.facing=target.x<s.x?-1:1;if(s.timer>=45){s.phase='windup';s.timer=0;s.aimX=target.x+16;s.aimY=target.y+16;}}
  else if(s.phase==='windup'&&s.timer>=60){s.phase='attack';s.timer=0;}
  else if(s.phase==='attack'){
   if(e.combat.type==='charger')s.x=clamp(s.x+s.facing*6,e.x-110,e.x+110);
   if(e.combat.type==='gunner'&&s.timer%18===1){const a=Math.atan2(s.aimY-(e.y+16),s.aimX-(s.x+16));for(const spread of [-.24,0,.24])projectile(world,{team:'enemy',kind:'spark',owner:e.id,x:s.x+16,y:e.y+16,vx:Math.cos(a+spread)*4,vy:Math.sin(a+spread)*4});}
   if(e.combat.type==='guardian'&&[1,19].includes(s.timer))for(const dir of [-1,1])projectile(world,{team:'enemy',kind:'wave',owner:e.id,x:s.x+e.w/2,y:e.y+e.h-8,vx:dir*4,vy:0,r:7,ttl:70});
   if(s.timer>=(e.combat.type==='gunner'?55:36)){s.phase='recover';s.timer=0;}
  }else if(s.phase==='recover'&&s.timer>=84){s.phase='patrol';s.timer=0;}
 }
}
export function updateCombat(players,map,world,solids,enemies,respawn){
 initCombat(world);world.explosions=world.explosions.filter(e=>e.until>world.frame).slice(-12);world.puddles=world.puddles.filter(p=>p.until>world.frame);
 advanceAI(players,map,world);
 for(const p of players){
  if(!alive(p)||!p.fireRequest)continue;
  const kind=p.fireRequest;p.fireRequest=null;
  projectile(world,{owner:p.id,team:'player',kind,x:p.x+16+p.facing*12,y:p.y+16,vx:p.facing*(kind==='banana'?5.8:kind==='explosive'?8:13),vy:kind==='banana'?-6.8:0,r:kind==='pellet'?4:7,ttl:kind==='banana'?75:100});
 }
 // Banana interrupts attacks and makes bosses physically skid within their arena.
 const s=world.boss,br=bossRect(map,world);
 if(s?.started&&s.hp>0&&br){
  const patch=world.puddles.find(a=>a.x+a.w>br[0]&&a.x<br[0]+br[2]&&Math.abs(a.y-600)<20&&(a.id!==s.slippedOn||(s.slipReady??0)<=world.frame));
  if(patch&&(s.slipReady??0)<=world.frame){s.slippedOn=patch.id;s.slipUntil=world.frame+70;s.slipReady=world.frame+240;s.slideV=(patch.x+patch.w/2<br[0]+52?1:-1)*4;s.open=Math.max(s.open,95);}
  if((s.slipUntil??0)>world.frame){s.slideX=clamp((s.slideX??0)+(s.slideV??0),-150,150);s.slideV*=.96;}
  else s.slideX=(s.slideX??0)*.92;
 }
 const remaining=[];
 for(const shot of world.projectiles){
  const ox=shot.x,oy=shot.y;if(shot.kind==='banana')shot.vy+=.35;
  const nx=ox+shot.vx,ny=oy+shot.vy;let t=Infinity,hit=null;
  for(const r of solids){const a=segmentHit(ox,oy,nx,ny,r,shot.r);if(a<t){t=a;hit='wall';}}
  if(shot.team==='player'&&shot.kind!=='banana'){
   for(const e of enemies()){const a=segmentHit(ox,oy,nx,ny,[e.x,e.y,e.w,e.h],shot.r);if(a<t){t=a;hit=e;}}
   const rect=bossRect(map,world);if(rect&&world.boss?.started&&world.boss.hp>0){const a=segmentHit(ox,oy,nx,ny,rect,shot.r);if(a<t){t=a;hit='boss';}}
  }else if(shot.team==='enemy')for(const p of players){if(!alive(p)||p.invulnerable||p.zone?.startsWith('home-'))continue;const a=segmentHit(ox,oy,nx,ny,[p.x,p.y,32,32],shot.r);if(a<t){t=a;hit=p;}}
  shot.x=Number.isFinite(t)?ox+(nx-ox)*t:nx;shot.y=Number.isFinite(t)?oy+(ny-oy)*t:ny;shot.ttl--;
  if(hit||shot.ttl<=0){
   if(shot.kind==='banana')puddle(shot,world,solids);
   else if(shot.kind==='explosive')explode(shot,map,world,solids,enemies);
   else if(shot.team==='player'&&hit==='boss')damageBoss(world,.25);
   else if(shot.team==='player'&&hit&&typeof hit==='object')damageEnemy(world,hit,1,{vx:shot.vx});
   else if(shot.team==='enemy'&&hit&&typeof hit==='object')respawn(hit,map);
  }else if(shot.y<900&&shot.y>-100)remaining.push(shot);
 }
 world.projectiles=remaining;
}
export function addEnemyCombat(maps){
 for(const m of maps)for(const [i,e] of m.enemies.entries())if(e.id.startsWith('ancient-')||i===1||i===5){e.combat={type:e.kind==='toaster'?'gunner':e.kind==='duck'?'guardian':'charger',hp:e.kind==='toaster'?2:3};}
}
