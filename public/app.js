const $=s=>document.querySelector(s);
const canvas=$('#game'),ctx=canvas.getContext('2d');
let socket,id,level,players=[],camera=0,room='',busy=false;
const keys=new Set();
const params=new URLSearchParams(location.search);
$('#code').value=(params.get('sala')||'').slice(0,6);
function error(message){$('#error').textContent=message;}
function connect(joinExisting){
  if(busy)return;
  if(!$('#name').value.trim()){ $('#name').focus();return error('Ponle un nombre a tu cubito.'); }
  const code=$('#code').value.trim().toUpperCase();
  if(joinExisting&&!/^[A-F0-9]{6}$/.test(code))return error('Introduce los 6 caracteres de la sala.');
  busy=true;error('Conectando…');$('#create').disabled=$('#join').disabled=true;
  socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}`);
  const timeout=setTimeout(()=>socket.close(),10000);
  socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'join',name:$('#name').value,room:joinExisting?code:''})));
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.type==='error'){error(m.message);socket.close();return;}
    if(m.type==='welcome'){
      clearTimeout(timeout);id=m.id;level=m.level;room=m.room;busy=false;
      $('#lobby').hidden=true;$('#copy').hidden=false;
      $('#touch').hidden=!matchMedia('(pointer:coarse)').matches;
      $('#room-label').textContent=`SALA ${room} · 2–4 JUGADORES`;
      history.replaceState(null,'',`?sala=${room}`);
    }
    if(m.type==='state'){
      players=m.players;$('#victory').hidden=!m.complete;
      $('#players').replaceChildren(...players.map(p=>{
        const el=document.createElement('span');el.className='player';
        const swatch=document.createElement('i');swatch.className='swatch';swatch.style.backgroundColor=p.color;
        el.append(swatch,document.createTextNode(p.name+(p.id===id?' (tú)':'')+(p.finished?' ✓':'')));return el;
      }));
      const me=players.find(p=>p.id===id);
      $('#status').textContent=me?.finished?'EN LA META · ESPERANDO AL EQUIPO':players.length<2?'INVITA A ALGUIEN PARA COMPLETAR EL NIVEL':me?.checkpoint?'PUNTO DE CONTROL GUARDADO':'¡JUNTOS HASTA LA BANDERA!';
    }
  });
  socket.addEventListener('close',()=>{
    clearTimeout(timeout);busy=false;$('#create').disabled=$('#join').disabled=false;
    if(id){id=null;players=[];level=null;$('#lobby').hidden=false;$('#victory').hidden=true;$('#touch').hidden=true;$('#copy').hidden=true;error('Se ha perdido la conexión. Vuelve a entrar con el código de sala.');}
    else if($('#error').textContent==='Conectando…')error('No se pudo conectar con el servidor. Inténtalo de nuevo.');
  });
  socket.addEventListener('error',()=>error('No se pudo conectar con el servidor.'));
}
$('#join-form').addEventListener('submit',e=>{e.preventDefault();connect(false);});
$('#join').addEventListener('click',()=>connect(true));
$('#again').addEventListener('click',()=>{location.href='/';});
$('#copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);$('#copy').textContent='¡Invitación copiada!';setTimeout(()=>$('#copy').textContent='Copiar invitación ↗',2000);}
  catch{$('#status').textContent=`COMPARTE LA DIRECCIÓN DE ESTA PÁGINA · SALA ${room}`;}
});
function sendInput(){if(socket?.readyState===WebSocket.OPEN&&id)socket.send(JSON.stringify({type:'input',left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jump:keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')}));}
const controls=['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space'];
addEventListener('keydown',e=>{if(!id||!controls.includes(e.code))return;e.preventDefault();keys.add(e.code);sendInput();});
addEventListener('keyup',e=>{keys.delete(e.code);if(id&&controls.includes(e.code)){e.preventDefault();sendInput();}});
addEventListener('blur',()=>{keys.clear();sendInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();sendInput();}});
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);sendInput();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{keys.delete(b.dataset.key);sendInput();});
}
const demo={width:2600,height:720,platforms:[[0,600,440,120],[510,550,250,170],[830,600,310,120],[1200,540,240,180],[1510,600,300,120],[1880,540,260,180],[2200,600,400,120],[260,470,110,22],[630,420,110,22]],spikes:[],checkpoint:{x:1250,y:540},goal:{x:2480,y:600}};
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function flag(x,y,color){rect(x,y-95,4,95,'#50634b');ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+4,y-95);ctx.lineTo(x+53,y-80);ctx.lineTo(x+4,y-65);ctx.fill();}
function draw(time){
  const l=level||demo,me=players.find(p=>p.id===id);
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const scale=h/720,view=w/scale;
  camera+=(Math.max(0,Math.min(l.width-view,(me?.x||350)-view*.38))-camera)*.12;
  ctx.scale(scale,scale);
  rect(0,0,view,720,'#e6eddb');
  // Quiet layers of hills, moving at different speeds behind the level.
  for(let layer=0;layer<3;layer++){
    ctx.fillStyle=['#d6e1c9','#c6d7b6','#b3cba0'][layer];ctx.beginPath();ctx.moveTo(-200,720);
    for(let x=-200;x<view+200;x+=8)ctx.lineTo(x,460+layer*45+Math.sin((x+camera*(.12+layer*.08))/175+layer*2)*70);
    ctx.lineTo(view+200,720);ctx.fill();
  }
  ctx.fillStyle='#fcf9e3';ctx.beginPath();ctx.arc(view-150,135,44,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(-camera,0);
  for(let x=60;x<2600;x+=200){rect(x,520,9,80,'#8ea97a');ctx.fillStyle='#a4c18c';ctx.beginPath();ctx.arc(x+5,500,40,0,Math.PI*2);ctx.fill();}
  for(const [x,y,pw,ph] of l.platforms){
    rect(x,y,pw,ph,'#91a875');rect(x,y,pw,9,'#678d50');rect(x,y+9,pw,7,'#b2c58b');
    for(let dx=15;dx<pw;dx+=33)rect(x+dx,y+27,5,4,'#819a66');
  }
  for(const [x,y,sw,sh] of l.spikes){ctx.fillStyle='#c07559';for(let dx=0;dx<sw;dx+=16){ctx.beginPath();ctx.moveTo(x+dx,y+sh);ctx.lineTo(x+dx+8,y);ctx.lineTo(x+dx+16,y+sh);ctx.fill();}}
  flag(l.checkpoint.x,l.checkpoint.y,me?.checkpoint?'#b9f277':'#e9edbe');flag(l.goal.x,l.goal.y,'#eab665');
  ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#587249';ctx.fillText('PUNTO DE CONTROL',l.checkpoint.x+10,l.checkpoint.y-112);ctx.fillText('JUNTOS HASTA AQUÍ',l.goal.x,l.goal.y-112);
  const visible=level?players:[{id:'demo',x:170,y:568,color:'#b4f669',name:'Tu aventura empieza aquí'}];
  for(const p of visible){
    ctx.fillStyle='#47633b25';ctx.beginPath();ctx.ellipse(p.x+16,p.y+35,20,5,0,0,Math.PI*2);ctx.fill();
    rect(p.x,p.y,32,32,p.color);rect(p.x,p.y,32,4,'#ffffff66');rect(p.x,p.y+28,32,4,'#00000012');
    rect(p.x+8,p.y+11,4,6,'#344232');rect(p.x+21,p.y+11,4,6,'#344232');rect(p.x+13,p.y+22,7,2,'#344232');
    ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#344b32';ctx.fillText(p.name+(p.id===id?' · TÚ':''),p.x+16,p.y-13);
    if(p.id===id){ctx.fillStyle='#487452';ctx.beginPath();ctx.moveTo(p.x+12,p.y-36);ctx.lineTo(p.x+20,p.y-36);ctx.lineTo(p.x+16,p.y-30);ctx.fill();}
  }
  ctx.restore();requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
