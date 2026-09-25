"""One-off white-background cutout for DOMA product pack shots.
Mirrors the manual process already used for hero-bag.webp (white-threshold, Pillow):
soft-threshold near-white pixels to alpha, crop to content bbox with padding, resize to max 1600px, save webp.
Usage: python cutout-white.py <src.jpg> <dst.webp>
"""
import sys
from PIL import Image

def cutout(src, dst, max_dim=1400, pad=24, lo=235, hi=250):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            m = min(r, g, b)
            if m >= hi:
                px[x, y] = (r, g, b, 0)
            elif m > lo:
                alpha = int(255 * (hi - m) / (hi - lo))
                px[x, y] = (r, g, b, alpha)
    bbox = im.getbbox()
    if bbox:
        l, t, rr, b2 = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        rr = min(w, rr + pad); b2 = min(h, b2 + pad)
        im = im.crop((l, t, rr, b2))
    scale = max_dim / max(im.size)
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=80)
    print(dst, im.size)

if __name__ == "__main__":
    cutout(sys.argv[1], sys.argv[2])
