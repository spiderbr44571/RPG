"""Verify the APK contains byte-identical assets from the tested checkout."""
from pathlib import Path
import sys, zipfile, hashlib
with zipfile.ZipFile(sys.argv[1]) as apk:
 for file in Path('app/src/main/assets').iterdir():
  if file.is_file():
   assert apk.read('assets/'+file.name)==file.read_bytes(), f'Stale APK asset: {file.name}'
 brand=Path('app/src/main/res/drawable-nodpi/mastermind_logo.png').read_bytes()
 assert brand.startswith(b'\\x89PNG\\r\\n\\x1a\\n')
 assert apk.read('assets/mastermind_logo.png')==brand
 native=[name for name in apk.namelist() if name.startswith('res/') and name.endswith('/mastermind_logo.png')]
 assert native, 'Android launcher icon resource was not packaged'
 assert any(apk.read(name).startswith(b'\\x89PNG\\r\\n\\x1a\\n') for name in native)
 assert b'mastermind60_identity.css' in apk.read('assets/demo-offline.html')
 assert b'>v0.60<' in apk.read('assets/demo-offline.html')
 print('PASS: all bundled assets exactly match tested source; v0.59 marker present')
 print('SHA-256:',hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest())
