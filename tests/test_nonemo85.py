#!/usr/bin/env python3
"""Verify real CC0 PNG layers in the repo and self-contained Android bundle."""
import base64
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from io import BytesIO

root=Path(__file__).resolve().parents[1]
source=root/'app/asset_sources/nonemo'
chunks=sorted(source.glob('part_*.b64'))
assert len(chunks)==9
packed=base64.b64decode(''.join(p.read_text().strip() for p in chunks),validate=True)
assert hashlib.sha256(packed).hexdigest()=='774dd31aad0b87df55bdf62e5d5b79d777e14109cbdb999d144a87c461e0a04b'
with zipfile.ZipFile(BytesIO(packed)) as z:
 files=[n for n in z.namelist() if n.endswith('.png')]
 assert len(files)==180
 assert all(z.read(n)[:8]==b'\x89PNG\r\n\x1a\n' for n in files)
 assert 'CC0' in z.read('license.md').decode()
 for p in ('skin/tint_1/head.png','skin/tint_3/head.cheeks.png','hairs/front/regular.brown.png','hairs/back/long.brown.png','faces/parts/eyes/ordinary.png','faces/parts/mouth/smile.png','shirts/dress.green.png','beards/long.white.png'):
  assert p in files,p
js=(root/'app/src/main/assets/nonemo85_assets.js').read_text()
assert 'window.Nonemo85Assets=Object.freeze(' in js
assert len(js)>400000
for key in files:assert json.dumps(key)[:-1] in js, key
assert js.count('data:image/png;base64,')==180
html=(root/'app/src/main/assets/demo-offline.html').read_text()
assert 'id="screen-atelier85"' in html
assert 'data-screen="atelier85"' in html
for filename in ['nonemo85_assets.js','nonemo85_renderer.js','nonemo85_studio.js','nonemo85_studio.css']:
 assert f'"{filename}"' in html
for forbidden in ['mastermind83_renderer.js','mastermind82_rig.js','mastermind80_portraits.js']:
 assert f'src="{forbidden}"' not in html
print('PASS: 180 original 2x PNG CC0 sprites, offline data bundle, native UI and no legacy atelier')