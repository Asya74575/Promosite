import { chromium } from "playwright-core";
const out = process.argv[2];
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--use-angle=d3d11","--enable-gpu"] });
for (const [w,h] of (process.argv[3]).split(",").map(s=>s.split("x").map(Number))) {
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.addInitScript(() => { window.__qaInstant = true; });
await p.goto("http://localhost:5173/", { waitUntil: "load" }); await p.waitForTimeout(3500);
for (const f of [0.78]) {
  await p.evaluate((f) => { const el=document.querySelector(".hero"); const t=el.getBoundingClientRect().top+scrollY; const y=t+f*(el.offsetHeight-innerHeight); window.__lenis?window.__lenis.scrollTo(y,{immediate:true}):scrollTo(0,y); }, f);
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${out}-perks-${w}x${h}.jpg`, type:"jpeg", quality:70 });
}
await p.evaluate(() => { const t = document.querySelector(".product__track").getBoundingClientRect().top + scrollY; window.__lenis ? window.__lenis.scrollTo(t, {immediate:true}) : scrollTo(0,t); });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}-energy-${w}x${h}.jpg`, type:"jpeg", quality:70 });
await p.close(); }
await b.close();
