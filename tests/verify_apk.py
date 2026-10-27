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
 assert b'>v0.80<' in apk.read('assets/demo-offline.html')
 for asset in ('mastermind78_assets.js','mastermind79_art.js','mastermind80_portraits.js','mastermind78_atelier.js','mastermind78_atelier.css'):
  assert 'assets/'+asset in apk.namelist(), f'Missing modular character resource: {asset}'
  assert len(apk.read('assets/'+asset))>(500 if asset.endswith('.css') else 1200 if asset=='mastermind80_portraits.js' else 2000), f'Empty modular resource: {asset}'
 assert b'mastermind78_atelier.js' in apk.read('assets/demo-offline.html')
 assert b'mastermind78_assets.js' in apk.read('assets/demo-offline.html')
 assert b'mastermind79_art.js' in apk.read('assets/demo-offline.html')
 assert b'mastermind80_portraits.js' in apk.read('assets/demo-offline.html')
 assert b'data-m77-tab="illustrated"' in apk.read('assets/demo-offline.html')
 picture=apk.read('assets/atelier/v080_premium.webp')
 assert len(picture)>150000 and picture[:4]==b'RIFF' and picture[8:12]==b'WEBP', 'Missing real illustrated portrait atlas'
 assert hashlib.sha256(picture).hexdigest()=='47521f87f41aac1ee59d2b17d9359436989377a66396d28c66b184ce208976fe', 'Wrong portrait atlas version'
 assert b'data-m77-tab="hairBack"' in apk.read('assets/demo-offline.html')
 print('PASS: all bundled assets match checkout; enhanced modular art, v0.80 marker and native logo present')
 print('SHA-256:',hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest())
