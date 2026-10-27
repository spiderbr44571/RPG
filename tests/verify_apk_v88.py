#!/usr/bin/env python3
"""Validate v0.88 APK actually includes direct Godot HTML5 loader and RPG import."""
import pathlib,zipfile,sys,hashlib
p=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(p) as z:
    names=z.namelist()
    for name in ('demo-offline.html','pixelportrait86_companion.js','pixelportrait86_companion.css','mastermind39_ui.js'):
        assert z.read('assets/'+name)==(pathlib.Path('app/src/main/assets')/name).read_bytes(),name
    html=z.read('assets/demo-offline.html')
    assert b'>v0.88<' in html
    assert b'data-p86-action="online">Personalizar dentro do app' in html
    assert b'id="p86-portrait"' in html and b'id="p86-token"' in html
    assert b"pixelportrait86_companion.js" in html
    dex=b''.join(z.read(n) for n in names if n.endswith('.dex'))
    assert b'PixelPortraitActivity' in dex,'Embedded Android Activity not compiled'
    assert b'html.itch.zone/html/18379448/index.html' in dex,'Direct verified Godot index URL absent from APK'
    assert b'lyime.itch.io/pixel-portrait-creator' in dex,'Original public page for dynamic discovery not found'
    assert b'lyime-capture-v087.png' in dex,'RPG capture bridge missing'
    for name in names:
        if not name.startswith('assets/'):continue
        low=name.lower()
        assert not any(bad in low for bad in ('nonemo85','pixelportraitcreator.exe','pixelportraitcreator.pck','lyime/index.pck','lyime/index.wasm','index.wasm')),name
    print('PASS v0.88 Android APK: native direct Godot WebView, image capture bridge, no third-party binaries')
    print('SHA256',hashlib.sha256(p.read_bytes()).hexdigest())
