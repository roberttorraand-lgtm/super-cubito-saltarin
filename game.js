export const level = {
  width: 2600, height: 720, spawn: { x: 90, y: 548 },
  platforms: [
    [0, 600, 440, 120], [510, 550, 250, 170], [830, 600, 310, 120],
    [1200, 540, 240, 180], [1510, 600, 300, 120], [1880, 540, 260, 180],
    [2200, 600, 400, 120]
  ],
  spikes: [[920, 580, 70, 20], [1590, 580, 65, 20], [2300, 580, 65, 20]],
  checkpoint: { x: 1250, y: 540 }, goal: { x: 2480, y: 600 }
};
export function newPlayer(id, name, color) {
  return { id, name, color, ...level.spawn, vx: 0, vy: 0, grounded: false,
    checkpoint: false, finished: false, deaths: 0, input: { left: false, right: false, jump: false }, jumpHeld: false };
}
export function isComplete(players) { return players.length >= 2 && players.every(p => p.finished); }
function respawn(p) {
  p.x = p.checkpoint ? level.checkpoint.x : level.spawn.x;
  p.y = p.checkpoint ? level.checkpoint.y - 40 : level.spawn.y;
  p.vx = p.vy = 0; p.deaths++; p.grounded = false;
}
export function tick(p) {
  if (p.finished) return;
  p.vx = ((p.input.right ? 1 : 0) - (p.input.left ? 1 : 0)) * 5;
  if (p.input.jump && !p.jumpHeld && p.grounded) { p.vy = -13; p.grounded = false; }
  p.jumpHeld = p.input.jump;
  p.vy = Math.min(p.vy + 0.62, 16);
  p.x = Math.max(0, Math.min(level.width - 32, p.x + p.vx));
  for (const [x,y,w,h] of level.platforms) {
    if (p.x + 32 > x && p.x < x+w && p.y+32 > y && p.y < y+h) {
      if (p.vx > 0) p.x = x-32;
      if (p.vx < 0) p.x = x+w;
    }
  }
  const oldY = p.y;
  p.y += p.vy; p.grounded = false;
  for (const [x,y,w,h] of level.platforms) {
    if (p.x+32 > x && p.x < x+w && p.y+32 > y && p.y < y+h) {
      if (p.vy >= 0 && oldY+32 <= y+1) { p.y=y-32; p.vy=0; p.grounded=true; }
      else if (p.vy < 0 && oldY >= y+h-1) { p.y=y+h; p.vy=0; }
    }
  }
  if (p.y > level.height+100 || level.spikes.some(([x,y,w,h]) => p.x+32>x && p.x<x+w && p.y+32>y && p.y<y+h)) respawn(p);
  if (p.x > level.checkpoint.x-25 && p.x < level.checkpoint.x+65 && p.y+32 <= level.checkpoint.y+5) p.checkpoint = true;
  if (p.x > level.goal.x-20 && p.y+32 >= level.goal.y-55) p.finished = true;
}
