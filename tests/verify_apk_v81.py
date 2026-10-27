"""Ensure APK contains exactly the tested rebuilt atelier and valid native icon."""
from pathlib import Path
import hashlib,sys,zipfile
apkfile=Path(sys.argv[1])
with zipfile.ZipFile(apkfile) as apk:
 for filename in ('mastermind81_rig.js','mastermind81_atelier.js','mastermind81_atelier.css','demo-offline.html'):
  local=Path('app/src/main/assets')/filename
  data=apk.read('assets/'+filename)
  assert data==local.read_bytes(),f'Mismatched APK asset: {filename}'
  assert len(data)>1200,f'Incomplete asset: {filename}'
 shell=apk.read('assets/demo-offline.html')
 assert b'>v0.81<' in shell
 assert b'mastermind81_rig.js' in shell and b'mastermind81_atelier.js' in shell
 assert b'mastermind78_atelier.js' not in shell and b'mastermind80_portraits.js' not in shell
 assert b'data-m81-tab="ears"' in shell
 native=[x for x in apk.namelist() if x.startswith('res/') and x.endswith('/mastermind_logo.png')]
 assert native,'Launcher logo resource missing'
 assert any(apk.read(x).startswith(bytes.fromhex('89504e470d0a1a0a')) for x in native)
 print('PASS APK v0.81 new rig, editor, HTML, native icon')
 print('SHA-256:',hashlib.sha256(apkfile.read_bytes()).hexdigest())
