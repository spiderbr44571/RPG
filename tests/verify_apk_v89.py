#!/usr/bin/env python3
"""APK v0.89 verification: zoom controls compiled; original lyime runtime still remote."""
import pathlib,sys,zipfile,hashlib
filename=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(filename) as z:
    names=z.namelist()
    for name in ('demo-offline.html','pixelportrait86_companion.js','pixelportrait86_companion.css','mastermind39_ui.js'):
        assert z.read('assets/'+name)==(pathlib.Path('app/src/main/assets')/name).read_bytes(),name
    html=z.read('assets/demo-offline.html')
    assert b'>v0.89<' in html
    assert b'data-p86-action="online">Personalizar dentro do app' in html
    assert b'data-p86-action="browser"' in html
    assert b'id="p86-token"' in html
    dex=b''.join(z.read(name) for name in names if name.endswith('.dex'))
    assert b'PixelPortraitActivity' in dex
    assert b'html.itch.zone/html/18379448/index.html' in dex
    for word in (b'Ajustar',b'Mover',b'Paisagem'):
        assert word in dex,'UI zoom control not compiled: '+repr(word)
    for name in names:
        if name.startswith('assets/'):
            assert not any(p in name.lower() for p in ('index.wasm','pixelportraitcreator.pck','pixelportraitcreator.exe','nonemo85','index.pck'))
    print('PASS Mastermind v0.89 APK: zoom/move/fit/landscape controls, original Godot HTML5, no bundled proprietary assets')
    print('SHA256',hashlib.sha256(filename.read_bytes()).hexdigest())
