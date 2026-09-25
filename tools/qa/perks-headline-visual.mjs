// Force the real (narrow, wheel-width) .perks__card elements into normal static flow, inside a wrapper carrying
// the default perks--a variant class, so we see the actual styled heading wrap at the animation's real width.
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1200);
const heights = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("#perksCards .perks__card")];
  const wrap = document.createElement("div");
  wrap.className = "perks--a";
  wrap.style.cssText = "position:fixed; inset:0; z-index:9999; background:#000; display:flex; gap:24px; padding:24px; align-items:flex-start;";
  const out = [];
  cards.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.style.cssText = "position:static; visibility:visible; transform:none; margin:0;";
    wrap.appendChild(clone);
    out.push(Math.round(clone.querySelector("h3").getBoundingClientRect().height));
  });
  document.body.appendChild(wrap);
  return out;
});
console.log("h3 heights:", heights);
await page.waitForTimeout(300);
await page.screenshot({ path: out, type: "jpeg", quality: 90 });
await browser.close();
