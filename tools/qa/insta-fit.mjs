// Block 5 · Инста: every visible card's box must lie inside the stage (no card cut by an edge), checked with real
// wheel steps through the whole block. Reports the worst overflow per scroll point.
// usage: node insta-fit.mjs [w] [h]
import { chromium } from "playwright-core";
const [w = "1440", h = "900"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate(() => { const t = document.getElementById("insta").getBoundingClientRect().top + scrollY - innerHeight; window.__lenis ? window.__lenis.scrollTo(t, { immediate: true }) : scrollTo(0, t); });
await p.waitForTimeout(1000);
await p.mouse.move(+w / 2, +h / 2);
for (let i = 0; i < 24; i++) {
  for (let j = 0; j < 2; j++) { await p.mouse.wheel(0, +h * 0.075); await p.waitForTimeout(60); }
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const root = document.getElementById("insta"), st = root.querySelector(".insta__stage").getBoundingClientRect();
    const v = ((innerHeight - root.getBoundingClientRect().top) / innerHeight).toFixed(2);
    let worst = 0, cnt = 0;
    for (const el of root.querySelectorAll(".insta__tile")) {
      if (el.style.visibility === "hidden" || +el.style.opacity < 0.5) continue;
      const q = el.getBoundingClientRect(); cnt++;
      worst = Math.max(worst, st.left - q.left, q.right - st.right, st.top - q.top, q.bottom - st.bottom);
    }
    return { v, cnt, worst: Math.round(worst) };
  });
  console.log(`v=${r.v} visible=${r.cnt} overflow=${r.worst}px${r.worst > 0 ? "  CUT" : ""}`);
}
await b.close();
