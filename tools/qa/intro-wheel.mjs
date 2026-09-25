// Real mouse.wheel() film of hero → perks (product travel + card wheel). usage: node intro-wheel.mjs <outDir> [steps] [px] [query]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "../qa/intro-shots", steps = "24", px = "300", q = ""] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--enable-gpu"] });
const errors = [];
for (const [label, vp] of [["d", { width: 1600, height: 900 }], ["p", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${label}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
  await page.goto("http://localhost:5173/" + q, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.mouse.move(vp.width / 2, vp.height / 2);
  const n = label === "p" ? Math.round(+steps * 0.9) : +steps;
  for (let i = 0; i <= n; i++) {
    await page.screenshot({ path: `${out}/${label}-${String(i).padStart(2, "0")}.jpg`, quality: 70, type: "jpeg" });
    await page.mouse.wheel(0, +px * (label === "p" ? 0.95 : 1));
    await page.waitForTimeout(650);
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "No console/page errors.");
