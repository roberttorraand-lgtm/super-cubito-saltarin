import { addEncounters } from './encounters.js';
// Authored routes: [island width, surface height, gap after the island].
// Geometry, mechanisms and movement rules are intentionally different per world.
const themes=[
 {sky:['#bfe8ef','#f4f4d3'],hills:['#b1d6b0','#82b390','#527f70'],ground:'#527d68',grass:'#abe179',dirt:'#729274',accent:'#f5d47c',glow:'#fff2b9'},
 {sky:['#d1b6de','#ffdfb0'],hills:['#c39cbd','#9c7d9e','#6f627f'],ground:'#76617b',grass:'#e6ac78',dirt:'#9e7c8e',accent:'#ffda8b',glow:'#fff0b4'},
 {sky:['#a5c8ef','#e9f7ff'],hills:['#b0cde5','#7fabc9','#537b9e'],ground:'#648da7',grass:'#e4faff',dirt:'#86a9bf',accent:'#88f1e4',glow:'#d9ffff'},
 {sky:['#171e43','#61557f'],hills:['#4e4b79','#3b3c67','#292d51'],ground:'#535078',grass:'#b7a5ef',dirt:'#71638d',accent:'#baf8dd',glow:'#e8daff'}
];
function route(id,name,subtitle,layout){
 let x=0;const platforms=[],gaps=[];
 for(const [w,y,gap] of layout){platforms.push([x,y,w,id===3?32:720-y]);if(gap)gaps.push([x+w,y,gap,24]);x+=w+gap;}
 const first=platforms[0],last=platforms.at(-1);
 return {id,name,subtitle,theme:themes[id],width:x,height:720,spawn:{x:90,y:first[1]-32},platforms,gaps,
  checkpoints:[{x:210,y:first[1]},...platforms.filter((_,i)=>i>0&&i%3===0).map(([x,y])=>({x:x+65,y}))],
  spikes:[],blocks:[],gates:[],plates:[],bridges:[],saws:[],crumble:[],iceRegions:[],lasers:[],objectives:[],
  gravity:.62,goal:{x:x-100,y:last[1]}};
}
const forest=route(0,'Bosque de las copas','Troncos, espinos y una torre entre las hojas',[
 [560,600,75],[430,560,95],[350,500,85],[500,550,110],[460,600,70],[380,530,90],
 [540,570,100],[420,490,90],[500,550,100],[480,600,85],[550,540,90],[650,580,0]
]);
forest.gates=[{id:'tower',rect:[370,444,42,156],material:'wood'}];
forest.plates=[{id:'release',group:'tower',x:465,y:600,w:46}];
forest.objectives=[{group:'tower',type:'tower',baseX:300,approachX:235,releaseX:472,hint:'Haced una torre: saltad desde un compañero y abrid el tronco al otro lado.'}];
for(const i of [1,4,8]){const [x,y]=forest.platforms[i];forest.blocks.push({rect:[x+200,y-42,62,42],type:'log'});}
for(const i of [6,10]){const [x,y]=forest.platforms[i];forest.spikes.push([x+230,y-20,65,20]);}

const canyon=route(1,'Cañón de los puentes','Pasarelas compartidas y sierras entre barrancos',[
 [680,600,95],[500,570,380],[620,590,95],[420,530,145],[560,580,90],[660,550,430],
 [600,570,95],[480,510,140],[620,580,100],[540,550,120],[700,600,0]
]);
function bridgePuzzle(map,after,id,material='wood'){
 const [x,y,w]=map.platforms[after],rect=map.gaps.find(g=>g[0]===x+w);
 map.bridges.push({id,rect,material});
 map.plates.push({id:id+'-a',group:id,x:x+w-200,y,w:44},{id:id+'-b',group:id,x:x+w-100,y,w:44});
 map.objectives.push({group:id,type:'plates',hint:material==='stars'?'Encended las dos placas para unir la constelación.':'Un cubito en cada placa: construid juntos la pasarela del cañón.'});
}
bridgePuzzle(canyon,1,'bridge');bridgePuzzle(canyon,5,'bridge-2');
for(const i of [3,8]){const [x,y,w]=canyon.platforms[i];canyon.saws.push({x:x+w*.55,y:y-28,range:65,radius:18,period:200,offset:i*29});}

const ice=route(2,'Glaciar del deshielo','Frena con tiempo: el hielo no espera',[
 [900,600,150],[600,570,160],[500,590,130],[720,550,170],[560,590,140],
 [650,560,160],[540,600,130],[680,560,150],[600,580,170],[800,600,0]
]);
ice.gates=[{id:'thaw',rect:[620,300,42,300],material:'ice'}];
ice.plates=[{id:'thaw-a',group:'thaw',x:360,y:600,w:46},{id:'thaw-b',group:'thaw',x:470,y:600,w:46}];
ice.objectives=[{group:'thaw',type:'plates',hint:'Pisad las dos placas para derretir la barrera de cristal.'}];
ice.checkpoints.splice(1,0,{x:760,y:600});
ice.iceRegions=[{x:1050,w:ice.width-1050}];
for(const i of [0,2,4,6,8]){const [x,y,w]=ice.platforms[i],gap=ice.gaps.find(g=>g[0]===x+w);ice.crumble.push({id:`ice-${i}`,rect:[gap[0],y,gap[2],18],delay:42,restore:180});}
for(const i of [2,5,8]){const [x,y]=ice.platforms[i];ice.spikes.push([x+260,y-20,55,20]);}

const moon=route(3,'Constelación de los saltos','Gravedad suave y pulsos de energía',[
 [600,600,230],[420,510,250],[650,550,560],[480,450,220],[500,520,260],
 [620,420,240],[540,500,270],[600,440,250],[560,540,260],[780,500,0]
]);
moon.gravity=.38;
bridgePuzzle(moon,2,'stars','stars');
for(const i of [5,7,9]){const [x,y,w]=moon.platforms[i];moon.lasers.push({id:`pulse-${i}`,x:x+250,y:y-110,w:20,h:110,period:180,on:80,offset:i*31});}
// Fixed seeds keep the absurdity identical for everybody in the room.
function addEnemy(map,island,kind,offsetX=180){
 const [x,y,w]=map.platforms[island];
 map.enemies??=[];
 map.enemies.push({id:`${map.id}-${kind}-${island}`,kind,x:x+Math.min(offsetX,w-100),y:y-(kind==='toaster'?130:kind==='duck'?36:32),w:kind==='duck'?40:34,h:kind==='duck'?36:32,range:kind==='toaster'?35:22,period:220+island*11,offset:island*37});
}
for(const [i,kind,x] of [[2,'toaster',180],[3,'duck',290],[5,'toaster',180],[7,'toaster',210],[9,'banana',160],[11,'toaster',520]])addEnemy(forest,i,kind,x);
for(const [i,kind,x] of [[2,'duck',350],[4,'banana',200],[6,'capy',340],[7,'toaster',220],[9,'toaster',250],[10,'toaster',540]])addEnemy(canyon,i,kind,x);
for(const [i,kind,x] of [[1,'capy',210],[3,'duck',280],[4,'toaster',250],[6,'banana',200],[7,'toaster',280],[9,'duck',480]])addEnemy(ice,i,kind,x);
for(const [i,kind,x] of [[1,'toaster',230],[2,'capy',210],[3,'toaster',220],[4,'banana',120],[6,'toaster',290],[8,'toaster',300]])addEnemy(moon,i,kind,x);
for(const map of [forest,canyon,ice,moon]){
 const last=map.platforms.at(-1);
 map.springs=[{x:last[0]+100,y:last[1],w:44}];
 map.memes=map.platforms.filter((_,i)=>i>0&&i%2===0).map(([x,y,w],i)=>({x:x+w*.65,y:y-230,kind:['capy','toaster','banana','duck'][(i+map.id)%4],caption:['NO ERA POR AHÍ','SKILL ISSUE','¿TODO BIEN, EQUIPO?','FÍSICA: CONFÍA','EL PATO TE JUZGA'][(i+map.id)%5]}));
}
canyon.belts=[4,6].map(i=>({x:canyon.platforms[i][0]+60,y:canyon.platforms[i][1],w:120,speed:-1.2}));
export const levels=[forest,canyon,ice,moon];
addEncounters(levels);
