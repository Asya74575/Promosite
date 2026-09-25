// ≤480px (пользователь 2026-09-25): колесо «Преимуществ» доезжает до №04 по центру. usage: node tools/qa/perks-480.mjs <out> [w=480] [h=900]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/p480", w = "480", h = "900"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(3500);
const hero = await page.evaluate(() => { const r = document.querySelector("#hero").getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
const endY = hero.top + hero.h - +h;
for (const [n, f] of [["a", 0.55], ["b", 0.8], ["c", 0.95], ["d", 1]]) {
  await page.evaluate((y) => scrollTo(0, y), Math.round(endY * f)); await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/${w}x${h}-${n}.jpg`, type: "jpeg", quality: 72 });
}
const m = await page.evaluate(() => [...document.querySelectorAll("#perks .perks__card")].map((c) => { const r = c.getBoundingClientRect(); return Math.round(r.left + r.width / 2 - innerWidth / 2); }));
console.log(w, h, "hero", hero.h, "card centre offsets", JSON.stringify(m));
await page.evaluate(() => scrollTo(0, 0));
const sel = ".product__carousel";
const pt = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
await page.evaluate((y) => scrollTo(0, y), pt - 120); await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/${w}x${h}-product.jpg`, type: "jpeg", quality: 72 });
await browser.close();
