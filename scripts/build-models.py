"""Original articulated Brasa Burger assets. Run: blender -b -t 2 --python scripts/build-models.py
No downloaded meshes. Coordinates: Blender front -Y; glTF front +Z, ground Y=0.
"""
import bpy,math,random,pathlib,json
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'public/assets/models';OUT.mkdir(parents=True,exist_ok=True)
random.seed(67)
def material(name,color,metal=.2,rough=.48,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m

def empty(name,parent=None,pos=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos;o.parent=parent;return o

def finish(o,name,parent,pos,scale,mat,bevel=0):
 o.name=name;o.location=pos;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Machined edges','BEVEL');mod.width=bevel;mod.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def box(name,p,pos,size,mat,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1);return finish(bpy.context.object,name,p,pos,size,mat,bevel)
def ball(name,p,pos,size,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.5);return finish(bpy.context.object,name,p,pos,size,mat)
def cyl(name,p,pos,radius,depth,mat,rot=None,vertices=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth);o=finish(bpy.context.object,name,p,pos,(1,1,1),mat,.008)
 if rot:o.rotation_euler=rot
 return o
def cone(name,p,pos,r1,r2,depth,mat):
 bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r1,radius2=r2,depth=depth);return finish(bpy.context.object,name,p,pos,(1,1,1),mat,.01)
def ring(name,p,pos,radius,minor,mat,rot=(math.pi/2,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,major_radius=radius,minor_radius=minor);o=finish(bpy.context.object,name,p,pos,(1,1,1),mat);o.rotation_euler=rot;return o
def cable(name,p,points,radius,mat):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=2;curve.bevel_depth=radius;curve.bevel_resolution=1;s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for q,co in zip(s.bezier_points,points):q.co=co;q.handle_left_type=q.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.parent=p;curve.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

def model(kind):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 metal=material('Graphite alloy',(.12,.16,.17),.78,.31);black=material('Rubber seams',(.025,.035,.033),.05,.8);bone=material('Porcelain teeth',(.77,.72,.55),.05,.4);copper=material('Copper coils',(.42,.19,.08),.7,.4)
 palettes={'prisma':((.62,.57,.42),(.18,.10,.065),(.14,.58,1)), 'welder':((.20,.33,.28),(.045,.12,.09),(.24,1,.35)), 'gold':((.68,.47,.15),(.79,.72,.48),(1,.67,.12)), 'ember':((.16,.13,.12),(.08,.07,.065),(1,.095,.025))}
 col,cloth,light=palettes[kind];shell=material('Worn enamel',col,.5,.4);fabric=material('Uniform fabric',cloth,.03,.82);glow=material('Phosphor lamps',light,.2,.23,3);ivory=material('Highlight enamel',tuple(min(1,x*1.25) for x in col),.4,.34)
 root=empty('Character');hips=empty('Hips',root,(0,0,.88));torso=empty('Chest',hips,(0,0,.48));head=empty('Head',torso,(0,0,.77));jaw=empty('Jaw',head,(0,-.06,-.17));arms=[];legs=[]
 box('Pelvis',hips,(0,0,0),(.51,.34,.30),metal);cyl('Spine',torso,(0,0,-.27),.11,.38,metal)
 for s in [-1,1]:
  ball('Hip socket',hips,(s*.21,0,-.12),(.21,.23,.22),metal);leg=empty('Leg.L' if s<0 else 'Leg.R',root,(s*.21,0,.79));legs.append(leg)
  cyl('Thigh piston',leg,(0,0,-.17),.085,.35,metal);box('Thigh plate',leg,(0,-.06,-.13),(.20,.17,.30),shell)
  ball('Knee bearing',leg,(0,0,-.37),(.23,.22,.20),metal);ring('Knee gasket',leg,(0,-.1,-.37),.07,.015,copper)
  cyl('Shin piston',leg,(0,0,-.51),.07,.27,metal);box('Shin guard',leg,(0,-.07,-.51),(.19,.15,.26),ivory)
  box('Boot',leg,(0,-.10,-.69),(.31,.45,.18),black);box('Boot toe',leg,(0,-.25,-.65),(.29,.16,.12),shell)
 box('Rib cage',torso,(0,0,.08),(.65,.38,.72),shell,.07);box('Chest inset',torso,(0,-.205,.08),(.50,.04,.50),fabric,.015)
 for z in [-.12,.05,.22]:box('Vent grille',torso,(0,-.235,z),(.29,.025,.025),black,.004)
 for s in [-1,1]:
  ball('Shoulder socket',torso,(s*.40,0,.29),(.29,.28,.28),metal)
  arm=empty('Arm.L' if s<0 else 'Arm.R',torso,(s*.44,0,.30));arms.append(arm)
  cyl('Upper arm',arm,(0,0,-.21),.09,.37,metal);box('Arm armor',arm,(0,-.035,-.15),(.22,.20,.27),shell)
  ball('Elbow',arm,(0,0,-.40),(.20,.20,.20),metal);fore=empty('Forearm.L' if s<0 else 'Forearm.R',arm,(0,0,-.41))
  box('Forearm armor',fore,(0,0,-.15),(.21,.23,.29),ivory);cyl('Wrist gasket',fore,(0,0,-.34),.075,.1,black)
  box('Palm',fore,(0,-.02,-.43),(.21,.12,.16),metal)
  for j in range(4):
   finger=empty('Finger',fore,((j-1.5)*.048,-.02,-.48));box('Finger segment',finger,(0,-.01,-.055),(.033,.055,.11),ivory,.008);ball('Finger joint',finger,(0,-.025,-.11),(.042,.05,.045),metal)
  cable('Arm conduit',arm,[(s*.08,.08,-.02),(s*.12,.1,-.28),(s*.08,.12,-.52)],.022,black)
 cyl('Neck',head,(0,0,-.38),.09,.23,metal);box('Cranium',head,(0,0,.025),(.53,.43,.49),shell,.075)
 box('Face plate',head,(0,-.22,0),(.47,.07,.33),ivory,.035);box('Mouth cavity',jaw,(0,-.16,-.015),(.37,.13,.14),black,.012);box('Lower jaw plate',jaw,(0,-.16,-.10),(.43,.22,.10),shell,.025)
 for j in range(7):box('Upper teeth',head,((j-3)*.048,-.265,-.15),(.037,.06,.065),bone,.007);box('Lower teeth',jaw,((j-3)*.048,-.235,-.055),(.037,.045,.045),bone,.006)
 for s in [-1,1]:
  ball('Eye socket',head,(s*.135,-.253,.065),(.20,.08,.15),black);ball('Iris lens',head,(s*.135,-.298,.065),(.105,.045,.10),glow)
  cyl('Temple rivet',head,(s*.274,0,.07),.045,.035,metal,(0,math.pi/2,0));box('Brow',head,(s*.13,-.255,.18),(.22,.07,.045),metal,.009)
 # Readable surface wear, mechanical screws and numbered inspection ports.
 for s in [-1,1]:
  for z in [-.19,.31]:ball('Chest fastener',torso,(s*.27,-.206,z),(.034,.022,.034),metal)
 for i in range(6):box('Paint chip',torso,((i%3-1)*.19,-.229,-.15+(i//3)*.42),(.045,.008,.019),metal,.002)
 if kind=='prisma':
  # Tall ceremonial silhouette: layered robe panels, curly hair, brass halo coils.
  cone('Ceremonial robe',hips,(0,.01,-.15),.48,.30,.67,fabric)
  for s in [-1,1]:
   panel=box('Ivory stole',torso,(s*.18,-.245,.05),(.16,.055,.77),ivory);panel.rotation_euler.y=s*.05
   ring('Spectacle rim',head,(s*.145,-.326,.065),.129,.018,copper)
  box('Spectacle bridge',head,(0,-.326,.07),(.07,.032,.025),copper,.006)
  for i in range(17):
   a=i/17*math.tau;ball('Sculpted curls',head,(math.cos(a)*.265,.01+math.sin(a)*.16,.29+abs(math.sin(a))*.07),(.16,.16,.17),fabric)
  for i in range(6):ball('Crown curls',head,((i%3-1)*.14,-.03+(i//3)*.13,.41),(.19,.19,.17),fabric)
  ring('胸 badge',torso,(0,-.29,.23),.10,.024,copper);ball('Badge core',torso,(0,-.32,.23),(.08,.03,.08),glow)
  cable('Optical lead',head,[(.25,-.10,.10),(.31,.10,.07),(.22,.15,-.30)],.02,copper)
 elif kind=='welder':
  # Wide industrial backpack, articulated tool and a slatted welding visor.
  box('Apron',torso,(0,-.25,-.08),(.58,.08,.78),fabric,.025)
  for s in [-1,1]:box('Apron strap',torso,(s*.22,-.23,.33),(.085,.055,.32),ivory)
  box('Filter backpack',torso,(0,.31,.10),(.54,.27,.68),metal,.06)
  for s in [-1,1]:cyl('Pressure tank',torso,(s*.22,.42,.14),.13,.73,shell);cyl('Tank cap',torso,(s*.22,.42,.56),.07,.08,copper)
  for i in range(5):box('Cooling slat',torso,(0,.46,-.05+i*.095),(.34,.045,.028),black,.004)
  box('Welding crown',head,(0,.01,.28),(.64,.50,.13),metal);box('Forehead filter',head,(0,-.08,.40),(.43,.32,.14),ivory)
  box('Visor',head,(0,-.28,.085),(.44,.06,.18),black);box('Visor slit',head,(0,-.32,.10),(.37,.025,.045),glow,.004)
  tool=bpy.data.objects.get('Forearm.R');box('Welder housing',tool,(0,-.12,-.23),(.30,.30,.40),metal)
  cyl('Tool barrel',tool,(0,-.40,-.28),.10,.36,copper,(math.pi/2,0,0));cyl('Tool aperture',tool,(0,-.60,-.28),.055,.06,glow,(math.pi/2,0,0))
  cable('High pressure hose',torso,[(.21,.42,.42),(.60,.32,.12),(.60,.05,-.28),(.46,-.12,-.54)],.032,black)
 elif kind=='gold':
  # Leisure suit, sculpted jaw, flower lei and oversized black sunglasses.
  box('Printed shirt',torso,(0,-.235,.08),(.67,.08,.64),fabric,.035)
  red=material('Hibiscus terracotta',(.58,.20,.14),.05,.7);green=material('Palm print',(.12,.33,.23),.05,.8)
  for i in range(9):
   x=(i%3-1)*.20;z=-.15+(i//3)*.22;flower=ball('Hibiscus petal',torso,(x,-.29,z),(.14,.022,.10),red if i%2 else green);flower.rotation_euler.y=i*.8
  for s in [-1,1]:box('Obsidian shades',head,(s*.143,-.323,.09),(.255,.10,.14),black,.03);box('Gold frame',head,(s*.143,-.38,.16),(.26,.025,.028),shell,.006)
  box('Shades bridge',head,(0,-.36,.11),(.07,.04,.027),shell)
  box('Hero jaw',jaw,(0,-.15,-.11),(.52,.24,.15),ivory,.05)
  for i in range(9):
   a=i/8*math.pi;ball('Flower lei',torso,(math.cos(a)*.30,-.31,.30-math.sin(a)*.24),(.12,.065,.12),red if i%2 else bone)
  for i in range(6):ball('Swept hair',head,((i-2.5)*.09,.01,.33),(.20,.32,.15),metal)
  box('Gold buckle',hips,(0,-.18,.10),(.16,.055,.10),shell)
 elif kind=='ember':
  # Asymmetric furnace armor, broken horn, chimney stack, exposed glowing core.
  cone('Furnace breastplate',torso,(0,.02,.09),.37,.44,.64,metal)
  ring('Core shroud',torso,(0,-.47,.06),.20,.065,black);ball('Furnace heart',torso,(0,-.46,.06),(.29,.10,.29),glow)
  for s in [-1,1]:
   box('Pauldrons',torso,(s*.46,0,.40),(.38,.48,.21),metal,.045)
   spike=cone('Shoulder spike',torso,(s*.54,.03,.66),.10,.015,.30,shell);spike.rotation_euler.y=s*.35
   horn=cone('Horn',head,(s*.22,.02,.45),.10,.012,.35 if s<0 else .22,metal);horn.rotation_euler.y=s*.3
  for i in range(3):
   cyl('Chimney',torso,((i-1)*.17,.35,.60+i*.035),.065,.63,black);ring('Chimney lip',torso,((i-1)*.17,.35,.925+i*.035),.066,.015,copper,(0,0,0))
  for i in range(8):
   x=(i%3-1)*.12;z=-.21+(i//3)*.21
   crack=box('Hot armor fracture',torso,(x,-.405,z),(.018,.014,.14),glow,.003);crack.rotation_euler.y=(i%3-1)*.65
  for i in range(4):cable('Exposed cable',torso,[((i-1.5)*.1,.25,.20),((i-1.5)*.17,.38,-.16),((i-1.5)*.16,.26,-.48)],.018,copper)
 # glTF groups share names across object NLA tracks, imported as complete clips.
 def clip(obj,name,axis,keys):
  obj.rotation_mode='XYZ'
  for frame,value in keys:obj.rotation_euler[axis]=value;obj.keyframe_insert(data_path='rotation_euler',index=axis,frame=frame,group=name)
  action=obj.animation_data.action;action.name=name+'_'+obj.name
  track=obj.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);obj.animation_data.action=None
 for i,limb in enumerate(legs+arms):
  amplitude=.30 if i<2 else .19;sign=1 if i%2==0 else -1
  clip(limb,'Walk',0,[(0,0),(6,sign*amplitude),(12,0),(18,-sign*amplitude),(24,0)])
 clip(head,'Idle',2,[(0,-.025),(30,.025),(60,-.025)])
 clip(jaw,'Idle',0,[(0,0),(30,.035),(60,0)])
 clip(arms[0],'Attack',0,[(0,0),(7,-1.15),(14,-1.45),(24,0)])
 clip(arms[1],'Attack',0,[(0,0),(7,-1.35),(14,-1.1),(24,0)])
 clip(jaw,'Attack',0,[(0,0),(8,-.40),(16,-.32),(24,0)])
 bpy.context.scene.frame_set(0)
 bpy.context.view_layer.update()
 # Merge rigid pieces sharing a material and pivot, retaining articulated nodes.
 groups={}
 for obj in list(bpy.context.scene.objects):
  if obj.type=='MESH':groups.setdefault((obj.parent,obj.active_material),[]).append(obj)
 for (parent,mat),objects in groups.items():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for obj in objects:obj.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=kind+'_'+(parent.name if parent else 'root')+'_'+mat.name
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_frame_range=False,export_force_sampling=True,export_apply=True,export_cameras=False,export_lights=False)
 print('EXPORTED',kind)
for name in ['prisma','welder','gold','ember']:model(name)
(OUT/'manifest.json').write_text(json.dumps({'author':'Turno Cero / original procedural sculpture','generator':'Blender 4.3','front':'+Z','up':'+Y','units':'metres','models':['prisma','welder','gold','ember'],'clips':['Idle','Walk','Attack']},indent=2))
