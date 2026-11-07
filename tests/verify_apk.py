#!/usr/bin/env python3
"""Confere o APK do Android antes de publicar: assets idênticos ao código, versão do build.gradle, pontes nativas e Ateliê."""
import re
from pathlib import Path
import sys,zipfile,hashlib
apk=Path(sys.argv[1])
gradle=Path('app/build.gradle').read_text(encoding='utf8')
maj,mn=re.search(r"versionName '(\d+)\.(\d+)\.\d+-",gradle).groups()
versao=f'v{maj}.{mn}'
assert apk.is_file() and apk.stat().st_size > 1024*1024, "APK not built or too small"
assets=Path('app/src/main/assets')
files=('demo-offline.html','mastermind_coc7_engine.js','mastermind_coc7_ui.js','mastermind_coc7.css','mastermind_coc7_android.css','mastermind56_local_powers.js','mastermind55_powers.json','mastermind_system_editor.js','mastermind_ordem_template.js','mastermind_system_pdf.js','pdf-lib.min.js','mastermind_sheet_studio.js','mastermind_sheet_studio.css','mastermind51_private_books.js','rpg15_catalog.js','rpg11_campaigns.js','mastermind99_atelier.js','mastermind99_atelier_layers.js','mastermind99_atelier.css','rpg31_master_table.js','rpg29_scene_editor.js')
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
    assert f"android:'{versao}'".encode() in z.read('assets/mastermind39_ui.js'), 'versão do app difere do build.gradle'
    assert b'mastermind_sheet_studio.js' in html and b'mastermind_sheet_studio.css' in html
    assert b'mastermind_coc7_engine.js' in html and b'mastermind_coc7_ui.js' in html
    assert b'mastermind51_private_books.js' in html
    assert b'id="ma99-atelier"' in html and b'mastermind99_atelier.js' in html and b'mastermind99_atelier_layers.js' in html
    assert b'p90-native-stage' not in html and b'pixelportrait86_companion.js' not in html, 'lyime ainda referenciado'
    layers=z.read('assets/mastermind99_atelier_layers.js')
    assert layers.startswith(b'/* Mastermind Ate') and b'"rosto-redondo"' in layers and b'"cabelo-afro"' in layers and b'"barba-cheia"' in layers and b'"cabelo-longo"' in layers and b'"roupa-moletom"' in layers and b'"roupa-capa"' in layers
    atelier=z.read('assets/mastermind99_atelier.js')
    assert b'cobreTras:true' in atelier and b"find(p=>p.id==='redondo');if(r)r.z=32" in atelier and b'rosto:5,' in atelier and b'function splitHair' in atelier and b'function furosGrandes(fc,k)' in atelier
    assert b'"ajuste":"rosto-2"' in layers and b'"ajuste":"rosto-3"' in layers and b'"ajuste":"gemini-1"' in layers and b'"ajuste":"jaleco-3"' in layers and b'"ajuste":"esclera-1"' in layers, 'camadas sem a correção de esclera (Jovem até a pálpebra), barba e jaleco (entre os dedos)'
    dex=b''.join(z.read(n) for n in names if n.endswith('.dex'))
    for needle in (b'saveInvestigatorJson',b'listPersonalBooks',b'searchPersonalBook',b'InlinePixelPortraitStage',b'PdfTextSearch'):
        assert needle in dex, 'Missing native bridge/code: '+needle.decode()
    for n in names:
        assert not any(token in n.lower() for token in ('pixelportraitcreator.exe','pixelportraitcreator.pck','index.wasm','index.pck')), n
print(f'PASS Mastermind Android {versao}: Atelie em camadas offline, CoC7, PDFs privados e assets de campanha preservados')
print('SIZE MB:',round(apk.stat().st_size/1048576,2))
print('SHA256:',hashlib.sha256(apk.read_bytes()).hexdigest())
