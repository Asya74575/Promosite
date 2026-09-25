// «Где купить» на ≤900px: кадры на скролле секции + замер зазоров между карточками и хода колонок.
// usage: node retail-820.mjs <outDir> [widths=820] [h=1180]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/r820", widths = "820", h = "1180"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const w of widths.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: +h } });
  await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3500);
  const top = await page.evaluate(() => document.querySelector("[data-retail-wall]").getBoundingClientRect().top + scrollY);
  const secH = await page.evaluate(() => document.getElementById("retailWall").offsetHeight);
  const res = [];
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const y = top - +h + f * (secH);
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const cols = [...document.querySelectorAll(".retailWall__col")];
      const tiles = cols.map((c) => [...c.children].map((t) => t.getBoundingClientRect()));
      const r = (n) => Math.round(n);
      return {
        ty: cols.map((c) => c.style.transform.replace(/[^\d.-]/g, "")),
        colGap: r(tiles[1][0].left - tiles[0][0].right),
        vGapsL: [...tiles[0], ...tiles[2]].slice(1).map((t, i, a) => 0).length && (() => {
          const L = [...tiles[0], ...tiles[2]], R = [...tiles[1], ...tiles[3]];
          const g = (A) => A.slice(1).map((t, i) => r(t.top - A[i].bottom));
          return { L: g(L), R: g(R), bottoms: [r(L.at(-1).bottom), r(R.at(-1).bottom)], left: r(L[0].left), right: r(innerWidth - R[0].right) };
        })(),
      };
    });
    res.push({ f, ...m });
    await page.screenshot({ path: `${out}/${w}-${f}.jpg`, quality: 70, type: "jpeg" });
  }
  console.log(w, JSON.stringify(res, null, 0));
  await page.close();
}
await browser.close();
