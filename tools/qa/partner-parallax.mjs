// Partner cans parallax: viewport shots + can offsets at start / middle / end of the section's pass.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: CHROME });
for (const [tag, vp] of [["desk", { width: 1600, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  await p.goto(url, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(2500);
  for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, 2000); await p.waitForTimeout(40); }  // let the retail wall settle
  await p.waitForTimeout(800);
  const { top, h } = await p.evaluate(() => { const s = document.getElementById("partner"); return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight }; });
  for (const [n, f] of [["a-start", 0.25], ["b-mid", 0.5], ["c-end", 1]]) {
    const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const y = Math.min(max, top - vp.height + f * (max - (top - vp.height)));  // progress f of «top bottom → page end»
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.mouse.wheel(0, 1); await p.waitForTimeout(900);
    const v = await p.evaluate(() => [...document.querySelectorAll(".partner__can")].map((c) => `${c.className.split("--")[1]} py=${c.style.getPropertyValue("--py")} pr=${c.style.getPropertyValue("--pr")}`).join(" | "));
    console.log(tag, n, v);
    await p.screenshot({ path: `${outDir}/px-${tag}-${n}.png` });
  }
  await p.close();
}
await b.close();
