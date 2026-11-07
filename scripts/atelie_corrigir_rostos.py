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
     brilho da íris. Com ESCLERA definida (Jovem), a abertura é a esclera inteira, da pálpebra de cima
     até a linha da pálpebra de baixo: a faixa clara sob a íris e o traço cinza ao lado dela viram esclera,
     e a pálpebra de baixo é uma linha de nanquim limpa (PALPEBRA), com bordas suaves (supersampling).
Barba cheia: vem de scripts/atelie_barba_gemini.py (pintada sobre o manequim), não deste script.
Esclera: em todos os rostos e no manequim a esclera era bege-rosada; vira branca neutra com a mesma
sombra e as pontas afinando até a pálpebra (esclera_neutra). Pixels opacos com a cor da pele do rosto
recebem máscara de pele inteira (sem fios claros ao trocar o tom de pele).
É idempotente: rodar de novo não muda nada ("ajuste":"rosto-2"; "rosto-3" nos rostos com ESCLERA).
Para refazer uma correção já aplicada, rode sobre as camadas originais (mastermind99_atelier_layers.js da
v0.102, commit 0bde7ae), na ordem: este script, atelie_barba_gemini.py e atelie_corrigir_jaleco.py; depois
copie só as camadas refeitas (rostos, barba, jaleco) para o arquivo atual — os cabelos vêm de outra etapa.

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
        [(147, 245), (149, 239), (153, 233), (160, 229), (177, 226), (186, 232), (190, 240), (192, 248), (193, 252),
         (190, 258), (184, 262), (173, 264), (162, 263), (155, 259), (150, 253)],
        [(240, 255), (243, 248), (246, 244), (250, 241), (257, 238), (273, 234), (290, 239), (298, 249), (300, 253),
         (292, 262), (282, 265), (273, 267), (257, 267), (248, 265), (244, 261)],
    ],
}
# contorno do rosto (pixels do manequim): fora dele a camada pintou pescoço, gola e hachuras sobre a roupa.
# O Redondo fica na frente das roupas (z 32), então essas sobras cobriam a camisa/terno; aqui são apagadas
# e o pescoço do manequim (sob a roupa escolhida) aparece no lugar.
CONTORNO = {
    'rosto-redondo': [(118, 178), (366, 178), (366, 235), (352, 262), (340, 290), (322, 320), (300, 345), (278, 365),
                      (258, 380), (240, 392), (222, 394), (200, 379), (188, 372), (177, 364), (167, 354), (157, 344), (146, 333), (138, 321),
                      (132, 300), (124, 270), (118, 230)],  # passa ~3 px por fora do traço da bochecha esquerda
}
# íris (centro x, centro y, raio) dentro da abertura do olho: fica com a pintura (cinza e brilho).
# Raio medido na pintura (borda escura da íris): com raio maior, o traço cinza ao lado da íris ficava como "íris".
IRIS = {'rosto-jovem': [(177, 245.5, 13.2), (272, 249, 13.2)]}
# esclera inteira (pixels do manequim, bordas dos pixels): da pálpebra de cima até a linha da pálpebra de baixo.
# Tudo aqui dentro, fora da íris, vira esclera clara: a faixa clara sob a íris, o traço cinza ao lado dela e a
# linha de dentro da pálpebra dupla (que virava uma faixa rabiscada de nanquim).
ESCLERA = {
    'rosto-jovem': [
        [(151.5, 247), (152, 242), (153, 239), (154, 238), (155, 237), (156, 236), (157, 235), (158, 234), (161, 233),
         (164, 232.5), (170, 236), (182, 236), (188.5, 246), (190.5, 251), (191.5, 255.5), (190.5, 259.5), (187.5, 263.2),
         (184, 264.6), (180, 265.6), (176, 266.4), (172, 266.4), (168, 265.6), (164, 264.4), (161, 263.2), (159, 263),
         (157, 262.2), (155, 260.2), (153, 257.8), (152, 252)],
        [(245.5, 256.5), (246, 250), (247.5, 246), (249.5, 243.5), (252, 241.5), (255, 240), (258.5, 239), (268, 240),
         (280, 240), (286, 244.5), (289, 246), (292, 248.5), (294, 251), (295, 254), (294.5, 256.5), (292.5, 260.5),
         (290.5, 262.6), (288.5, 263.8), (286.5, 265.6), (284, 267.6), (280, 269.6), (276, 271), (270, 271.6),
         (264, 271.6), (260, 270.8), (258, 269.8), (255, 268.2), (253, 266.4), (250.5, 262.4), (248, 260.2)],
    ],
}
# linha da pálpebra de baixo (nanquim limpo, ~1,6 px, afinando nas pontas), logo abaixo da esclera
PALPEBRA = {
    'rosto-jovem': [
        [(152.6, 252.5), (153.6, 258.6), (155.6, 261), (157.6, 263), (160, 263.9), (164, 265.2), (168, 266.4),
         (172, 267.2), (176, 267.2), (180, 266.4), (184, 265.4), (187.5, 264)],
        [(246, 258.2), (248.4, 261), (250.8, 263.2), (253.4, 267.2), (255.6, 269), (258.4, 270.6), (260.4, 271.6),
         (264, 272.4), (270, 272.4), (276, 271.8), (280, 270.4), (284.2, 268.4), (286.8, 266.4), (288.8, 264.6),
         (290.8, 263.4), (292.8, 261.2)],
    ],
}
SS = 4  # supersampling das máscaras desenhadas (borda suave, sem serrilhado)
PREFIXO = 'window.MastermindAtelierLayers='


def dec(uri, mode):
    return np.array(Image.open(io.BytesIO(base64.b64decode(uri.split(',', 1)[1]))).convert(mode))


def enc(arr, mode):
    b = io.BytesIO()
    if mode == 'RGBA':  # WebP sem perda (exato, inclusive o RGB sob alfa 0): bem menor que PNG
        Image.fromarray(arr, mode).save(b, 'WEBP', lossless=True, exact=True, method=6)
        return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    Image.fromarray(arr, mode).save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def poligono(h, w, x0, y0, pts):
    m = Image.new('L', (w, h), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in pts], fill=1)
    return np.array(m).astype(bool)


def cobertura(h, w, x0, y0, pts=None, linha=None, largura=1.6, circulos=()):
    """Fração (0-1) de cada pixel coberta por um polígono, uma linha (afinando nas pontas) ou círculos.
    Coordenadas em pixels do manequim, nas bordas dos pixels; desenhado SSx maior e reduzido pela média."""
    from PIL import ImageDraw
    m = Image.new('L', (w * SS, h * SS), 0)
    dr = ImageDraw.Draw(m)
    s = lambda x, y: ((x - x0) * SS, (y - y0) * SS)
    if pts:
        dr.polygon([s(x, y) for x, y in pts], fill=255)
    if linha:
        n = len(linha) - 1
        for i in range(n):
            t = min(i, n - 1 - i) / max(n / 4, 1)  # afina no primeiro e no último quarto
            lw = largura * (0.45 + 0.55 * min(t, 1))
            dr.line([s(*linha[i]), s(*linha[i + 1])], fill=255, width=max(1, round(lw * SS)))
            r = lw * SS / 2
            for p in (linha[i], linha[i + 1]):
                cx, cy = s(*p)
                dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    for cx, cy, r in circulos:
        a, b = s(cx, cy)
        dr.ellipse([a - r * SS, b - r * SS, a + r * SS, b + r * SS], fill=255)
    a = np.array(m, float).reshape(h, SS, w, SS).mean((1, 3)) / 255
    return a


CAIXA_OLHOS = (138, 212, 322, 292)  # x0, y0, x1, y1 em pixels do manequim


def na_caixa_dos_olhos(h, w, x0, y0):
    yy, xx = np.mgrid[0:h, 0:w]
    X, Y = xx + x0, yy + y0
    a, b, c, d = CAIXA_OLHOS
    return (X >= a) & (X < c) & (Y >= b) & (Y < d)


def esclera_neutra(out, m, pm, x0, y0, nao_pele):
    """Esclera branca neutra (era bege-rosada), com a mesma sombra; as pontas afinam sem corte.
    Núcleo: pixel claro e pouco saturado perto do traço do olho. Em volta (2 px) a troca é gradual
    pela saturação, então o canto do olho continua afinando até a pálpebra. A máscara de pele sai da
    esclera (não escurece nem avermelha com o tom de pele). nao_pele: o que a pintura não marcou como
    pele (máscara pm do rosto; no manequim, fora da camada de pele) — brilho de pálpebra é pele e fica."""
    h, w = out.shape[:2]
    caixa = na_caixa_dos_olhos(h, w, x0, y0)
    rgb = out[..., :3]
    lum = rgb @ [.299, .587, .114]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    op = out[..., 3] > 200
    tinta = op & (lum < 90)
    nucleo = caixa & op & nao_pele & (lum > 150) & (sat < .22) & nd.binary_dilation(tinta, iterations=7)
    lab, n = nd.label(nucleo)
    if n:
        tam = nd.sum(nucleo, lab, range(1, n + 1))
        nucleo = np.isin(lab, 1 + np.where(tam >= 6)[0])
    borda = nd.binary_dilation(nucleo, iterations=2) & op & ~tinta & caixa & nao_pele
    peso = np.clip((.30 - sat) / .10, 0, 1) * np.clip((lum - 150) / 40, 0, 1)  # traço cinza (< 150) não clareia
    peso = np.where(nucleo, 1.0, np.where(borda, peso, 0.0))
    L = np.minimum(lum * 1.06, 248)
    alvo = np.stack([L * 1.0, L * .99, L * .985], -1)
    out[..., :3] = rgb * (1 - peso[..., None]) + alvo * peso[..., None]
    m = m * (1 - peso)
    pm = pm * (1 - peso)
    return out, m, pm


def esclera_do_manequim(L):
    c = L['corpo']
    if c.get('ajuste') == 'esclera-1':
        return None
    S = dec(c['src'], 'RGBA').astype(float)
    h, w = S.shape[:2]
    z = np.zeros((h, w))
    antes = S.copy()
    pele = dec(L['pele']['src'], 'RGBA')[..., 3] > 0
    S, _, _ = esclera_neutra(S, z, z, 0, 0, ~pele)
    c['src'] = enc(S.round().clip(0, 255).astype(np.uint8), 'RGBA')
    c['ajuste'] = 'esclera-1'
    return dict(pixels=int((np.abs(S - antes).max(-1) > 1).sum()))


def tom_de_pele(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    lum = rgb @ [.299, .587, .114]
    return (r >= g) & (g >= b - 8) & (sat > .12) & (sat < .75) & (lum > 55) & (lum < 240)


def corrige(L, k, corpo, cabeca):
    c = L[k]
    if c.get('ajuste') in ('rosto-2', 'rosto-3'):
        return None
    x0, y0 = c['x'], c['y']
    S = dec(c['src'], 'RGBA').astype(float)
    h, w = S.shape[:2]
    m = dec(c['m'], 'L').astype(float) if 'm' in c else np.zeros((h, w))
    pm = dec(c['pm'], 'L').astype(float) if 'pm' in c else np.zeros((h, w))
    pm0 = pm.copy()
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
    # traço de nanquim da borda do rosto fica opaco mesmo fora da silhueta do manequim (bochecha mais larga)
    tinta_borda = vis & (A >= 60) & ((S[..., :3] @ [.299, .587, .114]) < 90)
    semi = vis & (A < 255) & (dentro | tinta_borda)
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
    olho_rep = np.zeros((h, w), bool)
    anel_tratado = np.zeros((h, w), bool)
    for pts in OLHOS.get(k, []):
        olho |= poligono(h, w, x0, y0, pts)
    q_escl = np.zeros((h, w))
    for pts in ESCLERA.get(k, []):
        q_escl = np.maximum(q_escl, cobertura(h, w, x0, y0, pts=pts))
    olho_antigo = olho.copy()
    if ESCLERA.get(k):  # a esclera desenhada segue o traço da pintura: substitui a abertura antiga (ia além do canto)
        olho = q_escl >= .5
    if olho.any():
        raw = np.stack([nd.median_filter(S[..., ch], size=3) for ch in range(3)], -1)
        lum = raw @ [.299, .587, .114]
        mx, mn = raw.max(-1), raw.min(-1)
        sat = (mx - mn) / np.maximum(mx, 1)
        yy, xx = np.mgrid[0:h, 0:w]
        iris = np.zeros((h, w), bool)
        for cx, cy, r in IRIS.get(k, []):
            iris |= (xx + x0 - cx) ** 2 + (yy + y0 - cy) ** 2 <= r * r
        traco = olho & ((lum < 95) | ((lum < 145) & (sat < .18)))   # cílios, pálpebra, pupila e o traço cinza dos cantos
        manter = traco | (iris & (sat < .2))                        # íris cinza e brilho dentro dela
        escl = olho & ~manter                                       # o resto da abertura é esclera
        # esclera clara e neutra, com sombra suave junto do traço (pálpebra e íris)
        sombra = nd.gaussian_filter((traco | iris).astype(float), 2.2)
        Lc = 238 - 70 * np.clip(sombra, 0, 1)
        cor = np.stack([Lc, Lc * .975, Lc * .96], -1)
        out[escl, :3] = cor[escl]
        # canto sem traço (a esclera encostava direto na pele): contorno de nanquim de ~1,5 px na borda da abertura
        fora = ~olho
        perto_fora = nd.binary_dilation(fora, iterations=1) & olho
        perto_fora2 = nd.binary_dilation(fora, iterations=2) & olho
        tinta_toda = (lum < 95) | ((lum < 145) & (sat < .18))  # traço original, dentro ou logo fora da abertura
        sem_traco = ~nd.binary_dilation(tinta_toda, iterations=2)
        borda_tinta = (perto_fora | (perto_fora2 & nd.binary_dilation(perto_fora & sem_traco, iterations=1))) & sem_traco
        out[borda_tinta, :3] = (28, 20, 22)
        out[borda_tinta & perto_fora2 & ~perto_fora, :3] = (70, 58, 58)
        out[olho & manter, :3] = raw[olho & manter]
        out[olho, 3] = 255
        m[olho] = 0
        pm[olho] = 0
        olho_rep = escl
        if ESCLERA.get(k):
            # esclera inteira até a pálpebra de baixo (fora da íris), com a mesma sombra junto do traço de cima e da íris
            ci = cobertura(h, w, x0, y0, circulos=IRIS.get(k, []))
            q = q_escl * (1 - ci)
            lum_o = out[..., :3] @ [.299, .587, .114]
            tinta_cima = (lum_o < 95) & (q_escl < .5)
            sombra2 = nd.gaussian_filter((tinta_cima | (ci > .5)).astype(float), 2.2)
            L2 = 238 - 70 * np.clip(sombra2, 0, 1)
            cor2 = np.stack([L2, L2 * .975, L2 * .96], -1)
            out[..., :3] = out[..., :3] * (1 - q[..., None]) + cor2 * q[..., None]
            out[q_escl > 0, 3] = 255
            m *= 1 - q
            pm *= 1 - q
            # linha limpa da pálpebra de baixo, logo abaixo da esclera
            lc = np.zeros((h, w))
            for ln in PALPEBRA.get(k, []):
                lc = np.maximum(lc, cobertura(h, w, x0, y0, linha=ln))
            out[..., :3] = out[..., :3] * (1 - lc[..., None]) + np.array([28., 20., 22.]) * lc[..., None]
            out[lc > 0, 3] = 255
            m *= 1 - lc
            olho_rep = escl | (q >= .5)
            olho |= lc >= .5
        # em volta da abertura, a pintura tinha brilhos brancos (abaixo da pálpebra e nos cantos) que ficavam
        # brancos até em pele escura: entre dois traços viram traço; o resto vira pele (acompanha o tom)
        # (com ESCLERA, a volta da abertura antiga também entra: pálpebra acima dos cílios, como antes)
        anel = nd.binary_dilation(olho | olho_antigo, iterations=6) & ~olho & (out[..., 3] > 200)
        l2 = out[..., :3] @ [.299, .587, .114]
        mx2, mn2 = out[..., :3].max(-1), out[..., :3].min(-1)
        s2 = (mx2 - mn2) / np.maximum(mx2, 1)
        claro = anel & (l2 > 160) & (s2 < .2)
        escuro = l2 < 100
        acima = np.zeros_like(claro)
        abaixo = np.zeros_like(claro)
        for t in range(1, 4):
            acima |= np.roll(escuro, t, 0)
            abaixo |= np.roll(escuro, -t, 0)
        entre = claro & acima & abaixo
        out[entre, :3] = (28, 20, 22)
        resto = claro & ~entre
        if ref.sum() > 50:
            out[resto, :3] = pel
            pm[resto] = 255
        m[claro] = 0
        anel_tratado = anel
        olho = escl
    st = dict(contorno=corte, semitransparente=int(semi.sum()), fresta=int(fresta.sum()), olho=int(olho.sum()))
    out, m, pm = esclera_neutra(out, m, pm, x0, y0, ((pm0 < 100) & ~anel_tratado) | olho_rep)
    # pele inteira (pm 255) em todo pixel opaco com a cor da pele do rosto, fora dos olhos: sem fios claros ao trocar o tom
    if ref.sum() > 50:
        perto = (np.abs(out[..., :3] - pel).max(-1) < 40) & (out[..., 3] >= 250) & ~na_caixa_dos_olhos(h, w, x0, y0)
        pm = np.where(perto, 255, pm)
    c['src'] = enc(out.round().clip(0, 255).astype(np.uint8), 'RGBA')
    c['ajuste'] = 'rosto-3' if k in ESCLERA else 'rosto-2'
    if 'm' in c:
        c['m'] = enc(m.round().clip(0, 255).astype(np.uint8), 'L')
    if 'pm' in c:
        c['pm'] = enc(pm.round().clip(0, 255).astype(np.uint8), 'L')
    return st


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
    print('corpo (olhos do manequim)', esclera_do_manequim(L))
    novo = txt[:i] + json.dumps(L, ensure_ascii=False, separators=(',', ':')) + txt[i + fim:]
    open(path, 'w', encoding='utf8').write(novo)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'app/src/main/assets/mastermind99_atelier_layers.js')
