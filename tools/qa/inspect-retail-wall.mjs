import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const errors = [];
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(4000); // fonts + lazy layout settle before we trust any geometry

const geoNow = () => page.evaluate(() => {
  const el = document.getElementById("retailWall");
  const r = el.getBoundingClientRect();
  return { top: r.top + scrollY, height: r.height, vh: innerHeight, docH: document.body.scrollHeight };
});
const readOffsets = () => page.evaluate(() => [...document.querySelectorAll("#retailWall .retailWall__col")]
  .map((c) => { const m = /translateY\(([-\d.]+)px\)/.exec(c.style.transform || ""); return m ? +m[1] : 0; }));

async function shotAt(frac, name) {
  const g = await geoNow(); // re-measure fresh every time — page height can shift as things settle
  const rangeStart = g.top - g.vh, rangeEnd = g.top + g.height;
  const y = rangeStart + (rangeEnd - rangeStart) * frac;
  await page.evaluate((v) => window.scrollTo(0, v), Math.max(0, y));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.jpg`, quality: 85, type: "jpeg" });
  return { geo: g, y, offsets: await readOffsets() };
}

console.log("start:", JSON.stringify(await shotAt(0.02, "wall-start")));
console.log("mid:  ", JSON.stringify(await shotAt(0.5, "wall-mid")));
console.log("end:  ", JSON.stringify(await shotAt(0.97, "wall-end")));
console.log("console/page errors:", errors.length ? errors.slice(0, 10) : "none");
await browser.close();
