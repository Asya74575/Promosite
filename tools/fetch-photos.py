"""Download chosen photo candidates, convert them to WebP at web size, and record their credits.

Works with the candidates.json written by templates/qa/stock-unsplash.mjs (fields: q, i, src, alt, page).
Unsplash License: commercial use, no attribution required — the credits file is for us and the client anyway.

Usage:
  python fetch-photos.py <candidates.json> <outDir> <width> <name>=<query>:<index> [...]
  python fetch-photos.py research/stock/candidates.json site/assets/img/homes 1400 villa-1=luxury-villa-pool:6 villa-2=luxury-villa-pool:12

Needs Pillow (pip install pillow).
"""
import io, json, sys, urllib.request
from datetime import date
from pathlib import Path
from PIL import Image

if len(sys.argv) < 5:
    print(__doc__)
    sys.exit(1)
cands = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
out = Path(sys.argv[2])
width = int(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
credits_path = out / "credits.json"
credits = json.loads(credits_path.read_text(encoding="utf-8")) if credits_path.exists() else []

for spec in sys.argv[4:]:
    name, pick = spec.split("=", 1)
    query, index = pick.rsplit(":", 1)
    c = next((x for x in cands if x["q"] == query and x["i"] == int(index)), None)
    if not c:
        print(f"skip {spec}: no such candidate")
        continue
    # Ask for more pixels than we ship, so the resize only ever goes down
    url = c["src"] + f"?w={round(width * 1.3)}&q=85&fm=jpg"
    raw = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width < width:
        print(f"warning {name}: source is only {im.width}px wide (wanted {width}) — pick another, never upscale")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    file = f"{name}.webp"
    im.save(out / file, "WEBP", quality=80, method=6)
    credits = [x for x in credits if x.get("file") != file]
    credits.append({"file": file, "source": c.get("page", ""), "image": c["src"], "alt": c.get("alt", ""),
                    "licence": "Unsplash License", "fetched": date.today().isoformat()})
    print(f"{file}: {im.width}x{im.height}, {(out / file).stat().st_size // 1024} KB")

credits_path.write_text(json.dumps(credits, indent=1, ensure_ascii=False), encoding="utf-8")
