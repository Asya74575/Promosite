// One-off: capture the hero at a custom early delay (to catch the lightning flash peak, ~1.1-1.2s after load)
// instead of shot.mjs's fixed 4200ms settle wait.
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out, delayMs] = process.argv.slice(2);
const errs = [];
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => ["error", "warning"].includes(m.type()) && errs.push(m.type() + ": " + m.text().slice(0, 200)));
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(+delayMs);
await page.screenshot({ path: out, type: "jpeg", quality: 85 });
console.log(errs.length ? errs.join("\n") : "no errors");
await browser.close();
