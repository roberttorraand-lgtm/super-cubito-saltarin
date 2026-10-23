// Campaign rules are shared by the desktop server, host worker and interface.
export const NIGHTS=Object.freeze([
 {id:1,title:'Contrato de prueba',tag:'APRENDE EL LOCAL',brief:'Prisma sigue el teléfono. Soldador escucha tus carreras. Mira a Don 67 y reserva energía para el Asador, que despierta a las 03:00.',story:'La dirección asegura que los paseos nocturnos son parte del mantenimiento.',speed:1,awake:[120,180,240,480],sight:9,memory:5,hearing:1,drain:1,charge:3,doorDrain:1.2,doorCharge:.45,breathing:45,stun:1.5,stunCooldown:5,bang:4,refill:45,lureTime:8,blackoutEvery:0,blackoutDuration:0,teamwork:false},
 {id:2,title:'Fuera de horario',tag:'NO REPITAS TU RUTA',brief:'Soldador y Don 67 salen antes. Los cuatro caminan más rápido, oyen más lejos y recuerdan tu última posición durante más tiempo.',story:'Alguien ha fichado con tu nombre antes de que llegaras. La firma todavía está húmeda.',speed:1.1,awake:[120,150,180,420],sight:9.5,memory:6,hearing:1.1,drain:1.08,charge:2.9,doorDrain:1.3,doorCharge:.43,breathing:41,stun:1.35,stunCooldown:5.5,bang:4.5,refill:50,lureTime:7,blackoutEvery:0,blackoutDuration:0,teamwork:false},
 {id:3,title:'Fallo de suministro',tag:'ESCUCHA EL AVISO ELÉCTRICO',brief:'Hay cortes de 16 segundos cada tres minutos de peligro. Las cámaras pierden señal y las bases dejan de recargar; las puertas conservan su reserva. La linterna aún funciona.',story:'El técnico encuentra cuatro cables cortados desde dentro. Se niega a entrar otra vez.',speed:1.18,awake:[120,140,160,360],sight:10,memory:7,hearing:1.2,drain:1.16,charge:2.8,doorDrain:1.4,doorCharge:.4,breathing:37,stun:1.2,stunCooldown:6,bang:5,refill:55,lureTime:6,blackoutEvery:180,blackoutDuration:16,teamwork:false},
 {id:4,title:'El turno compartido',tag:'YA SE AVISAN ENTRE ELLOS',brief:'Cuando Soldador te ve, alerta a los demás de tu posición. Cambia de habitación después de perderlo. El Asador despierta a la 01:00; los cortes duran 20 segundos.',story:'Las cámaras graban a los cuatro reunidos frente a una taquilla vacía. Están esperando a alguien.',speed:1.27,awake:[120,130,145,240],sight:10.5,memory:8,hearing:1.3,drain:1.24,charge:2.65,doorDrain:1.5,doorCharge:.37,breathing:33,stun:1.05,stunCooldown:6.5,bang:5.5,refill:60,lureTime:5,blackoutEvery:150,blackoutDuration:20,teamwork:true},
 {id:5,title:'Última nómina',tag:'TODOS DESPIERTAN A MEDIANOCHE',brief:'Los cuatro salen a las 00:00. Soldador coordina la caza, Prisma resiste mejor la luz y los cortes llegan cada dos minutos durante 22 segundos. Ahorra, distrae y cambia de refugio.',story:'No hay encargado al teléfono. Solo tu propia voz, grabada mañana, pidiendo que no aceptes este turno.',speed:1.36,awake:[120,120,120,120],sight:11,memory:9,hearing:1.4,drain:1.32,charge:2.5,doorDrain:1.6,doorCharge:.34,breathing:29,stun:.9,stunCooldown:7,bang:6,refill:65,lureTime:4,blackoutEvery:120,blackoutDuration:22,teamwork:true},
].map(n=>Object.freeze({...n,awake:Object.freeze(n.awake)})));
export const nightNumber=value=>Number.isInteger(value)&&value>=1&&value<=5?value:1;
export const nightRules=value=>NIGHTS[nightNumber(value)-1];
export function powerState(night,elapsed){
 const n=nightRules(night),danger=elapsed-120;
 if(!n.blackoutEvery||danger<0)return {active:false,warning:false,remaining:0};
 // The first cut happens after a complete interval, never during preparation.
 const cycle=danger%n.blackoutEvery;
 const active=danger>=n.blackoutEvery&&cycle<n.blackoutDuration;
 return {active,warning:!active&&cycle>=n.blackoutEvery-8,remaining:active?Math.ceil(n.blackoutDuration-cycle):0};
}
export function campaignProgress(data){
 const completed=[...new Set((Array.isArray(data?.completed)?data.completed:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=5))].sort((a,b)=>a-b);
 let unlocked=1;while(unlocked<5&&completed.includes(unlocked))unlocked++;
 return {version:1,completed,unlocked};
}
export function completeNight(progress,night){return campaignProgress({completed:[...campaignProgress(progress).completed,nightNumber(night)]});}
