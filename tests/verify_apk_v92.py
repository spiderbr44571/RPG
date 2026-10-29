#!/usr/bin/env python3
"""Validate v0.92 APK includes isolated inline editor and preserves old RPG data infrastructure."""
import sys,pathlib,hashlib,zipfile
p=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(p) as apk:
 names=apk.namelist()
 for name in ('demo-offline.html','pixelportrait86_companion.js','pixelportrait86_companion.css','mastermind39_ui.js'):
  assert apk.read('assets/'+name)==(pathlib.Path('app/src/main/assets')/name).read_bytes(),name
 html=apk.read('assets/demo-offline.html')
 assert b'>v0.90<' in html # The inline Atelier HTML markup is unchanged
 assert b'id="p90-native-stage"' in html
 assert b'id="p90-token-panel"' in html
 assert b'id="screen-atelier85"' in html
 assert b'data-p86-action="save"' in html and b'data-p86-action="exportToken"' in html
 assert b'data-p86-action="online"' not in html,'No extra tap to open Godot allowed'
 dex=b''.join(apk.read(x) for x in names if x.endswith('.dex'))
 assert b'InlinePixelPortraitStage' in dex,'Inline stage not included in executable'
 assert b'PixelPortraitActivity' in dex,'Preserve fullscreen fallback'
 assert b'html.itch.zone/html/18379448/index.html' in dex,'Original Godot entry missing'
 assert b'p90-native-stage' in dex,'MainActivity is not reading the DOM stage'
 for name in names:
  if name.startswith('assets/'):
   assert not any(s in name.lower() for s in ('pixelportraitcreator.exe','pixelportraitcreator.pck','nonemo85','index.wasm','index.pck')),name
 assert b'const edges=[[a,b],[c,b],[b,d]]' not in html, 'Automatically generated canvas edges still present' 
 assert b"legacy.replaceChildren()" in html, 'Legacy edge layer not cleared'
 assert b"mastermind42_workspace.js" in html,'Manual connection engine missing'
 assert b"setOverlayVisible?.(true)" in html,'Mastermind menu does not hide native Godot'
 assert b"setOverlayVisible?.(false)" in html,'Mastermind menu does not restore native Godot'
 assert b'setOverlayVisible' in dex,'Native Java overlay bridge missing'
 print('PASS v0.92 APK: auto inline Godot, scrolling clips, capture/token, no redistributed binaries')
 print('SHA256',hashlib.sha256(p.read_bytes()).hexdigest())
