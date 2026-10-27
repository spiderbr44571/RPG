#!/usr/bin/env python3
"""Check v0.87 APK really contains embedded lyime client, without copyrighted assets."""
import pathlib,sys,zipfile,hashlib
apkfile=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(apkfile) as apk:
    files=apk.namelist()
    for name in ('demo-offline.html','pixelportrait86_companion.js','pixelportrait86_companion.css','mastermind39_ui.js'):
        assert apk.read('assets/'+name)==(pathlib.Path('app/src/main/assets')/name).read_bytes(),name
    html=apk.read('assets/demo-offline.html')
    assert b'>v0.87<' in html
    assert b'data-p86-action="online">Personalizar dentro do app' in html
    assert b'data-p86-action="browser"' in html
    assert b'data-p86-action="download"' in html
    assert b'id="p86-portrait"' in html and b'id="p86-token"' in html
    assert b'pixelportrait86_companion.js' in html
    assert b'nonemo85_' not in html
    dex=b''.join(apk.read(x) for x in files if x.endswith('.dex'))
    assert b'PixelPortraitActivity' in dex,'Embedded Android screen missing from classes.dex'
    assert b'lyime.itch.io/pixel-portrait-creator' in dex,'Official editor URL missing from binary'
    assert b'PIXEL_PORTRAIT_CREATOR' in dex or b'lyime-capture-v087.png' in dex
    assert not any('pixelportraitcreator.pck' in p.lower() or 'pixelportraitcreator.exe' in p.lower() for p in files)
    assert not any('nonemo85' in p.lower() or 'nonemo/' in p.lower() for p in files)
    assert not any(p.startswith('assets/lyime/') for p in files)
    print('PASS APK v0.87: isolated Android online creator, capture-to-token adapter and no copyrighted assets bundled')
    print('SHA256',hashlib.sha256(apkfile.read_bytes()).hexdigest())
