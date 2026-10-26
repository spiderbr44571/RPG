"""Verify the APK contains byte-identical assets from the tested checkout."""
from pathlib import Path
import sys, zipfile, hashlib
with zipfile.ZipFile(sys.argv[1]) as apk:
 for file in Path('app/src/main/assets').iterdir():
  if file.is_file():
   assert apk.read('assets/'+file.name)==file.read_bytes(), f'Stale APK asset: {file.name}'
 brand=Path('app/src/main/res/drawable-nodpi/mastermind_logo.png').read_bytes()
 assert brand.startswith(bytes.fromhex('89504e470d0a1a0a'))
 assert apk.read('assets/mastermind_logo.png')==brand
 native=[name for name in apk.namelist() if name.startswith('res/') and name.endswith('/mastermind_logo.png')]
 assert native, 'Android launcher icon resource was not packaged'
 assert any(apk.read(name).startswith(bytes.fromhex('89504e470d0a1a0a')) for name in native)
 assert b'mastermind60_identity.css' in apk.read('assets/demo-offline.html')
 assert b'>v0.77<' in apk.read('assets/demo-offline.html')
 for asset in ('mastermind77_assets.js','mastermind77_atelier.js','mastermind77_atelier.css'):
  assert 'assets/'+asset in apk.namelist(), f'Missing modular character resource: {asset}'
  assert len(apk.read('assets/'+asset))>2000, f'Empty modular resource: {asset}'
 assert b'mastermind77_atelier.js' in apk.read('assets/demo-offline.html')
 assert b'mastermind77_assets.js' in apk.read('assets/demo-offline.html')
 assert b'data-m77-tab="hairBack"' in apk.read('assets/demo-offline.html')
 print('PASS: all bundled assets match checkout; modular vector layers, v0.77 marker and native logo present')
 print('SHA-256:',hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest())
