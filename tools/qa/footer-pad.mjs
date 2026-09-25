// Поля копирайта в футере. usage: node tools/qa/footer-pad.mjs [w=481]
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [w = "481"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: 800 } });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(2500);
await page.evaluate(() => scrollTo(0, 1e6)); await page.waitForTimeout(1200);
console.log(w, await page.evaluate(() => {
  const f = document.querySelector(".footer").getBoundingClientRect();
  const t = [...document.querySelectorAll(".footer__legal > *")].map((e) => e.getBoundingClientRect());
  return `text top ${Math.round(Math.min(...t.map((r) => r.top)) - f.top)} / bottom ${Math.round(f.bottom - Math.max(...t.map((r) => r.bottom)))} , contacts→footer ${Math.round(f.top - document.querySelector(".partner__contacts").getBoundingClientRect().bottom)}`;
}));
await page.screenshot({ path: `tools/qa/shots/j481/${w}-footer.jpg`, type: "jpeg", quality: 72 });
await browser.close();
