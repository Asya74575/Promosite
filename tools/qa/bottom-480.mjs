// Что стоит последним в блоке и сколько под ним до низа секции. usage: node tools/qa/bottom-480.mjs [w=480]
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [w = "480"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: 800 } });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(2500);
console.log(await page.evaluate(() => ["#retailWall", "#partner"].map((id) => {
  const s = document.querySelector(id), R = s.getBoundingClientRect();
  return id + "\n" + [...s.querySelectorAll("*")].filter((e) => e.offsetHeight && R.bottom - e.getBoundingClientRect().bottom < 140)
    .map((e) => `  ${e.tagName.toLowerCase()}.${[...e.classList].join(".")} below=${Math.round(R.bottom - e.getBoundingClientRect().bottom)} mb=${getComputedStyle(e).marginBottom} pb=${getComputedStyle(e).paddingBottom}`).join("\n");
}).join("\n")));
await browser.close();
