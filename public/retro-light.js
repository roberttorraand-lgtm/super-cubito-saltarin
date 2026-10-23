import * as T from '/vendor/three.module.js';
// Low mode uses precomputed room lighting and one inexpensive analytical torch.
// Normal mode keeps real-time diffuse lighting and shadow maps.
export function prepareRetroLighting(meshes,lights,torch){
 const pairs=[];
 for(const mesh of meshes){
  if(!mesh.isMesh||!mesh.material.isMeshLambertMaterial)continue;
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   let r=.25+.09*Math.max(0,n.getY(i)),green=r,b=r;
   for(const light of lights){
    const dx=light.position.x-p.getX(i),dy=light.position.y-p.getY(i),dz=light.position.z-p.getZ(i),distance=Math.hypot(dx,dy,dz);
    const normal=Math.max(0,(dx*n.getX(i)+dy*n.getY(i)+dz*n.getZ(i))/Math.max(.05,distance));
    const amount=(.15+.85*normal)*.8/(1+distance*distance*.19);
    r+=light.color.r*amount;green+=light.color.g*amount;b+=light.color.b*amount;
   }
   colors.set([Math.min(1.3,r),Math.min(1.3,green),Math.min(1.3,b)],i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  const source=mesh.material,material=new T.MeshBasicMaterial({color:source.color,map:source.map,vertexColors:true,side:source.side,fog:true});
  material.onBeforeCompile=shader=>{
   shader.uniforms.uRetroPosition=torch.position;shader.uniforms.uRetroDirection=torch.direction;shader.uniforms.uRetroStrength=torch.strength;
   shader.vertexShader='varying vec3 vRetroPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvRetroPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='varying vec3 vRetroPosition;uniform vec3 uRetroPosition;uniform vec3 uRetroDirection;uniform float uRetroStrength;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec3 retroDelta=vRetroPosition-uRetroPosition;
    float retroDistance=length(retroDelta);
    float retroCone=smoothstep(0.82,0.96,dot(normalize(retroDelta),uRetroDirection));
    outgoingLight*=0.85+uRetroStrength*retroCone/(1.0+0.09*retroDistance*retroDistance);
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=> 'turno-retro-1';pairs.push({mesh,normal:source,low:material});
 }
 return pairs;
}
