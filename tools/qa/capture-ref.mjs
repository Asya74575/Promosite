// Captures a reference site: viewport frames down the page, plus what it loads and how it moves.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out, shots = "6"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const libs = new Set(), media = [];
page.on("request", (r) => {
  const u = r.url();
  if (/\.(js|mjs)(\?|$)/i.test(u) || /cdn|unpkg|jsdelivr/i.test(u)) {
    const m = u.match(/([^/?]+\.m?js)/i); if (m) libs.add(m[1]);
  }
  if (/\.(mp4|webm|hdr|glb|gltf|ktx2|basis|exr)(\?|$)/i.test(u)) media.push(u.split("/").pop().slice(0, 60));
});
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(6000);

const info = await page.evaluate(() => {
  const g = (s) => getComputedStyle(document.body)[s];
  const canvases = [...document.querySelectorAll("canvas")].map((c) => `${c.width}x${c.height}`);
  const fonts = new Set();
  for (const el of [...document.querySelectorAll("h1,h2,h3,p,a,span,div")].slice(0, 400)) {
    const f = getComputedStyle(el).fontFamily.split(",")[0].replace(/"/g, "");
    if (f) fonts.add(f);
  }
  return {
    title: document.title,
    canvases,
    fonts: [...fonts].slice(0, 10),
    bodyBg: g("backgroundColor"),
    bodyColor: g("color"),
    height: document.body.scrollHeight,
    videos: document.querySelectorAll("video").length,
    globals: ["gsap", "ScrollTrigger", "THREE", "Lenis", "lenis", "SplitText", "Swiper", "barba", "Locomotive", "Matter", "PIXI", "OGL"].filter((k) => k in window),
  };
});
console.log(JSON.stringify(info, null, 1));
console.log("libs:", [...libs].slice(0, 22).join(", "));
if (media.length) console.log("media:", [...new Set(media)].slice(0, 12).join(", "));

const n = +shots;
for (let i = 0; i < n; i++) {
  await page.evaluate((f) => window.scrollTo({ top: f * (document.body.scrollHeight - innerHeight), behavior: "instant" }), i / (n - 1));
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 2);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/f${i}.jpg`, quality: 78, type: "jpeg" });
}
await browser.close();
