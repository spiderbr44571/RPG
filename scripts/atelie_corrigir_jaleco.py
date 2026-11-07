#!/usr/bin/env python3
"""Corrige a camada "roupa-jaleco" do Ateliê (mastermind99_atelier_layers.js).

O jaleco foi pintado opaco por cima do manequim e trouxe três sobras:
  1. vão entre o corpo e o braço (lado direito da imagem, y 620-880): o fundo entre a frente do
     jaleco e a manga veio pintado de tecido, com hachuras cinza do braço do manequim. Ali o
     manequim é fundo: sai o que fica entre a linha da frente do jaleco e a linha da manga;
  2. mão (y 875-1012): uma sombra cinza e um contorno de dedos duplicado ficavam sobre o vão e a
     beirada da mão verdadeira. Sai o que está sobre o fundo ou a pele da mão (ficam o punho
     preto da manga, a barra e o tecido branco da frente); as bordas novas ganham traço de nanquim;
  3. perna (y 880-1090): uma faixa de tecido passava para fora da linha da borda da frente do
     jaleco, por cima da calça. Em cada linha, o que está à esquerda do traço da borda sai.
Marca "ajuste":"jaleco-1" e não repete. Uso: python3 scripts/atelie_corrigir_jaleco.py [layers.js]
"""
import base64, io, json, sys
import numpy as np
from PIL import Image

# contornos em pixels do manequim, traçados sobre a grade da camada (frente do jaleco, manga, punho, mão e barra)
VAO = [(419, 628), (419, 700), (421, 740), (427, 780), (431, 820), (437, 860), (440, 879),
       (447, 879), (443, 860), (443, 800), (444, 740), (444, 700), (442, 680), (438, 660), (432, 640), (425, 624)]
MAO = [(437, 879), (441, 879), (441, 893), (472, 893), (472, 1001), (455, 1001), (440, 1015), (428, 1027),
       (416, 1037), (412, 1037), (411, 960), (412, 906), (431, 899)]
PREFIXO = 'window.MastermindAtelierLayers='


def dec(uri, mode):
    return np.array(Image.open(io.BytesIO(base64.b64decode(uri.split(',', 1)[1]))).convert(mode))


def enc(arr):
    b = io.BytesIO()
    Image.fromarray(arr, 'RGBA').save(b, 'WEBP', lossless=True, exact=True, method=6)  # sem perda e menor que PNG
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


def corrige(L, k='roupa-jaleco'):
    c = L.get(k)
    if not c or c.get('ajuste') == 'jaleco-1':
        return None
    S = dec(c['src'], 'RGBA').copy()
    corpo = dec(L['corpo']['src'], 'RGBA').astype(int)
    x0, y0 = c['x'], c['y']
    h, w = S.shape[:2]
    rgb = S[..., :3].astype(int)
    lum = rgb @ [.299, .587, .114]
    Cc = corpo[y0:y0 + h, x0:x0 + w]
    fundo = Cc[..., 3] < 128
    cm = Cc[..., :3]
    mx, mn = cm.max(-1), cm.min(-1)
    pele = (Cc[..., 3] > 128) & ((mx - mn) / np.maximum(mx, 1) > .15) & (mx > 60)
    Y, X = np.mgrid[0:h, 0:w]
    Y, X = Y + y0, X + x0
    n = {}
    tinta = lum < 70
    def poligono(pts):
        from PIL import ImageDraw
        im = Image.new('L', (w, h), 0)
        ImageDraw.Draw(im).polygon([(x - x0, y - y0) for x, y in pts], fill=1)
        return np.array(im).astype(bool)
    # 1: entre a linha da frente do jaleco (esquerda) e a linha de dentro da manga (direita)
    z1 = poligono(VAO)
    # 2: abaixo do punho, entre a frente do jaleco e a mão: sombra cinza e dedos duplicados; a mão volta a aparecer
    z2 = poligono(MAO)
    # 3
    z3 = np.zeros((h, w), bool)
    for yy in range(880, 1090):
        j = yy - y0
        if not 0 <= j < h:
            continue
        xs = [x for x in range(280, 340) if 0 <= x - x0 < w and S[j, x - x0, 3] > 128 and lum[j, x - x0] < 70]
        if xs:
            for x in range(280, xs[0]):
                if 0 <= x - x0 < w:
                    z3[j, x - x0] = True
    tirar = np.zeros((h, w), bool)
    for nome, z in (('vao', z1), ('mao', z2), ('perna', z3)):
        z &= S[..., 3] > 0
        n[nome] = int(z.sum())
        tirar |= z
    S[tirar, 3] = 0
    # contorno de nanquim (2 px) onde o tecido ficou encostado no fundo aberto, no vão e na mão
    from scipy import ndimage as nd
    perto = nd.binary_dilation(tirar & ((Y >= 620) & (Y < 1040) & (X >= 395)), iterations=2)
    contorno = perto & ~tirar & (S[..., 3] > 128) & ~tinta & ~((Y >= 875) & pele)
    S[contorno, :3] = (24, 18, 22)
    n['contorno'] = int(contorno.sum())
    c['src'] = enc(S)
    c['ajuste'] = 'jaleco-1'
    return n


def main(path):
    txt = open(path, encoding='utf8').read()
    i = txt.index(PREFIXO) + len(PREFIXO)
    L, fim = json.JSONDecoder().raw_decode(txt[i:])
    print('roupa-jaleco', corrige(L))
    open(path, 'w', encoding='utf8').write(txt[:i] + json.dumps(L, ensure_ascii=False, separators=(',', ':')) + txt[i + fim:])


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'app/src/main/assets/mastermind99_atelier_layers.js')
