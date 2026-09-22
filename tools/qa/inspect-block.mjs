// Finds a block by the text inside it, screenshots it, and dumps how it is built:
// element tree depth, canvas/svg/video presence, listeners implied by class names, transform usage.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, outDir, ...needles] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(5000);

// Walk the whole page once so lazy sections mount
const h = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 700) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(260);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1200);

for (const needle of needles) {
  const found = await page.evaluate((text) => {
    const all = [...document.querySelectorAll("section, div, article")];
    const hit = all.find((el) => {
      const t = (el.textContent || "").trim();
      return t.toLowerCase().includes(text.toLowerCase()) && t.length < 3000 && el.offsetHeight > 260;
    });
    if (!hit) return null;
    hit.setAttribute("data-probe", "1");
    const inside = (sel) => hit.querySelectorAll(sel).length;
    return {
      tag: hit.tagName.toLowerCase(),
      cls: hit.className.toString().slice(0, 160),
      box: { w: Math.round(hit.offsetWidth), h: Math.round(hit.offsetHeight), top: Math.round(hit.getBoundingClientRect().top + scrollY) },
      canvas: inside("canvas"), svg: inside("svg"), path: inside("svg path"),
      img: inside("img"), video: inside("video"), button: inside("button"),
      childClasses: [...hit.querySelectorAll("*")].slice(0, 60).map((n) => n.className.toString().split(" ")[0]).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 26),
    };
  }, needle);
  console.log(`\n=== "${needle}" ===`);
  console.log(found ? JSON.stringify(found, null, 1) : "NOT FOUND");
  if (found) {
    await page.evaluate(() => document.querySelector('[data-probe="1"]').scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${outDir}/${needle.slice(0, 18).replace(/\W+/g, "-")}.jpg`, quality: 80, type: "jpeg" });
    await page.evaluate(() => document.querySelector('[data-probe="1"]').removeAttribute("data-probe"));
  }
}
await browser.close();
