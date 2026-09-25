// Partner block («Коллаборация»): whole section at several widths + form states (errors, done).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: CHROME });
for (const [tag, vp] of [["1600", { width: 1600, height: 900 }], ["1280", { width: 1280, height: 800 }], ["1024", { width: 1024, height: 768 }], ["390", { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  await p.goto(url, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(2500);
  const s = p.locator("#partner"); await s.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  await s.screenshot({ path: `${outDir}/partner-${tag}.png` });
  const hit = await p.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const body = r(document.querySelector(".partner__body")), lede = r(document.querySelector(".partner__lede"));
    return [...document.querySelectorAll(".partner__can")].map((c) => { const k = r(c); return `${c.className.split("--")[1]} ${Math.round(k.left)}..${Math.round(k.right)} × ${Math.round(k.top)}..${Math.round(k.bottom)}`; }).join(" | ")
      + ` || body ${Math.round(body.left)}..${Math.round(body.right)} × ${Math.round(body.top)}..${Math.round(body.bottom)}; lede ${Math.round(lede.left)}..${Math.round(lede.right)}, bottom ${Math.round(lede.bottom)}`;
  });
  console.log(tag, hit);
  if (tag === "1600" || tag === "390") {
    await p.click("#partnerForm .btn"); await p.waitForTimeout(300);
    await s.screenshot({ path: `${outDir}/partner-${tag}-errors.png` });
  }
  await p.close();
}
await b.close();
