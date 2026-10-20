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
// Render remote players 100 ms behind reception to bridge 20 Hz snapshots.
// Respawns bypass interpolation so a cube never slides across the whole map.
export function interpolate(history,target){
  if(!history.length)return null;
  let a=history[0],b=history.at(-1);
  for(let i=1;i<history.length;i++){if(history[i].time>=target){a=history[i-1];b=history[i];break;}a=history[i];}
  if(a.player.deaths!==b.player.deaths||Math.hypot(b.player.x-a.player.x,b.player.y-a.player.y)>180)return {...b.player};
  const t=b.time===a.time?0:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time)));
  return {...b.player,x:a.player.x+(b.player.x-a.player.x)*t,y:a.player.y+(b.player.y-a.player.y)*t};
}
