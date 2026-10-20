import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeInput,queueInput } from '../transport.js';
import { SnapshotTimeline,PeerPresentation,interpolate } from '../public/netcode.js';

test('network bursts cannot accumulate half a second of delayed inputs or erase a short jump',()=>{
 const queue=[];
 for(let seq=1;seq<=200;seq++)queueInput(queue,{seq,right:seq<190,jump:seq===1});
 assert.equal(queue.length,30);
 const input=takeInput(queue,false);
 assert.equal(queue.length,3);assert.equal(input.seq,197);assert.equal(input.right,false);assert.equal(input.jump,true);
 assert.equal(takeInput(queue,true).jump,false,'a short press retains its release');
 const normal=[{seq:1,jump:false},{seq:2,jump:true}];assert.equal(takeInput(normal).seq,1);
});
test('stable snapshot clock uses simulation timestamps and a small buffer',()=>{
 const timeline=new SnapshotTimeline();
 for(let frame=0;frame<=120;frame+=2)timeline.push(frame,5000+frame*1000/60+40);
 assert.ok(timeline.delay>=50&&timeline.delay<70);
 assert.ok(Math.abs(timeline.render(7040)-(2000-timeline.delay))<.001);
});
test('variable network delay expands the buffer but rendering never reverses or teleports',()=>{
 const timeline=new SnapshotTimeline();let previous=-Infinity,lastArrival=0;
 const arrivals=[];
 for(let frame=0;frame<220;frame+=2){
  const time=1000+frame*1000/60+40+(frame%8===0?80:0);
  lastArrival=Math.max(lastArrival+1,time);arrivals.push({frame,at:lastArrival});
 }
 for(let now=1000;now<5000;now+=16){
  while(arrivals.length&&arrivals[0].at<=now){const sample=arrivals.shift();timeline.push(sample.frame,sample.at);}
  const target=timeline.render(now);
  assert.ok(target>=previous);
  if(Number.isFinite(previous))assert.ok(target-previous<=16*1.15+.001);
  previous=target;
 }
 assert.ok(timeline.delay>70&&timeline.delay<=150);
});
test('steady 30Hz snapshots produce continuous interpolated movement at render rate',()=>{
 const timeline=new SnapshotTimeline(),history=[];let last=-Infinity;
 for(let now=0;now<1000;now+=1000/60){
  if(Math.round(now/(1000/60))%2===0){
   const frame=Math.round(now/(1000/60));timeline.push(frame,now);
   history.push({time:frame*1000/60,player:{id:'peer',x:frame*5,y:100,deaths:0}});
  }
  const p=interpolate(history,timeline.render(now));
  assert.ok(p.x>=last);if(Number.isFinite(last))assert.ok(p.x-last<=6);last=p.x;
 }
});
test('switching between remote interpolation and contact prediction is blended',()=>{
 const presentation=new PeerPresentation();
 const p={id:'p',x:100,y:200,deaths:0};assert.equal(presentation.sample(p,'snapshot',0).x,100);
 const contact=presentation.sample({...p,x:150},'contact',16);
 assert.ok(contact.x>100&&contact.x<125,'no instantaneous 50px pop at the contact boundary');
 let latest;for(let now=32;now<500;now+=16)latest=presentation.sample({...p,x:150},'contact',now);
 assert.ok(Math.abs(latest.x-150)<.1);
 const death=presentation.sample({...p,x:20,deaths:1},'snapshot',510);assert.equal(death.x,20,'respawn snaps safely');
});
test('remote contact correction is eased and new levels clear all presentation state',()=>{
 const view=new PeerPresentation(),p={id:'p',x:100,y:200,deaths:0};view.sample(p,'contact',0);
 view.rebase([p],[{...p,x:80}]);const rendered=view.sample({...p,x:80},'contact',16);
 assert.ok(rendered.x>90&&rendered.x<100);
 view.clear();assert.equal(view.sample({...p,x:30},'contact',32).x,30);
});

test('a large contact correction cannot turn into a one-frame teleport',()=>{
 const view=new PeerPresentation(),p={id:'p',x:230,y:568,deaths:0};
 view.sample(p,'contact',0);view.rebase([p],[{...p,x:160}]);
 let previous=p.x;
 for(let time=16;time<500;time+=16){
  const current=view.sample({...p,x:160},'contact',time);
  assert.ok(Math.abs(current.x-previous)<=600*.016+.001);previous=current.x;
 }
 assert.ok(Math.abs(previous-160)<1);
});
