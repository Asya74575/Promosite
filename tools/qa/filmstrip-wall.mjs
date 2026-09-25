// Filmstrip of a masonry-wall block while wheel-scrolling through it: one frame per step + per-column translateY,
// so our block and the reference can be compared frame-for-frame at the same position relative to the grid.
// usage: node filmstrip-wall.mjs <url> <gridSel> <colSel> <outDir> <prefix> [width] [height]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, gridSel, colSel, out, prefix, w = "1900", h = "900"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(3500);
try { await page.click("text=Ок", { timeout: 1500 }); } catch {}

const y0 = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, gridSel);
await page.evaluate((y) => window.scrollTo(0, y - innerHeight + 60), y0);
await page.waitForTimeout(1200);
await page.mouse.move(+w / 2, +h / 2);

for (let i = 0; i < 16; i++) {
  const s = await page.evaluate(([g, c]) => {
    const grid = document.querySelector(g).getBoundingClientRect();
    const cols = [...document.querySelectorAll(c)];
    return {
      gridTop: Math.round(grid.top),
      colTops: cols.map((x) => Math.round(x.getBoundingClientRect().top)),
      colBottoms: cols.map((x) => Math.round(x.getBoundingClientRect().bottom)),
      shift: cols.map((x) => { const m = /translateY\(([-\d.]+)px\)/.exec(x.style.transform || ""); return m ? Math.round(-m[1]) : 0; }),
    };
  }, [gridSel, colSel]);
  console.log(prefix, String(i).padStart(2, "0"), JSON.stringify(s));
  await page.screenshot({ path: `${out}/${prefix}-${String(i).padStart(2, "0")}.jpg`, quality: 70, type: "jpeg" });
  if (Math.max(...s.colBottoms) < 0) break;
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(700);
}
await browser.close();
