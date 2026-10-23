"""Deterministic original 512px tiling surfaces with normal maps; no external assets."""
from PIL import Image,ImageDraw,ImageFilter
import random,pathlib,math
ROOT=pathlib.Path(__file__).resolve().parent.parent/'public/assets/textures';ROOT.mkdir(parents=True,exist_ok=True)
rng=random.Random(2016);size=512
for kind in ['tile','plaster','steel','wood','fabric','rubber','enamel']:
 im=Image.new('RGB',(size,size));px=im.load();height=Image.new('L',(size,size));hp=height.load()
 for y in range(size):
  for x in range(size):
   noise=rng.randrange(-10,11);v=180+noise;h=128+noise
   if kind=='tile':
    grout=x%128<4 or y%128<4;dark=((x//128+y//128)%2)==0;v=(52 if dark else 190)+noise;v=30 if grout else v;h=80 if grout else 140+noise//2
   elif kind=='plaster':v=190+noise+int(5*math.sin(x*.2)*math.sin(y*.09));h=128+noise*2
   elif kind in ['steel','enamel']:v=155+noise+int(13*math.sin(y*1.3));h=128+noise//2+int(5*math.sin(y*1.3))
   elif kind=='wood':v=140+noise+int(18*math.sin(y*.09+3*math.sin(x*.014)));h=v
   elif kind=='fabric':v=175+noise+(15 if (x+y)%4<2 else -15);h=v
   elif kind=='enamel':v=231+noise//2;h=128+noise
   elif kind=='rubber':v=70+noise+(15 if (x+y)%48<4 else 0);h=v
   px[x,y]=(max(0,min(255,v)),)*3;hp[x,y]=max(0,min(255,h))
 d=ImageDraw.Draw(im)
 if kind in ['steel','enamel']:
  for i in range(55):
   x,y=rng.randrange(size),rng.randrange(size);d.line((x,y,min(511,x+rng.randrange(5,50)),y),fill=(210,205,190) if kind=='steel' else (174,170,158),width=1)
 if kind=='plaster':
  for i in range(15):
   x,y=rng.randrange(size),rng.randrange(size);d.line([(x,y),(x+5,y+20),(x-3,y+40)],fill=(135,134,126),width=1)
 normal=Image.new('RGB',(size,size));np=normal.load()
 for y in range(size):
  for x in range(size):
   dx=(hp[(x+1)%size,y]-hp[(x-1)%size,y])*.017;dy=(hp[x,(y+1)%size]-hp[x,(y-1)%size])*.017;l=math.sqrt(dx*dx+dy*dy+1);np[x,y]=(int(127.5-dx/l*127.5),int(127.5-dy/l*127.5),int(127.5+127.5/l))
 im.save(ROOT/(kind+'.png'),optimize=True);normal.save(ROOT/(kind+'-normal.png'),optimize=True)
print('Seven original surface/normal pairs generated.')
