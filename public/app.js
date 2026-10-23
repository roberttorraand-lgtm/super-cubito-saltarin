import {connectGame} from '/transport.js';
import {Scene} from '/scene.js';
import {Sound} from '/sound.js';
import {newWorld,newPlayer,playerMove,DT} from '/shared/simulation.js';
import {hourAt,roomAt,interaction,cameras} from '/shared/world.js';
const $=s=>document.querySelector(s),keys=new Set(),taps=new Set(),sound=new Sound();
let scene;try{scene=new Scene($('#world'),$('#camera-feed'));}catch(error){$('#error').textContent='No se pudo iniciar el motor 3D. Prueba a actualizar el controlador gráfico.';console.error(error);}
let socket,id=null,state={world:newWorld(),players:[],started:false},local=null,pending=[],seq=0,look={yaw:Math.PI/2,pitch:0},paused=false,last=performance.now(),acc=0,saved=null,loading=false,latestEvent=0,notice='',noticeUntil=0;
const demo=newPlayer('demo','Guardia');demo.x=-10;demo.z=-7.3;demo.yaw=.9;
const storage={async save(data){if(window.guardian)return window.guardian.save(data);localStorage.setItem('turno-cero.save',JSON.stringify(data));return true;},async load(){if(window.guardian)return window.guardian.load();try{return JSON.parse(localStorage.getItem('turno-cero.save'));}catch{return null;}}};
$('#relay').value=window.guardian?.relay??location.origin;$('#quit').hidden=!window.guardian;$('#continue').disabled=true;
storage.load().then(data=>{saved=data;$('#continue').disabled=!data;}).catch(()=>{});
function info(text){notice=text;noticeUntil=performance.now()+5000;}
function active(){return id&&state.started&&state.world.status==='playing'&&!paused;}
function lock(){if(active()&&!local?.phone)$('#world').requestPointerLock?.();sound.start();}
function unlock(){if(document.pointerLockElement)document.exitPointerLock();}
function setPause(value){if(!id)return;paused=value;$('#pause').hidden=!value;keys.clear();taps.clear();unlock();if(state.mode==='solo')socket?.send(JSON.stringify({type:'pause',paused:value}));if(!value)lock();$('#pause-note').textContent=state.mode==='solo'?'El turno individual está en pausa.':'El turno cooperativo continúa mientras consultas este menú.';$('#save').disabled=state.host!==id;}
function leave(){socket?.close();socket=null;id=null;local=null;pending=[];keys.clear();taps.clear();paused=false;state={world:newWorld(),players:[],started:false};for(const selector of ['#hud','#pause','#ready','#ending','#phone','#caught'])$(selector).hidden=true;$('#menu').hidden=false;unlock();$('#error').textContent='';loading=false;}
async function connect(mode,code='',data=null){
 if(loading)return;const name=$('#name').value.trim();if(!name){$('#error').textContent='Escribe el nombre del guardia.';return;}loading=true;$('#error').textContent='Conectando…';sound.start();
 try{const connection=connectGame(mode,code,$('#relay').value,{forceRelay:$('#link-mode').value==='relay'});socket=connection;$('#network').textContent=mode==='solo'?'INDIVIDUAL · LOCAL':'CONECTANDO CON EL ANFITRIÓN';
 const timer=setTimeout(()=>{if(!id&&socket===connection){connection.close();loading=false;$('#error').textContent='No se pudo contactar con el servidor.';}},45000);
 connection.addEventListener('open',()=>connection.send(JSON.stringify({type:'join',mode,name,code,save:data})));
 connection.addEventListener('network',event=>{const role=event.role==='host'?'ANFITRIÓN · SIMULACIÓN LOCAL':'INVITADO';$('#network').textContent=event.role==='host'?role+(event.transport==='relay'?' · ENLACE DE APOYO':''):role+(event.transport==='relay'?' · ENLACE DE APOYO':' · CONEXIÓN DIRECTA');if(event.text)info(event.text);});
 connection.addEventListener('message',async event=>{if(socket!==connection)return;let m;try{m=JSON.parse(event.data);}catch{return;}
  if(m.type==='error'){$('#error').textContent=m.text;loading=false;if(!id)socket.close();return;}
  if(m.type==='welcome'){clearTimeout(timer);id=m.id;state=m;local=structuredClone(m.players.find(p=>p.id===id));look={yaw:local.yaw,pitch:local.pitch};seq=0;pending=[];latestEvent=m.world.event?.id??0;$('#menu').hidden=true;$('#hud').hidden=false;$('#error').textContent='';loading=false;info('Lee el manual con ESC. El turno aún no ha empezado.');}
  if(m.type==='state'&&id&&m.world.frame<state.world.frame)return;
  if(m.type==='state'||m.type==='welcome'){
   const wasStarted=state.started;state=m;if(m.started&&!wasStarted)info('23:00 · Tienes dos minutos para reconocer el local y preparar el equipo.');const p=m.players.find(p=>p.id===id);if(p){pending=pending.filter(i=>i.seq>p.seq);local=structuredClone(p);if(m.started&&!paused)for(const i of pending)playerMove(local,i,m.world);}
   $('#ready').hidden=!!m.started;$('#room-code').textContent=m.mode==='coop'?`SALA ${m.code} · Comparte este código con tus compañeros.`:'TURNO INDIVIDUAL · SIN COMPAÑEROS';$('#crew').textContent=m.players.map(p=>p.name).join(' / ');$('#start').disabled=m.host!==id||(m.mode==='coop'&&m.players.length<2);$('#waiting').textContent=m.mode==='coop'&&m.players.length<2?'Hace falta un segundo guardia para empezar.':m.host===id?'Todos dentro. Ficha cuando estéis preparados.':'El anfitrión decidirá cuándo empezar.';
   if(m.world.status!=='playing'){unlock();$('#phone').hidden=true;$('#pause').hidden=true;paused=false;$('#ending').hidden=performance.now()/1000<(scene?.scareUntil??0);const won=m.world.status==='won';$('#ending-tag').textContent=won?'07:00 · FIN DEL TURNO':'INCIDENTE REGISTRADO';$('#ending-title').textContent=won?'Has llegado a la mañana.':'El local sigue abierto.';$('#ending-copy').textContent=won?'La persiana se levanta. Hoy no tendrás que conocer a tu sustituto.':'Ningún guardia consiguió terminar la noche. Vuelve al menú para intentarlo de nuevo.';}
   if(m.world.event&&m.world.event.id!==latestEvent){latestEvent=m.world.event.id;info(m.world.event.text);if(m.world.event.type==='caught'&&m.world.event.player===id){scene?.showScare(m.world.event.enemy);$('#ending').hidden=true;$('#caught').hidden=false;setTimeout(()=>{$('#caught').hidden=true;if(id&&state.world.status!=='playing')$('#ending').hidden=false;},1100);}}
  }
  if(m.type==='save'){try{const data={...m.data,mode:state.mode};await storage.save(data);saved=data;$('#continue').disabled=false;$('#save-status').textContent='Partida guardada en este ordenador.';}catch{$('#save-status').textContent='No se ha podido escribir la partida. Comprueba el espacio y los permisos.';}}
 });
 connection.addEventListener('close',event=>{clearTimeout(timer);if(socket!==connection)return;if(id){leave();$('#error').textContent=event.reason||'Conexión cerrada. Puedes continuar desde tu último guardado.';}else{loading=false;if($('#error').textContent==='Conectando…')$('#error').textContent='No se pudo abrir la conexión.';}});
 connection.addEventListener('error',()=>{if(socket!==connection)return;$('#error').textContent='No se pudo conectar. Revisa la dirección del servidor.';loading=false;});
 }catch(error){$('#error').textContent=error.message;loading=false;}
}
$('#solo').onclick=()=>connect('solo');$('#create').onclick=()=>connect('coop');$('#join').onclick=()=>{const code=$('#code').value.trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(code)){$('#error').textContent='El código tiene seis letras y números.';return;}connect('coop',code);};$('#continue').onclick=()=>saved&&connect(saved.mode??'solo','',saved);
$('#start').onclick=()=>{socket.send(JSON.stringify({type:'start'}));sound.start();};$('#capture').onclick=lock;$('#resume').onclick=()=>setPause(false);$('#save').onclick=()=>{socket?.send(JSON.stringify({type:'save'}));$('#save-status').textContent='Guardando…';};for(const b of document.querySelectorAll('[data-leave]'))b.onclick=leave;
$('#fullscreen').onclick=()=>window.guardian?window.guardian.fullscreen():document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();$('#quit').onclick=()=>window.guardian?.quit();$('#volume').oninput=e=>sound.setVolume(Number(e.target.value)/100);$('#quality').onchange=e=>{if(scene){scene.quality=e.target.value;scene.resize();}};$('#show-fps').onchange=e=>$('#performance').hidden=!e.target.checked;
$('#close-phone').onclick=()=>taps.add('Tab');for(const c of cameras){const button=document.createElement('button');button.textContent=c.name;button.onclick=()=>{if(local)local.camera=c.id;selectedCamera=c.id;};button.dataset.camera=c.id;$('#camera-buttons').append(button);}let selectedCamera=0;
addEventListener('keydown',e=>{if(!id||e.target.closest('input,select'))return;if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){setPause(!paused);return;}if(paused)return;if(!e.repeat)taps.add(e.code);keys.add(e.code);});addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('mousemove',e=>{if(document.pointerLockElement===$('#world')&&active()&&!local?.phone){look.yaw+=e.movementX*.0023;look.pitch=Math.max(-1.2,Math.min(1.2,look.pitch-e.movementY*.0023));}});
addEventListener('blur',()=>{keys.clear();taps.clear();if(id&&state.mode==='solo'&&!paused)setPause(true);});document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)keys.clear();});
function input(){const i={type:'input',seq:++seq,yaw:look.yaw,pitch:look.pitch,camera:selectedCamera,forward:keys.has('KeyW')||keys.has('ArrowUp'),back:keys.has('KeyS')||keys.has('ArrowDown'),left:keys.has('KeyA'),right:keys.has('KeyD'),run:keys.has('ShiftLeft')||keys.has('ShiftRight'),crouch:keys.has('KeyC'),interact:taps.has('KeyE'),phone:taps.has('Tab'),flashlight:taps.has('KeyF'),lure:taps.has('KeyG')};taps.clear();return i;}
let view={x:demo.x,z:demo.z},lastPhone=false;
function frame(now){const dt=Math.min(.08,(now-last)/1000);last=now;acc+=dt;
 if(active()&&local&&socket?.readyState===WebSocket.OPEN){while(acc>=DT){acc-=DT;const i=input();socket.send(JSON.stringify(i));pending.push(i);if(pending.length>90)pending.shift();local.input=i;playerMove(local,i,state.world);}}else{acc=0;taps.clear();}
 let me=local??demo;if(local&&!local.alive)me=state.players.find(p=>p.alive)??local;
 if(Math.hypot(me.x-view.x,me.z-view.z)>2){view.x=me.x;view.z=me.z;}else{view.x+=(me.x-view.x)*(1-Math.exp(-22*dt));view.z+=(me.z-view.z)*(1-Math.exp(-22*dt));}
 const moving=active()&&(keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD')||keys.has('ArrowUp')||keys.has('ArrowDown'));
 const shown={...me,x:view.x,z:view.z},phone=!!local?.phone&&active();$('#phone').hidden=!phone;if(phone&&!lastPhone)unlock();lastPhone=phone;
 scene?.draw(state,shown,{...look,crouch:keys.has('KeyC'),moving,run:keys.has('ShiftLeft')},dt,now/1000);
 if(scene){const m=scene.metrics;$('#performance').textContent=`${Math.round(m.fps??0)} FPS · ${m.width??0}×${m.height??0} · ${m.drawCalls??0} dibujos`;}
 if(id&&local){$('#clock').textContent=hourAt(state.world.elapsed);$('#phase').textContent=state.world.elapsed<120?'PREPARACIÓN':state.world.elapsed>=480?'NO BAJES LA GUARDIA':'TURNO NOCTURNO';$('#location').textContent=roomAt(me);$('#battery').textContent=`TELÉFONO ${Math.ceil(local.battery)}%`;$('#phone-battery').textContent=`${Math.ceil(local.battery)}%`;$('#lures').textContent=`LATAS ${local.lures} / 3`;$('#stamina').style.width=`${local.stamina}%`;const action=active()?interaction(local,state.world):null;$('#prompt').textContent=action?`E · ${action.label}${local.hidden&&state.world.elapsed-(local.hideSince??0)>35?' · CUIDADO CON TU RESPIRACIÓN':''}`:'';$('#message').textContent=now<noticeUntil?notice:'';$('#spectator').hidden=local.alive;$('#capture').hidden=!active()||phone||!!document.pointerLockElement;$('#camera-label').textContent=cameras[selectedCamera].name;for(const b of $('#camera-buttons').children)b.classList.toggle('active',Number(b.dataset.camera)===selectedCamera);sound.update(state,me,moving,now/1000);}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
