#!/usr/bin/env python3
"""Gera a camada "barba-cheia" do Ateliê a partir da barba pintada no Gemini sobre o manequim.

Fonte: scripts/atelie_fontes/barba-cheia-gemini.jpg (o manequim de referência com a barba pintada
por cima, 422x1024). Passos:
  1. alinhamento: a imagem é redimensionada para 553x1347 e colocada em (3,0) sobre o quadro do
     manequim (560x1360). Esses valores vieram de uma busca de escala e deslocamento que maximiza a
     correlação das bordas fora da barba (0,98); --buscar refaz a busca;
  2. recorte: barba = pixels castanhos ou de traço escuro que diferem do manequim, sem ruído,
     com os vãos fechados; a boca e o queixo sem pelo (tons de pele) ficam abertos;
  3. borda: o contorno claro (pele do Gemini colada no pelo) é retirado e a borda é suavizada só para dentro;
  4. máscara m (o pelo; o traço de nanquim fica fora) e ref (luminância média do pelo) para recolorir no app.
Grava em mastermind99_atelier_layers.js com "ajuste":"gemini-1". Rodar de novo gera o mesmo resultado.

Uso: python3 scripts/atelie_barba_gemini.py [layers.js] [--buscar]
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTE = os.path.join(AQUI, 'atelie_fontes', 'barba-cheia-gemini.jpg')
ESCALA, POS = (553, 1347), (3, 0)
REGIAO = (110, 200, 400, 480)  # x0, y0, x1, y1 no quadro do manequim
PREFIXO = 'window.MastermindAtelierLayers='


def dec(uri, mode):
    return Image.open(io.BytesIO(base64.b64decode(uri.split(',', 1)[1]))).convert(mode)


def enc(img):
    b = io.BytesIO()
    if img.mode == 'RGBA':  # WebP sem perda: menor que PNG
        img.save(b, 'WEBP', lossless=True, exact=True, method=6)
        return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    img.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def manequim(L):
    c = dec(L['corpo']['src'], 'RGBA')
    bg = Image.new('RGBA', c.size, (255, 255, 255, 255))
    bg.alpha_composite(c)
    return bg.convert('RGB')


def buscar(ref, g):
    R = np.array(ref.convert('L')).astype(float)
    bordas = lambda a: np.hypot(nd.sobel(a, 0), nd.sobel(a, 1))
    ER = bordas(nd.gaussian_filter(R, 1))
    mask = np.zeros_like(R, bool)
    mask[:600] = True
    mask[230:420, 120:370] = False
    melhor = None
    for W in range(546, 561):
        for H in range(1334, 1358):
            EG = bordas(nd.gaussian_filter(np.array(g.convert('L').resize((W, H), Image.LANCZOS)).astype(float), 1))
            for cy in range(-4, 9):
                for cx in range(-2, 10):
                    C = np.zeros_like(R)
                    y0, x0, y1, x1 = max(0, cy), max(0, cx), min(R.shape[0], cy + H), min(R.shape[1], cx + W)
                    C[y0:y1, x0:x1] = EG[y0 - cy:y1 - cy, x0 - cx:x1 - cx]
                    s = (C * ER)[mask].sum() / np.sqrt((C[mask] ** 2).sum() * (ER[mask] ** 2).sum() + 1e-9)
                    if melhor is None or s > melhor[0]:
                        melhor = (s, (W, H), (cx, cy))
    return melhor


def gera(L, procurar=False):
    ref = manequim(L)
    g = Image.open(FONTE).convert('RGB')
    escala, pos = ESCALA, POS
    if procurar:
        s, escala, pos = buscar(ref, g)
        print('alinhamento', escala, pos, round(s, 4))
    al = Image.new('RGB', ref.size, (255, 255, 255))
    al.paste(g.resize(escala, Image.LANCZOS), pos)
    x0, y0, x1, y1 = REGIAO
    a = np.array(al).astype(float)[y0:y1, x0:x1]
    r = np.array(ref).astype(float)[y0:y1, x0:x1]
    lum = a @ [.299, .587, .114]
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    pelo = (lum < 150) & ((sat > .18) | (lum < 70)) & (np.abs(a - r).max(-1) > 35)
    pelo = nd.binary_opening(pelo, structure=np.ones((2, 2)))
    lab, n = nd.label(pelo)
    tam = nd.sum(pelo, lab, range(1, n + 1))
    M = np.isin(lab, 1 + np.where(tam >= 200)[0])
    M = nd.binary_fill_holes(nd.binary_closing(M, structure=np.ones((5, 5))))
    pele = (lum > 115) & (sat > .15) & (sat < .6)
    M &= ~nd.binary_opening(M & pele, structure=np.ones((3, 3)))  # boca e queixo sem pelo
    for _ in range(2):  # contorno claro (pele do Gemini) na borda da barba
        borda = M & ~nd.binary_erosion(M)
        M &= ~(borda & (lum > 70))
    # suavização só para dentro: fora da barba o pixel do Gemini é pele/fundo claro e virava pontilhado
    alfa = np.where(M, np.where(nd.binary_erosion(M), 255, 190), 0).astype(float)
    ys, xs = np.where(alfa > 0)
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([a, alfa]).round().clip(0, 255).astype(np.uint8)[by0:by1, bx0:bx1]
    # traço de nanquim (muito escuro) fica fora da máscara: o contorno continua preto em qualquer cor de barba
    m = (np.where(M, np.clip((lum - 22) / 22, 0, 1), 0) * 255).round().astype(np.uint8)[by0:by1, bx0:bx1]
    ref_lum = float(lum[M].mean())
    L['barba-cheia'] = {'x': int(x0 + bx0), 'y': int(y0 + by0), 'ref': round(ref_lum, 3),
                        'src': enc(Image.fromarray(rgba, 'RGBA')), 'm': enc(Image.fromarray(m, 'L')), 'ajuste': 'gemini-1'}
    return dict(x=x0 + bx0, y=y0 + by0, largura=bx1 - bx0, altura=by1 - by0, pixels=int(M.sum()), ref=round(ref_lum, 1))


def main(path, procurar):
    txt = open(path, encoding='utf8').read()
    i = txt.index(PREFIXO) + len(PREFIXO)
    L, fim = json.JSONDecoder().raw_decode(txt[i:])
    print('barba-cheia', gera(L, procurar))
    open(path, 'w', encoding='utf8').write(txt[:i] + json.dumps(L, ensure_ascii=False, separators=(',', ':')) + txt[i + fim:])


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(args[0] if args else 'app/src/main/assets/mastermind99_atelier_layers.js', '--buscar' in sys.argv)
