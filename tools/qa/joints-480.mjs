// Стыки блоков на узком экране: кадр по центру каждой границы секций. usage: node tools/qa/joints-480.mjs <out> [w=480] [h=800]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/j480", w = "480", h = "800"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(3000);
for (const [a, b] of [["#duo", "#product"], ["#insta", "#creators"], ["#creators", "#retailWall"], ["#retailWall", "#partner"], ["#partner", ".footer"]]) {
  const y = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, b);
  await page.evaluate((y) => scrollTo(0, y), Math.round(y - +h / 2)); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${w}-${a.slice(1)}-${b.replace(/[#.]/, "")}.jpg`, type: "jpeg", quality: 72 });
}
await browser.close();
