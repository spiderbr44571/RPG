#!/usr/bin/env python3
"""Native APK content and Android WebView resource regression verification."""
import hashlib,re,sys,zipfile
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p) as apk:
 names=apk.namelist()
 for name in ('nonemo85_assets.js','nonemo85_renderer.js','nonemo85_studio.js','nonemo85_studio.css','demo-offline.html'):
  path=Path('app/src/main/assets')/name
  blob=apk.read('assets/'+name)
  assert blob==path.read_bytes(),f'Stale or missing Android WebView asset: {name}'
 html=apk.read('assets/demo-offline.html')
 assert b'id="screen-atelier85"' in html and b'data-screen="atelier85"' in html
 assert b'>v0.85<' in html
 assert b'nonemo85_assets.js' in html
 atlas=apk.read('assets/nonemo85_assets.js')
 assert len(atlas)>400000 and atlas.count(b'data:image/png;base64,')==180,'180 lossless PNGs must be embedded in APK'
 assert b'window.Nonemo85Assets=Object.freeze(' in atlas
 assert all(b not in html for b in (b'mastermind83_renderer.js',b'mastermind82_rig.js',b'mastermind80_portraits.js'))
 java=Path('app/src/main/java/dev/rpgmesa/demo/MainActivity.java').read_text()
 assert 'savePng(String filename,String base64)' in java and 'ACTION_CREATE_DOCUMENT' in java
 print('PASS v0.85 APK: original 180 RGBA PNGs, new customizer, PNG SAF export and verified assets')
 print('SHA256',hashlib.sha256(p.read_bytes()).hexdigest())