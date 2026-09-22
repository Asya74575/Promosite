// Quick visual check of one page: screenshots at given scroll positions (fractions of a section, or of the page),
// plus every console error and failed request. Lighter than site-tour when only one block changed.
// usage: node shot.mjs <url> <outPrefix> <selector> <fractions> [w] [h]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out, sel = "body", fracs = "0", w = "1440", h = "900"] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => ["error", "warning"].includes(m.type()) && errs.push(m.type() + ": " + m.text().slice(0, 200)));
page.on("requestfailed", (r) => errs.push("failed: " + r.url().slice(-90)));
page.on("response", (r) => r.status() >= 400 && errs.push(`HTTP ${r.status()}: ${r.url().slice(-90)}`));
await page.addInitScript(() => { window.__qaInstant = true; });
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(4200);
for (const f of fracs.split(",").map(Number)) {
  await page.evaluate(([s, f]) => {
    const el = document.querySelector(s);
    const top = el.getBoundingClientRect().top + scrollY;
    const span = Math.max(0, el.offsetHeight - innerHeight);
    (window.__lenis ? window.__lenis.scrollTo(top + f * span, { immediate: true }) : window.scrollTo(0, top + f * span));
  }, [sel, f]);
  await page.mouse.move(+w * 0.62, +h * 0.45);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}-${String(f).replace(".", "_")}.jpg`, quality: 76, type: "jpeg" });
}
const stats = await page.evaluate(() => ({ ready: document.querySelector(".hero")?.className, fps: window.__fps || null }));
console.log(JSON.stringify(stats));
console.log(errs.length ? errs.join("\n") : "no errors");
await browser.close();
