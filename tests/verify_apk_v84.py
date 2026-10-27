#!/usr/bin/env python3
"""Verify the Android app no longer ships the old creator or generated sprites."""
import hashlib, pathlib, sys, zipfile
apkfile=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(apkfile) as z:
 names=z.namelist()
 ui=z.read('assets/demo-offline.html')
 assert ui==pathlib.Path('app/src/main/assets/demo-offline.html').read_bytes()
 for token in (b'id="screen-atelier"',b'data-screen="atelier"',b'mastermind83_studio.js',b'mastermind83_renderer.js',b'rpg05-open-atelier'):
  assert token not in ui,token
 for name in names:
  if name.startswith('assets/'):
   assert not (name.startswith('assets/pixel83/') or name.startswith('assets/atelier/') or name.startswith('assets/mastermind83_')),name
 assert b'id="screen-sheet"' in ui
 assert b'id="screen-settings"' in ui
 assert b'photo' in ui and b'tokenImage' in ui
 print('PASS v0.84 APK: atelier scripts and sprite atlas absent; character features preserved')
 print('SHA256:',hashlib.sha256(apkfile.read_bytes()).hexdigest())
