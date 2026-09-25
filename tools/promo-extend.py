"""Line-up photos (2409 energy, 2410 chips) are ~4:5; the carousel card is ~1:2 on phones. Instead of cropping the
outer cans/packs, extend the photo's own dark background up and down (edge rows stretched, seam feathered) to a
tall 0.43 frame, so object-fit: cover fills the card on every screen and only the extended background gets cut.
Usage: python tools/promo-extend.py   (run from site/)"""
from PIL import Image, ImageFilter

SRC = "../Фото продукции/PHOTO DOMA BY GUF FMCG/"
RATIO = 0.43          # width / height of the output (narrowest card: phone)
W = 1400
FEATHER = 160         # px of blend at each seam

for src, dst in [("2409.jpg", "promo-energy.webp"), ("2410.jpg", "promo-chips.webp")]:
    im = Image.open(SRC + src).convert("RGB")
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    H = round(W / RATIO)
    top = (H - im.height) // 2 - round(H * 0.04)   # sit a little above centre: the CTA takes the bottom
    out = Image.new("RGB", (W, H))
    bot_h = H - top - im.height

    def strip(row, h, fade_down):
        # edge row, blurred across (no streaks from reflections) and faded to black away from the photo
        band = im.crop((0, row, W, row + 8)).filter(ImageFilter.GaussianBlur(40)).resize((W, h))
        g = Image.linear_gradient("L").resize((W, h))            # 0 at top → 255 at bottom
        if not fade_down:
            g = g.transpose(Image.FLIP_TOP_BOTTOM)
        return Image.composite(Image.new("RGB", (W, h)), band, g.point(lambda v: round(v * .85)))

    out.paste(strip(0, top + FEATHER, False), (0, 0))
    out.paste(strip(im.height - 8, bot_h + FEATHER, True), (0, H - bot_h - FEATHER))
    mask = Image.new("L", im.size, 255)
    for y in range(FEATHER):
        v = round(255 * y / FEATHER)
        mask.paste(v, (0, y, W, y + 1)); mask.paste(v, (0, im.height - 1 - y, W, im.height - y))
    out.paste(im, (0, top), mask)
    out.save("assets/img/" + dst, "WEBP", quality=86, method=6)
    print(dst, out.size)
