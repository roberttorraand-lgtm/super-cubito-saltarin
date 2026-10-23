const OPEN=1,CLOSED=3,PROTOCOL=4;
const configuration={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
const endpoint=(base,path)=>{const u=new URL(path,base);if(!['https:','http:'].includes(u.protocol))throw Error('Dirección de enlace no válida.');u.protocol=u.protocol==='https:'?'wss:':'ws:';return u;};
class Link extends EventTarget{
 constructor(){super();this.readyState=0;this.explicit=false;}
 event(type,detail){const e=new Event(type);Object.assign(e,detail);this.dispatchEvent(e);}
 opened(){if(this.readyState===OPEN)return;this.readyState=OPEN;this.event('open',{});}
 packet(data){if(this.readyState===CLOSED)return;this.event('message',{data});}
 network(role,transport,text=''){this.event('network',{role,transport,text});}
 ended(reason='Conexión cerrada.'){if(this.readyState===CLOSED)return;this.readyState=CLOSED;this.event('close',{reason});}
 error(text){this.packet(JSON.stringify({type:'error',text}));}
}
export class HostedLink extends Link{
 constructor(relay){
  super();this.peers=new Map();this.code=null;this.created=false;
  this.worker=new Worker('/host-worker.js',{type:'module'});
  this.worker.onmessage=event=>{const {peer,packet}=event.data;if(peer==='host')this.packet(JSON.stringify(packet));else this.toGuest(peer,JSON.stringify(packet));};
  this.worker.onerror=()=>{this.error('No se pudo iniciar la simulación del anfitrión.');this.close();};
  this.signaler=new WebSocket(endpoint(relay,'/signal'));
  this.signaler.onopen=()=>this.signal({type:'host',protocol:PROTOCOL});
  this.signaler.onmessage=event=>this.signaled(JSON.parse(event.data));
  this.signaler.onerror=()=>{if(!this.code)this.error('No se pudo contactar con el servicio de enlace.');};
  this.signaler.onclose=()=>{
   if(this.explicit)return;
   if(!this.code){this.worker.terminate();this.ended('No se pudo crear la sala online.');return;}
   this.network('host','local','El servicio de enlace se ha desconectado. Las conexiones directas pueden continuar; no se podrán unir nuevos guardias.');
   for(const [id,p] of this.peers)if(p.channel?.readyState!=='open')this.drop(id);
  };
 }
 signal(message){if(this.signaler.readyState===OPEN)this.signaler.send(JSON.stringify(message));}
 send(text){if(this.readyState!==OPEN)return;const data=JSON.parse(text);
  if(!this.created){if(data.type!=='join')return;this.created=true;this.worker.postMessage({type:'create',code:this.code,data});}
  else this.worker.postMessage({type:'packet',peer:'host',data});
 }
 peer(id){if(!this.peers.has(id))this.peers.set(id,{ice:[],channel:null,pc:null,relay:false});return this.peers.get(id);}
 async signaled(m){
  if(this.explicit)return;
  if(m.type==='hosted'){this.code=m.code;this.network('host','local');this.opened();return;}
  if(m.type==='error'){this.error(m.text);if(!this.code)this.close();return;}
  if(m.type==='peer-joined'){this.peer(m.peer);return;}
  if(m.type==='peer-left'){const p=this.peers.get(m.peer);if(p?.channel?.readyState!=='open')this.drop(m.peer);return;}
  if(m.type==='fallback'){const p=this.peer(m.peer);p.relay=true;this.signal({type:'relay-ready',peer:m.peer});this.describe();return;}
  if(m.type==='relay'){this.receive(m.peer,m.data);return;}
  if(m.type!=='signal')return;const p=this.peer(m.peer);
  try{
   if(m.description){
    if(!p.pc){p.pc=new RTCPeerConnection(configuration);p.pc.onicecandidate=e=>{if(e.candidate)this.signal({type:'signal',peer:m.peer,candidate:e.candidate.toJSON()});};p.pc.ondatachannel=e=>this.channel(m.peer,e.channel);}
    await p.pc.setRemoteDescription(m.description);for(const c of p.ice.splice(0))await p.pc.addIceCandidate(c);
    await p.pc.setLocalDescription(await p.pc.createAnswer());this.signal({type:'signal',peer:m.peer,description:p.pc.localDescription.toJSON()});
   }else if(m.candidate){if(p.pc?.remoteDescription)await p.pc.addIceCandidate(m.candidate);else p.ice.push(m.candidate);}
  }catch{p.relay=true;this.signal({type:'fallback',peer:m.peer});}
 }
 channel(id,channel){const p=this.peer(id);p.channel=channel;
  channel.onopen=()=>this.describe();channel.onmessage=e=>this.receive(id,e.data);
  channel.onerror=()=>{};channel.onclose=()=>{if(this.explicit||!this.peers.has(id))return;if(this.signaler.readyState===OPEN){p.relay=true;this.signal({type:'fallback',peer:id});this.describe();}else this.drop(id);};
 }
 receive(id,text){if(!this.peers.has(id)||typeof text!=='string'||text.length>145000)return;
  try{const data=JSON.parse(text);if(data.type==='disconnect'){this.drop(id);return;}this.worker.postMessage({type:'packet',peer:id,data});}catch{}
 }
 toGuest(id,text){const p=this.peers.get(id);if(!p)return;
  if(p.channel?.readyState==='open'){if(p.channel.bufferedAmount<131072||!text.includes('"type":"state"'))p.channel.send(text);}
  else if(p.relay)this.signal({type:'relay',peer:id,data:text});
 }
 describe(){const list=[...this.peers.values()];this.network('host',list.some(p=>p.relay&&p.channel?.readyState!=='open')?'relay':'direct');}
 drop(id){const p=this.peers.get(id);if(!p)return;this.peers.delete(id);this.worker.postMessage({type:'remove',peer:id});p.channel?.close();p.pc?.close();this.describe();}
 close(){if(this.explicit)return;this.explicit=true;for(const id of [...this.peers.keys()])this.drop(id);this.worker.terminate();this.signaler.close();this.ended('El anfitrión ha terminado la partida.');}
}
export class GuestLink extends Link{
 constructor(relay,code,{forceRelay=false}={}){
  super();this.code=code;this.forceRelay=forceRelay;this.wire=null;this.ice=[];this.hostGone=false;
  this.signaler=new WebSocket(endpoint(relay,'/signal'));
  this.signaler.onopen=()=>this.signal({type:'join',code,protocol:PROTOCOL});
  this.signaler.onmessage=e=>this.signaled(JSON.parse(e.data));
  this.signaler.onerror=()=>{if(!this.wire)this.error('No se pudo contactar con el anfitrión.');};
  this.signaler.onclose=()=>{if(this.explicit)return;if(this.channel?.readyState==='open')this.network('guest','direct','El enlace inicial se ha cerrado; la conexión directa sigue activa.');else this.finish('El anfitrión o la retransmisión se ha desconectado.');};
 }
 signal(m){if(this.signaler.readyState===OPEN)this.signaler.send(JSON.stringify(m));}
 async signaled(m){
  if(this.explicit)return;
  if(m.type==='error'){this.error(m.text);this.close();return;}
  if(m.type==='host-left'){this.hostGone=true;if(this.channel?.readyState!=='open')this.finish('El anfitrión ha salido. La partida ha terminado.');return;}
  if(m.type==='joined'){
   if(this.forceRelay||typeof RTCPeerConnection==='undefined'){this.fallback();return;}
   try{
    this.pc=new RTCPeerConnection(configuration);this.channel=this.pc.createDataChannel('turno-cero',{ordered:true});
    this.pc.onicecandidate=e=>{if(e.candidate)this.signal({type:'signal',candidate:e.candidate.toJSON()});};
    this.channel.onopen=()=>{clearTimeout(this.fallbackTimer);this.wire='direct';this.network('guest','direct');this.opened();};
    this.channel.onmessage=e=>this.packet(e.data);this.channel.onerror=()=>{};
    this.channel.onclose=()=>{if(!this.explicit){if(this.hostGone||this.signaler.readyState!==OPEN)this.finish('El anfitrión se ha desconectado.');else this.fallback();}};
    this.pc.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(this.pc.connectionState)&&!this.explicit)this.fallback();};
    await this.pc.setLocalDescription(await this.pc.createOffer());this.signal({type:'signal',description:this.pc.localDescription.toJSON()});
    this.fallbackTimer=setTimeout(()=>this.fallback(),6000);
   }catch{this.fallback();}
   return;
  }
  if(m.type==='fallback'){this.fallback();return;}
  if(m.type==='relay-ready'){this.wire=this.channel?.readyState==='open'?'direct':'relay';this.network('guest',this.wire);this.opened();return;}
  if(m.type==='relay'){this.packet(m.data);return;}
  if(m.type==='signal')try{
   if(m.description){await this.pc.setRemoteDescription(m.description);for(const c of this.ice.splice(0))await this.pc.addIceCandidate(c);}
   else if(m.candidate){if(this.pc?.remoteDescription)await this.pc.addIceCandidate(m.candidate);else this.ice.push(m.candidate);}
  }catch{this.fallback();}
 }
 fallback(){if(this.explicit||this.hostGone)return;if(this.signaler.readyState===OPEN)this.signal({type:'fallback'});else if(this.channel?.readyState!=='open')this.finish('No se pudo recuperar la conexión con el anfitrión.');}
 send(text){if(this.readyState!==OPEN)return;if(this.channel?.readyState==='open')this.channel.send(text);else this.signal({type:'relay',data:text});}
 finish(reason){clearTimeout(this.fallbackTimer);this.explicit=true;this.channel?.close();this.pc?.close();this.signaler.close();this.ended(reason);}
 close(){if(this.explicit)return;if(this.readyState===OPEN)this.send(JSON.stringify({type:'disconnect'}));this.finish('Has salido de la partida.');}
}
export function connectGame(mode,code,relay,options={}){
 if(mode==='coop')return code?new GuestLink(relay,code,options):new HostedLink(relay);
 return new WebSocket(endpoint(location.origin,'/ws'));
}
