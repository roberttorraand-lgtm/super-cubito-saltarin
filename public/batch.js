import * as T from '/vendor/three.module.js';
// Merge meshes with one material without changing their world-space silhouette.
// Articulated children (heads, arms, doors, cameras) remain independent groups.
export function batchMeshes(parent,roots=parent.children.filter(c=>c.isMesh)){
 if(!roots.length)return;
 parent.updateMatrixWorld(true);const inverse=parent.matrixWorld.clone().invert(),byMaterial=new Map();
 for(const root of roots)root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material))return;
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
  const list=byMaterial.get(mesh.material)??[];list.push(geometry);byMaterial.set(mesh.material,list);
 });
 for(const root of roots)parent.remove(root);
 for(const [material,list] of byMaterial){
  const merged=new T.BufferGeometry();
  for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
   const values=new Float32Array(list.reduce((n,g)=>n+(g.attributes[name]?.array.length??0),0));let offset=0;
   for(const g of list){const data=g.attributes[name]?.array;if(data){values.set(data,offset);offset+=data.length;}}
   merged.setAttribute(name,new T.BufferAttribute(values,size));
  }
  for(const g of list)g.dispose();merged.computeBoundingSphere();
  const mesh=new T.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
 }
}
