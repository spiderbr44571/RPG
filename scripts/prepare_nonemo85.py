#!/usr/bin/env python3
"""Build self-contained, unmodified Nonemo CC0 PNG@2x assets for Android WebView.
Input = original artist files, losslessly transferred as a small base64 archive.
"""
import base64
import hashlib
import io
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'app' / 'asset_sources' / 'nonemo'
PARTS = sorted(SOURCE.glob('part_*.b64'))
assert len(PARTS) == 9, f'Expected 9 source parts, got {len(PARTS)}'
ARCHIVE = base64.b64decode(''.join(p.read_text().strip() for p in PARTS), validate=True)
EXPECTED_SHA = '774dd31aad0b87df55bdf62e5d5b79d777e14109cbdb999d144a87c461e0a04b'
assert hashlib.sha256(ARCHIVE).hexdigest() == EXPECTED_SHA, 'Source asset bundle digest mismatch'

with zipfile.ZipFile(io.BytesIO(ARCHIVE)) as pack:
    images = sorted(p for p in pack.namelist() if p.endswith('.png'))
    assert len(images) == 180, f'Asset count differs: {len(images)}'
    license_text = pack.read('license.md').decode('utf8')
    assert 'CC0' in license_text, 'Missing artist license'
    assert len(set(images)) == len(images)
    sprites = {}
    for key in images:
        raw = pack.read(key)
        assert raw[:8] == b'\x89PNG\r\n\x1a\n', f'Invalid PNG: {key}'
        assert re.fullmatch(r'[a-zA-Z0-9_./-]+', key), 'Invalid asset key'
        sprites[key] = 'data:image/png;base64,' + base64.b64encode(raw).decode('ascii')

target = ROOT / 'app' / 'src' / 'main' / 'assets' / 'nonemo85_assets.js'
target.parent.mkdir(parents=True, exist_ok=True)
payload = {
    'version': 85,
    'artist': 'nemo / nonemo',
    'license': 'CC0-1.0',
    'count': len(sprites),
    'sourceSha256': EXPECTED_SHA,
    'sprites': sprites,
}
target.write_text('/* Original CC0 art by nonemo: nonemo.itch.io — PNG@2x, 180 untouched files. */\n'
                  'window.Nonemo85Assets=Object.freeze(' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ');\n', encoding='utf8')
license_target = ROOT / 'app' / 'src' / 'main' / 'assets' / 'nonemo85_license.txt'
license_target.write_text(license_text, encoding='utf8')
print(f'PASS: {len(sprites)} original CC0 assets packed into offline WebView script ({target.stat().st_size:,} bytes)')