// Block 5 · Инста: real mouse.wheel() through the pinned ring, screenshots at points of the section's progress.
// usage: node insta-wheel.mjs <outDir> [w] [h] [reduced]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const [out = "shots/insta", w = "1440", h = "900", red] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, reducedMotion: red ? "reduce" : "no-preference", hasTouch: false });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 200)));
p.on("response", (r) => r.status() >= 400 && errs.push(`HTTP ${r.status()}: ${r.url().slice(-80)}`));
await p.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
// jump to one screen above the block, then only real wheel steps
await p.evaluate(() => { const t = document.getElementById("insta").getBoundingClientRect().top + scrollY - innerHeight * 1.05; window.__lenis ? window.__lenis.scrollTo(t, { immediate: true }) : scrollTo(0, t); });
await p.waitForTimeout(1500);
await p.mouse.move(+w * 0.5, +h * 0.5);
let k = 0;
const snap = async () => {
  const st = await p.evaluate(() => { const r = document.getElementById("insta").getBoundingClientRect(); return ((innerHeight - r.top) / innerHeight).toFixed(2); });
  await p.screenshot({ path: `${out}/${String(k++).padStart(2, "0")}-v${st}.jpg`, type: "jpeg", quality: 72 });
};
await snap();
for (let i = 0; i < 16; i++) { for (let j = 0; j < 3; j++) { await p.mouse.wheel(0, +h * 0.075); await p.waitForTimeout(60); } await p.waitForTimeout(700); if (i % 2 === 1) await snap(); }
console.log(errs.length ? errs.join("\n") : "no errors");
await b.close();
