// Partner form validation: screenshots empty submit, wrong input, live fix, success; desktop + phone.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
for (const [tag, vp] of [["desk", { width: 1600, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3000);
  const form = page.locator("#partnerForm");
  await form.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  const shot = (n) => form.screenshot({ path: `${outDir}/${tag}-${n}.png` });
  await page.fill("#pfName", "Ксения");
  await page.click("#partnerForm .btn"); await page.waitForTimeout(200); await shot("1-empty");
  console.log(tag, "focused:", await page.evaluate(() => document.activeElement.id));
  await page.fill("#pfName", "К3");
  await page.fill("#pfPhone", "+7 965 31");
  await page.fill("#pfEmail", "mail.ru");
  await page.click("#partnerForm .btn"); await page.waitForTimeout(200); await shot("2-wrong");
  await page.fill("#pfEmail", "name@mail");
  await page.fill("#pfPhone", "+7 965 abc");
  await page.click("#partnerForm .btn"); await page.waitForTimeout(200); await shot("3-wrong2");
  await page.fill("#pfName", "Ксения");
  await page.fill("#pfPhone", "8 (965) 314-93-78");
  await page.fill("#pfEmail", "name@mail.ru");
  await shot("4-fixed-live");
  await page.check("#pfConsent");
  await page.click("#partnerForm .btn"); await page.waitForTimeout(200); await shot("5-done");
  await page.close();
}
await browser.close();
