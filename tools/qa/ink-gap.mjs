// Видимые промежутки по пикселям: от низа карточек до границы фона и от границы до верха букв заголовка.
// usage: node tools/qa/ink-gap.mjs [w=481]
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [w = "481"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: 800 } });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(2500);
// for every heading: box top vs the top of its ink (glyphs), measured on a canvas with the same font
const res = await page.evaluate(() => [...document.querySelectorAll("section h2")].filter((h) => h.offsetHeight).map((h) => {
  const cs = getComputedStyle(h), r = document.createRange(); r.selectNodeContents(h);
  const c = document.createElement("canvas").getContext("2d"); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = c.measureText(h.textContent.trim().toUpperCase());
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  const half = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
  const inkTop = half + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent;
  const lastLineInkBottom = half + m.fontBoundingBoxAscent + m.actualBoundingBoxDescent;
  return `${h.closest("section").id.padEnd(11)} fs ${cs.fontSize} lh ${cs.lineHeight} ink starts ${inkTop.toFixed(1)}px below box top, ends ${(lh - lastLineInkBottom).toFixed(1)}px above box bottom`;
}));
console.log(res.join("\n"));
await browser.close();
