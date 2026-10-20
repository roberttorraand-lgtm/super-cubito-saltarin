import { levels, newPlayer, tick, STEP_MS } from '/game.js';
import { reconcile, interpolate } from '/netcode.js';
import { Renderer } from '/renderer.js';
const $=s=>document.querySelector(s);
const renderer=new Renderer($('#game'));
renderer.setLevel(levels[0]);
let socket,id,level,room='',busy=false,revision=0,phase='playing',levelIndex=0;
let players=[],local=null,previousLocal=null,pending=[],seq=0,accumulator=0,lastTime=performance.now();
let correction={x:0,y:0},histories=new Map(),playerSignature='',ping=0,lastPing=0;
const keys=new Set();
$('#code').value=(new URLSearchParams(location.search).get('sala')||'').slice(0,6);
function error(message){$('#error').textContent=message;}
function resetLevel(m){
  id=m.id;level=m.level;revision=m.revision;levelIndex=m.levelIndex;phase='playing';
  local=newPlayer(id,$('#name').value,'#b4f669',level);previousLocal={...local};
  pending=[];seq=0;correction={x:0,y:0};histories.clear();players=[];keys.clear();accumulator=0;
  renderer.setLevel(level);$('#victory').hidden=true;$('#next').disabled=false;
  $('#level-label').textContent=`MUNDO ${String(levelIndex+1).padStart(2,'0')} / ${level.name.toUpperCase()}`;
  $('#level-info').textContent=`${levelIndex+1} / ${m.totalLevels} · ${level.subtitle}`;
  $('#level-info').classList.remove('announce');void $('#level-info').offsetWidth;$('#level-info').classList.add('announce');
}
function updateState(m){
  if(m.revision!==revision)return;
  players=m.players;phase=m.phase;
  const now=performance.now(),authoritative=players.find(p=>p.id===id);
  if(authoritative){
    pending=pending.filter(frame=>frame.seq>authoritative.seq);
    const corrected=reconcile(authoritative,phase==='playing'?pending:[],level);
    if(local&&local.deaths===corrected.deaths&&Math.hypot(local.x-corrected.x,local.y-corrected.y)<150&&phase==='playing'){
      correction.x+=local.x-corrected.x;correction.y+=local.y-corrected.y;
    }else correction={x:0,y:0};
    local=corrected;previousLocal={...local};
  }
  const connected=new Set(players.map(p=>p.id));
  for(const key of histories.keys())if(!connected.has(key))histories.delete(key);
  for(const p of players){
    if(p.id===id)continue;
    const history=histories.get(p.id)||[];history.push({time:now,player:p});
    if(history.length>12)history.shift();histories.set(p.id,history);
  }
  const signature=players.map(p=>`${p.id}:${p.finished}`).join('|');
  if(signature!==playerSignature){
    playerSignature=signature;
    $('#players').replaceChildren(...players.map(p=>{
      const el=document.createElement('span');el.className='player';
      const swatch=document.createElement('i');swatch.className='swatch';swatch.style.backgroundColor=p.color;
      el.append(swatch,document.createTextNode(p.name+(p.id===id?' (tú)':'')+(p.finished?' ✓':'')));return el;
    }));
  }
  $('#victory').hidden=phase==='playing';
  if(phase!=='playing'){
    const final=phase==='complete';
    $('#victory-title').textContent=final?'¡Cuatro mundos, un equipo!':'¡Nivel superado!';
    $('#victory-description').textContent=final?'Habéis completado toda la aventura. ¿Otra vuelta juntos?':`Siguiente parada: ${levels[levelIndex+1].name}.`;
    const ready=m.ready.includes(id);$('#next').disabled=ready;
    $('#next').textContent=ready?`Esperando al equipo (${m.ready.length}/${players.length})`:(final?'Volver a jugar juntos ↗':'Listo para el siguiente mundo ↗');
  }
  $('#status').textContent=local?.finished?'EN LA META · ESPERANDO AL EQUIPO':players.length<2?'INVITA A ALGUIEN PARA COMPLETAR EL NIVEL':local?.checkpoint>=0?'PUNTO DE CONTROL GUARDADO':'¡JUNTOS HASTA LA BANDERA!';
}
function connect(joinExisting){
  if(busy)return;
  if(!$('#name').value.trim()){$('#name').focus();return error('Ponle un nombre a tu cubito.');}
  const code=$('#code').value.trim().toUpperCase();
  if(joinExisting&&!/^[A-F0-9]{6}$/.test(code))return error('Introduce los 6 caracteres de la sala.');
  busy=true;error('Conectando…');$('#create').disabled=$('#join').disabled=true;
  socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}`);
  const timeout=setTimeout(()=>socket.close(),15000);
  socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'join',name:$('#name').value,room:joinExisting?code:''})));
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.type==='error'){error(m.message);socket.close();return;}
    if(m.type==='welcome'){
      clearTimeout(timeout);resetLevel(m);room=m.room;busy=false;
      $('#lobby').hidden=true;$('#copy').hidden=false;$('#fullscreen').hidden=false;
      $('#touch').hidden=!(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0);
      $('#room-label').textContent=`SALA ${room} · 2–4 JUGADORES`;
      history.replaceState(null,'',`?sala=${room}`);
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
      $('#lobby').hidden=false;$('#victory').hidden=true;$('#touch').hidden=true;$('#copy').hidden=true;$('#fullscreen').hidden=true;
      $('#code').value=room;$('#room-label').textContent='CONEXIÓN INTERRUMPIDA';$('#connection').textContent='Sin conexión';
      error('Se ha perdido la conexión. Pulsa Entrar para volver a tu sala.');
    }else if($('#error').textContent==='Conectando…')error('No se pudo conectar con el servidor. Inténtalo de nuevo.');
  });
  socket.addEventListener('error',()=>error('No se pudo conectar con el servidor.'));
}
$('#join-form').addEventListener('submit',e=>{e.preventDefault();connect(false);});
$('#join').addEventListener('click',()=>connect(true));
$('#next').addEventListener('click',()=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'next',revision}));});
$('#copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);$('#copy').textContent='¡Invitación copiada!';setTimeout(()=>$('#copy').textContent='Copiar invitación ↗',2000);}
  catch{$('#status').textContent=`COMPARTE LA DIRECCIÓN DE ESTA PÁGINA · SALA ${room}`;}
});
$('#fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.game-shell').requestFullscreen();}
  catch{$('#status').textContent='PANTALLA COMPLETA NO DISPONIBLE EN ESTE NAVEGADOR';}
});
const controls=['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space'];
addEventListener('keydown',e=>{if(!id||!controls.includes(e.code)||e.target.closest('input'))return;e.preventDefault();keys.add(e.code);});
addEventListener('keyup',e=>{keys.delete(e.code);if(id&&controls.includes(e.code))e.preventDefault();});
addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();accumulator=0;lastTime=performance.now();});
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));
}
function draw(now){
  const elapsed=Math.min(now-lastTime,100);lastTime=now;const dt=elapsed/1000;
  if(id&&local&&socket?.readyState===WebSocket.OPEN&&phase==='playing'){
    accumulator+=elapsed;
    while(accumulator>=STEP_MS){
      accumulator-=STEP_MS;previousLocal={...local};
      const input={type:'input',revision,seq:++seq,left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')};
      local.input=input;tick(local,level);pending.push(input);
      if(pending.length>120)pending.shift();
      if(socket.bufferedAmount<65536)socket.send(JSON.stringify(input));
    }
  }else accumulator=0;
  correction.x*=Math.exp(-14*dt);correction.y*=Math.exp(-14*dt);
  const visible=[];
  if(id&&local){
    const alpha=accumulator/STEP_MS;
    const snap=local.deaths!==previousLocal?.deaths||phase!=='playing';
    visible.push({...local,x:snap?local.x:previousLocal.x+(local.x-previousLocal.x)*alpha+correction.x,y:snap?local.y:previousLocal.y+(local.y-previousLocal.y)*alpha+correction.y});
    for(const history of histories.values()){const p=interpolate(history,now-100);if(p)visible.push(p);}
    if(now-lastPing>3000){lastPing=now;socket.send(JSON.stringify({type:'ping',sent:now}));}
  }else visible.push({...newPlayer('demo','Tu aventura empieza aquí','#b4f669'),grounded:true});
  renderer.draw(visible,id,now/1000,dt);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
