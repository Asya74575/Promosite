// Белые полосы: прокрутка всей страницы по шагам, в каждом кадре ищем пиксели светлого фона (#f3efe6) и белые
// строки/столбцы по краям. Печатает кадры, где найдено.
import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sizes = (process.argv[2] || "1920x1080,1440x900,1024x768,900x513,820x1180,700x1000,645x900,480x900,375x812").split(",");
const dprs = (process.env.DPRS || "1,1.25").split(",").map(Number);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu", "--hide-scrollbars=false"] });
let bad = 0;
for (const s of sizes) for (const dpr of dprs) {
  const [w, h] = s.split("x").map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const hits = [];
  for (let y = 0; y < total; y += Math.round(h * 0.37)) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(350);
    const b64 = (await page.screenshot()).toString("base64");
    const { rows, cols } = await page.evaluate(async (b64) => {
      const bm = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      const W = bm.width, H = bm.height, c = new OffscreenCanvas(W, H), x = c.getContext("2d");
      x.drawImage(bm, 0, 0); const data = x.getImageData(0, 0, W, H).data;
      const light = (i) => data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 190 && !(data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250) && data[i] - data[i + 2] > 4;
      const rows = [], cols = [];
      for (let yy = 0; yy < H; yy++) { let n = 0; for (let xx = 0; xx < W; xx++) if (light((yy * W + xx) * 4)) n++; if (n > W * 0.6) rows.push(yy); }
      for (let xx = 0; xx < W; xx++) { let n = 0; for (let yy = 0; yy < H; yy++) if (light((yy * W + xx) * 4)) n++; if (n > H * 0.3) cols.push(xx); }
      const thin = (a) => { const out = []; let st = null; for (let k = 0; k <= a.length; k++) { if (k < a.length && st !== null && a[k] === a[k - 1] + 1) continue; if (st !== null && a[k - 1] - st < 4) out.push(st); st = a[k] ?? null; } return out; };
      return { rows: thin(rows), cols: thin(cols) };
    }, b64);
    if (rows.length || cols.length) hits.push({ y, rows: rows.slice(0, 5), nRows: rows.length, cols: cols.slice(0, 5), nCols: cols.length });
  }
  console.log(s, "dpr", dpr, hits.length ? "BAD " + JSON.stringify(hits) : "ok");
  if (hits.length) bad++;
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
