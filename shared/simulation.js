import {nightNumber,nightRules,powerState} from './nights.js';
import {NIGHT_SECONDS,PREP_SECONDS,mascots,doors,hides,cameras,charger,dispenser,solids,move,clearLine,near,pathTo,interaction,blocked} from './world.js';
export const DT=1/30;
export function newPlayer(id,name,slot=0){return {id,name,slot,x:-10.7+slot*.65,z:-7.2,yaw:Math.PI/2,pitch:0,alive:true,hidden:null,stamina:100,battery:100,lures:3,phone:false,flashlight:true,camera:0,seq:0,input:{},held:{},refillAt:0};}
export function newWorld(night=1){return {version:1,night:nightNumber(night),power:powerState(night,0),elapsed:0,frame:0,status:'playing',paused:false,doors:Object.fromEntries(doors.map(d=>[d.id,{closed:false,power:100}])),enemies:mascots.map((m,i)=>({...m,state:'dormant',target:null,path:[],repath:0,patrol:i,stun:0})),lures:[],event:null,eventId:0};}
const patrol=[{x:0,z:0},{x:-11,z:0},{x:11,z:0},{x:12,z:6},{x:2,z:9},{x:10,z:9},{x:-10,z:6},{x:2,z:-7}];
export function playerMove(p,input,world,dt=DT){
 if(!p.alive)return;p.yaw=input.yaw??p.yaw;p.pitch=input.pitch??p.pitch;
 if(p.hidden)return;let forward=Number(!!input.forward)-Number(!!input.back),side=Number(!!input.right)-Number(!!input.left);const length=Math.hypot(forward,side);if(!length)return;
 const running=input.run&&p.stamina>1&&!p.phone;const speed=input.crouch?1.2:running?4.4:2.55;
 const dx=(Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)/length*speed*dt;
 const dz=(-Math.cos(p.yaw)*forward+Math.sin(p.yaw)*side)/length*speed*dt;move(p,dx,dz,solids(world));
}
export function emit(world,type,text,data={}){world.event={id:++world.eventId,type,text,until:world.elapsed+5,...data};}
function use(p,world,players){
 const action=interaction(p,world);if(!action)return;
 if(action.type==='door'){const d=world.doors[action.id];if(!d.closed){const shape=doors.find(q=>q.id===action.id);if(players.some(q=>q.alive&&!q.hidden&&blocked(q.x,q.z,[[shape.x,shape.z,shape.w,shape.d]]))){emit(world,'info','Apártate del umbral para cerrar la puerta.');return;}}if(d.closed||d.power>5){d.closed=!d.closed;emit(world,'door',d.closed?'Puerta blindada cerrada. Consume energía.':'Puerta blindada abierta.',{x:p.x,z:p.z});}}
 if(action.type==='hide'){if(p.hidden){if(p.hideReturn){p.x=p.hideReturn.x;p.z=p.hideReturn.z;}p.hidden=null;p.hideReturn=null;}else{p.hideReturn={x:p.x,z:p.z};p.hideSince=world.elapsed;p.exposedUntil=world.enemies.some(e=>e.state!=='dormant'&&near(p,e,8)&&clearLine(e.x,e.z,p.x,p.z,solids(world)))?world.elapsed+6:0;const spot=hides.find(h=>h.id===action.id);p.hidden=spot.id;p.x=spot.x;p.z=spot.z;p.phone=false;p.flashlight=false;}}
 if(action.type==='charge'){emit(world,'info',world.power?.active?'La base no tiene corriente. Espera a que vuelva el suministro.':'Teléfono conectado: recarga automática mientras permanezcas junto a la base.');}
 if(action.type==='refill'&&world.elapsed>=p.refillAt){p.lures=3;p.refillAt=world.elapsed+nightRules(world.night).refill;emit(world,'info','Tres latas. Pulsa G para lanzar una distracción.');}
}
function throwLure(p,world){if(!p.alive||p.hidden||!p.lures)return;p.lures--;const l={x:p.x,z:p.z,until:world.elapsed+nightRules(world.night).lureTime};move(l,Math.sin(p.yaw)*4.5,-Math.cos(p.yaw)*4.5,solids(world),.08);world.lures.push(l);world.lures=world.lures.slice(-8);emit(world,'lure','El golpe de la lata resuena por el local.',l);}
export function step(world,players,dt=DT){
 if(world.status!=='playing'||world.paused)return;const rules=nightRules(world.night),oldPower=powerState(world.night,world.elapsed);world.frame++;world.elapsed=Math.min(NIGHT_SECONDS,world.elapsed+dt);world.lures=world.lures.filter(l=>l.until>world.elapsed);
 world.power=powerState(world.night,world.elapsed);
 if(world.power.active&&!oldPower.active)emit(world,'blackout','Fallo eléctrico: cámaras y recarga fuera de servicio. Las puertas usan su reserva.');
 else if(world.power.warning&&!oldPower.warning)emit(world,'warning','Aviso: corte de suministro en ocho segundos. Guarda el teléfono y busca una salida.');
 else if(!world.power.active&&oldPower.active)emit(world,'power','Suministro restablecido. Cámaras y bases operativas.');
 for(const p of players){if(!p.alive)continue;const input=p.input??{};
  if(input.interact&&!p.held.interact)use(p,world,players);if(input.phone&&!p.held.phone&&!p.hidden&&p.battery>0)p.phone=!p.phone;
  if(input.flashlight&&!p.held.flashlight&&!p.hidden&&p.battery>0)p.flashlight=!p.flashlight;
  if(input.lure&&!p.held.lure)throwLure(p,world);p.held={interact:!!input.interact,phone:!!input.phone,flashlight:!!input.flashlight,lure:!!input.lure};p.camera=input.camera??p.camera;
  playerMove(p,input,world,dt);p.stamina=Math.max(0,Math.min(100,p.stamina+(input.run&&(input.forward||input.back||input.left||input.right)&&!p.hidden&&!p.phone&&!input.crouch?-22:14)*dt));
  p.battery=Math.max(0,p.battery-dt*(p.phone?.7:p.flashlight?.09:0)*rules.drain);if(near(p,charger,1.8)&&!p.phone&&!world.power.active)p.battery=Math.min(100,p.battery+dt*rules.charge);
  if(p.battery<=0){p.phone=false;p.flashlight=false;}
 }
 for(const d of doors){const s=world.doors[d.id];s.power=Math.max(0,Math.min(100,s.power+dt*(s.closed?-rules.doorDrain:world.power.active?0:rules.doorCharge)));if(!s.power&&s.closed){s.closed=false;emit(world,'power','La puerta ha agotado su reserva.');}}
 const rects=solids(world),nav=solids(world,true),vision=solids(world,false,true);
 for(const e of world.enemies){
  const awake=rules.awake[mascots.findIndex(m=>m.id===e.id)]??PREP_SECONDS;if(world.elapsed<awake){e.state='dormant';continue;}
  const living=players.filter(p=>p.alive),visible=living.filter(p=>(!p.hidden||p.exposedUntil>world.elapsed)&&near(p,e,rules.sight)&&clearLine(e.x,e.z,p.x,p.z,p.hidden?vision:rects));
  const looked=p=>{const dx=e.x-p.x,dz=e.z-p.z,len=Math.hypot(dx,dz);return len<10&&len>.001&&(dx*Math.sin(p.yaw)-dz*Math.cos(p.yaw))/len>.94&&clearLine(e.x,e.z,p.x,p.z,rects);};
  if(e.id==='gold'&&living.some(p=>!p.hidden&&!p.phone&&looked(p))){e.state='watched';continue;}
  if(e.id==='prisma'&&living.some(p=>p.flashlight&&!p.hidden&&looked(p))&&world.elapsed>(e.cooldown??0)){e.stun=world.elapsed+rules.stun;e.cooldown=world.elapsed+rules.stunCooldown;}
  if(e.id==='prisma'&&world.elapsed<(e.stun??0)){e.state='stunned';continue;}
  let target=visible.sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z))[0];
  const heard=living.find(p=>!p.hidden&&p.input?.run&&near(p,e,(e.id==='welder'?19:9)*rules.hearing));
  const breathing=living.find(p=>p.hidden&&world.elapsed-(p.hideSince??world.elapsed)>rules.breathing&&near(p,e,e.id==='welder'?12:5));if(breathing&&near(breathing,e,1.4))breathing.exposedUntil=world.elapsed+.3;
  const lens=e.id==='prisma'?living.find(p=>p.phone&&near(p,e,16*rules.hearing)):null;
  if(target){e.target={x:target.x,z:target.z};e.memory=world.elapsed+rules.memory;e.state='chase';
   if(e.id==='welder'&&rules.teamwork&&world.elapsed>=(e.alertAt??0)){world.alert={x:target.x,z:target.z,until:world.elapsed+rules.memory};e.alertAt=world.elapsed+10;emit(world,'alarm','Soldador ha dado la alarma. Cambia de habitación.');}}
  else if(lens||heard||breathing){const p=lens??heard??breathing;e.target={x:p.x,z:p.z};e.memory=world.elapsed+7;e.state='investigate';}
  else if(rules.teamwork&&world.alert?.until>world.elapsed&&e.id!=='welder'){e.target={x:world.alert.x,z:world.alert.z};e.memory=world.alert.until;e.state='investigate';}
  else if(world.lures.length){const lure=world.lures.find(l=>near(e,l,e.id==='welder'?24:12));if(lure){e.target={x:lure.x,z:lure.z};e.memory=world.elapsed+4;e.state='investigate';}}
  if(!e.target||world.elapsed>(e.memory??0)){e.target=patrol[e.patrol%patrol.length];e.state='patrol';if(near(e,e.target,.8))e.patrol++;}
  if(e.state==='patrol'&&near(e,e.target,.8)){e.patrol++;e.target=patrol[e.patrol%patrol.length];}
  if(world.elapsed>=e.repath||!e.path?.length){e.path=pathTo(e,e.target,nav);e.repath=world.elapsed+.9;}
  let goal=e.path?.[0];if(goal&&near(e,goal,.2)){e.path.shift();goal=e.path[0];}
  if(!goal&&clearLine(e.x,e.z,e.target.x,e.target.z,nav))goal=e.target;
  if(goal){const dx=goal.x-e.x,dz=goal.z-e.z,length=Math.hypot(dx,dz),burst=e.id==='ember'&&e.state==='chase'&&world.elapsed%7<2;const speed=e.speed*rules.speed*(e.state==='chase'?1.35:1)*(burst?1.9:1);if(length>.01){e.yaw=Math.atan2(dx,-dz);move(e,dx/length*speed*dt,dz/length*speed*dt,rects,.31);}}
  if(e.id==='ember')for(const d of doors)if(world.doors[d.id].closed&&near(e,d,1.35)){world.doors[d.id].power=Math.max(0,world.doors[d.id].power-rules.bang*dt);e.state='banging';}
  for(const p of living)if(near(p,e,p.hidden?1.1:.65)&&clearLine(e.x,e.z,p.x,p.z,p.hidden?vision:rects)&&(!p.hidden||p.exposedUntil>world.elapsed)){p.alive=false;p.hidden=null;p.phone=false;p.flashlight=false;emit(world,'caught',`${p.name} ha sido encontrado.`,{player:p.id,enemy:e.id});}
 }
 if(players.length&&players.every(p=>!p.alive)){world.status='lost';if(world.event?.type!=='caught')emit(world,'lost','El turno ha terminado antes de tiempo.');}
 else if(world.elapsed>=NIGHT_SECONDS){world.status='won';emit(world,'won',`07:00 · Noche ${world.night??1} superada.`);}
}
export function snapshot(world,players){return {version:1,world:structuredClone(world),players:players.map(p=>({...p,input:{},held:{}}))};}
export function restore(data){
 if(data?.version!==1||!data.world||!Array.isArray(data.players)||data.players.length>4)throw new Error('Partida incompatible');const source=data.world,w=newWorld(source.night??1);
 if(source.night!==undefined&&nightNumber(source.night)!==source.night)throw new Error('Noche incompatible');
 if(!Number.isFinite(source.elapsed)||source.elapsed<0||source.elapsed>=NIGHT_SECONDS)throw new Error('Partida finalizada o dañada');
 w.elapsed=source.elapsed;w.power=powerState(w.night,w.elapsed);w.frame=Math.floor(w.elapsed/DT);for(const d of doors){const s=source.doors?.[d.id];if(s){w.doors[d.id].power=Number.isFinite(s.power)?Math.max(0,Math.min(100,s.power)):100;w.doors[d.id].closed=!!s.closed&&w.doors[d.id].power>0;}}
 for(const e of w.enemies){const old=source.enemies?.find(q=>q.id===e.id);if(old&&Number.isFinite(old.x)&&Number.isFinite(old.z)&&!solids(w).some(([x,z,ww,dd])=>Math.abs(old.x-x)<ww/2+.1&&Math.abs(old.z-z)<dd/2+.1)&&Math.abs(old.x)<14.8&&Math.abs(old.z)<11.8){e.x=old.x;e.z=old.z;}}
 const saved=data.players.map((old,i)=>{const p=newPlayer('',String(old.name??'Guardia').slice(0,18),i),pos=old.hidden&&old.hideReturn?old.hideReturn:old;if(Number.isFinite(pos.x)&&Number.isFinite(pos.z)&&Math.abs(pos.x)<14.7&&Math.abs(pos.z)<11.7&&!blocked(pos.x,pos.z,solids(w))){p.x=pos.x;p.z=pos.z;}p.alive=old.alive!==false;p.battery=Number.isFinite(old.battery)?Math.max(0,Math.min(100,old.battery)):100;p.lures=Number.isInteger(old.lures)?Math.max(0,Math.min(3,old.lures)):3;p.yaw=Number.isFinite(old.yaw)?old.yaw:0;p.stamina=Number.isFinite(old.stamina)?Math.max(0,Math.min(100,old.stamina)):100;p.refillAt=Number.isFinite(old.refillAt)?Math.max(w.elapsed,Math.min(w.elapsed+nightRules(w.night).refill,old.refillAt)):0;return p;});return {world:w,players:saved};
}
