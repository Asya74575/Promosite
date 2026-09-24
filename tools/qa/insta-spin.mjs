// Block 5 · Инста: the formed ring keeps turning with no scroll input — pinned, and scrolled on past the block.
// usage: node insta-spin.mjs <outDir> [w] [h]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const [out = "shots/insta-spin", w = "1440", h = "900"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 200)));
await p.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate(() => { const r = document.getElementById("insta"); const t = r.getBoundingClientRect().top + scrollY + r.offsetHeight - innerHeight * 1.6; window.__lenis ? window.__lenis.scrollTo(t, { immediate: true }) : scrollTo(0, t); });
await p.waitForTimeout(1200);
await p.mouse.move(+w / 2, +h / 2);
const pos = () => p.evaluate(() => document.querySelector(".insta__tile").style.transform.slice(0, 40));
for (const [name, steps] of [["pinned", 4], ["past", 6]]) {
  for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, +h * 0.1); await p.waitForTimeout(80); }
  await p.waitForTimeout(1500);
  const top = await p.evaluate(() => Math.round(document.getElementById("insta").getBoundingClientRect().bottom - innerHeight));
  const a = await pos(); await p.screenshot({ path: `${out}/${name}-a.jpg`, type: "jpeg", quality: 70 });
  await p.waitForTimeout(1500);
  const c = await pos(); await p.screenshot({ path: `${out}/${name}-b.jpg`, type: "jpeg", quality: 70 });
  console.log(name, "bottom-offset", top, "|", a, "→", c, a === c ? "STILL" : "MOVING");
}
console.log(errs.length ? errs.join("\n") : "no errors");
await b.close();
