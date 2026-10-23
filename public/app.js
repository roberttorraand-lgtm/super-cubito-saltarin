import { nearbyInteraction, houseFor, zoneBounds } from '/exploration.js';
import { levels, newPlayer, createWorld, STEP_MS } from '/game.js';
import { prediction, predictFrame, interpolate, SnapshotTimeline, PeerPresentation } from '/netcode.js';
import { Renderer } from '/graphics.js';
const $=s=>document.querySelector(s);
const renderer=new Renderer($('#game'));
renderer.attachButton($('#graphics'));
// Expose read-only rendering metrics for device diagnostics.
window.cubitoGraphics=()=>({...renderer.engine.stats,mode:renderer.engine.stats?.mode??'2D'});
renderer.setLevel(levels[0]);
let socket,id,level,room='',busy=false,revision=0,phase='playing',levelIndex=0,mode='coop';
let players=[],local=null,previousLocal=null,pending=[],seq=0,accumulator=0,lastTime=performance.now();
let correction={x:0,y:0},histories=new Map(),playerSignature='',ping=0,lastPing=0;
let world=createWorld(),projectedWorld=createWorld(),ghosts=[];
let timeline=new SnapshotTimeline();
const peerPresentation=new PeerPresentation();
const keys=new Set();
const routeDots=new Map();
let interactQueued=false,jumpQueued=false,useQueued=false,selectedPower=1;
$('#code').value=(new URLSearchParams(location.search).get('sala')||'').slice(0,6);
function error(message){$('#error').textContent=message;}
function resetLevel(m){
  selectedPower=1;useQueued=false;id=m.id;level=m.level;mode=m.mode??'coop';revision=m.revision;levelIndex=m.levelIndex;phase='playing';
  world=m.world??createWorld();projectedWorld=structuredClone(world);ghosts=[];
  local=m.player?structuredClone(m.player):newPlayer(id,$('#name').value,'#b4f669',level);previousLocal={...local};
  pending=[];seq=0;correction={x:0,y:0};histories.clear();peerPresentation.clear();timeline=new SnapshotTimeline();players=[];keys.clear();interactQueued=jumpQueued=useQueued=false;accumulator=0;
  renderer.setLevel(level);$('#boss-hud').hidden=true;$('#victory').hidden=true;$('#restart-panel').hidden=true;$('#next').disabled=false;
  $('#level-label').textContent=`MUNDO ${String(levelIndex+1).padStart(2,'0')} / ${level.name.toUpperCase()}`;
  $('#level-info').textContent=`${levelIndex+1} / ${m.totalLevels} · ${level.subtitle}`;
  $('#level-info').classList.remove('announce');void $('#level-info').offsetWidth;$('#level-info').classList.add('announce');
}
function updateState(m){
  if(m.revision!==revision)return;
  players=m.players;phase=m.phase;world=m.world??createWorld();
  $('#room-label').textContent=`${mode==='solo'?'EN SOLITARIO':`SALA ${room}`} · ARCHIVOS ${world.eggs?.length??0} / ${level.easterEggs.length}`;
  const now=performance.now();timeline.push(m.frame,now);
  const authoritative=players.find(p=>p.id===id);
  if(authoritative){
    pending=pending.filter(frame=>frame.seq>authoritative.seq);
    const result=prediction(authoritative,phase==='playing'?pending:[],level,world,players.filter(p=>p.id!==id));
    const corrected=result.state;peerPresentation.rebase(ghosts,result.ghosts);ghosts=result.ghosts;projectedWorld=result.world;
    if(local&&local.deaths===corrected.deaths&&Math.hypot(local.x-corrected.x,local.y-corrected.y)<150&&phase==='playing'){
      correction.x+=local.x-corrected.x;correction.y+=local.y-corrected.y;
    }else correction={x:0,y:0};
    const continuous=local&&previousLocal&&local.deaths===corrected.deaths&&local.zone===corrected.zone&&phase==='playing';
    const dx=continuous?local.x-previousLocal.x:0,dy=continuous?local.y-previousLocal.y:0;
    local=corrected;previousLocal={...local,x:local.x-dx,y:local.y-dy};
  }
  const connected=new Set(players.map(p=>p.id));peerPresentation.retain(connected);
  for(const key of histories.keys())if(!connected.has(key))histories.delete(key);
  for(const p of players){
    if(p.id===id)continue;
    const history=histories.get(p.id)||[];history.push({time:m.frame*1000/60,player:p});
    if(history.length>24)history.shift();histories.set(p.id,history);
  }
  const signature=players.map(p=>`${p.id}:${p.finished}:${p.lives}:${p.eliminated}`).join('|');
  if(signature!==playerSignature){
    playerSignature=signature;
    $('#players').replaceChildren(...players.map(p=>{
      const el=document.createElement('span');el.className='player';
      const swatch=document.createElement('i');swatch.className='swatch';swatch.style.backgroundColor=p.color;
      el.append(swatch,document.createTextNode(p.name+(p.id===id?' (tú)':'')+(p.eliminated?' · KO':p.finished?' ✓':` · ♥${p.lives??3}`)));return el;
    }));
  }
  $('#boss-hud').hidden=local?.zone!=='boss';
  if(local?.zone==='boss')$('#boss-hud').textContent=world.boss?.hp===0?'JEFE DERROTADO':`JEFE · ${'◆'.repeat(Math.ceil(world.boss?.hp??3))}${'◇'.repeat(3-Math.ceil(world.boss?.hp??3))}`;
  const lives=authoritative?.lives??3;
  const heartText='♥'.repeat(lives)+'♡'.repeat(3-lives);
  if($('#hearts').textContent!==heartText)$('#hearts').textContent=heartText;
  $('#life-label').textContent=authoritative?.eliminated?'ESPECTADOR':`${lives} / 3 VIDAS`;
  $('#restart-panel').hidden=phase!=='playing'||!players.some(p=>p.eliminated);
  const restartVoted=(m.restartReady??[]).includes(id);
  $('#restart-description').textContent=authoritative?.eliminated?'Sin vidas. Observa a tu equipo o acordad reiniciar este mundo.':'Un compañero está sin vidas. Podéis continuar o votar para reiniciar el mundo.';
  $('#restart').disabled=restartVoted;
  $('#restart').textContent=restartVoted?`Voto enviado (${m.restartReady.length}/${players.length})`:'Reiniciar mundo juntos';
  $('#victory').hidden=phase==='playing';
  if(phase!=='playing'){
    const final=phase==='complete',lost=phase==='defeated';
    $('#victory-eyebrow').textContent=lost?'SE ACABARON LAS VIDAS':(mode==='solo'?'¡LO HAS CONSEGUIDO!':'¡LO HABÉIS CONSEGUIDO!');
    $('#victory-title').textContent=lost?(mode==='solo'?'El meme te ganó.':'El meme os ganó.'):final?(mode==='solo'?'¡Cuatro mundos, un cubito!':'¡Cuatro mundos, un equipo!'):'¡Nivel superado!';
    $('#victory-description').textContent=lost?(mode==='solo'?'Reintenta este mundo con tres vidas nuevas.':'Votad todos para repetir este mundo con tres vidas nuevas.'):final?(mode==='solo'?'Has sobrevivido al archivo cursed de 2016. ¿Otra vuelta?':'Habéis sobrevivido al caos. ¿Otra vuelta juntos?'):`Siguiente parada: ${levels[levelIndex+1].name}. Recuperas 3 vidas.`;
    const votes=lost?(m.restartReady??[]):m.ready,ready=votes.includes(id);$('#next').disabled=ready;
    $('#next').textContent=ready?`Esperando al equipo (${votes.length}/${players.length})`:(lost?'Reintentar este mundo · 3 vidas':final?(mode==='solo'?'Volver a jugar ↗':'Volver a jugar juntos ↗'):'Siguiente mundo · 3 vidas ↗');
  }
  const objective=(level.objectives??[]).find(o=>!world.activated.includes(o.group));
  const pads=objective?level.plates.filter(p=>p.group===objective.group):[];
  const nearby=!local?.zone&&objective&&pads.length&&Math.min(...pads.map(p=>p.x))-(local?.x??0)<750;
  const hint=local?.zone==='boss'?level.boss.hint:local?.zone==='secret'?'SALA SECRETA · Llega a la puerta del fondo para obtener un escudo.':nearby?objective.hint:null;
  const movementTip=level.id===2?'Hielo: frena con tiempo y no te detengas sobre los puentes frágiles.':level.id===3?'Gravedad lunar: mantén el salto y calcula los pulsos de energía.':level.subtitle;
  const region=(level.regions??[]).filter(r=>r.x<=(local?.x??0)).at(-1);
  const home=houseFor(level,local);
  const egg=world.lastEgg?.until>world.frame?world.lastEgg.caption:null;
  const instruction=egg??hint??(home?`INTERIOR · ${home.owner}`:`${levelIndex+1} / ${levels.length} · ${region?.name??movementTip}`);
  if($('#level-info').textContent!==instruction)$('#level-info').textContent=instruction;
  $('#status').textContent=local?.eliminated?'SIN VIDAS · MODO ESPECTADOR':local?.finished?'EN LA META · ESPERANDO AL EQUIPO':mode!=='solo'&&players.length<2?'INVITA A ALGUIEN PARA COMPLETAR EL NIVEL':hint??(local?.checkpoint>=0?'PUNTO DE CONTROL GUARDADO':'¡JUNTOS HASTA LA BANDERA!');
}
function connect(joinExisting,solo=false){
  if(busy)return;
  if(!$('#name').value.trim()){$('#name').focus();return error('Ponle un nombre a tu cubito.');}
  const code=$('#code').value.trim().toUpperCase();
  if(joinExisting&&!/^[A-F0-9]{6}$/.test(code))return error('Introduce los 6 caracteres de la sala.');
  busy=true;error('Conectando…');$('#create').disabled=$('#join').disabled=true;
  socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}`);
  const timeout=setTimeout(()=>socket.close(),15000);
  socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'join',name:$('#name').value,room:joinExisting?code:'',mode:solo?'solo':'coop'})));
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.type==='error'){error(m.message);socket.close();return;}
    if(m.type==='welcome'){
      clearTimeout(timeout);resetLevel(m);room=m.room;busy=false;
      $('#lobby').hidden=true;$('#life-hud').hidden=false;$('#copy').hidden=mode==='solo';$('#fullscreen').hidden=false;
      $('#touch').hidden=!(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0);
      $('#room-label').textContent=mode==='solo'?'AVENTURA EN SOLITARIO · 1 JUGADOR':`SALA ${room} · 2–4 JUGADORES`;
      history.replaceState(null,'',mode==='solo'?'?modo=solo':`?sala=${room}`);
    }
    if(m.type==='level')resetLevel(m);
    if(m.type==='state')updateState(m);
    if(m.type==='pong'&&typeof m.sent==='number'){
      ping=Math.round(performance.now()-m.sent);$('#connection').textContent=`${ping} ms`;
      $('#connection').classList.toggle('slow',ping>150);
    }
  });
  socket.addEventListener('close',()=>{
    clearTimeout(timeout);busy=false;$('#create').disabled=$('#join').disabled=false;
    if(id){
      id=null;players=[];level=null;local=null;pending=[];histories.clear();keys.clear();playerSignature='';
      renderer.setLevel(levels[0]);$('#players').textContent='Tu equipo aparecerá aquí';
      $('#lobby').hidden=false;$('#boss-hud').hidden=true;$('#life-hud').hidden=true;$('#restart-panel').hidden=true;$('#victory').hidden=true;$('#touch').hidden=true;$('#copy').hidden=true;$('#fullscreen').hidden=true;
      $('#code').value=room;$('#room-label').textContent='CONEXIÓN INTERRUMPIDA';$('#connection').textContent='Sin conexión';
      error(mode==='solo'?'Se ha perdido la conexión. Pulsa Jugar solo para empezar una nueva aventura.':'Se ha perdido la conexión. Pulsa Entrar para volver a tu sala.');
    }else if($('#error').textContent==='Conectando…')error('No se pudo conectar con el servidor. Inténtalo de nuevo.');
  });
  socket.addEventListener('error',()=>error('No se pudo conectar con el servidor.'));
}
$('#join-form').addEventListener('submit',e=>{e.preventDefault();connect(false);});
$('#join').addEventListener('click',()=>connect(true));
for(const b of document.querySelectorAll('[data-power]'))b.addEventListener('click',()=>{selectedPower=Number(b.dataset.power);});
$('#solo').addEventListener('click',()=>connect(false,true));
$('#next').addEventListener('click',()=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:phase==='defeated'?'restart':'next',revision}));});
$('#restart').addEventListener('click',()=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'restart',revision}));});
$('#copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);$('#copy').textContent='¡Invitación copiada!';setTimeout(()=>$('#copy').textContent='Copiar invitación ↗',2000);}
  catch{$('#status').textContent=`COMPARTE LA DIRECCIÓN DE ESTA PÁGINA · SALA ${room}`;}
});
$('#fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.game-shell').requestFullscreen();}
  catch{$('#status').textContent='PANTALLA COMPLETA NO DISPONIBLE EN ESTE NAVEGADOR';}
});
const controls=['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space','KeyE','ArrowDown','KeyR','Digit1','Digit2','Digit3'];
addEventListener('keydown',e=>{if(!id||!controls.includes(e.code)||e.target.closest('input'))return;e.preventDefault();keys.add(e.code);if(['Digit1','Digit2','Digit3'].includes(e.code))selectedPower=Number(e.code.at(-1));if(e.code==='KeyR'&&!e.repeat)useQueued=true;if(!e.repeat&&['KeyE','ArrowDown'].includes(e.code))interactQueued=true;if(!e.repeat&&['Space','ArrowUp','KeyW'].includes(e.code))jumpQueued=true;});
addEventListener('keyup',e=>{keys.delete(e.code);if(id&&controls.includes(e.code))e.preventDefault();});
addEventListener('blur',()=>{keys.clear();interactQueued=jumpQueued=useQueued=false;});
document.addEventListener('visibilitychange',()=>{keys.clear();interactQueued=jumpQueued=useQueued=false;accumulator=0;lastTime=performance.now();});
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);if(b.dataset.key==='KeyR')useQueued=true;if(b.dataset.key==='KeyE')interactQueued=true;if(b.dataset.key==='Space')jumpQueued=true;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));
}
function draw(now){
  const elapsed=Math.min(now-lastTime,100);lastTime=now;const dt=elapsed/1000;
  if(id&&local&&socket?.readyState===WebSocket.OPEN&&phase==='playing'){
    accumulator+=elapsed;
    while(accumulator>=STEP_MS){
      accumulator-=STEP_MS;previousLocal={...local};
      const input={type:'input',revision,seq:++seq,left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:jumpQueued||keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW'),interact:interactQueued||keys.has('KeyE')||keys.has('ArrowDown'),use:useQueued||keys.has('KeyR'),power:selectedPower};
      interactQueued=jumpQueued=useQueued=false;
      local.input=input;predictFrame(local,ghosts,level,projectedWorld);pending.push(input);
      if(pending.length>120)pending.shift();
      if(socket.bufferedAmount<65536)socket.send(JSON.stringify(input));
    }
  }else accumulator=0;
  correction.x*=Math.exp(-14*dt);correction.y*=Math.exp(-14*dt);
  const visible=[];
  const remoteTime=timeline.render(now);
  if(id&&local){
    const alpha=accumulator/STEP_MS;
    const snap=local.deaths!==previousLocal?.deaths||local.zone!==previousLocal?.zone||phase!=='playing';
    visible.push({...local,x:snap?local.x:previousLocal.x+(local.x-previousLocal.x)*alpha+correction.x,y:snap?local.y:previousLocal.y+(local.y-previousLocal.y)*alpha+correction.y});
    for(const history of histories.values()){
      let p=interpolate(history,remoteTime),mode='snapshot';
      const ghost=ghosts.find(g=>g.id===p?.id);
      if(ghost&&(local.supportId===ghost.id||ghost.supportId===id||Math.hypot(local.x-ghost.x,local.y-ghost.y)<90)){p=ghost;mode='contact';}
      if(p)visible.push(peerPresentation.sample(p,mode,now));
    }
    if(now-lastPing>1500){lastPing=now;socket.send(JSON.stringify({type:'ping',sent:now}));}
  }else visible.push({...newPlayer('demo','Tu aventura empieza aquí','#b4f669'),grounded:true});
  const displayWorld=id&&phase==='playing'?{...world,frame:projectedWorld.frame}:world;
  const action=id&&local&&phase==='playing'?nearbyInteraction(local,level,displayWorld):null;
  $('#interaction').hidden=!action;
  const prompt=action?`E / ↓ · ${action.label}`:'';
  if($('#interaction').textContent!==prompt)$('#interaction').textContent=prompt;
  const dialogue=id&&local?.dialogue&&local.dialogue.until>displayWorld.frame&&phase==='playing'?local.dialogue:null;
  $('#dialogue').hidden=!dialogue;
  if(dialogue){if($('#dialogue-name').textContent!==dialogue.name)$('#dialogue-name').textContent=dialogue.name;if($('#dialogue-text').textContent!==dialogue.text)$('#dialogue-text').textContent=dialogue.text;}
  $('#powerups').hidden=!id;
  if(id&&local){
    for(const b of document.querySelectorAll('[data-power]')){const on=Number(b.dataset.power)===selectedPower;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}
    const fuel=local.fuel??180,charge=local.charge??0,cool=local.weaponCooldown??0;
    $('#power-meter-fill').style.width=`${selectedPower===2?fuel/180*100:selectedPower===1?Math.min(100,charge/60*100):Math.max(0,100-cool/120*100)}%`;
    $('#power-meter').setAttribute('aria-valuenow',String(Math.round(selectedPower===2?fuel/180*100:selectedPower===1?Math.min(100,charge/60*100):Math.max(0,100-cool/120*100))));
    $('#power-meter').className=selectedPower===2?'fuel':charge>=60?'charged':'';
    const label=local.eliminated?'SIN VIDAS':selectedPower===2?`COMBUSTIBLE ${Math.round(fuel/180*100)}%`:selectedPower===1?(charge>=60?'EXPLOSIVO LISTO · SUELTA R':charge?'CARGANDO · MANTÉN R':cool?'RECARGANDO…':'R · TOQUE / MANTÉN 1 s'):cool?'PREPARANDO BANANA…':'R · BANANA: TODOS RESBALAN';
    if($('#power-status').textContent!==label)$('#power-status').textContent=label;
  }
  const routeMap=$('#route-map'),showRoute=!!id&&renderer.engine.stats?.mode==='2.5D';routeMap.hidden=!showRoute;
  if(showRoute){const focus=visible.find(p=>p.id===id&&!p.eliminated)??visible.find(p=>!p.eliminated)??local;const bounds=zoneBounds(level,focus),connected=new Set(visible.map(p=>p.id));
    for(const [key,dot] of routeDots)if(!connected.has(key)){dot.remove();routeDots.delete(key);}
    for(const p of visible){let dot=routeDots.get(p.id);if(!dot){dot=document.createElement('i');dot.style.backgroundColor=p.color;dot.title=p.name;routeDots.set(p.id,dot);routeMap.append(dot);}dot.hidden=p.eliminated||p.zone!==focus?.zone;dot.className=p.id===id?'you':'';dot.style.left=`${Math.max(0,Math.min(100,(p.x-bounds.x)/bounds.w*100))}%`;}
  }
  renderer.draw(visible,id,now/1000,dt,{...displayWorld,projectiles:projectedWorld.projectiles??world.projectiles,puddles:projectedWorld.puddles??world.puddles,explosions:projectedWorld.explosions??world.explosions});
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
