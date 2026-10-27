"""Regression tests for the *new* 0.83 rig. No legacy sprites are allowed."""
from pathlib import Path
from PIL import Image
import json,hashlib,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import generate_pixel83 as a
root=Path('app/src/main/assets/pixel83')
assert root.exists(),'New pixel art asset package is missing'
manifest=json.loads((root/'manifest.json').read_text())
img=Image.open(root/'atlas.png').convert('RGBA')
assert (a.W,a.H)==(192,224)
assert manifest['version']==83
assert manifest['total']==sum(a.COUNT.values())==107
assert img.size==(8*a.W,((107+7)//8)*a.H)
assert set(manifest['count'])==set(manifest['order'])==set(a.COUNT)
assert manifest['anchors']['eyes']==[[75,91],[116,91]]
for key,n in a.COUNT.items():
 seen=set()
 for i in range(n):
  obj=a.Sprite();getattr(a,key)(obj,i);pic=obj.im
  assert pic.getchannel('A').getextrema() in [(0,255),(0,0)]
  assert not (set(pic.getchannel('A').getdata())-{0,255}),f'Antialiasing detected in {key}/{i}'
  signature=hashlib.sha256(pic.tobytes()).hexdigest()
  assert signature not in seen,f'Duplicate sprite {key}/{i}'
  seen.add(signature)
  num=manifest['offset'][key]+i;x=(num%8)*a.W;y=(num//8)*a.H
  assert img.crop((x,y,x+a.W,y+a.H)).tobytes()==pic.tobytes(),f'Atlas misaligned {key}/{i}'
  for px in pic.getdata():
   r,g,b,alpha=px
   if alpha==0:continue
   if b==64 and r>=32 and (r-32)%24==0:
    grp=(r-32)//24;shade=(g-32)/28
    assert grp in range(8) and shade in range(7) and float(shade).is_integer(),f'Bad palette index {key}/{i}'
assert (root/'preview_0.png').stat().st_size>10000
print('PASS: all 107 original, pixel-perfect, nonduplicated, aligned indexed sprites tested')