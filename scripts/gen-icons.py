# -*- coding: utf-8 -*-
"""Gera os ícones do PWA a partir de logo.png.

Rodar: python scripts/gen-icons.py   — só quando a marca mudar.

Duas decisões que valem explicação:

1. O texto do logo é descartado. Num ícone de 192px "BAZAR DO RENASCER / CENTRO
   ESPÍRITA" vira borrão. Fica só o símbolo (sol + sacolas) — é o mesmo motivo
   pelo qual toda marca tem uma versão reduzida.

2. O fundo branco vira navy. Ícone de fundo branco desaparece contra o launcher
   claro e não tem personalidade; o navy é a cor do próprio logo e faz o sol
   amarelo brilhar. O branco é removido por flood fill a partir dos cantos, o
   que preserva o branco INTERNO (entre as alças das sacolas).

Três formatos, porque cada sistema trata o ícone de um jeito:
  any       cantos arredondados, arte com folga  -> Chrome/Android, desktop
  maskable  fundo sangrando, arte em 62% central -> Android recorta em círculo,
                                                    squircle, o que quiser
  apple     quadrado cheio, sem transparência    -> o iOS aplica a própria máscara
"""
from PIL import Image, ImageDraw

SRC = 'logo.png'
OUT = 'public/icons'
NAVY = (1, 56, 87)         # #013857 — o navy do próprio logo
SYMBOL_BOTTOM = 0.56       # o texto começa por volta de 56% da altura
MARK = (255, 0, 255)       # cor-sentinela do flood fill


def simbolo():
    """Recorta o símbolo e devolve num quadrado com fundo transparente."""
    im = Image.open(SRC).convert('RGB')
    art = im.crop((0, 0, im.width, int(im.height * SYMBOL_BOTTOM)))

    # Flood fill dos quatro cantos: some só o branco EXTERNO.
    marcado = art.copy()
    for pt in [(0, 0), (marcado.width - 1, 0),
               (0, marcado.height - 1), (marcado.width - 1, marcado.height - 1)]:
        ImageDraw.floodfill(marcado, pt, MARK, thresh=40)

    rgba = art.convert('RGBA')
    pm, pa = marcado.load(), rgba.load()
    for y in range(marcado.height):
        for x in range(marcado.width):
            if pm[x, y] == MARK:
                pa[x, y] = (0, 0, 0, 0)

    rgba = rgba.crop(rgba.getbbox())
    lado = max(rgba.size)
    quad = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    quad.paste(rgba, ((lado - rgba.width) // 2, (lado - rgba.height) // 2))
    return quad


def render(art, size, escala, raio, fundo=NAVY):
    canvas = Image.new('RGBA', (size, size), fundo + (255,))
    alvo = max(1, int(size * escala))
    a = art.resize((alvo, alvo), Image.LANCZOS)
    canvas.alpha_composite(a, ((size - alvo) // 2, (size - alvo) // 2))
    if raio:
        # Máscara em 4x e reduzida: cantos suaves sem serrilhado.
        m = Image.new('L', (size * 4, size * 4), 0)
        ImageDraw.Draw(m).rounded_rectangle(
            [0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * raio), fill=255)
        canvas.putalpha(m.resize((size, size), Image.LANCZOS))
    return canvas


if __name__ == '__main__':
    art = simbolo()
    render(art, 192, .80, .22).save(f'{OUT}/icon-192.png')
    render(art, 512, .80, .22).save(f'{OUT}/icon-512.png')
    # maskable: Android pode recortar 20% de cada lado — arte dentro de 62%.
    render(art, 512, .62, 0).save(f'{OUT}/maskable-512.png')
    # iOS mascara sozinho: quadrado cheio, sem canal alpha.
    render(art, 180, .80, 0).convert('RGB').save(f'{OUT}/apple-touch-icon.png')
    render(art, 48, .92, .20).save(f'{OUT}/favicon-48.png')
    # Símbolo solto (fundo transparente) para usar dentro do app.
    art.resize((256, 256), Image.LANCZOS).save(f'{OUT}/simbolo.png')
    print('ícones gerados em', OUT)
