// Presentation only. Collision shapes remain in the shared simulation.
const palettes=[['#45634e','#283b37','#85b77d'],['#a87660','#54465a','#d8a37a'],['#7196ad','#354b69','#dbf2f7'],['#676080','#302d4c','#bcaae6']];
export class WorldArt{
 constructor(){this.scenes=new Image();this.scenes.src='/assets/landscapes.png';this.creatures=new Image();this.creatures.src='/assets/creatures.png';this.residents=new Image();this.textures=new Map();this.patterns=new Map();}
 background(c,m,camera,view,time,reduced){
  if(this.scenes.complete&&this.scenes.naturalWidth){
   const sw=this.scenes.width/2,sh=this.scenes.height/2,w=720*sw/sh;
   const offset=-(camera*.12%(w*2));
   for(let x=offset-w*2;x<view;x+=w){c.save();const index=Math.round((x-offset)/w);c.translate(x,0);if(Math.abs(index)%2){c.translate(w,0);c.scale(-1,1);}c.drawImage(this.scenes,m.id%2*sw,Math.floor(m.id/2)*sh,sw,sh,0,0,w,720);c.restore();}
  }else{const g=c.createLinearGradient(0,0,0,720);g.addColorStop(0,m.theme.sky[0]);g.addColorStop(1,m.theme.sky[1]);c.fillStyle=g;c.fillRect(0,0,view,720);}
  const haze=c.createLinearGradient(0,320,0,720);haze.addColorStop(0,'#172c3600');haze.addColorStop(1,m.id===3?'#1b153b77':'#24423555');c.fillStyle=haze;c.fillRect(0,0,view,720);
  if(!reduced){for(let i=0;i<22;i++){const x=((i*137.13-camera*.3+Math.sin(time+i)*10)%(view+30)+view+30)%(view+30),y=130+(i*71.7+time*(m.id===2?9:-3))%530;c.globalAlpha=.18+(.5+Math.sin(time+i)*.5)*.3;c.fillStyle=m.id===2?'#e8faff':m.id===0?'#fff1a7':'#f9daed';c.beginPath();c.arc(x,y,m.id===2?1.7:1.2,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
 }
 texture(id){
  if(this.textures.has(id))return this.textures.get(id);
  const tile=document.createElement('canvas');tile.width=192;tile.height=192;const t=tile.getContext('2d');
  for(let i=0;i<65;i++){const x=(i*47)%192,y=(i*83)%192;t.fillStyle=i%2?'#ffffff08':'#0000000e';t.beginPath();t.ellipse(x,y,3+i%7,1+i%3,.4,0,Math.PI*2);t.fill();}
  this.textures.set(id,tile);return tile;
 }
 terrain(c,m,left,right){
  const [top,bottom,edge]=palettes[m.id];
  for(const [x,y,w,h] of [...m.platforms,...(m.ledges??[])]){
   if(x+w<left||x>right)continue;
   const thin=h<40,inside=x>m.overworldWidth;const g=c.createLinearGradient(0,y,0,y+Math.max(h,80));g.addColorStop(0,top);g.addColorStop(1,bottom);
   c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,thin?7:[7,7,0,0]);c.fill();
   if(!this.patterns.has(m.id))this.patterns.set(m.id,c.createPattern(this.texture(m.id),'repeat'));c.fillStyle=this.patterns.get(m.id);c.fillRect(x,y+10,w,Math.max(0,h-10));
   c.fillStyle='#101d282e';c.fillRect(x+7,y+13,w-14,7);
   c.fillStyle=inside?'#bb986b':edge;c.beginPath();c.roundRect(x,y,w,thin?7:12,[6,6,3,3]);c.fill();
   c.fillStyle='#ffffff3b';c.fillRect(x+8,y+1,w-16,2);
   if(!thin){
    c.strokeStyle='#091b252e';c.lineWidth=2;
    for(let dx=38;dx<w;dx+=95){c.beginPath();c.moveTo(x+dx,y+28);c.lineTo(x+dx-14,y+57);c.lineTo(x+dx+2,y+83);c.stroke();}
    if(m.id===0&&!inside)for(let dx=12;dx<w-10;dx+=31){c.fillStyle=dx%2?'#75a06b':'#a4cb88';c.beginPath();c.ellipse(x+dx,y+9,14,5,.3,0,Math.PI*2);c.fill();}
   }
   if(!inside&&!thin){
    for(let dx=60;dx<w-30;dx+=163){const xx=x+dx;if(xx<left-50||xx>right+50)continue;
     if(m.id===0){c.fillStyle='#365e4f';for(let j=0;j<4;j++){c.beginPath();c.ellipse(xx+j*8,y-9-j%2*6,15,9,-.3+j*.2,0,Math.PI*2);c.fill();}c.fillStyle='#ecc777';c.fillRect(xx+11,y-23,3,4);}
     else if(m.id===1){c.fillStyle='#ba8c73';c.beginPath();c.moveTo(xx-16,y);c.lineTo(xx-10,y-22);c.lineTo(xx+12,y-17);c.lineTo(xx+23,y);c.fill();c.strokeStyle='#e4ba9380';c.beginPath();c.moveTo(xx-6,y-17);c.lineTo(xx+12,y-13);c.stroke();}
     else if(m.id===2){c.fillStyle='#c4f2f8aa';c.beginPath();c.moveTo(xx-10,y);c.lineTo(xx,y-40);c.lineTo(xx+10,y);c.fill();c.fillStyle='#efffff99';c.beginPath();c.moveTo(xx,y-40);c.lineTo(xx+10,y);c.lineTo(xx,y);c.fill();}
     else{c.fillStyle='#a89ada';c.beginPath();c.moveTo(xx-8,y);c.lineTo(xx-2,y-23);c.lineTo(xx+9,y-10);c.lineTo(xx+12,y);c.fill();c.fillStyle='#d4c9f4';c.fillRect(xx-2,y-19,3,10);}
    }
   }
  }
 }
 creature(c,e,time,reduced){
  const image=this.creatures,index={capy:0,toaster:1,banana:2,duck:3}[e.kind]??0;
  const w=e.w+16,h=e.h+18,x=e.x-8,y=e.y-16;
  c.fillStyle='#10232933';c.beginPath();c.ellipse(e.x+e.w/2,e.y+e.h+2,e.w*.45,4,0,0,Math.PI*2);c.fill();
  c.save();c.translate(x+w/2,y+h);if(e.facing<0)c.scale(-1,1);
  if(!reduced){const bob=Math.sin(time*(e.kind==='toaster'?12:7)+e.offset)*.025;c.scale(1+bob,1-bob);c.rotate(e.kind==='toaster'?bob:0);}
  if(image.complete&&image.naturalWidth){const split=.44,sy=index<2?0:image.height*split,sh=index<2?image.height*split:image.height*(1-split);c.drawImage(image,index%2*image.width/2,sy,image.width/2,sh,-w/2,-h,w,h);}
  else{c.fillStyle=['#b4855f','#abc4cf','#f2d27a','#edbd54'][index];c.beginPath();c.roundRect(-w/2+6,-h+6,w-12,h-6,10);c.fill();}
  c.restore();
 }
 resident(c,n,time,reduced){
  if(!this.residents.src)this.residents.src='/assets/residents.png';
  if(!this.residents.complete||!this.residents.naturalWidth)return false;
  const i={doge:0,frog:1,troll:2,robot:3}[n.kind]??0,sw=this.residents.width/2,sh=this.residents.height/2;
  const bob=reduced?0:Math.sin(time*2+n.x)*.8;
  c.fillStyle='#191e2b33';c.beginPath();c.ellipse(n.x,n.y,25,4,0,0,Math.PI*2);c.fill();
  c.drawImage(this.residents,i%2*sw,Math.floor(i/2)*sh,sw,sh,n.x-38,n.y-84+bob,76,84);
  return true;
 }
 house(c,h,time,reduced){
  const x=h.x,y=h.y;c.save();c.translate(x,y);
  c.fillStyle='#10232b33';c.beginPath();c.ellipse(0,0,122,12,0,0,Math.PI*2);c.fill();
  // Timber, plaster and stone trim; the doorway matches the interaction point.
  const plaster=c.createLinearGradient(-94,-150,94,0);plaster.addColorStop(0,'#f0d9b4');plaster.addColorStop(.6,'#decaad');plaster.addColorStop(1,'#b7a48f');c.fillStyle=plaster;c.beginPath();c.roundRect(-94,-153,188,153,5);c.fill();
  c.fillStyle='#9e795b';c.fillRect(-94,-154,188,14);for(const xx of [-87,78])c.fillRect(xx,-146,9,146);
  c.fillStyle='#685560';c.fillRect(51,-217,23,75);c.fillStyle='#bea38d';c.fillRect(46,-220,34,9);
  c.fillStyle=['#557c75','#92716c','#6d7299'][h.style];c.beginPath();c.moveTo(-116,-143);c.quadraticCurveTo(-45,-184,0,-231);c.quadraticCurveTo(55,-180,116,-143);c.lineTo(103,-126);c.quadraticCurveTo(40,-166,0,-207);c.quadraticCurveTo(-39,-168,-103,-126);c.closePath();c.fill();
  c.strokeStyle='#e2cf9f66';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-86+i*21,-151-i*15);c.lineTo(-15+i*8,-172-i*12);c.stroke();}
  c.fillStyle='#94765b';c.fillRect(-36,-91,72,91);c.fillStyle='#263c43';c.beginPath();c.roundRect(-27,-84,54,84,[24,24,0,0]);c.fill();
  c.fillStyle='#d7a85c';c.beginPath();c.arc(14,-37,3,0,Math.PI*2);c.fill();c.fillStyle='#bdad91';c.beginPath();c.roundRect(-40,-4,80,8,3);c.fill();
  for(const xx of [-66,63]){c.fillStyle='#8c6f5c';c.fillRect(xx-20,-119,40,45);const g=c.createLinearGradient(0,-116,0,-77);g.addColorStop(0,'#ffe8a2');g.addColorStop(1,'#e4ad68');c.fillStyle=g;c.fillRect(xx-16,-115,32,37);c.strokeStyle='#9c7557';c.lineWidth=3;c.beginPath();c.moveTo(xx,-115);c.lineTo(xx,-78);c.moveTo(xx-16,-97);c.lineTo(xx+16,-97);c.stroke();c.fillStyle='#688a67';c.fillRect(xx-23,-73,46,9);for(let j=0;j<4;j++){c.fillStyle=j%2?'#edb6bb':'#d9d2a0';c.beginPath();c.arc(xx-15+j*10,-76,4,0,Math.PI*2);c.fill();}}
  if(!reduced)for(let i=0;i<3;i++){c.globalAlpha=.12-i*.025;c.fillStyle='#f5e6d6';c.beginPath();c.ellipse(62+Math.sin(time+i)*8,-240-i*19-(time*9%19),8+i*4,6+i*4,0,0,Math.PI*2);c.fill();}c.globalAlpha=1;
  c.strokeStyle='#efe0c333';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-89,-25-i*22);c.lineTo(88,-25-i*22);c.stroke();}
  c.restore();
 }
 room(c,m,h,time,reduced){
  const x=h.room.x,w=h.room.w;c.fillStyle='#182632';c.fillRect(x-300,0,w+600,720);
  const g=c.createLinearGradient(0,100,0,600);g.addColorStop(0,'#5a4b50');g.addColorStop(1,'#88705d');c.fillStyle=g;c.fillRect(x,90,w,510);
  c.fillStyle='#353341';c.fillRect(x,75,w,30);c.fillStyle='#c0a17c';c.fillRect(x,105,w,7);c.fillRect(x,575,w,18);
  c.strokeStyle='#382f3433';c.lineWidth=2;for(let xx=x+20;xx<x+w;xx+=64){c.beginPath();c.moveTo(xx,115);c.lineTo(xx,575);c.stroke();}
  c.fillStyle='#513c32';c.fillRect(x,600,w,120);for(let yy=607;yy<720;yy+=22){c.fillStyle='#b68c5b55';c.fillRect(x,yy,w,2);for(let xx=x+(yy%3)*80;xx<x+w;xx+=180){c.fillRect(xx,yy,2,22);}}
  for(const xx of [x+230,x+760]){c.fillStyle='#302e3e';c.beginPath();c.roundRect(xx-53,190,106,132,45);c.fill();const glass=c.createLinearGradient(0,190,0,320);glass.addColorStop(0,m.theme.sky[0]);glass.addColorStop(1,m.theme.sky[1]);c.fillStyle=glass;c.beginPath();c.roundRect(xx-45,198,90,116,38);c.fill();c.strokeStyle='#d1ae7a';c.lineWidth=6;c.beginPath();c.moveTo(xx,198);c.lineTo(xx,314);c.moveTo(xx-45,255);c.lineTo(xx+45,255);c.stroke();c.fillStyle='#a77769';c.fillRect(xx-66,184,18,144);c.fillRect(xx+48,184,18,144);}
  // Exit, rug, work table, loft and a tempting bookcase.
  c.fillStyle='#c9ae83';c.fillRect(x+48,453,85,147);c.fillStyle='#263e47';c.beginPath();c.roundRect(x+57,464,67,136,[30,30,0,0]);c.fill();
  c.fillStyle=['#a25e68','#6b8a7f','#777499'][h.style];c.beginPath();c.ellipse(x+520,599,240,10,0,0,Math.PI*2);c.fill();c.strokeStyle='#dfc69c88';c.lineWidth=2;c.beginPath();c.ellipse(x+520,599,225,6,0,0,Math.PI*2);c.stroke();
  c.fillStyle='#bf9468';c.fillRect(x+300,548,130,12);c.fillStyle='#795943';c.fillRect(x+312,560,10,40);c.fillRect(x+408,560,10,40);c.fillStyle='#e0d1a5';c.beginPath();c.ellipse(x+360,546,22,5,0,0,Math.PI*2);c.fill();c.fillStyle='#cb9871';c.beginPath();c.ellipse(x+360,542,16,6,0,0,Math.PI*2);c.fill();
  c.fillStyle='#574538';c.fillRect(x+600,312,190,99);for(let i=0;i<12;i++){c.fillStyle=['#aa7979','#a8b597','#c2a36d','#8597ae'][i%4];c.fillRect(x+611+i*14,330+i%3*5,10,42-i%3*5);}c.fillStyle='#bd9469';c.fillRect(x+598,373,194,7);
  c.fillStyle='#554339';c.fillRect(x+440,502,105,9);c.fillRect(x+610,411,170,9);
  c.fillStyle='#403b3f';c.fillRect(x+850,485,105,115);c.fillStyle='#c7a07d';c.fillRect(x+841,478,124,15);c.fillStyle='#251e28';c.beginPath();c.roundRect(x+867,513,71,87,[30,30,0,0]);c.fill();
  for(let i=0;i<5;i++){c.fillStyle=i%2?'#f9cb77':'#de8f5b';c.beginPath();c.ellipse(x+885+i*9,580,5,15+(reduced?0:Math.sin(time*6+i)*6),.2,0,Math.PI*2);c.fill();}
  if(h.style===0){
   c.fillStyle='#6e5743';c.fillRect(x+145,405,58,8);for(let i=0;i<3;i++){c.strokeStyle='#e5c47f';c.lineWidth=2;c.beginPath();c.arc(x+156+i*17,425,5,0,Math.PI*2);c.moveTo(x+156+i*17,430);c.lineTo(x+156+i*17,445);c.stroke();}
   c.fillStyle='#a97f64';c.beginPath();c.roundRect(x+170,565,34,35,[3,3,10,10]);c.fill();c.fillStyle='#8fa476';for(let i=0;i<5;i++){c.beginPath();c.ellipse(x+185+Math.sin(i*3)*17,550+i%2*8,17,7,i,0,Math.PI*2);c.fill();}
  }else if(h.style===1){
   c.fillStyle='#d3b997';c.fillRect(x+145,480,115,120);c.fillStyle='#856d5f';c.fillRect(x+152,505,101,70);c.fillStyle='#eece8e';for(let i=0;i<3;i++){c.beginPath();c.ellipse(x+170+i*30,540,12,6,.3,0,Math.PI*2);c.fill();}
   c.strokeStyle='#edd4aa';c.lineWidth=5;c.beginPath();c.moveTo(x+310,530);c.lineTo(x+342,530);c.stroke();
  }else{
   c.fillStyle='#4a403d';c.fillRect(x+155,365,125,235);for(let row=0;row<3;row++){for(let j=0;j<7;j++){c.fillStyle=['#9e696e','#879b8b','#b8a078','#7f8aa9'][j%4];c.fillRect(x+166+j*15,380+row*65+(j%3)*4,10,45-(j%3)*4);}c.fillStyle='#c09b75';c.fillRect(x+155,430+row*65,125,6);}
  }
  // Warm light pools are gradients rather than expensive canvas blur filters.
  const light=c.createRadialGradient(x+901,550,8,x+901,550,150);light.addColorStop(0,'#ffb45b24');light.addColorStop(1,'#ffb45b00');c.fillStyle=light;c.fillRect(x+740,400,320,250);
 }
 secretMark(c,m,p,time,reduced){
  const d=m.secret.door;if(Math.abs(p.x+16-d.x)>140||p.zone)return;
  c.save();c.translate(d.x,d.y);c.strokeStyle='#d2e4b666';c.lineWidth=2;c.beginPath();c.moveTo(-18,-23);c.lineTo(-6,-35);c.lineTo(2,-17);c.lineTo(13,-38);c.stroke();if(!reduced){c.fillStyle='#e5f4c9aa';c.beginPath();c.arc(8,-45,1.5+Math.sin(time*2)*.5,0,Math.PI*2);c.fill();}c.restore();
 }
}
