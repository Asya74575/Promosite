// One-off: screenshot the perks cards, both in reduced-motion (static grid, easy to read) and in normal
// pinned-wheel motion at a mid-scroll fraction, to check .perks__tag text-transform.
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });

// Reduced motion: static grid
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById("perks").scrollIntoView());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}-reduced.jpg`, type: "jpeg", quality: 85 });
  await page.close();
}

// Normal motion: pinned wheel, mid-scroll
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => { window.__qaInstant = true; });
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(4200);
  await page.evaluate(() => {
    const el = document.getElementById("perks");
    const top = el.getBoundingClientRect().top + scrollY;
    const span = Math.max(0, el.offsetHeight - innerHeight);
    (window.__lenis ? window.__lenis.scrollTo(top + 0.5 * span, { immediate: true }) : window.scrollTo(0, top + 0.5 * span));
  });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}-wheel.jpg`, type: "jpeg", quality: 85 });
  await page.close();
}
await browser.close();
console.log("done");
