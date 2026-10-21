import { levels, soloLevels, newPlayer, isComplete, createWorld } from './game.js';
export function createRoom(code,mode='coop'){return {code,mode,clients:new Set(),levelIndex:0,phase:'playing',ready:new Set(),restartReady:new Set(),revision:0,world:createWorld()};}
export const roomLevels=room=>room.mode==='solo'?soloLevels:levels;
export function checkCompletion(room){
 if(room.phase!=='playing')return;
 const players=[...room.clients].map(c=>c.player);
 if(players.length&&players.every(p=>p.eliminated)){room.phase='defeated';room.ready.clear();return;}
 if(room.mode==='solo'?players.length===1&&players[0].finished:isComplete(players)){room.phase=room.levelIndex===levels.length-1?'complete':'cleared';room.ready.clear();room.restartReady.clear();}
}
function resetRoom(room,index){
 room.levelIndex=index;room.phase='playing';room.ready.clear();room.restartReady.clear();room.revision++;room.world=createWorld();
 for(const c of room.clients){
  c.player=newPlayer(c.player.id,c.player.name,c.player.color,roomLevels(room)[index],c.player.spawnSlot??0);
  c.queue=[];c.lastSeq=0;c.receivedSeq=0;
 }
}
export function voteNext(room,playerId){
 if(!['cleared','complete'].includes(room.phase)||![...room.clients].some(c=>c.player.id===playerId))return false;
 room.ready.add(playerId);const members=[...room.clients];
 if(members.length<(room.mode==='solo'?1:2)||!members.every(c=>room.ready.has(c.player.id)))return false;
 resetRoom(room,room.phase==='complete'?0:room.levelIndex+1);return true;
}
export function voteRestart(room,playerId){
 const members=[...room.clients];
 if(!['playing','defeated'].includes(room.phase)||!members.some(c=>c.player.eliminated)||!members.some(c=>c.player.id===playerId))return false;
 room.restartReady.add(playerId);
 if(!members.every(c=>room.restartReady.has(c.player.id)))return false;
 resetRoom(room,room.levelIndex);return true;
}
