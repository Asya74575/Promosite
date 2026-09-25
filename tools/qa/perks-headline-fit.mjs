// Measure rendered line-count/height of the real .perks__card h3 elements (as currently saved in index.html)
// at their actual narrow wheel-animation width, to confirm all four now wrap to the same height.
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(1500);
const result = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("#perksCards .perks__card")];
  return cards.map((card) => {
    const h3 = card.querySelector("h3");
    const cs = getComputedStyle(h3);
    const lineHeight = parseFloat(cs.lineHeight);
    const height = h3.getBoundingClientRect().height;
    return { text: h3.textContent, height: Math.round(height), lines: Math.round(height / lineHeight) };
  });
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
