"""Chip-bag renders ship with a baked light-grey floor shadow (cut from a white background), which reads as a
white smear on the coloured product panels. This turns it into a faint, soft black shadow and trims the dark
1-2px cutout rim off the pack itself. Source = untouched originals in ../qa/img-before-defringe/.
Usage: python tools/bag-shadow.py   (run from site/)"""
from PIL import Image, ImageFilter

STRENGTH = 2.0   # alpha per unit of original grey darkness (6 was too hard; ~20% max opacity now)
BLUR = 14        # shadow softness, px

for n in ["01", "02", "03", "04", "05"]:
    im = Image.open(f"../qa/img-before-defringe/bag-{n}.webp").convert("RGBA")
    w, h = im.size
    px = im.load()
    y0 = next(y for y in range(int(h * .8), h)
              if (vis := [px[x, y] for x in range(0, w, 4) if px[x, y][3] > 20])
              and len(vis) > 10 and sum(p[0] > 150 for p in vis) > .8 * len(vis))
    body = im.copy(); bp = body.load()
    sh = Image.new("L", im.size, 0); sp = sh.load()
    for y in range(y0 - 6, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and r > 120:
                sp[x, y] = int(min(255, (255 - r) * STRENGTH * a / 255))
                bp[x, y] = (0, 0, 0, 0)
    sh = sh.filter(ImageFilter.GaussianBlur(BLUR))
    r, g, b, a = body.split()
    body = Image.merge("RGBA", (r, g, b, a.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(.7))))
    shadow = Image.merge("RGBA", (Image.new("L", im.size, 0),) * 3 + (sh,))
    Image.alpha_composite(shadow, body).save(f"assets/img/bag-{n}.webp", "WEBP", quality=90, method=6)
    print(n, "shadow max alpha", sh.getextrema()[1])
