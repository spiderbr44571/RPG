#!/usr/bin/env python3
"""Original high-resolution, *layered* pixel portraits for Mastermind v0.83.
Sprites are designed on one 192x224 rig. No silhouettes or images from v0.82 are loaded.
RGBA tiles include indexed shading for recoloring; dark ink and specular whites stay constant.
"""
from PIL import Image,ImageDraw,ImageColor
from pathlib import Path
import json, math, random
W,H=192,224
GROUPS={'skin':0,'hair':1,'eye':2,'main':3,'secondary':4,'metal':5,'leather':6,'blush':7}
SHADES=[-.70,-.48,-.24,0,.21,.40,.60]
INK='#251e36'; DARK='#43304b'; PALE='#ffebd5'; WHITE='#fef6ef'
COUNT={'backCloak':6,'backHair':8,'body':3,'neck':1,'outfit':10,'armor':6,'ears':4,'face':4,'eyes':8,'brows':7,'nose':6,'mouth':8,'beard':6,'frontHair':10,'headwear':6,'accessory':8,'frontCloak':6}
ORDER=list(COUNT)
LABEL={
 'body':['Delicado','Atlético','Robusto'],
 'face':['Oval','Angular','Redondo','Alongado'],
 'ears':['Humanas','Pequenas','Élficas','Longas'],
 'eyes':['Expressivos','Serenos','Felinos','Intensos','Sonolentos','Brilhantes','Arredondados','Místicos'],
 'brows':['Naturais','Arqueadas','Retas','Grossas','Franzidas','Suaves','Assimétricas'],
 'nose':['Curto','Fino','Arrebitado','Reto','Marcado','Largo'],
 'mouth':['Sorriso suave','Neutra','Alegre','Séria','Confiante','Sorriso aberto','Concentrada','Surpresa'],
 'backHair':['Curto','Liso longo','Ondulado','Tranças','Coque','Rabo de cavalo','Cachos','Maria-chiquinhas'],
 'frontHair':['Franja lateral','Franja reta','Dividido','Ondulado','Cachos','Topete','Mechas longas','Franja irregular','Tranças','Curtinho'],
 'beard':['Sem barba','Por fazer','Barba curta','Bigode','Cavanhaque','Barba longa'],
 'outfit':['Aventureiro','Ocultista','Nobre','Caçador','Mago','Acadêmico','Guerreiro','Explorador','Samurai','Alquimista'],
 'armor':['Sem armadura','Ombreiras leves','Armadura de couro','Peitoral metálico','Armadura rúnica','Cota de malha'],
 'backCloak':['Sem capa','Capa curta','Manto longo','Capuz','Capa dividida','Pele de inverno'],
 'frontCloak':['Sem detalhe','Fecho de capa','Gola de manto','Capuz frontal','Faixas de capa','Gola de pele'],
 'headwear':['Nada','Tiara','Faixa de tecido','Chapéu arcano','Capuz levantado','Coroa'],
 'accessory':['Nenhum','Brincos','Óculos','Cicatriz','Colar','Pintura ritual','Presilhas','Tapa-olho']}
COORD={'headCenter':[96,98],'hairRoot':[96,36],'eyes':[[75,91],[116,91]],'nose':[96,119],'mouth':[96,138],'ears':[[52,96],[140,96]],'neck':[96,159],'shoulderLeft':[25,180],'shoulderRight':[167,180]}

def encoded(group,shade=3):return (32+GROUPS[group]*24,32+int(shade)*28,64,255)
def rgba(c):
 if isinstance(c,str):return ImageColor.getrgb(c)+(255,)
 if isinstance(c,tuple) and len(c)==4:return c
 return encoded(*c)
class Sprite:
 def __init__(self):self.im=Image.new('RGBA',(W,H));self.d=ImageDraw.Draw(self.im)
 def poly(self,points,c,outline=INK,width=2):
  p=[tuple(map(int,x)) for x in points];self.d.polygon(p,fill=rgba(c) if c is not None else None);
  if outline:self.d.line(p+[p[0]],fill=rgba(outline),width=width,joint='curve')
 def ell(self,bb,c,outline=None,width=1):self.d.ellipse(bb,fill=rgba(c),outline=rgba(outline) if outline else None,width=width)
 def line(self,p,c,width=1):self.d.line(p,fill=rgba(c),width=width,joint='curve')
 def rect(self,bb,c):self.d.rectangle(bb,fill=rgba(c))
 def diamond(self,x,y,dx,dy,c,outline=INK):self.poly([(x,y-dy),(x+dx,y),(x,y+dy),(x-dx,y)],c,outline,1)
 def flecks(self,coords,group,shade=5):
  for x,y in coords:self.rect((x,y,x+1,y+1),(group,shade))

def backCloak(s,v):
 if v==0:return
 shapes=[None,[(55,159),(25,165),(6,209),(2,223),(190,223),(179,189),(161,162),(134,152)],
 [(58,154),(24,157),(0,196),(0,223),(192,223),(190,192),(165,160),(135,153)],
 [(52,140),(27,155),(9,195),(0,223),(192,223),(181,193),(160,153),(141,139)],
 [(52,157),(16,173),(0,214),(0,223),(87,223),(88,190),(101,190),(107,223),(192,223),(177,165),(139,152)],
 [(51,151),(31,157),(5,180),(0,222),(190,222),(183,188),(164,153),(136,151)]][v]
 s.poly(shapes,('secondary',1),width=3)
 s.poly([(29,176),(45,160),(58,158),(70,174),(42,223),(12,223)],('secondary',3),None)
 s.poly([(140,160),(165,168),(177,186),(184,223),(153,223)],('secondary',0),None)
 for x in [21,168]:s.line([(x,178),(x-7 if x<100 else x+7,220)],('secondary',5),2)
 if v==5:
  for x in (20,37,161,177):s.ell((x-7,167,x+8,190),('secondary',4),INK,1)

def backHair(s,v):
 if v==0:return
 ends=[140,140,201,199,146,182,205,195]
 bottom=ends[v]
 if v==4:
  s.ell((107,17,163,73),('hair',1),INK,3)
  s.ell((116,25,156,60),('hair',4),INK,2)
 if v==5:
  s.poly([(132,69),(160,82),(170,126),(160,174),(146,193),(130,183),(134,134)],('hair',1),width=3)
 s.poly([(59,70),(60,43),(75,30),(96,25),(122,34),(134,53),(138,83),(147,bottom-11),(136,bottom),(109,bottom-3),(91,bottom-6),(54,bottom),(41,bottom-11),(51,127)],('hair',1),width=3)
 s.poly([(59,73),(70,38),(84,32),(101,32),(114,42),(122,77),(112,116),(72,124),(56,113)],('hair',3),None)
 s.poly([(125,52),(138,77),(144,bottom-7),(135,bottom),(128,181),(120,112)],('hair',0),None)
 # broad clusters with deliberate highlights, not random noise
 for n in range(6):
  x=58+n*12
  s.line([(x,70),(x-7 if n%2 else x+4,108),(x-4, min(bottom-9,154)),(x+3,bottom-4)],('hair',4 if n%2 else 2),2)
  if bottom>165:s.line([(x+3,130),(x+5,bottom-8)],('hair',5),1)
 if v in (3,7):
  for x in (45,140):
   s.poly([(x-9,82),(x+9,86),(x+12,111),(x+5,bottom),(x-13,bottom-6)],('hair',1),width=2)
   for y in range(97,bottom-9,16):
    s.line([(x-9,y),(x+9,y+12)],('hair',5),2);s.line([(x+10,y),(x-9,y+12)],('hair',2),2)
 if v==6:
  for x in (39,148):
   for y in (74,92,112,133,151,175):
    s.ell((x-16,y-12,x+16,y+17),('hair',2),INK,2)
    s.ell((x-13,y-8,x+1,y+6),('hair',4),None)
 if v==7:
  for x in (27,158):
   s.ell((x-22,60,x+22,105),('hair',1),INK,3)
   s.ell((x-17,64,x+4,83),('hair',4),None)

def body(s,v):
 wide=[0,5,10][v]
 s.poly([(61,151),(73,158),(117,158),(136,151),(158+wide,157),(176,174),(191,204),(192,224),(0,224),(0,203),(17,176),(35-wide,158)],('skin',2),width=3)
 s.poly([(19,185),(33,169),(45,169),(50,194),(42,224),(0,224)],('skin',4),None)
 s.poly([(145,167),(163,177),(180,209),(180,224),(165,224),(148,191)],('skin',1),None)

def neck(s,v):
 s.poly([(79,143),(112,143),(113,169),(121,177),(99,193),(74,179),(79,166)],('skin',2),width=2)
 s.poly([(81,145),(86,151),(84,166),(93,174),(83,174),(77,165)],('skin',4),None)
 s.poly([(105,147),(113,149),(114,174),(104,182),(99,180)],('skin',1),None)
 s.line([(86,164),(97,170),(105,165)],('skin',0),2)

def outfit(s,v):
 shape=[(53,164),(70,163),(93,180),(99,184),(121,164),(137,163),(159,168),(177,185),(192,211),(192,224),(0,224),(0,205),(17,182),(34,169)]
 s.poly(shape,('main',1),width=3)
 s.poly([(24,177),(39,166),(58,166),(76,185),(59,223),(4,224),(12,199)],('main',3),None)
 s.poly([(124,166),(152,170),(174,190),(188,218),(157,224),(121,189)],('main',0),None)
 # shoulder stitch highlights and distinct design families
 family=v%5
 if family==0: # adventurer leather coat
  s.poly([(53,166),(76,174),(96,189),(83,224),(47,224),(37,184)],('secondary',2),width=2)
  s.poly([(125,166),(103,187),(114,224),(151,224),(158,183)],('secondary',1),width=2)
  s.poly([(78,172),(96,190),(113,172),(106,198),(96,209),(86,200)],('leather',4),width=2)
  for y in (202,213):s.rect((95,y,100,y+4),('metal',5))
 elif family==1: # mystic robe, borders
  s.poly([(65,165),(92,188),(117,164),(143,178),(131,224),(57,224),(46,179)],('secondary',2),width=2)
  s.poly([(71,173),(94,197),(118,173),(112,187),(97,217),(83,186)],('main',0),width=2)
  for y in (184,193,202,211):
   s.line([(54,y),(66,y+5)],('metal',4),1);s.line([(137,y),(125,y+5)],('metal',4),1)
 elif family==2: # nobility jacket
  s.poly([(64,165),(96,188),(79,224),(43,224),(47,180)],('secondary',3),width=2)
  s.poly([(128,165),(97,188),(114,224),(148,224),(148,181)],('secondary',2),width=2)
  s.poly([(85,182),(97,198),(109,181),(107,224),(87,224)],('leather',1),width=2)
  for y in (197,208,219):s.diamond(97,y,3,3,('metal',5))
 elif family==3: # hunter equipment
  s.poly([(33,177),(60,168),(76,186),(55,214),(14,207)],('leather',2),width=2)
  s.poly([(134,167),(163,179),(176,208),(146,212),(118,188)],('leather',1),width=2)
  s.line([(124,171),(82,222)],('leather',5),7)
  s.line([(120,171),(78,221)],('metal',4),1)
  for x,y in [(119,174),(102,194),(87,213)]:s.rect((x-2,y-2,x+2,y+2),('metal',5))
 else: # ornate mantle
  s.poly([(59,166),(97,184),(134,165),(149,180),(128,224),(65,224),(41,181)],('secondary',3),width=2)
  s.poly([(76,174),(96,193),(116,174),(110,199),(96,213),(83,197)],('main',1),width=2)
  for x in (49,143):
   for y in (184,194,205,215):s.rect((x,y,x+4,y+2),('metal',4))
 if v>=5: # more structural variety, not recolors
  s.poly([(18,182),(37,166),(58,173),(60,194),(45,214),(8,208)],('leather',2),width=2)
  s.poly([(138,172),(159,167),(176,187),(181,212),(149,214),(131,195)],('leather',3),width=2)
  s.line([(20,190),(47,174),(54,182)],('metal',5),2)
 # clean textile seams and tailored details
 s.line([(30,189),(23,221)],('main',5),2)
 s.line([(163,190),(171,223)],('main',4),2)
 for n in range(7):
  y=180+n*6
  s.line([(58,y),(66,y+3)],('main',4),1)
  s.line([(126,y+1),(136,y+3)],('main',0),1)

def armor(s,v):
 if v==0:return
 material='metal' if v in (3,4,5) else 'leather'
 for flip in (-1,1):
  x=47 if flip<0 else 145
  z=lambda dx:x+flip*dx
  s.poly([(z(-19),178),(z(-10),165),(z(6),165),(z(20),185),(z(13),201),(z(-12),198)],(material,2),width=2)
  s.poly([(z(-12),177),(z(-4),169),(z(10),180),(z(10),190),(z(-9),184)],(material,4),None)
  s.line([(z(-15),190),(z(12),195)],('metal',4),2)
  s.diamond(z(5),192,3,3,('metal',5))
 if v>=2:
  s.poly([(78,181),(95,191),(114,181),(126,202),(114,224),(77,224),(66,203)],(material,2),width=2)
  s.poly([(77,188),(97,202),(117,187),(112,199),(98,211),(81,198)],('metal',4),None)
  s.line([(84,214),(107,215)],('metal',5),2)
 if v==4:
  for x,y in [(96,201),(78,204),(114,204)]:s.diamond(x,y,3,5,('metal',6))
 if v==5:
  for yy in (197,202,207,212):
   for xx in (80,87,94,101,108):s.line([(xx,yy),(xx+3,yy+4)],('metal',4),1)

def ears(s,v):
 # Human ears are visible: all four options use the same face anchor.
 height=[0,0,11,20][v];spread=[-3,-6,8,13][v]
 for sign in [-1,1]:
  x=54 if sign<0 else 138
  s.poly([(x,86),(x+sign*(12+spread),82-height),(x+sign*(17+spread),94),(x+sign*11,109),(x,105)],('skin',2),width=2)
  s.poly([(x+sign*4,89),(x+sign*(11+spread),92),(x+sign*9,105),(x+sign*4,100)],('blush',2),None)
  s.line([(x+sign*5,96),(x+sign*12,98)],('skin',5),1)

def face(s,v):
 widths=[0,-5,5,0];width=widths[v]
 left=57-width;right=135+width;chin=150+(3 if v==3 else -2 if v==2 else 0)
 points=[(left+14,44),(77,37),(96,34),(114,38),(right-9,50),(right,71),(right+1,105),(right-5,129),(111,chin-2),(97,chin+3),(79,chin),(left+11,129),(left,102),(left,70)]
 s.poly(points,('skin',3),width=3)
 s.poly([(left+5,65),(left+15,46),(80,41),(72,68),(65,99),(left+10,116)],('skin',4),None)
 s.poly([(right-8,50),(right,78),(right-3,118),(right-12,139),(113,chin-1),(123,110),(124,80)],('skin',1),None)
 s.poly([(79,41),(96,36),(113,41),(119,50),(103,44),(87,44)],('skin',5),None)
 s.poly([(left+14,118),(left+29,140),(79,chin-5),(95,chin),(112,chin-5),(121,131),(right-4,112),(116,143),(99,chin+2),(80,chin+1)],('skin',2),None)
 # cheek clusters, freckles, not unstructured pixel noise
 for x in (69,117):
  s.ell((x-8,118,x+6,124),('blush',4),None)
  s.poly([(x-6,118),(x+4,118),(x+6,121),(x-7,121)],('skin',4),None)
  for dx,dy in ((-7,1),(-1,4),(5,2)):
   s.rect((x+dx,119+dy,x+dx+1,120+dy),('skin',1))
 s.poly([(91,132),(96,134),(101,132),(103,137),(96,139),(92,137)],('skin',4),None)
 s.line([(83,146),(94,150),(109,146)],('skin',1),2)

def eyes(s,v):
 # irises include large colored regions, 2 reflections and lid/eyelash accents
 wide=[23,21,24,22,20,24,25,22][v];height=[17,14,16,18,11,17,20,19][v]
 for n,cx in enumerate((75,117)):
  top=84+(2 if v==4 else 0);left=cx-wide//2;right=cx+wide//2
  squint=v==4
  s.poly([(left,top+5),(left+4,top+1),(cx-4,top-2),(cx+5,top-1),(right,top+5),(right-2,top+height-2),(cx+2,top+height+2),(left+4,top+height-1)],WHITE,width=2)
  s.poly([(left-1,top+4),(left+3,top),(cx-4,top-3),(cx+5,top-3),(right+2,top+4),(right,top+6),(cx+6,top+1),(cx-5,top+1),(left,top+8)],INK,None)
  irisY=top+4
  if squint:s.ell((cx-6,irisY,cx+7,irisY+height-4),('eye',2),INK,1)
  else:s.ell((cx-7,irisY-3,cx+7,irisY+height),('eye',1),INK,2)
  s.ell((cx-5,irisY+2,cx+6,irisY+height-1),('eye',4),None)
  s.ell((cx-2,irisY+1,cx+3,irisY+height-3),INK,None)
  s.rect((cx-5,irisY,cx-2,irisY+3),WHITE)
  s.rect((cx+3,irisY+height-4,cx+4,irisY+height-3),WHITE)
  s.line([(left+1,top+height-1),(cx,top+height+2),(right-1,top+height-2)],('skin',1),1)
  s.line([(left-3,top+4),(left-5,top-2)],INK,2)
  s.line([(left+1,top+1),(left-1,top-4)],INK,2)
  if v in (2,3,7):s.line([(right,top+5),(right+5,top+1)],INK,2)
  if v==5:
   for dx in (-11,-8,8,11):s.rect((cx+dx,top+height+2,cx+dx+1,top+height+3),('eye',6))

def brows(s,v):
 bends=[-1,-3,1,-2,3,0,-1][v]
 for n,cx in enumerate((75,117)):
  yy=75+bends
  p=[(cx-12,yy+3),(cx-7,yy),(cx+4,yy-2 if v in (1,3) else yy),(cx+11,yy+3)]
  if v==4:p=[(cx-12,yy),(cx-3,yy+5),(cx+10,yy)]
  if v==6 and n==1:p=[(cx-12,yy+4),(cx-5,yy-4),(cx+11,yy+2)]
  s.line(p,('hair',1),4 if v==3 else 2)
  s.line([(cx-10,yy+1),(cx-4,yy-1)],('hair',5),1)

def nose(s,v):
 # faceted nasal bridge, subtler highlight and asymmetric nostril clusters
 x,y=96,117
 width=[4,3,4,5,6,7][v]
 s.line([(x-2,y-9),(x-4,y-1),(x-1,y+5),(x+width,y+5)],('skin',1),2)
 s.rect((x-3,y+5,x-1,y+6),('blush',1))
 s.rect((x+width-1,y+5,x+width+1,y+6),('blush',1))
 s.poly([(x+2,y-3),(x+width,y+2),(x+2,y+4),(x-1,y+2)],('skin',5),None)
 if v==2:s.line([(x-5,y+3),(x-2,y+6),(x+6,y+5)],('blush',2),1)
 if v==4:s.line([(x-2,y-10),(x+1,y-4),(x+5,y+2)],('skin',1),2)

def mouth(s,v):
 x,y=96,138
 styles={0:[(x-9,y),(x-3,y+3),(x+4,y+3),(x+10,y-1)],1:[(x-8,y+1),(x+9,y)],2:[(x-10,y-1),(x-4,y+5),(x+4,y+5),(x+10,y-1)],3:[(x-8,y+3),(x,y),(x+8,y+3)],4:[(x-7,y+1),(x-1,y+3),(x+8,y)],5:[(x-10,y),(x-8,y+6),(x+8,y+6),(x+10,y)],6:[(x-7,y-1),(x,y+1),(x+8,y+1)],7:[(x-6,y),(x-6,y+7),(x+6,y+8),(x+7,y)]}
 if v==5:
  s.poly([(x-9,y),(x+9,y),(x+7,y+7),(x-7,y+7)],('blush',1),INK,2)
  s.rect((x-6,y,x+6,y+2),WHITE)
 elif v==7:
  s.ell((x-5,y,x+7,y+9),('blush',0),INK,2)
 else:s.line(styles[v],('blush',0),2)
 s.line([(x-6,y+8),(x+6,y+7)],('skin',5),1)
 if v in (0,2):s.rect((x-3,y+4,x+3,y+4),('blush',5))

def beard(s,v):
 if v==0:return
 if v==1:
  for x,y in [(73,133),(76,138),(83,144),(100,147),(110,142),(117,134)]:s.rect((x,y,x+2,y+2),('hair',1))
 elif v==3:
  s.poly([(84,130),(95,133),(105,130),(112,135),(106,140),(96,137),(84,140),(79,136)],('hair',1),None)
 else:
  s.poly([(62,118),(69,132),(81,150),(95,155),(111,148),(124,132),(129,118),(124,140),(114,159),(96,168 if v==5 else 160),(75,158),(64,141)],('hair',1),width=2)
  s.poly([(71,138),(84,155),(94,159),(107,153),(118,138),(105,147),(93,152),(82,148)],('hair',4),None)
  for n in range(8):
   x=71+n*7;s.line([(x,140),(x-3,151+(n%3)*3)],('hair',5),1)
  if v==4:s.poly([(87,133),(107,132),(104,152),(94,159),(88,149)],('hair',2),width=2)

def frontHair(s,v):
 # silhouettes with deliberate large locks of hair, shaped for all shared face anchors
 profiles=[
 [(53,83),(56,54),(68,39),(86,32),(108,33),(128,44),(139,69),(136,98),(125,75),(119,60),(110,73),(100,90),(91,75),(78,92),(66,86)],
 [(52,82),(57,54),(72,37),(96,29),(118,36),(135,54),(137,87),(127,69),(116,76),(106,68),(94,82),(83,70),(67,81)],
 [(55,88),(58,55),(77,34),(95,28),(119,37),(134,56),(138,86),(125,71),(112,67),(98,64),(93,51),(86,70),(68,77)],
 [(49,87),(57,52),(78,29),(108,29),(133,48),(142,75),(137,93),(125,78),(120,66),(109,79),(95,92),(79,73),(67,97)],
 [(47,87),(54,53),(73,32),(101,30),(129,45),(141,76),(136,97),(121,78),(109,94),(98,73),(89,100),(76,78),(62,99)],
 [(56,83),(61,61),(66,37),(87,21),(103,34),(115,29),(131,52),(136,80),(123,68),(113,59),(97,56),(86,75),(70,65)],
 [(51,95),(55,50),(78,30),(103,29),(130,48),(141,85),(136,112),(125,98),(116,74),(105,86),(94,68),(77,91),(60,113)],
 [(51,86),(58,47),(75,30),(106,28),(130,51),(141,82),(126,88),(120,64),(107,82),(96,63),(83,93),(72,71),(61,97)],
 [(53,89),(59,45),(77,30),(112,29),(133,52),(140,84),(130,97),(116,78),(100,94),(91,76),(78,94),(68,71),(60,103)],
 [(53,75),(61,47),(79,35),(108,35),(129,51),(135,73),(124,63),(103,58),(91,61),(72,58)]
 ]
 s.poly(profiles[v],('hair',1),width=3)
 s.poly([(61,57),(76,39),(95,34),(113,40),(127,57),(114,48),(92,43),(76,51),(67,76)],('hair',4),None)
 s.poly([(119,45),(131,59),(136,80),(129,81),(125,63)],('hair',0),None)
 # coherent clustered strands with clearly shaped strands and highlights
 for n in range(6):
  x=68+n*10
  s.line([(x,42),(x-6,59),(x-9,68+(n%3)*7)],('hair',5 if n%2 else 2),2)
 if v in (3,4,6,8):
  for sign in (-1,1):
   x=51 if sign<0 else 136
   s.poly([(x,76),(x+sign*6,91),(x+sign*3,126),(x-sign*7,135),(x-sign*5,105)],('hair',2),width=2)
   s.line([(x,90),(x+sign*3,115)],('hair',5),2)
 if v==8:
  for x in (59,132):
   for y in (81,91,102):s.line([(x-7,y),(x+7,y+8)],('hair',4),2)

def headwear(s,v):
 if v==0:return
 if v==1:
  s.poly([(69,42),(82,37),(96,33),(111,39),(124,47),(119,51),(98,42),(77,49)],('metal',3),INK,2)
  s.diamond(96,36,5,6,('eye',5))
 elif v==2:
  s.poly([(54,60),(69,48),(101,45),(129,57),(133,65),(109,55),(74,57),(57,70)],('secondary',3),width=2)
 elif v==3:
  s.poly([(63,59),(73,18),(105,3),(125,54),(141,64),(128,70),(67,71),(47,67)],('secondary',1),width=3)
  s.poly([(80,24),(103,12),(109,44),(88,46)],('secondary',4),None)
  s.line([(67,58),(135,59)],('metal',5),3)
 elif v==4:
  s.poly([(48,93),(51,59),(64,35),(96,18),(128,35),(142,61),(141,100),(131,82),(123,62),(96,43),(72,62),(60,95)],('secondary',1),width=3)
  s.poly([(63,58),(87,34),(112,45),(122,66),(96,52)],('secondary',4),None)
 elif v==5:
  s.poly([(68,53),(69,36),(80,41),(85,29),(96,38),(108,29),(112,40),(123,35),(126,53)],('metal',3),width=2)
  for x,y in ((78,42),(96,37),(115,42)):s.diamond(x,y,4,5,('eye',5))

def accessory(s,v):
 if v==0:return
 if v==1:
  for x in (56,137):
   s.ell((x-2,106,x+2,110),('metal',5),INK,1)
   s.ell((x-3,110,x+4,119),('metal',4),INK,1)
 if v==2:
  for cx in (75,116):
   s.poly([(cx-16,83),(cx+15,83),(cx+14,103),(cx-14,103)],None,'#ead8bd',2)
  s.line([(90,87),(101,88)],('metal',4),2)
 if v==3:
  s.line([(119,109),(109,123),(122,130)],('blush',1),2)
 if v==4:
  s.line([(82,163),(96,175),(114,164)],('metal',5),2)
  s.diamond(96,181,5,7,('eye',5))
 if v==5:
  for cx,cy in ((75,118),(118,118),(95,135)):
   s.diamond(cx,cy,4,5,('blush',1),None)
 if v==6:
  for x in (62,126):s.diamond(x,62,6,5,('metal',5))
 if v==7:
  s.poly([(62,86),(90,85),(89,103),(63,105)],('leather',1),width=2)
  s.line([(59,84),(124,68)],('leather',5),3)

def frontCloak(s,v):
 if v==0:return
 if v==1:
  s.poly([(68,165),(79,173),(96,183),(113,171),(124,166),(113,188),(96,201),(79,190)],('secondary',3),width=2)
  s.diamond(96,190,6,8,('metal',5))
 elif v==2:
  s.poly([(54,166),(80,175),(96,193),(114,175),(138,167),(123,203),(96,219),(69,202)],('secondary',2),width=2)
  s.line([(66,186),(95,208),(127,187)],('metal',4),2)
 elif v==3:
  s.poly([(51,159),(60,127),(69,111),(77,120),(69,151),(79,163)],('secondary',2),width=2)
  s.poly([(142,159),(133,127),(124,111),(116,120),(123,151),(113,163)],('secondary',2),width=2)
 elif v==4:
  s.line([(64,170),(87,200),(71,223)],('secondary',4),7)
  s.line([(127,169),(105,201),(122,223)],('secondary',4),7)
 else:
  for x,y in ((65,170),(75,180),(86,185),(113,185),(125,176)):
   s.ell((x-9,y-9,x+10,y+9),('secondary',4),INK,1)

def build(out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True)
 offset={};entries=[];idx=0
 total=sum(COUNT.values());cols=8;rows=math.ceil(total/cols)
 atlas=Image.new('RGBA',(cols*W,rows*H),(0,0,0,0))
 for key,count in COUNT.items():
  offset[key]=idx
  fn=globals()[key]
  for i in range(count):
   s=Sprite();fn(s,i)
   x=(idx%cols)*W;y=(idx//cols)*H
   atlas.paste(s.im,(x,y))
   entries.append(dict(key=key,variant=i,x=x,y=y))
   idx+=1
 atlas.save(out/'atlas.png',optimize=True,compress_level=9)
 manifest=dict(version=83,width=W,height=H,columns=cols,rows=rows,total=total,count=COUNT,offset=offset,order=ORDER,labels=LABEL,anchors=COORD,sprites=entries)
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
 print('Built',total,'original sprites /',atlas.size,'/',(out/'atlas.png').stat().st_size,'bytes')
 # verified specimen composes the same indexed pixels into a bust portrait
 def tone(base,shade):
  base=ImageColor.getrgb(base);target=(35,26,52) if shade<0 else (255,244,218);t=abs(shade)
  return tuple(round(base[i]*(1-t)+target[i]*t) for i in range(3))
 def colorize(sprite,palette):
  im=sprite.copy();raw=im.load()
  for y in range(H):
   for x in range(W):
    r,g,b,a=raw[x,y]
    if a==0 or b!=64:continue
    gr=(r-32)/24;sh=(g-32)/28
    if not float(gr).is_integer() or not float(sh).is_integer():continue
    gr=int(gr);sh=int(sh)
    if gr<0 or gr>=8 or sh<0 or sh>=7:continue
    base=palette[gr];rgb=tone(base,SHADES[sh]);raw[x,y]=(*rgb,a)
  return im
 palettes=[
  ['#ce9c85','#7c469d','#7153bf','#6a396c','#59304f','#e0b982','#60413c','#c86d75'],
  ['#bd9075','#277481','#389495','#304d62','#47666b','#e7c98d','#654636','#cb737d'],
  ['#edcdb7','#bd596b','#d5b352','#4e5f73','#807394','#c8b2d1','#5a3c36','#d3828f']]
 for no,pal in enumerate(palettes):
  bg=Image.new('RGBA',(W,H),('#332940','#203843','#453047')[no]);dr=ImageDraw.Draw(bg)
  dr.ellipse((16,16,176,191),outline=('#765477','#597f87','#815872')[no],width=2)
  pieces={'backCloak':(no+1)%6,'backHair':(7 if no==0 else 2 if no==1 else 5),'body':no,'neck':0,'outfit':(1 if no==0 else 3 if no==1 else 2),'armor':(0 if no==0 else 2),'ears':(0 if no==0 else 2),'face':no,'eyes':(0 if no==0 else 3),'brows':no,'nose':no,'mouth':no,'beard':0,'frontHair':(4 if no==0 else 3 if no==1 else 2),'headwear':(0 if no<2 else 1),'accessory':(1 if no==0 else 4 if no==1 else 0),'frontCloak':(1 if no==0 else 0)}
  for key in ORDER:
   s=Sprite();globals()[key](s,pieces[key]);bg.alpha_composite(colorize(s.im,pal))
  bg.resize((W*3,H*3),Image.Resampling.NEAREST).save(out/f'preview_{no}.png')

if __name__=='__main__':
 import sys
 build(sys.argv[1] if len(sys.argv)>1 else 'build')