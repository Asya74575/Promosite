// Стык «Преимущества» → «Фото + видео» на узком экране: ищем светлую полосу. usage: node tools/qa/seam-480.mjs <out> [w=480] [heights=600,700,900]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/p480", w = "480", hs = "600,700,900"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const h of hs.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: +w, height: h } });
  await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3000);
  const duoTop = await page.evaluate(() => document.querySelector("#duo").getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => scrollTo(0, y), Math.round(duoTop - h * 0.6)); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${w}x${h}-seam.png` });
  // rows with a bright, even line across the width
  const info = await page.evaluate(() => {
    const el = [...document.querySelectorAll("#hero, .perks__spill, #duo, .hero__stage, .hero__front, .hero__scan")];
    return el.map((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return `${e.id || e.className} top ${r.top.toFixed(1)} bottom ${r.bottom.toFixed(1)} bg ${cs.backgroundColor} bt ${cs.borderTopWidth} ${cs.borderBottomWidth} op ${cs.opacity}`; });
  });
  console.log(w, h, "\n " + info.join("\n "));
  await page.close();
}
await browser.close();
