#!/usr/bin/env python3
"""Check Android v0.98 built content, engine and resource isolation before publishing."""
from pathlib import Path
import sys,zipfile,hashlib
apk=Path(sys.argv[1])
assert apk.is_file() and apk.stat().st_size > 1024*1024, "APK not built or too small"
assets=Path('app/src/main/assets')
files=('demo-offline.html','mastermind_coc7_engine.js','mastermind_coc7_ui.js','mastermind_coc7.css','mastermind_coc7_android.css','mastermind56_local_powers.js','mastermind55_powers.json','mastermind_system_editor.js','mastermind_ordem_template.js','mastermind_system_pdf.js','pdf-lib.min.js','mastermind_sheet_studio.js','mastermind_sheet_studio.css','mastermind51_private_books.js','rpg15_catalog.js','rpg11_campaigns.js','pixelportrait86_companion.js','rpg31_master_table.js','rpg29_scene_editor.js')
with zipfile.ZipFile(apk) as z:
    names=set(z.namelist())
    assert 'AndroidManifest.xml' in names
    for name in files:
        assert ('assets/'+name) in names, 'Missing: '+name
        assert z.read('assets/'+name)==(assets/name).read_bytes(), 'Unexpected content: '+name
    assert len(z.read('assets/pdf-lib.min.js'))>100_000, 'PDF engine absent'
    html=z.read('assets/demo-offline.html')
    assert b'id="mm-release"' in html
    assert b'r09-chocolate-menu' in html and html.count(b'class="r09-chocolate-tile"') == 9
    assert b"versionBadge.textContent='v0.98'" in z.read('assets/mastermind39_ui.js')
    assert b'mastermind_sheet_studio.js' in html and b'mastermind_sheet_studio.css' in html
    assert b'mastermind_coc7_engine.js' in html and b'mastermind_coc7_ui.js' in html
    assert b'mastermind51_private_books.js' in html
    dex=b''.join(z.read(n) for n in names if n.endswith('.dex'))
    for needle in (b'saveInvestigatorJson',b'listPersonalBooks',b'searchPersonalBook',b'InlinePixelPortraitStage',b'PdfTextSearch'):
        assert needle in dex, 'Missing native bridge/code: '+needle.decode()
    for n in names:
        assert not any(token in n.lower() for token in ('pixelportraitcreator.exe','pixelportraitcreator.pck','index.wasm','index.pck')), n
print('PASS Mastermind Android v0.98: CoC7, private PDF search/index, Godot/editor and existing campaign assets preserved')
print('SIZE MB:',round(apk.stat().st_size/1048576,2))
print('SHA256:',hashlib.sha256(apk.read_bytes()).hexdigest())
