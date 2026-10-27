#!/usr/bin/env python3
"""Verify Pixel Portrait Creator companion while excluding proprietary editor assets."""
import pathlib,sys,zipfile,hashlib,re
p=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(p) as apk:
    files=apk.namelist()
    for name in ("demo-offline.html","pixelportrait86_companion.js","pixelportrait86_companion.css","mastermind39_ui.js"):
        packaged=apk.read("assets/"+name)
        actual=(pathlib.Path("app/src/main/assets")/name).read_bytes()
        assert packaged==actual,f"Stale WebView asset: {name}"
    html=apk.read("assets/demo-offline.html")
    assert b'id="screen-atelier85"' in html
    assert b'data-screen="atelier85"' in html
    assert b'data-p86-action="online"' in html and b'data-p86-action="download"' in html
    assert b'id="p86-import"' in html and b'id="p86-portrait"' in html
    assert b'>v0.86<' in html
    assert b'pixelportrait86_companion.js' in html
    assert b"Pixel Portrait Creator" in html
    for name in files:
        low=name.lower()
        if name.startswith("assets/"):
            assert "nonemo85" not in low and "/nonemo/" not in low,f"Old editor bundled: {name}"
            assert "pixelportraitcreator.exe" not in low and "pixelportraitcreator.pck" not in low
            assert "lyime" not in low.replace("pixelportrait86",""),f"Unexpected copyrighted editor file: {name}"
    assert not any(name.startswith("assets/app/asset_sources") for name in files)
    java=pathlib.Path("app/src/main/java/dev/rpgmesa/demo/MainActivity.java").read_text()
    assert "class PixelPortraitBridge" in java
    assert "https://lyime.itch.io/pixel-portrait-creator" in java
    assert "Intent.ACTION_VIEW" in java
    assert "savePng(String filename,String base64)" in java
    print("PASS v0.86 APK: original lyime external browser link, photo importer, RPG token, no redistributed editor or sprites")
    print("SHA256",hashlib.sha256(p.read_bytes()).hexdigest())
