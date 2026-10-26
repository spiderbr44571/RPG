#!/usr/bin/env python3
"""Compile the original image atlas from split, text-only GitHub sources."""
from pathlib import Path
import base64, hashlib
src=Path('app/asset_sources')
parts=[src/f'v080_illustrated_{i:02d}.b64' for i in range(6)]
assert all(p.is_file() for p in parts), 'Missing v0.80 illustrated-portrait source'
encoded=''.join(''.join(p.read_text().split()) for p in parts)
image=base64.b64decode(encoded,validate=True)
digest=hashlib.sha256(image).hexdigest()
assert digest=='47521f87f41aac1ee59d2b17d9359436989377a66396d28c66b184ce208976fe',(len(image),digest)
assert image[:4]==b'RIFF' and image[8:12]==b'WEBP'
out=Path('app/src/main/assets/atelier/v080_premium.webp')
out.parent.mkdir(exist_ok=True,parents=True)
out.write_bytes(image)
print(f'ASSETS PASS: {out} {len(image)} bytes SHA256={digest}')
