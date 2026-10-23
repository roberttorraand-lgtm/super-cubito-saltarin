import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('all four shipped Blender models contain usable articulated clips and self-contained geometry',async()=>{
 for(const id of ['prisma','welder','gold','ember']){
  const data=await readFile(new URL(`../public/assets/models/${id}.glb`,import.meta.url));
  assert.equal(data.toString('ascii',0,4),'glTF',id);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
  const document=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
  assert.ok(document.nodes.length>20,id);assert.ok(document.meshes.length>5,id);
  assert.equal(document.buffers.length,1);assert.equal(document.buffers[0].uri,undefined,'Geometry must be installed locally');
  assert.ok(!(document.extensionsRequired??[]).includes('KHR_draco_mesh_compression'),'No decoder download at runtime');
  let triangles=0;for(const mesh of document.meshes)for(const primitive of mesh.primitives)triangles+=document.accessors[primitive.indices].count/3;
  assert.ok(triangles>1000&&triangles<50000,`${id}: ${triangles} triangles`);
  for(const name of ['Idle','Walk','Attack']){
   const animation=document.animations.find(a=>a.name===name);assert.ok(animation,`${id}: ${name}`);assert.ok(animation.channels.length);
   for(const channel of animation.channels){const sampler=animation.samplers[channel.sampler];assert.ok(document.accessors[sampler.input].count>1);assert.ok(document.nodes[channel.target.node]);}
  }
 }
});

test('every installed surface has a 512px normal map and no network texture dependency',async()=>{
 for(const kind of ['tile','plaster','steel','wood','fabric','rubber','enamel'])for(const suffix of ['','-normal']){
  const data=await readFile(new URL(`../public/assets/textures/${kind}${suffix}.png`,import.meta.url));
  assert.equal(data.toString('ascii',1,4),'PNG');assert.equal(data.readUInt32BE(16),512);assert.equal(data.readUInt32BE(20),512);
 }
});
