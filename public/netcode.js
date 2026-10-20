import { tick, tickGroup, createWorld } from '../game.js';
// Replay only inputs not yet acknowledged by the authoritative server.
export function predictFrame(state,peers,map,world){
  tickGroup([state,...peers],map,world,{mechanisms:false});
}
export function reconcile(authoritative,pending,map,world=null,peers=[]){
  const state={...authoritative,input:{left:false,right:false,jump:false}};
  const predictedPeers=peers.map(p=>({...p,input:{left:false,right:false,jump:false,...p.input}}));
  const predictedWorld=world?structuredClone(world):null;
  for(const frame of pending){
    state.input=frame;
    if(predictedWorld)predictFrame(state,predictedPeers,map,predictedWorld);
    else tick(state,map);
  }
  return state;
}
export function prediction(authoritative,pending,map,world,peers){
  const state={...authoritative,input:{left:false,right:false,jump:false}};
  const ghosts=peers.map(p=>({...p,input:{left:false,right:false,jump:false,...p.input}}));
  const projected=structuredClone(world??createWorld());
  for(const frame of pending){state.input=frame;predictFrame(state,ghosts,map,projected);}
  return {state,ghosts,world:projected};
}
// Interpolate remote players on the adaptive server-time presentation clock.
// Respawns bypass interpolation so a cube never slides across the whole map.
export function interpolate(history,target){
  if(!history.length)return null;
  let a=history[0],b=history.at(-1);
  for(let i=1;i<history.length;i++){if(history[i].time>=target){a=history[i-1];b=history[i];break;}a=history[i];}
  if(a.player.deaths!==b.player.deaths||Math.hypot(b.player.x-a.player.x,b.player.y-a.player.y)>180)return {...b.player};
  const t=b.time===a.time?0:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time)));
  return {...b.player,x:a.player.x+(b.player.x-a.player.x)*t,y:a.player.y+(b.player.y-a.player.y)*t};
}

// Arrival time varies with the network. Server simulation time does not.
// A small adaptive buffer absorbs jitter without slowing every connection down
// by the same fixed amount; the presentation clock never travels backwards.
export class SnapshotTimeline {
  constructor(){this.samples=[];this.offset=null;this.jitter=0;this.delay=67;this.previous=null;this.cursor=null;this.lastNow=null;}
  push(frame,now){
    const time=frame*1000/60;
    if(this.previous&&time<=this.previous.time)return;
    if(this.previous){
      const variation=Math.abs((now-this.previous.now)-(time-this.previous.time));
      this.jitter+=(Math.min(200,variation)-this.jitter)*.15;
    }
    this.samples.push(now-time);if(this.samples.length>60)this.samples.shift();
    const baseline=Math.min(...this.samples);
    this.offset=this.offset===null?baseline:this.offset+(baseline-this.offset)*.08;
    const wanted=Math.max(50,Math.min(150,67+this.jitter*2));
    this.delay+=(wanted-this.delay)*(wanted>this.delay?.3:.025);
    this.previous={time,now};
  }
  render(now){
    if(this.offset===null)return 0;
    const target=Math.max(0,now-this.offset-this.delay);
    if(this.cursor===null)this.cursor=target;
    else this.cursor+=Math.max(0,Math.min(target-this.cursor,Math.max(0,now-this.lastNow)*1.15));
    this.lastNow=now;return this.cursor;
  }
}

// Switching between delayed remote snapshots and immediate contact prediction
// must not make a teammate visibly jump to a different position.
export class PeerPresentation {
  constructor(){this.entries=new Map();}
  clear(){this.entries.clear();}
  retain(ids){for(const id of this.entries.keys())if(!ids.has(id))this.entries.delete(id);}
  rebase(oldPeers,newPeers){
    for(const p of newPeers){
      const e=this.entries.get(p.id),old=oldPeers.find(q=>q.id===p.id);
      if(!e||e.mode!=='contact'||!old)continue;
      if(old.deaths!==p.deaths||Math.hypot(old.x-p.x,old.y-p.y)>150){this.entries.delete(p.id);continue;}
      e.dx+=old.x-p.x;e.dy+=old.y-p.y;
    }
  }
  sample(player,mode,now){
    let e=this.entries.get(player.id);
    if(!e||e.deaths!==player.deaths||Math.hypot(e.x-player.x,e.y-player.y)>180){
      e={x:player.x,y:player.y,dx:0,dy:0,mode,now,deaths:player.deaths};this.entries.set(player.id,e);
    }
    if(e.mode!==mode){e.dx=e.x-player.x;e.dy=e.y-player.y;e.mode=mode;}
    const elapsed=Math.max(0,Math.min(100,now-e.now));
    const decay=Math.exp(-16*elapsed/1000);
    e.dx*=decay;e.dy*=decay;
    // Corrections must not accelerate an avatar far beyond normal movement.
    // Respawns already bypass this limiter in the reset branch above.
    const maxX=600*elapsed/1000,maxY=1300*elapsed/1000;
    e.x+=Math.max(-maxX,Math.min(maxX,player.x+e.dx-e.x));
    e.y+=Math.max(-maxY,Math.min(maxY,player.y+e.dy-e.y));
    e.dx=e.x-player.x;e.dy=e.y-player.y;e.now=now;
    return {...player,x:e.x,y:e.y};
  }
}
