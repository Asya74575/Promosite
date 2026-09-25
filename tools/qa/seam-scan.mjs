// Скролл через стык «Преимущества» → «Фото + видео», снимки каждые 40px. usage: node tools/qa/seam-scan.mjs <out> <w> <h>
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out, w, h, dpr = "1"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(3000);
const duoTop = await page.evaluate(() => document.querySelector("#duo").getBoundingClientRect().top + scrollY);
for (let i = 0; i < 10; i++) {
  const y = Math.round(duoTop - +h * 1.1 + i * +h * 0.12);
  await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${w}x${h}@${dpr}-${i}.png` });
}
await browser.close();
