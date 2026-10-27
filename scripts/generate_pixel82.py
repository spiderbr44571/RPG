#!/usr/bin/env python3
"""Mastermind 0.82: original, deliberately authored 168x208 modular pixel-art sprites.
Each exported atlas tile has the SAME coordinates and transparencies.
Semantic palette colors are indexed RGB markers and recolored in the Android WebView.
No resampling, AI sheet cropping, or vector rendering is used at runtime.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import json, math, random
W,H=168,208
KEYS=['body','hairBack','cloak','neck','outfit','armor','ears','face','eyes','brows','nose','mouth','beard','hairFront','accessory']
COUNTS={'body':4,'hairBack':12,'cloak':6,'neck':1,'outfit':16,'armor':6,'ears':4,'face':6,'eyes':8,'brows':8,'nose':6,'mouth':8,'beard':7,'hairFront':12,'accessory':12}
INK=(38,29,46,255);EDGE=(74,48,62,255);WHITE=(255,245,232,255);LIGHT=(255,253,242,255)

def c(group,shade=3):return (32+group*24,32+shade*28,64,255)
SKIN,HAIR,MAIN,ALT,METAL,EYE,LEATHER,BLUSH=range(8)

def poly(d,points,color):d.polygon(points,fill=color)
def rect(d,box,color):d.rectangle(box,fill=color)
def ellipse(d,box,color):d.ellipse(box,fill=color)
def ln(d,p,color,width=1):d.line(p,fill=color,width=width,joint='curve')
def outlined(d,points,fill,outline=INK,thick=2):
 poly(d,points,outline)
 # drawing outer polygon then inner smaller polygon is not mathematically stable;
 # draw fill then outline with exact 1-2 pixel stepped edging
 poly(d,points,fill)
 for i in range(len(points)):ln(d,[points[i],points[(i+1)%len(points)]],outline,thick)

def noise(d,seed,area,color,n=25):
 rng=random.Random(seed);x0,y0,x1,y1=area
 for _ in range(n):
  x=rng.randrange(x0,x1);y=rng.randrange(y0,y1)
  rect(d,(x,y,x+rng.randrange(1,4),y+rng.randrange(1,3)),color)

def body(d,v):
 wide=[0,5,11,8][v]
 points=[(72,119),(96,119),(109,132),(124+wide,139),(145+wide,151),(161,175),(168,208),(0,208),(7,175),(24-wide,148),(48-wide,136),(63,131)]
 outlined(d,points,c(SKIN,2))
 outlined(d,[(74,111),(96,111),(99,142),(93,151),(75,151),(68,141)],c(SKIN,3),EDGE)
 poly(d,[(72,116),(94,116),(93,125),(74,127)],c(SKIN,1))
 ln(d,[(62,144),(72,150),(85,154),(99,149),(110,142)],c(SKIN,5),2)
 rect(d,(17-wide,166,23-wide,196),c(SKIN,1))
 rect(d,(145+wide,164,150+wide,198),c(SKIN,1))

def neck(d,v):
 outlined(d,[(73,108),(96,108),(98,142),(88,152),(78,151),(69,139)],c(SKIN,3),EDGE)
 poly(d,[(71,111),(76,118),(79,139),(73,143),(69,132)],c(SKIN,1));ln(d,[(88,115),(94,115),(94,140)],c(SKIN,5),3)

def cloak(d,v):
 if v==0:return
 if v==1: points=[(59,128),(43,136),(23,153),(7,208),(162,208),(142,153),(110,131),(98,125)]
 elif v==2:points=[(59,123),(30,127),(10,155),(0,208),(167,208),(155,153),(127,126),(105,125)]
 elif v==3:points=[(59,126),(34,122),(19,140),(0,208),(166,208),(150,142),(118,123),(103,126)]
 elif v==4:points=[(64,136),(36,133),(19,143),(10,165),(28,181),(140,183),(160,165),(145,143),(107,133),(100,137)]
 else:points=[(58,127),(39,132),(16,153),(4,199),(36,208),(138,208),(163,192),(149,157),(120,132),(104,130)]
 outlined(d,points,c(ALT,2))
 poly(d,[(32,160),(48,139),(62,135),(45,162),(25,205),(17,205)],c(ALT,4))
 poly(d,[(127,139),(147,162),(160,203),(152,207),(135,178)],c(ALT,1))
 for j in range(3):ln(d,[(24+j*7,177+j*2),(32+j*7,191+j*3)],c(ALT,5),1)

def outfit(d,v):
 variant=v%8
 base=[(68,136),(78,148),(88,150),(101,137),(117,137),(136,143),(155,161),(168,208),(0,208),(13,164),(32,141),(55,136)]
 outlined(d,base,c(MAIN,2))
 poly(d,[(30,143),(49,136),(65,139),(77,154),(60,194),(42,207),(4,208),(20,170)],c(MAIN,4))
 poly(d,[(107,138),(123,139),(140,145),(160,172),(165,208),(132,208),(117,177),(98,155)],c(MAIN,1))
 poly(d,[(64,138),(83,163),(103,138),(102,155),(86,176),(69,154)],c(ALT,3))
 poly(d,[(80,148),(87,153),(95,146),(93,140),(87,146)],c(ALT,5))
 ln(d,[(66,140),(79,165),(88,170)],INK,2)
 ln(d,[(105,138),(96,158),(88,168)],INK,2)
 if variant in (0,5):
  outlined(d,[(36,153),(55,137),(68,144),(57,160),(42,179),(27,177)],c(ALT,2))
  outlined(d,[(114,144),(129,138),(144,153),(151,174),(131,176),(119,161)],c(ALT,2))
  for y in range(181,205,6):ln(d,[(48,y),(72,y+2)],c(ALT,5),1)
 elif variant in (1,4):
  outlined(d,[(61,141),(82,170),(85,208),(57,208),(39,168)],c(ALT,2))
  outlined(d,[(107,140),(91,170),(90,208),(114,208),(133,167)],c(ALT,2))
  for y in range(167,201,7):
   ln(d,[(59,y),(69,y+4)],c(METAL,4),2);ln(d,[(111,y),(103,y+4)],c(METAL,4),2)
 elif variant in (2,6):
  outlined(d,[(44,152),(57,140),(76,162),(69,196),(55,193),(34,169)],c(LEATHER,2))
  outlined(d,[(123,141),(142,151),(150,171),(132,192),(112,187),(102,161)],c(LEATHER,2))
  for x in [54,115]:
   for y in [169,179,189]:rect(d,(x,y,x+4,y+2),c(METAL,5))
 elif variant in (3,7):
  outlined(d,[(61,138),(84,169),(108,137),(128,156),(119,204),(48,204),(39,154)],c(ALT,3))
  outlined(d,[(81,162),(88,170),(101,163),(93,180),(88,186)],c(METAL,4))
  for y in [171,183,196]:ln(d,[(57,y),(72,y-2)],c(METAL,4),1)
 # custom shoulder silhouette for second block, not merely recoloring
 if v>=8:
  poly(d,[(14,168),(36,148),(44,151),(46,172),(28,182),(6,180)],c(LEATHER,2))
  poly(d,[(124,148),(144,153),(161,175),(155,183),(131,176)],c(LEATHER,3))
  ln(d,[(14,169),(37,151),(43,155)],c(METAL,5),2)
  ln(d,[(127,153),(140,155),(153,172)],c(METAL,5),2)
 # seam/detail ribbons, neckline + buttons
 ln(d,[(80,175),(78,208)],c(MAIN,5),2)
 for y in [177,188,201]:
  rect(d,(86,y,89,y+2),c(METAL,4));rect(d,(87,y,88,y+1),c(METAL,6))
 for y in range(161,201,8):
  x=20+(y%3)*3;ln(d,[(x,y),(x+6,y+3)],c(MAIN,5),1)
 noise(d,100+v,(18,160,55,198),c(MAIN,3),18)

def armor(d,v):
 if v==0:return
 pts=[(35,146),(51,132),(67,140),(72,162),(58,172),(39,172),(23,165)]
 outlined(d,pts,c(LEATHER if v in (1,4) else METAL,2))
 pts2=[(133,146),(117,132),(101,140),(97,162),(111,172),(130,172),(145,165)]
 outlined(d,pts2,c(LEATHER if v in (1,4) else METAL,3))
 poly(d,[(27,150),(48,136),(53,140),(32,158)],c(METAL,5))
 poly(d,[(117,138),(136,151),(139,158),(114,141)],c(METAL,5))
 for x in [30,45,123,139]:rect(d,(x,164,x+3,166),c(METAL,6))
 if v>=2:
  outlined(d,[(64,151),(84,172),(105,151),(116,175),(105,199),(83,207),(65,197),(56,177)],c(LEATHER if v==4 else METAL,2))
  poly(d,[(65,157),(82,174),(82,194),(62,175)],c(METAL,5))
  ln(d,[(103,157),(93,172),(88,198)],c(METAL,5),2)
  if v==3:
   for i in range(3):ln(d,[(73+i*6,178),(79+i*6,189)],c(METAL,6),2)
  if v==5:
   for y in [175,181,187,194]:ln(d,[(70,y),(100,y)],c(METAL,4),1)

def face(d,v):
 widths=[0,-3,4,5,-2,-1];w=widths[v];left=52-w;right=114+w
 pts=[(65,38),(82,33),(101,38),(right-8,47),(right,63),(right-1,92),(right-10,114),(97,129),(85,137),(75,136),(65,127),(left+5,113),(left,90),(left,62),(left+6,49)]
 if v==1:pts[9]=(right-14,112);pts[10]=(97,125)
 if v==2:pts[8]=(106,124);pts[9]=(right-8,119)
 outlined(d,pts,c(SKIN,3),INK,2)
 # pixel-perfect hand painted lighting and contour
 poly(d,[(left+3,63),(left+9,51),(69,43),(65,58),(61,88),(left+6,97)],c(SKIN,2))
 poly(d,[(right-6,52),(right-2,67),(right-3,98),(right-10,113),(99,128),(91,132),(99,117),(106,94)],c(SKIN,1))
 poly(d,[(67,43),(80,39),(95,43),(103,51),(94,48),(79,45),(73,52)],c(SKIN,5))
 for x in (left+9,right-19):
  ellipse(d,(x,92,x+14,99),c(BLUSH,3))
  rect(d,(x+3,94,x+10,96),c(BLUSH,4))
 # cheek freckles and pixel clusters
 for x,y in [(65,94),(68,96),(71,93),(98,94),(101,96),(104,93)]:rect(d,(x,y,x+1,y+1),c(SKIN,1))
 ln(d,[(65,111),(71,119),(79,124)],c(SKIN,5),1)
 rect(d,(83,127,92,128),c(SKIN,5))

def ears(d,v):
 if v==0:return
 for side in (-1,1):
  x=49 if side==-1 else 117
  w=9 if v==1 else (11 if v==2 else 14)
  tip=56 if v<2 else (43 if v==2 else 36)
  pts=[(x,69),(x+side*w,tip),(x+side*(w+3),84),(x,96)]
  outlined(d,pts,c(SKIN,2),INK,2)
  ln(d,[(x+side*3,71),(x+side*(w-2),78),(x+side*3,90)],c(SKIN,5),2)

def eyes(d,v):
 for n,x in enumerate([65,94]):
  wide=16+(2 if v in (1,7) else 0)
  high=10+(2 if v in (0,4,7) else -2 if v in (2,5) else 0)
  y=78+(1 if v==3 else 0)
  # pixel stepped eyeliner and lashes
  poly(d,[(x-wide//2,y-3),(x-5,y-high//2),(x+3,y-high//2-1),(x+wide//2,y-2),(x+wide//2,y+4),(x+3,y+high//2+2),(x-4,y+high//2+1),(x-wide//2,y+3)],INK)
  poly(d,[(x-wide//2+2,y-1),(x-4,y-high//2+1),(x+4,y-high//2+1),(x+wide//2-2,y-1),(x+wide//2-2,y+3),(x+3,y+high//2),(x-3,y+high//2)],WHITE)
  ellipse(d,(x-4,y-4,x+3,y+6),c(EYE,1))
  rect(d,(x-2,y-3,x+2,y+4),c(EYE,3));rect(d,(x,y-1,x+1,y+4),INK)
  rect(d,(x-3,y-3,x-1,y-1),LIGHT);rect(d,(x+2,y+2,x+2,y+3),c(EYE,6))
  ln(d,[(x-8,y-4),(x-4,y-6),(x+4,y-6),(x+8,y-4)],INK,2)
  rect(d,(x-10,y-6,x-8,y-4),INK)
  if v in (3,6):ln(d,[(x-7,y+9),(x+5,y+9)],c(SKIN,1),1)
  if v==5:ln(d,[(x-6,y+7),(x+5,y+6)],c(SKIN,1),2)

def brows(d,v):
 for x in (65,95):
  level=[62,64,61,62,65,61,62,63][v]
  thick=[2,2,2,4,1,3,2,2][v]
  shape=[(x-10,level+3),(x-5,level),(x+2,level-1),(x+9,level+2)]
  if v==2:shape=[(x-10,level+4),(x-1,level-2),(x+9,level+4)]
  if v==5:shape=[(x-10,level),(x-1,level+4),(x+9,level)]
  ln(d,shape,c(HAIR,1),thick)
  rect(d,(x-8,level-1,x-3,level),c(HAIR,5))

def nose(d,v):
 x=84;y=102
 if v==0:ln(d,[(x-2,y-7),(x-3,y),(x+2,y+3)],c(SKIN,1),1)
 elif v==1:ln(d,[(x-1,y-3),(x-3,y+2),(x+3,y+2)],c(SKIN,1),1)
 elif v==2:ln(d,[(x-2,y-6),(x+1,y+2),(x+5,y+2)],c(SKIN,1),2)
 elif v==3:ln(d,[(x-5,y+2),(x+6,y+2)],c(SKIN,1),2)
 elif v==4:ln(d,[(x-2,y-7),(x+1,y-1),(x-1,y+4),(x+7,y+4)],c(SKIN,1),1)
 else:ln(d,[(x-3,y-8),(x-3,y+1),(x+2,y+4)],c(SKIN,1),2)
 rect(d,(x+2,y+1,x+4,y+2),c(SKIN,5))

def mouth(d,v):
 x=84;y=116
 if v in (0,2,4):ln(d,[(x-7,y),(x+6,y)],c(BLUSH,1),1)
 if v==1:ln(d,[(x-9,y-1),(x-4,y+2),(x+4,y+2),(x+9,y-1)],c(BLUSH,1),2)
 if v==3:
  outlined(d,[(x-8,y-2),(x+8,y-2),(x+5,y+5),(x-5,y+5)],c(BLUSH,1),INK,1)
  rect(d,(x-5,y-1,x+5,y+1),WHITE)
 if v==5:
  ln(d,[(x-4,y),(x+4,y)],c(BLUSH,1),2)
 if v==6:ln(d,[(x-8,y-2),(x,y+2),(x+8,y-2)],c(BLUSH,1),1)
 if v==7:ln(d,[(x-8,y+1),(x-3,y-2),(x+4,y-1),(x+8,y+1)],c(BLUSH,1),2)
 rect(d,(x-3,y+4,x+3,y+4),c(SKIN,5))

def beard(d,v):
 if v==0:return
 if v==4:
  ln(d,[(75,112),(92,112)],c(HAIR,1),3);return
 if v in (1,2,3,5):
  color=c(HAIR,1)
  if v==1:
   for x in range(72,100,4):rect(d,(x,128,x+1,129),color)
  else:
   outline=[(57,109),(62,119),(69,130),(78,139),(90,139),(101,132),(111,112),(105,123),(94,137),(89,148),(78,148),(69,139),(62,131)]
   outlined(d,outline,c(HAIR,2),INK,1)
   poly(d,[(71,130),(83,137),(97,132),(89,145),(79,145)],c(HAIR,4))
   for x in (62,65,99,103):ln(d,[(x,112),(x+3,128)],c(HAIR,5),1)
 if v==6:
  for x in (57,60,108,111):ln(d,[(x,100),(x,130)],c(HAIR,1),2)

def hairBack(d,v):
 if v==7:return
 # hair silhouettes grow down back, with curled/tied variants
 y=[130,192,184,198,138,170,194,110,197,174,162,188][v]
 if v in (0,4):pts=[(54,75),(56,47),(69,34),(88,31),(108,43),(115,71),(115,127),(53,126)]
 elif v in (3,8,11):pts=[(51,78),(55,46),(71,28),(95,30),(118,45),(122,83),(137,y),(116,y-6),(104,y),(56,y),(34,y-6)]
 else:pts=[(54,78),(56,43),(72,30),(100,31),(117,52),(116,102),(126,y),(109,y),(56,y),(41,y),(51,115)]
 outlined(d,pts,c(HAIR,1),INK,2)
 poly(d,[(58,50),(68,36),(86,32),(106,43),(99,51),(75,47),(63,78)],c(HAIR,4))
 poly(d,[(108,51),(116,73),(116,y-8),(108,y-14)],c(HAIR,0))
 for i in range(6):
  x=49+i*13
  ln(d,[(x,79),(x-5,y-12),(x-3,y-1)],c(HAIR,3 if i%2 else 5),2)
 if v in (3,8,11):
  for side in [-1,1]:
   x=47 if side<0 else 119
   for j in range(5):
    yy=93+j*16
    poly(d,[(x-5,yy),(x+5,yy+4),(x-5,yy+8),(x+5,yy+12)],c(HAIR,3 if j%2 else 5))
 if v==6:
  # Large sculpted twin ponytails inspired by classic pixel RPG portraits.
  for side in (-1,1):
   x=37 if side<0 else 128
   outlined(d,[(x-9,59),(x+7,55),(x+15,72),(x+13,97),(x+5,115),(x-13,113),(x-18,91),(x-16,73)],c(HAIR,1),INK,2)
   poly(d,[(x-11,65),(x+1,59),(x+9,68),(x+5,80),(x-8,84)],c(HAIR,4))
   poly(d,[(x+5,87),(x+10,100),(x+2,110),(x-7,110)],c(HAIR,0))
   ln(d,[(x-8,70),(x-12,91),(x-3,108)],c(HAIR,5),2)
   rect(d,(x-5,60,x+1,63),c(METAL,5))
 if v in (4,5,9):
  ellipse(d,(95,34,124,64),c(HAIR,2))
  ellipse(d,(101,38,117,54),c(HAIR,5))

def hairFront(d,v):
 if v==9:
  pts=[(53,75),(53,55),(64,39),(76,35),(100,38),(115,57),(113,70),(103,53),(87,46),(69,52)]
 else:
  major=[70,84,66,77,101,60,82,72,89,60,99,77][v]
  pts=[(50,74),(52,52),(64,39),(79,33),(101,38),(115,51),(119,76),(111,major),(106,61),(96,major+1),(88,59),(75,major-6),(67,60),(53,major+12)]
 outlined(d,pts,c(HAIR,2),INK,2)
 poly(d,[(57,55),(67,42),(83,37),(98,42),(104,49),(86,44),(74,46),(62,66)],c(HAIR,4))
 poly(d,[(104,43),(113,52),(113,68),(106,60),(97,50)],c(HAIR,0))
 for i in range(6):
  x=62+i*9
  yy=55+((i*11+v*3)%17)
  ln(d,[(x,46),(x-3,54),(x-6,yy)],c(HAIR,5 if i%2==0 else 0),2)
 if v in (3,6,8,10):
  for side in [-1,1]:
   x=48 if side<0 else 117
   outlined(d,[(x,69),(x+side*4,82),(x+side*3,113),(x-side*3,119),(x-side*5,100)],c(HAIR,2),INK,1)
   ln(d,[(x,80),(x+side*2,100)],c(HAIR,5),2)
 if v in (1,5,11):
  ln(d,[(76,46),(70,58),(68,83)],c(HAIR,0),2)
  ln(d,[(93,43),(88,67),(91,83)],c(HAIR,5),2)

def accessory(d,v):
 if v==0:return
 if v in (1,8):
  for x in (49,118):
   ellipse(d,(x-1,94,x+3,99),c(METAL,4))
   if v==8:ln(d,[(x+1,98),(x+1,111)],c(METAL,4),1)
 if v==2:
  for x in (66,94):
   outlined(d,[(x-11,74),(x+9,74),(x+9,87),(x-11,87)],None,c(METAL,5),2)
  ln(d,[(76,78),(84,77)],c(METAL,5),2)
 if v==3:ln(d,[(105,92),(99,105),(111,111)],c(BLUSH,1),2)
 if v==4:
  ln(d,[(61,41),(83,37),(106,42)],c(METAL,5),3)
  rect(d,(82,36,87,41),c(METAL,6))
 if v==5:
  ln(d,[(73,140),(85,147),(99,140)],c(METAL,5),2)
  outlined(d,[(81,148),(87,148),(88,155),(83,158),(79,154)],c(METAL,5),INK,1)
 if v==6:
  outlined(d,[(59,75),(78,73),(81,91),(58,93)],c(LEATHER,0),INK,2)
  ln(d,[(52,77),(93,72)],c(LEATHER,2),2)
 if v==7:
  for x,y in [(67,101),(101,95),(78,117)]:rect(d,(x,y,x+3,y+2),c(METAL,5))
 if v==9:
  outlined(d,[(62,107),(106,107),(104,124),(65,124)],c(LEATHER,2),INK,2)
  for x in range(70,102,7):rect(d,(x,111,x+3,115),c(METAL,4))
 if v==10:
  outlined(d,[(75,135),(92,135),(98,146),(84,154),(70,146)],c(METAL,3))
 if v==11:
  for x,y in [(62,43),(106,43),(116,54)]:ellipse(d,(x-3,y-3,x+3,y+3),c(METAL,5))

def sprite(key,v):
 im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
 globals()[key](d,v)
 return im

def make(out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True)
 entries=[];total=sum(COUNTS.values());cols=10;rows=(total+cols-1)//cols
 atlas=Image.new('RGBA',(cols*W,rows*H),(0,0,0,0))
 idx=0
 for key in KEYS:
  for v in range(COUNTS[key]):
   im=sprite(key,v);x=idx%cols*W;y=idx//cols*H
   atlas.paste(im,(x,y),im)
   entries.append({'key':key,'index':v,'x':x,'y':y})
   idx+=1
 atlas.save(out/'pixel82_atlas.png',optimize=True)
 (out/'pixel82_manifest.json').write_text(json.dumps({'width':W,'height':H,'cols':cols,'count':total,'sprites':entries},separators=(',',':')))
 # Preview with palette color rendering equivalent to Android JS.
 colorBases={SKIN:'#d7a48b',HAIR:'#7f4bc6',MAIN:'#624ea3',ALT:'#b9a5d3',METAL:'#e9c591',EYE:'#7856c3',LEATHER:'#64465f',BLUSH:'#c47178'}
 from PIL import ImageColor
 def rendered(i):
  p=Image.new('RGBA',(W,H));base=Image.new('RGBA',(W,H),(0,0,0,0))
  order=[('hairBack',i%12),('cloak',i%6),('body',i%4),('neck',0),('outfit',i%16),('armor',i%6),('ears',i%4),('face',i%6),('eyes',i%8),('brows',i%8),('nose',i%6),('mouth',i%8),('beard',0),('hairFront',i%12),('accessory',i%12)]
  for key,index in order:
   a=sprite(key,index);data=a.load();
   for y in range(H):
    for x in range(W):
     r,g,b,alpha=data[x,y]
     if not alpha or b!=64 or r<32 or (r-32)%24:continue
     group=(r-32)//24;shade=(g-32)//28
     if group not in colorBases or not 0<=shade<=6:continue
     baseR=ImageColor.getrgb(colorBases[group]);dark=(29,21,36);light=(255,240,216)
     f=[-.72,-.48,-.27,0,.22,.42,.65][shade]
     target=dark if f<0 else light
     t=abs(f)
     data[x,y]=(round(baseR[0]*(1-t)+target[0]*t),round(baseR[1]*(1-t)+target[1]*t),round(baseR[2]*(1-t)+target[2]*t),alpha)
   base.alpha_composite(a)
  return base
 for i in (0,3,6):
  pic=rendered(i);bg=Image.new('RGBA',(W,H),(79,62,94,255));bg.alpha_composite(pic)
  bg.resize((W*3,H*3),Image.Resampling.NEAREST).save(out/f'preview_{i}.png')
 print('sprites',total,'atlas_size',atlas.size,'byte_size',(out/'pixel82_atlas.png').stat().st_size)
if __name__=='__main__':
 import sys
 make(sys.argv[1] if len(sys.argv)>1 else 'build')