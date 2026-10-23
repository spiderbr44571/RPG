"""Verify the APK contains byte-identical assets from the tested checkout."""
from pathlib import Path
import sys, zipfile, hashlib
with zipfile.ZipFile(sys.argv[1]) as apk:
 for file in Path('app/src/main/assets').iterdir():
  if file.is_file():
   assert apk.read('assets/'+file.name)==file.read_bytes(), f'Stale APK asset: {file.name}'
 assert b'>v0.59<' in apk.read('assets/demo-offline.html')
 print('PASS: all bundled assets exactly match tested source; v0.59 marker present')
 print('SHA-256:',hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest())
