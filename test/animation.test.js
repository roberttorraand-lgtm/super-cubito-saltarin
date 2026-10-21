import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enemyPose,landmarkPlan,ENEMY_FRAMES} from '../animation.js';
import {levels,soloLevels} from '../game.js';
test('each combat phase has its own animation pose and anticipation shape',()=>{
 const e={kind:'capy',offset:0};
 const wind=enemyPose({...e,phase:'windup'},{timer:55},100),attack=enemyPose({...e,phase:'attack'},{timer:5},100),recover=enemyPose({...e,phase:'recover'},{timer:10},100);
 assert.equal(wind.cell,2);assert.equal(attack.cell,3);assert.equal(recover.cell,0);assert.ok(wind.sy<1);assert.ok(attack.sx>1);assert.notEqual(wind.angle,attack.angle);
});
test('animation is deterministic, bounded and never mutates the authoritative enemy',()=>{
 for(const kind of ['capy','toaster','banana','duck'])for(const phase of ['patrol','windup','attack','recover','slipping']){
  const e={kind,phase,offset:37,combat:{type:'gunner'}},s={timer:17,hurtUntil:120},copy=structuredClone(e);
  for(let frame=0;frame<250;frame++){const p=enemyPose(e,s,frame);assert.deepEqual(p,enemyPose(e,s,frame));assert.ok(p.cell>=0&&p.cell<4);assert.ok(p.sx>.7&&p.sx<1.3);assert.ok(p.sy>.7&&p.sy<1.3);assert.ok(Object.values(p).filter(v=>typeof v==='number').every(Number.isFinite));}
  assert.deepEqual(e,copy);
 }
});
test('reduced motion preserves readable attack poses without bobbing, shaking or flashing',()=>{
 for(const phase of ['patrol','windup','attack','recover','slipping']){
  const e={kind:'toaster',phase},s={timer:50,hurtUntil:1000};const a=enemyPose(e,s,10,true),b=enemyPose(e,s,200,true);
  assert.deepEqual(a,b);assert.equal(a.angle,0);assert.equal(a.lift,0);assert.equal(a.opacity,1);
 }
});
test('every map has three authored landmarks outside houses and secret interiors',()=>{
 for(const m of [...levels,...soloLevels]){const plan=landmarkPlan(m);assert.equal(plan.length,3);assert.equal(new Set(plan.map(p=>p.id)).size,3);for(const p of plan){assert.equal(p.kind,m.id);assert.ok(p.x<m.overworldWidth);assert.ok(m.platforms.slice(0,m.routePlatformCount).some(([x,y,w])=>p.x>=x&&p.x<x+w&&p.y===y));}assert.deepEqual(plan,landmarkPlan(m));}
 assert.deepEqual(landmarkPlan({id:0,platforms:[]}),[]);
});

test('all sixteen painted frames have valid atlas rectangles and stable foot anchors',()=>{
 assert.equal(ENEMY_FRAMES.length,4);
 for(const row of ENEMY_FRAMES){assert.equal(row.length,4);for(const [x,y,w,h,anchor,feet] of row){assert.ok(x>=0&&y>=0&&w>0&&h>0);assert.ok(x+w<=1269&&y+h<=1240);assert.ok(anchor>=x&&anchor<=x+w);assert.ok(feet>=y+h&&feet<=y+h+30);}}
});
