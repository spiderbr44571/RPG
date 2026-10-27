#!/usr/bin/env python3
"""Generate standard hicolor Linux icons from the ORIGINAL approved Mastermind logo."""
from pathlib import Path
from PIL import Image, ImageOps
src=Path(__file__).resolve().parents[1]/'app/src/main/assets/mastermind_logo.png'
out=Path(__file__).resolve().parent/'icons'
out.mkdir(parents=True,exist_ok=True)
with Image.open(src) as image:
    image=image.convert('RGBA')
    for size in (16,24,32,48,64,128,256,512):
        tile=Image.new('RGBA',(size,size),(0,0,0,0))
        resized=ImageOps.contain(image,(size,size),Image.Resampling.LANCZOS)
        tile.alpha_composite(resized,((size-resized.width)//2,(size-resized.height)//2))
        path=out/f'{size}x{size}.png'
        tile.save(path)
        print(size,path)
