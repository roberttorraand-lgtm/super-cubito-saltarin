export class Sound {
 constructor(){this.volume=.65;this.ctx=null;this.lastStep=0;this.lastPulse=0;this.event=0;}
 start(){if(this.ctx){this.ctx.resume();return;}try{this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.2;this.master.connect(this.ctx.destination);const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='sine';osc.frequency.value=53;gain.gain.value=.13;osc.connect(gain).connect(this.master);osc.start();}catch{}}
 setVolume(value){this.volume=value;if(this.master)this.master.gain.setTargetAtTime(value*.2,this.ctx.currentTime,.1);}
 tone(freq,length=.1,vol=.3,type='sine'){if(!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.6),t+length);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+length);o.connect(g).connect(this.master);o.start();o.stop(t+length);}
 update(state,p,moving,time){if(!this.ctx)return;if(moving&&!p.hidden&&time-this.lastStep>(p.input?.run?.3:.52)){this.lastStep=time;this.tone(85,.08,.24,'triangle');}
  let nearest=100;for(const e of state.world.enemies)if(e.state!=='dormant')nearest=Math.min(nearest,Math.hypot(e.x-p.x,e.z-p.z));if(nearest<8&&time-this.lastPulse>Math.max(.4,nearest*.18)){this.lastPulse=time;this.tone(nearest<3?60:90,.18,.25*(1-nearest/9),'triangle');}
  const e=state.world.event;if(e?.id!==this.event){this.event=e?.id;if(e?.type==='caught')this.tone(110,1.1,.7,'sawtooth');if(e?.type==='door')this.tone(65,.5,.45,'triangle');if(e?.type==='warning'){this.tone(650,.45,.25,'triangle');setTimeout(()=>this.tone(650,.45,.25,'triangle'),500);}if(e?.type==='blackout')this.tone(45,1,.4,'sawtooth');if(e?.type==='alarm')this.tone(420,.7,.3,'square');if(e?.type==='won'){this.tone(440,.5,.3);setTimeout(()=>this.tone(660,.8,.3),300);}if(e?.type==='lure')this.tone(900,.18,.4,'square');}
 }
}
