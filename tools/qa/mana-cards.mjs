// Films the first screens of en.manayerbamate.com under real mouse.wheel steps (can travel + card scroll).
import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const out = "../qa/ref-mana-cards";
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://en.manayerbamate.com/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(7000);
// close cookie/age popups if any
for (const t of ["Accept", "Accept all", "Yes", "I agree", "OK"]) { try { await page.getByRole("button", { name: t }).first().click({ timeout: 800 }); } catch {} }
await page.mouse.move(720, 450);
await page.evaluate(()=>window.scrollTo(0,3900)); await page.waitForTimeout(2500);
for (let i = 0; i < 30; i++) {
  await page.screenshot({ path: `${out}/w${String(i).padStart(2, "0")}.jpg`, quality: 60, type: "jpeg" });
  const y = await page.evaluate(() => scrollY);
  console.log(i, y);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(700);
}
const info = await page.evaluate(() => ({ h: document.body.scrollHeight, secs: [...document.querySelectorAll("section")].slice(0,8).map(s => s.className + " " + s.getBoundingClientRect().height) }));
console.log(JSON.stringify(info));
await browser.close();
