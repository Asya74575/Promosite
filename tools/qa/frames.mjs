// Frames over time after the page reports ready — for intros and other timed motion.
// usage: node frames.mjs <url> <outPrefix> <ms,ms,...> [w] [h] [scrollSelector]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out, times = "0", w = "1440", h = "900", sel = ""] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && !/404|Failed to (load|fetch)/.test(m.text()) && errs.push(m.text().slice(0, 240)));
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
if (sel) {
  await page.evaluate((s) => {
    const top = document.querySelector(s).getBoundingClientRect().top + scrollY;
    window.__lenis ? window.__lenis.scrollTo(top, { immediate: true }) : scrollTo(0, top);
  }, sel);
}
const t0 = Date.now();
for (const t of times.split(",").map(Number)) {
  const wait = t - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}-${t}.jpg`, quality: 72, type: "jpeg" });
}
console.log(JSON.stringify({ fps: await page.evaluate(() => window.__fps) }));
console.log(errs.length ? errs.join("\n") : "no errors");
await browser.close();
