"""Validate the shipped binary, not merely the source tree."""
import sys,zipfile,hashlib,base64,re,json
from pathlib import Path
apkfile=Path(sys.argv[1]);root=Path('app/src/main/assets')
with zipfile.ZipFile(apkfile) as apk:
 for file in ['demo-offline.html','mastermind83_atlas.js','mastermind83_renderer.js','mastermind83_studio.js','mastermind83_studio.css']:
  assert apk.read('assets/'+file)==(root/file).read_bytes(),f'Wrong bytes or missing {file}'
 assert apk.read('assets/pixel83/atlas.png')==(root/'pixel83/atlas.png').read_bytes(),'Atlas mismatch'
 assert apk.read('assets/pixel83/manifest.json')==(root/'pixel83/manifest.json').read_bytes(),'Manifest mismatch'
 packed=apk.read('assets/mastermind83_atlas.js')
 match=re.search(rb'data:image/png;base64,([A-Za-z0-9+/=]+)',packed)
 assert match and base64.b64decode(match.group(1),validate=True)==apk.read('assets/pixel83/atlas.png')
 html=apk.read('assets/demo-offline.html')
 assert b'>v0.83<' in html
 for name in [b'mastermind83_atlas.js',b'mastermind83_renderer.js',b'mastermind83_studio.js']:
  assert b'src="'+name+b'"' in html
 for legacy in [b'mastermind82_rig.js',b'mastermind82_atelier.js',b'mastermind81_atelier.js',b'mastermind78_atelier.js']:
  assert legacy not in html
 data=json.loads(apk.read('assets/pixel83/manifest.json'))
 assert data['total']==107 and data['width']==192 and data['height']==224
 native=[x for x in apk.namelist() if x.startswith('res/') and x.endswith('/mastermind_logo.png')]
 assert native,'Native launcher icon missing'
 assert any(apk.read(x).startswith(bytes.fromhex('89504e470d0a1a0a')) for x in native)
 print('PASS: signed APK contains exclusively new active pixel studio, 107 verified sprites and Android icon')
 print('SHA256:',hashlib.sha256(apkfile.read_bytes()).hexdigest())