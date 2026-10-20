import { levels, newPlayer, isComplete } from './game.js';
export function createRoom(code){return {code,clients:new Set(),levelIndex:0,phase:'playing',ready:new Set(),revision:0};}
export function checkCompletion(room){
  if(room.phase==='playing'&&isComplete([...room.clients].map(c=>c.player))){
    room.phase=room.levelIndex===levels.length-1?'complete':'cleared';
    room.ready.clear();
  }
}
export function voteNext(room,playerId){
  if(room.phase==='playing'||![...room.clients].some(c=>c.player.id===playerId))return false;
  room.ready.add(playerId);
  const members=[...room.clients];
  if(members.length<2||!members.every(c=>room.ready.has(c.player.id)))return false;
  room.levelIndex=room.phase==='complete'?0:room.levelIndex+1;
  room.phase='playing';room.ready.clear();room.revision++;
  for(const c of members){
    c.player=newPlayer(c.player.id,c.player.name,c.player.color,levels[room.levelIndex]);
    c.queue=[];c.lastSeq=0;c.receivedSeq=0;
  }
  return true;
}
