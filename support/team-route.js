import { solidRects, sawPositions } from '../game.js';
const idle=()=>({left:false,right:false,jump:false});
function seek(p,target){
  const desired=Math.max(-4,Math.min(4,(target-p.x)*.22));
  return {left:p.vx>desired+.55,right:p.vx<desired-.55,jump:false};
}
function route(p,map,world){
  let jump=p.jumpHeld;
  if(p.grounded){
    if(p.jumpHeld)jump=false;
    else{
      const island=solidRects(map,world).find(([x,y,w])=>p.x+16>=x&&p.x+16<x+w&&Math.abs(p.y+32-y)<3);
      const gap=island&&island[0]+island[2]<map.width?island[0]+island[2]-p.x:Infinity;
      const spike=map.spikes.some(([x,y,w])=>x+w>p.x&&x-p.x<92&&x-p.x>0&&Math.abs(p.y+32-y-20)<4);
      const saw=sawPositions(map,world).some(h=>h.x-p.x<115&&h.x-p.x>0&&Math.abs(p.y+32-h.y)<65);
      jump=gap<94||spike||saw;
    }
  }
  return {left:false,right:true,jump};
}
// Both actors use only ordinary left/right/jump inputs; no position writes.
export function teamController(){
  let phase='approach',wait=0;
  return (players,map,world)=>{
    const [a,b]=players;let ia=idle(),ib=idle();
    if(!world.activated.includes('tower')){
      if(phase==='approach'){
        ia=seek(a,235);ib=seek(b,300);
        if(Math.abs(a.x-235)<5&&Math.abs(b.x-300)<5&&a.grounded&&b.grounded)phase='climb';
      }else if(phase==='climb'){
        ib=seek(b,300);ia=seek(a,b.x);ia.jump=!a.grounded||!a.jumpHeld;
        if(a.supportId===b.id){phase='settle';wait=0;}
      }else if(phase==='settle'){
        ib=seek(b,300);ia=seek(a,b.x);wait++;
        if(wait>12&&a.supportId===b.id){phase='cross';wait=0;}
      }else{
        ib=seek(b,300);ia=seek(a,472);ia.jump=wait++<35;
        if(a.y>550&&a.x<340&&a.grounded)phase='climb';
      }
    }else{
      ia=route(a,map,world);ib=route(b,map,world);
      if(!world.activated.includes('bridge')){
        const pads=map.plates.filter(p=>p.group==='bridge');
        for(const [p,pad,assign] of [[a,pads[1],v=>ia=v],[b,pads[0],v=>ib=v]]){
          const target=pad.x+6;
          if(p.x>target-85&&Math.abs(p.y+32-pad.y)<5)assign(seek(p,target));
        }
      }else if(!a.finished&&b.grounded&&a.x-b.x<60&&a.x>b.x)ib=idle();
    }
    return [ia,ib];
  };
}
