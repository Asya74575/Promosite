// usage: node site-tour.mjs <url> <outPrefix> [width=1440] [height=900]
// Visitor-style QA pass: a screenshot of every top-level section (pinned sections at 10/50/90%), a full wheel scroll
// from top to bottom, console/page errors, failed requests, HTTP errors and page weight.
// Run at 1440 900 and 390 844, then LOOK at the screenshots before calling anything done.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out, w = "1440", h = "900"] = process.argv.slice(2);
if (!url || !out) { console.log("usage: node site-tour.mjs <url> <outPrefix> [width] [height]"); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(m.type() + ": " + m.text().slice(0, 160)));
page.on("requestfailed", (r) => errors.push(`requestfailed (${r.failure()?.errorText}): ${r.url().slice(-100)}`));
page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()}: ${r.url().slice(-100)}`));
await page.addInitScript(() => { window.__qaInstant = true; }); // scenes snap to scroll progress, so frames are deterministic

await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForFunction(() => !document.getElementById("preloader"), null, { timeout: 60000 }).catch(() => errors.push("preloader never left"));
await page.waitForTimeout(1500);

const sections = await page.evaluate(() => [...document.querySelectorAll("main > section[id]")]
  .filter((s) => !s.hidden && s.offsetHeight > 0)
  .map((s) => ({ id: s.id, pinned: s.offsetHeight > innerHeight * 1.5 })));
for (const { id, pinned } of sections) {
  for (const f of pinned ? [0.1, 0.5, 0.9] : [0]) {
    await page.evaluate(([id, f]) => {
      const el = document.getElementById(id);
      const top = el.getBoundingClientRect().top + scrollY;
      window.scrollTo(0, top + f * Math.max(0, el.offsetHeight - innerHeight));
    }, [id, f]);
    // a real wheel tick after the programmatic jump, so Lenis and ScrollTrigger see user input
    await page.mouse.move(+w / 2, +h / 2);
    await page.mouse.wheel(0, 2);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}-${id}${pinned ? "-" + Math.round(f * 100) : ""}.jpg`, type: "jpeg", quality: 60 });
  }
}

// Full wheel scroll, the way a visitor would
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const t0 = Date.now();
let y = 0;
while (y < total - 5 && Date.now() - t0 < 150000) {
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(60);
  y = await page.evaluate(() => scrollY + innerHeight);
}
await page.waitForTimeout(1500);
const weight = await page.evaluate(() => {
  const r = performance.getEntriesByType("resource");
  const kb = (list) => Math.round(list.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0) / 1024);
  return { requests: r.length, totalKB: kb(r), modelsKB: kb(r.filter((e) => /\.glb/.test(e.name))), imagesKB: kb(r.filter((e) => /\.(webp|jpe?g|png|avif)/.test(e.name))) };
});
console.log("sections (* = pinned):", sections.map((s) => s.id + (s.pinned ? "*" : "")).join(" "));
console.log("page height px:", total, "| reached bottom by wheel:", y >= total - 5, "| scroll pass s:", Math.round((Date.now() - t0) / 1000));
console.log("weight:", JSON.stringify(weight));
console.log([...new Set(errors)].slice(0, 25).join("\n") || "no errors or warnings");
await browser.close();
