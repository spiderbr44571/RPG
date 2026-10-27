#!/usr/bin/env python3
"""Asset-level tests: immutable alignment, transparency, color masks, distinct sprites."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from generate_pixel82 import W,H,KEYS,COUNTS,sprite
root=Path('app/src/main/assets/atelier')
im=Image.open(root/'pixel82_atlas.png').convert('RGBA')
manifest=json.loads((root/'pixel82_manifest.json').read_text())
assert manifest['width']==168 and manifest['height']==208
assert manifest['count']==116 == sum(COUNTS.values())
assert im.size == (1680,2496)
assert len(manifest['sprites'])==116
for k in KEYS:
 seen=set()
 for i in range(COUNTS[k]):
  s=sprite(k,i)
  alpha=s.getchannel('A')
  assert set(alpha.getdata()).issubset({0,255}),(k,i,'Semi-transparent aliasing')
  h=hashlib.sha256(s.tobytes()).hexdigest()
  assert h not in seen,(k,i,'Duplicate variant')
  seen.add(h)
  m=next(t for t in manifest['sprites'] if t['key']==k and t['index']==i)
  assert im.crop((m['x'],m['y'],m['x']+W,m['y']+H)).tobytes()==s.tobytes(),(k,i,'Atlas tiles not exact')
  for r,g,b,a in s.getdata():
   if not a:continue
   if b==64 and r>=32 and (r-32)%24==0:
    assert 0<=(r-32)//24<8 and 0<=(g-32)//28<7 and (g-32)%28==0,(k,i,'Semantic color invalid')
print('PASS: 116 unique 168x208 pixel-art sprites, exact atlas registration, crisp RGBA and recolorable color masks')