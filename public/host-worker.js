import {HostSession} from '/shared/host-session.js';
import {DT} from '/shared/simulation.js';
let session=null,last=performance.now(),accumulator=0,frame=0;
const send=(peer,packet)=>postMessage({peer,packet});
onmessage=event=>{
 const {type,peer,data,code}=event.data??{};
 try{
  if(type==='create'){
   if(session)throw Error('La partida ya existe.');session=new HostSession(code,data.save);
   send('host',session.join('host',data.name));return;
  }
  if(!session)return;
  if(type==='remove'){session.remove(peer);return;}
  if(type==='packet'){
   if(data?.type==='join'){send(peer,session.join(peer,data.name));return;}
   const response=session.command(peer,data);if(response)send(peer,response);
  }
 }catch(error){send(peer??'host',{type:'error',text:error.message});}
};
setInterval(()=>{
 const now=performance.now();accumulator+=Math.min(.2,(now-last)/1000);last=now;
 while(accumulator>=DT){accumulator-=DT;if(!session)continue;session.tick();
  if(++frame%3===0){const packet=session.state();for(const peer of session.members.keys())send(peer,packet);}
 }
},5);
