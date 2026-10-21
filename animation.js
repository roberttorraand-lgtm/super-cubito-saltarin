// Visual animation uses the simulation clock and never changes hitboxes.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function enemyPose(enemy,state={},frame=0,reduced=false){
 const phase=enemy.phase??state.phase??'patrol',clock=(frame+(enemy.offset??0))/60;
 const progress=clamp((state.timer??0)/60,0,1),walk=Math.sin(clock*(enemy.kind==='toaster'?14:9));
 let cell=phase==='windup'?2:phase==='attack'?3:phase==='patrol'&&!reduced?Math.floor(clock*7)%2:0;
 let sx=1,sy=1,angle=0,lift=0,recoil=0;
 if(!reduced){
  if(phase==='patrol'){sx=1+walk*.025;sy=1-walk*.025;lift=enemy.kind==='toaster'?Math.sin(clock*4)*2:-Math.abs(walk)*1.3;angle=enemy.kind==='banana'?walk*.035:0;}
  if(phase==='windup'){sx=1+progress*.14;sy=1-progress*.16;angle=-progress*.09;lift=1.5*progress;}
  if(phase==='attack'){sx=enemy.kind==='toaster'?1.06:1.13;sy=.91;angle=.12;recoil=enemy.combat?.type==='gunner'?Math.max(0,1-(state.timer??0)%18/5)*3:0;}
  if(phase==='recover'){sx=.98;sy=.96;angle=-.055;lift=Math.sin(clock*3)*.6;}
  if(phase==='slipping'){angle=-.32+Math.sin(clock*13)*.055;lift=-2;}
 }
 const hurt=!reduced&&(state.hurtUntil??0)>frame&&Math.floor(frame/3)%2===0;
 return {cell,sx,sy,angle,lift,recoil,opacity:hurt?.45:1,phase,progress};
}
export function landmarkPlan(map){
 const count=map.routePlatformCount??map.platforms?.length??0;
 const indexes=[2,Math.max(4,count-5),Math.max(5,count-1)];
 return indexes.map((i,n)=>{
  const rect=map.platforms?.[i];if(!rect)return null;
  const [x,y,w]=rect;
  return {id:`landmark-${map.id}-${n}`,x:x+w*(n===0?.72:n===2?.28:.6),y,w:Math.min(230,w*.48),h:230+n*20,kind:map.id,variant:n};
 }).filter(Boolean);
}

// Source rectangles and foot anchors for each painted pose (1269 × 1240 atlas).
// Cropping by actual sprite bounds avoids neighboring wings entering a frame.
export const ENEMY_FRAMES=[
 [[36,26,238,297,155,323],[344,27,243,295,465,323],[631,86,254,235,758,323],[907,56,351,266,1035,323]],
 [[24,330,262,274,155,610],[317,392,294,206,465,610],[656,433,234,176,773,610],[891,336,364,276,1035,612]],
 [[17,630,267,292,150,922],[331,628,252,293,457,922],[648,717,235,205,766,922],[909,644,344,255,1045,922]],
 [[42,933,269,259,176,1192],[358,934,254,258,485,1192],[653,966,237,224,772,1192],[908,935,338,255,1035,1192]]
];
