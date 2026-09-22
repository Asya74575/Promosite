// usage: node perf.mjs <url> <angle: d3d11|swiftshader>
// Logs main-thread stalls (rAF gaps), long tasks and preloader timing during boot.
import { chromium } from "playwright-core";
const [url, angle = "d3d11"] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: [`--use-angle=${angle}`, "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  const t0 = performance.now();
  window.__perf = { gaps: [], long: [], marks: [] };
  const mark = (m) => window.__perf.marks.push([m, Math.round(performance.now() - t0)]);
  let last = performance.now();
  const loop = (t) => { const d = t - last; if (d > 80) window.__perf.gaps.push([Math.round(last - t0), Math.round(d), document.getElementById("preYear")?.textContent]); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.long.push([Math.round(e.startTime - t0), Math.round(e.duration)]))).observe({ type: "longtask", buffered: true });
  document.addEventListener("DOMContentLoaded", () => {
    mark("DOMContentLoaded");
    const pre = document.getElementById("preloader");
    new MutationObserver(() => { if (!document.getElementById("preloader")) mark("preloader removed"); }).observe(document.body, { childList: true });
    let seen2026 = false;
    const y = document.getElementById("preYear");
    new MutationObserver(() => { if (!seen2026 && y.textContent === "2026") { seen2026 = true; mark("counter hit 2026"); } }).observe(y, { childList: true, characterData: true, subtree: true });
  });
  window.addEventListener("load", () => mark("load"));
});
page.on("console", (m) => m.type() === "error" && console.log("console error:", m.text().slice(0, 120)));
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(12000);
const p = await page.evaluate(() => window.__perf);
const gl = await page.evaluate(() => { const c = document.createElement("canvas").getContext("webgl2"); const d = c && c.getExtension("WEBGL_debug_renderer_info"); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?"; });
console.log("renderer:", gl);
console.log("marks:", JSON.stringify(p.marks));
console.log("frame gaps >80ms [at, gap, year]:", JSON.stringify(p.gaps));
console.log("long tasks [at, dur]:", JSON.stringify(p.long));
const res = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => r.duration > 150 || r.transferSize > 300000).map((r) => [r.name.split("/").slice(-1)[0].slice(0, 40), Math.round(r.startTime), Math.round(r.duration), Math.round(r.encodedBodySize / 1024) + "KB"]));
console.log("slow/big resources [name, start, dur, size]:", JSON.stringify(res));
await browser.close();
