// Шапка: кадр навигации + размеры логотипа, кнопки и бургера. usage: node nav-shot.mjs <out> [widths]
import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/nav", widths = "820"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME });
for (const w of widths.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => Object.fromEntries([".brand__mark", ".nav .btn", ".nav__burger", ".nav"].map((s) => {
    const r = document.querySelector(s).getBoundingClientRect(); return [s, [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]];
  })));
  console.log(w, JSON.stringify(m));
  await page.screenshot({ path: `${out}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 110 } });
  await page.close();
}
await browser.close();
