import {Renderer as CanvasRenderer} from '/renderer.js';
import {Renderer3D} from '/renderer3d.js';
// The network and physics never depend on the graphics capability of a device.
export class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.choice='auto';this.level=null;this.reason='';
  try{const probe=document.createElement('canvas');const gl=probe.getContext('webgl2');if(!gl)throw new Error('WebGL2 no disponible');gl.getExtension('WEBGL_lose_context')?.loseContext();this.engine=new Renderer3D(canvas);this.engine.onFailure=()=>this.fallback('El dispositivo ha reiniciado los gráficos. Continúas en 2D.');}
  catch(error){this.fallback('Tu navegador usa el modo 2D compatible.');}
 }
 fallback(reason){
  this.reason=reason;this.engine?.dispose?.();
  // A canvas cannot switch from WebGL to a 2D context, so replace its surface.
  const next=this.canvas.cloneNode(false);this.canvas.replaceWith(next);this.canvas=next;
  this.engine=new CanvasRenderer(next);if(this.level)this.engine.setLevel(this.level);this.updateButton();
 }
 attachButton(button){this.button=button;button.addEventListener('click',()=>{if(!(this.engine instanceof Renderer3D))return;this.choice=this.choice==='auto'?'low':this.choice==='low'?'high':'auto';this.engine.setQuality(this.choice);this.updateButton();});this.updateButton();}
 updateButton(){if(!this.button)return;const three=this.engine instanceof Renderer3D;this.button.textContent=three?`2.5D · ${this.choice==='auto'?'AUTO':this.choice==='low'?'LIGERO':'ALTO'}`:'2D · COMPATIBLE';this.button.title=three?'Cambiar calidad gráfica: automática, ligera o alta':this.reason;this.button.setAttribute('aria-label',this.button.title);this.button.disabled=!three;}
 setLevel(level){this.level=level;try{this.engine.setLevel(level);}catch(error){console.error('No se pudo construir el escenario 3D',error);this.fallback('Se ha activado el modo 2D compatible.');}}
 draw(...args){try{this.engine.draw(...args);}catch(error){if(this.engine instanceof Renderer3D){console.error('Se ha recuperado el juego en modo 2D',error);this.fallback('Se ha recuperado el juego en modo 2D.');this.engine.draw(...args);}else throw error;}}
}
