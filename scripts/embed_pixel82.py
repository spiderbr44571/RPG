#!/usr/bin/env python3
"""Pack a pixel atlas into local JS as a safe offline data URI for Android WebView.
Used in CI immediately after the PNG generation; no remote resources or CORS.
"""
from pathlib import Path
import base64, hashlib, sys
source=Path(sys.argv[1]); dest=Path(sys.argv[2])
data=source.read_bytes()
assert data[:8]==bytes.fromhex('89504e470d0a1a0a'), 'Invalid PNG'
assert len(data)>55000, 'Incomplete pixel atlas'
encoded=base64.b64encode(data).decode('ascii')
dest.parent.mkdir(exist_ok=True,parents=True)
dest.write_text('(function(root){"use strict";root.Mastermind82AtlasEmbedded="data:image/png;base64,'+encoded+'";})(typeof window!=="undefined"?window:globalThis);\n')
print(f'Embedded pixel atlas: {len(data):,} bytes, SHA256={hashlib.sha256(data).hexdigest()}')