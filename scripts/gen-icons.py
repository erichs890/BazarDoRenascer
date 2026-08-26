"""Gera os ícones do PWA a partir da marca (coração sobre o ciano da marca).
Rodar: python scripts/gen-icons.py   — só é preciso quando a marca mudar.
"""
import math
from PIL import Image, ImageDraw

BG_TOP, BG_BOT = (76, 196, 233), (20, 131, 171)   # primary -> primaryDark
HEART = (255, 255, 255)
SS = 4  # supersampling: desenha 4x maior e reduz -> bordas suaves sem antialias nativo


def heart_points(cx, cy, scale, n=400):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * scale, cy - y * scale))
    return pts


def gradient(size):
    img = Image.new('RGB', (1, size))
    for y in range(size):
        k = y / max(size - 1, 1)
        img.putpixel((0, y), tuple(round(a + (b - a) * k) for a, b in zip(BG_TOP, BG_BOT)))
    return img.resize((size, size))


def icon(size, heart_ratio, radius_ratio):
    s = size * SS
    img = gradient(s).convert('RGBA')
    if radius_ratio:                       # cantos arredondados (ícone "any")
        mask = Image.new('L', (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=255)
        img.putalpha(mask)
    ImageDraw.Draw(img).polygon(heart_points(s / 2, s / 2, s * heart_ratio / 32), fill=HEART)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    icon(192, 0.62, 0.22).save('public/icons/icon-192.png')
    icon(512, 0.62, 0.22).save('public/icons/icon-512.png')
    # maskable: fundo sangrando até a borda, arte dentro da zona segura (80% central)
    icon(512, 0.44, 0).save('public/icons/maskable-512.png')
    # iOS mascara sozinho: quadrado cheio, sem transparência
    icon(180, 0.62, 0).convert('RGB').save('public/icons/apple-touch-icon.png')
    print('icones gerados em public/icons/')
