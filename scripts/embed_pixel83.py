#!/usr/bin/env python3
import base64,json,sys,hashlib
from pathlib import Path
folder=Path(sys.argv[1]);target=Path(sys.argv[2]);png=(folder/'atlas.png').read_bytes();man=json.loads((folder/'manifest.json').read_text())
assert man['total']==107
assert png[:8]==bytes.fromhex('89504e470d0a1a0a')
payload={'uri':'data:image/png;base64,'+base64.b64encode(png).decode(),'manifest':{k:man[k] for k in ['version','width','height','columns','rows','total','count','offset','labels','order','anchors']},'sha256':hashlib.sha256(png).hexdigest()}
target.write_text('/* ORIGINAL MASTER MIND 0.83 PIXEL ART — self-contained local image. */\nwindow.MM83_ASSETS='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
print('Atlas embedded:',len(png),'bytes original /',target.stat().st_size,'bytes JS')