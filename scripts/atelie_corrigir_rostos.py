#!/usr/bin/env python3
"""Corrige as camadas de rosto do Ateliê (mastermind99_atelier_layers.js).

As camadas de rosto foram recortadas como "diferença" sobre o manequim: onde a pintura
nova parecia o manequim, o pixel ficou transparente ou semitransparente. No app isso
deixava o rosto padrão aparecer por baixo:
  * frestas finas e meia-transparência pelo rosto (linhas fantasmas no Redondo);
  * esclera e brilho dos olhos apagados (o olho do manequim aparecia dentro do olho do Jovem).

O que este script faz em cada rosto:
  1. pixel semitransparente sobre o manequim vira opaco com a cor da pintura nova (o RGB guardado é o dela);
  2. fresta transparente fina cercada de pintura nova é preenchida pelos vizinhos (cor, m e pm);
  3. nos rostos com OLHOS definidos, a abertura do olho (polígono em pixels do manequim)
     volta a ser opaca com a pintura original: esclera limpa (clara e neutra), cílios e
     brilho da íris.
Barba cheia: a peça veio recortada à parte e não acompanhava o rosto do manequim. A costeleta
esquerda subia como um fio fino cruzando o canto do olho e o queixo da barba ficava ~30 px à
esquerda do queixo. A costeleta direita ficava no meio da bochecha, colada no canto do olho. A camada é deformada uma
única vez (marca "ajuste" na camada): acima da boca abre para os lados cada vez mais com a altura
(as costeletas vão para o contorno do rosto e para a orelha), abaixo da boca leva o queixo para a
direita, com a boca fixa no lugar e 6% mais larga.
É idempotente: rodar de novo não muda nada.

Uso: python3 scripts/atelie_corrigir_rostos.py [caminho do layers.js]
"""
import base64, io, json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROSTOS = ['rosto-redondo', 'rosto-quadrado', 'rosto-fino', 'rosto-delicado',
          'rosto-marcante', 'rosto-idoso', 'rosto-jovem', 'rosto-elfo']
# abertura dos olhos (pixels do manequim), contornando por dentro as pálpebras
OLHOS = {
    'rosto-jovem': [
        [(150, 238), (160, 230), (177, 227), (186, 235), (189, 248), (186, 260), (173, 266), (158, 263), (151, 253)],
        [(244, 258), (248, 247), (257, 238), (273, 233), (290, 239), (298, 249), (290, 261), (273, 267), (257, 267), (248, 264)],
    ],
}
# contorno do rosto (pixels do manequim): fora dele a camada pintou pescoço, gola e hachuras sobre a roupa.
# O Redondo fica na frente das roupas (z 32), então essas sobras cobriam a camisa/terno; aqui são apagadas
# e o pescoço do manequim (sob a roupa escolhida) aparece no lugar.
CONTORNO = {
    'rosto-redondo': [(118, 178), (366, 178), (366, 235), (352, 262), (340, 290), (322, 320), (300, 345), (278, 365),
                      (258, 380), (240, 392), (222, 393), (205, 381), (185, 361), (165, 336), (150, 310), (135, 270), (118, 230)],
}
# íris (centro x, centro y, raio) dentro da abertura do olho: fica com a pintura (cinza e brilho)
IRIS = {'rosto-jovem': [(176, 246, 15), (272, 249, 16)]}
PREFIXO = 'window.MastermindAtelierLayers='


def dec(uri, mode):
    return np.array(Image.open(io.BytesIO(base64.b64decode(uri.split(',', 1)[1]))).convert(mode))


def enc(arr, mode):
    b = io.BytesIO()
    Image.fromarray(arr, mode).save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def poligono(h, w, x0, y0, pts):
    m = Image.new('L', (w, h), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in pts], fill=1)
    return np.array(m).astype(bool)


def tom_de_pele(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    lum = rgb @ [.299, .587, .114]
    return (r >= g) & (g >= b - 8) & (sat > .12) & (sat < .75) & (lum > 55) & (lum < 240)


def corrige(L, k, corpo, cabeca):
    c = L[k]
    if c.get('ajuste') == 'rosto-1':
        return None
    x0, y0 = c['x'], c['y']
    S = dec(c['src'], 'RGBA').astype(float)
    h, w = S.shape[:2]
    m = dec(c['m'], 'L').astype(float) if 'm' in c else np.zeros((h, w))
    pm = dec(c['pm'], 'L').astype(float) if 'pm' in c else np.zeros((h, w))
    A = S[..., 3]
    C = corpo[max(0, y0):y0 + h, max(0, x0):x0 + w]
    C = np.pad(C, ((max(0, -y0), h - C.shape[0] - max(0, -y0)), (max(0, -x0), w - C.shape[1] - max(0, -x0)), (0, 0)))
    corte = 0
    if k in CONTORNO:
        fora = ~poligono(h, w, x0, y0, CONTORNO[k]) & (A > 0)
        corte = int(fora.sum())
        S[fora, 3] = 0
        A = S[..., 3]
    vis = A > 0
    out = S.copy()
    # 1
    H = cabeca[max(0, y0):y0 + h, max(0, x0):x0 + w]
    H = np.pad(H, ((max(0, -y0), h - H.shape[0] - max(0, -y0)), (max(0, -x0), w - H.shape[1] - max(0, -x0))))
    # só na cabeça do manequim (ou em pixel cor de pele): gola, camiseta cinza e hachuras do pescoço
    # continuam com a transparência original, senão cobririam a roupa escolhida
    dentro = (C[..., 3] > 200) & (H | tom_de_pele(S[..., :3]))
    semi = vis & (A < 255) & dentro
    out[semi, 3] = 255
    # 2
    fecho = nd.binary_closing(vis, structure=np.ones((7, 7)), border_value=0)
    fresta = fecho & ~vis & (C[..., 3] > 200)
    peso = vis.astype(float)
    den = nd.gaussian_filter(peso, 1.6)
    viz = lambda a: nd.gaussian_filter(a * peso, 1.6) / np.maximum(den, 1e-6)
    for ch in range(3):
        out[..., ch] = np.where(fresta, viz(S[..., ch]), out[..., ch])
    out[fresta, 3] = 255
    m = np.where(fresta, viz(m), m)
    pm = np.where(fresta, viz(pm), pm)
    # pixel que ficou opaco e tem a cor da pele pintada do próprio rosto: pele inteira (pm 255).
    # Com o pm antigo (parcial, da meia-transparência) sobrava contorno claro ao trocar o tom de pele.
    ref = (pm >= 250) & (A >= 250)
    if ref.sum() > 50:
        pel = np.median(S[ref, :3], axis=0)
        perto = np.abs(out[..., :3] - pel).max(-1) < 48
        pm = np.where((semi | fresta) & perto, 255, pm)
    # 3
    olho = np.zeros((h, w), bool)
    for pts in OLHOS.get(k, []):
        olho |= poligono(h, w, x0, y0, pts)
    if olho.any():
        raw = np.stack([nd.median_filter(S[..., ch], size=3) for ch in range(3)], -1)
        lum = raw @ [.299, .587, .114]
        mx, mn = raw.max(-1), raw.min(-1)
        sat = (mx - mn) / np.maximum(mx, 1)
        yy, xx = np.mgrid[0:h, 0:w]
        iris = np.zeros((h, w), bool)
        for cx, cy, r in IRIS.get(k, []):
            iris |= (xx + x0 - cx) ** 2 + (yy + y0 - cy) ** 2 <= r * r
        traco = olho & (lum < 95)                                   # cílios, pálpebra e pupila
        manter = traco | (iris & (sat < .2))                        # íris cinza e brilho dentro dela
        escl = olho & ~manter                                       # o resto da abertura é esclera
        # esclera clara e neutra, com sombra suave junto do traço (pálpebra e íris)
        sombra = nd.gaussian_filter((traco | iris).astype(float), 2.2)
        Lc = 238 - 70 * np.clip(sombra, 0, 1)
        cor = np.stack([Lc, Lc * .975, Lc * .96], -1)
        out[escl, :3] = cor[escl]
        out[olho & manter, :3] = raw[olho & manter]
        out[olho, 3] = 255
        m[olho] = 0
        pm[olho] = 0
        olho = escl
    st = dict(contorno=corte, semitransparente=int(semi.sum()), fresta=int(fresta.sum()), olho=int(olho.sum()))
    c['src'] = enc(out.round().clip(0, 255).astype(np.uint8), 'RGBA')
    c['ajuste'] = 'rosto-1'
    if 'm' in c:
        c['m'] = enc(m.round().clip(0, 255).astype(np.uint8), 'L')
    if 'pm' in c:
        c['pm'] = enc(pm.round().clip(0, 255).astype(np.uint8), 'L')
    return st


BARBA = dict(boca_y=335, boca_x=237, escala=1.06, abre=0.0025, desce=0.55, max_desce=30, folga_esq=40, folga_dir=50)


def ajusta_barba(L, k='barba-cheia'):
    c = L.get(k)
    if not c or c.get('ajuste') == 'encaixe-rosto-1':
        return None
    b = BARBA
    S = dec(c['src'], 'RGBA').astype(float)
    M = dec(c['m'], 'L').astype(float) if 'm' in c else None
    h, w = S.shape[:2]
    x0, y0 = c['x'], c['y']
    W2, X0n = w + b['folga_esq'] + b['folga_dir'], x0 - b['folga_esq']
    yy, xx = np.mgrid[0:h, 0:W2].astype(float)
    Y, X = yy + y0, xx + X0n
    dx = np.where(Y > b['boca_y'], np.minimum((Y - b['boca_y']) * b['desce'], b['max_desce']), 0)
    esc = b['escala'] + np.maximum(b['boca_y'] - Y, 0) * b['abre']
    cs = b['boca_x'] + (X - dx - b['boca_x']) / esc - x0  # coluna de origem (mapa inverso)
    out = np.stack([nd.map_coordinates(S[..., ch], [yy, cs], order=1, mode='constant', cval=0) for ch in range(4)], -1)
    c['src'] = enc(out.round().clip(0, 255).astype(np.uint8), 'RGBA')
    if M is not None:
        c['m'] = enc(nd.map_coordinates(M, [yy, cs], order=1, mode='constant', cval=0).round().clip(0, 255).astype(np.uint8), 'L')
    c['x'] = int(X0n)
    c['ajuste'] = 'encaixe-rosto-1'
    return dict(x=c['x'], largura=W2)


def main(path):
    txt = open(path, encoding='utf8').read()
    i = txt.index(PREFIXO) + len(PREFIXO)
    L, fim = json.JSONDecoder().raw_decode(txt[i:])
    corpo = dec(L['corpo']['src'], 'RGBA').astype(float)
    pele = dec(L['pele']['src'], 'RGBA')[..., 3] > 0
    cabeca = nd.binary_dilation(nd.binary_fill_holes(pele), iterations=4)
    for k in ROSTOS:
        if k in L:
            print(k, corrige(L, k, corpo, cabeca))
    print('barba-cheia', ajusta_barba(L))
    novo = txt[:i] + json.dumps(L, ensure_ascii=False, separators=(',', ':')) + txt[i + fim:]
    open(path, 'w', encoding='utf8').write(novo)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'app/src/main/assets/mastermind99_atelier_layers.js')
