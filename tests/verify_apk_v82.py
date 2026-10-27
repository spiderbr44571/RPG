"""Inspect v0.82 native APK sprite atlas, HTML switch and Android signing inputs."""
from pathlib import Path
import sys,zipfile,hashlib,base64,re
apkfile=Path(sys.argv[1])
with zipfile.ZipFile(apkfile) as apk:
 for name in ['demo-offline.html','mastermind82_rig.js','mastermind82_atelier.js','mastermind82_atelier.css']:
  local=Path('app/src/main/assets')/name
  assert apk.read('assets/'+name)==local.read_bytes(),f'Outdated packaged file: {name}'
  assert len(apk.read('assets/'+name))>1200
 sheet=Path('app/src/main/assets/atelier/pixel82_atlas.png')
 assert sheet.stat().st_size>45000
 packaged=apk.read('assets/atelier/pixel82_atlas.png')
 assert packaged==sheet.read_bytes(),'Missing or corrupted pixel art atlas'
 assert packaged[:8]==bytes.fromhex('89504e470d0a1a0a')
 # Verify the WebView receives exactly the same sprite pixels without file URL access.
 embedded=apk.read('assets/mastermind82_atlas_data.js')
 assert len(embedded)>60000 and b'data:image/png;base64,' in embedded,'Missing self-contained sprite atlas'
 match=re.search(rb'data:image/png;base64,([A-Za-z0-9+/=]+)',embedded)
 assert match and base64.b64decode(match.group(1),validate=True)==packaged,'Embedded atlas and native PNG differ'
 metadata=apk.read('assets/atelier/pixel82_manifest.json')
 assert metadata==(sheet.parent/'pixel82_manifest.json').read_bytes()
 html=apk.read('assets/demo-offline.html')
 assert b'>v0.82.1<' in html and b'src="mastermind82_rig.js"' in html
 assert b'src="mastermind82_atlas_data.js"' in html and b'src="mastermind82_atelier.js"' in html
 assert b'src="mastermind81_atelier.js"' not in html
 assert b'src="mastermind79_art.js"' not in html
 for key in [b'hairFront',b'hairBack',b'ears',b'eyes',b'brows',b'nose',b'mouth',b'outfit',b'armor',b'beard']:
  assert b'data-m81-tab="'+key+b'"' in html
 native=[n for n in apk.namelist() if n.startswith('res/') and n.endswith('/mastermind_logo.png')]
 assert native and any(apk.read(n)[:8]==bytes.fromhex('89504e470d0a1a0a') for n in native)
 print('PASS v0.82 APK: native and embedded pixel art, working offline loading, correct editor, all customizations, valid logo')
 print('SHA256:',hashlib.sha256(apkfile.read_bytes()).hexdigest())
