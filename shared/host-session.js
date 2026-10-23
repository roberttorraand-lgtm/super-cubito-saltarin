import {newWorld,newPlayer,step,snapshot,restore} from './simulation.js';

// Runs on the host's machine. No map, models or AI simulation live in the broker.
export class HostSession {
  constructor(code,save=null){
    const restored=save?restore(save):null;
    this.code=code;this.world=restored?.world??newWorld();this.saved=restored?.players??[];
    this.members=new Map();this.started=false;this.owner=null;
  }
  get players(){return [...this.members.values()].map(m=>m.player);}
  join(peer,name){
    if(this.members.has(peer))throw Error('Este guardia ya está conectado.');
    if(this.members.size>=4)throw Error('La sala ya tiene cuatro guardias.');
    const used=new Set(this.players.map(p=>p.slot));let slot=0;while(used.has(slot))slot++;
    const id=crypto.randomUUID(),safeName=String(name??'Guardia').replace(/[\x00-\x1f]/g,'').trim().slice(0,18)||'Guardia';
    const player={...newPlayer(id,safeName,slot),...(this.saved[slot]??{}),id,name:safeName,slot,seq:0,input:{},held:{},hidden:null};
    this.members.set(peer,{player,queue:[],seq:0,last:0,rateAt:0,rate:0});
    if(this.owner===null)this.owner=peer;
    return {type:'welcome',id,...this.state(),type:'welcome'};
  }
  command(peer,message,now=Date.now()){
    const member=this.members.get(peer);if(!member||!message||typeof message!=='object')return null;
    if(now-member.rateAt>1000){member.rateAt=now;member.rate=0;}if(++member.rate>100)return null;
    const p=member.player;
    if(message.type==='input'){
      if(!Number.isSafeInteger(message.seq)||message.seq<=member.seq||message.seq>member.seq+300)return null;
      member.seq=message.seq;const input={seq:message.seq};
      for(const key of ['forward','back','left','right','run','crouch','interact','phone','flashlight','lure'])input[key]=message[key]===true;
      input.yaw=Number.isFinite(message.yaw)?message.yaw%(Math.PI*2):p.yaw;
      input.pitch=Number.isFinite(message.pitch)?Math.max(-1.25,Math.min(1.25,message.pitch)):p.pitch;
      input.camera=Number.isInteger(message.camera)?Math.max(0,Math.min(5,message.camera)):p.camera;
      member.queue.push(input);if(member.queue.length>4){
        // Preserve a short action while shedding a delayed movement backlog.
        const dropped=member.queue.splice(0,member.queue.length-4);
        for(const key of ['interact','phone','flashlight','lure'])if(dropped.some(i=>i[key])&&!p.held[key])member.queue[0][key]=true;
      }
      member.last=now;
    }
    if(message.type==='start'&&peer===this.owner&&this.members.size>=2)this.started=true;
    if(message.type==='save'&&peer===this.owner&&this.started&&this.world.status==='playing')return {type:'save',data:snapshot(this.world,this.players)};
    return null;
  }
  tick(now=Date.now()){
    for(const m of this.members.values()){
      const input=m.queue.shift();if(input){m.player.input=input;m.player.seq=input.seq;}
      else if(now-m.last>200)m.player.input={yaw:m.player.yaw,pitch:m.player.pitch,camera:m.player.camera};
    }
    if(this.started)step(this.world,this.players);
  }
  remove(peer){this.members.delete(peer);return peer===this.owner;}
  state(){
    const w=this.world;
    return {type:'state',code:this.code,host:this.members.get(this.owner)?.player.id,mode:'coop',started:this.started,
      world:{version:w.version,frame:w.frame,elapsed:w.elapsed,status:w.status,paused:false,doors:w.doors,event:w.event,
        enemies:w.enemies.map(({id,x,z,yaw,state})=>({id,x,z,yaw,state}))},
      players:this.players.map(({input,held,fireRequest,...p})=>p)};
  }
}
