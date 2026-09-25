// Стык hero → «Фото + видео»: пиксели строк вокруг границы (белая полоса?)
import { chromium } from "playwright-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [w = "820", h = "1180", out = "tools/qa/shots/seam"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1) });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.waitForTimeout(3500);
const info = await page.evaluate(async () => {
  const d = document.getElementById("duo");
  const y = d.getBoundingClientRect().top + scrollY - innerHeight / 2;
  scrollTo(0, y);
  await new Promise((r) => setTimeout(r, 1500));
  const hero = document.getElementById("hero").getBoundingClientRect(), duo = d.getBoundingClientRect();
  const st = document.getElementById("heroStage").getBoundingClientRect();
  return { heroBottom: hero.bottom, stageBottom: st.bottom, duoTop: duo.top, halfH: [...d.children].map((c) => c.getBoundingClientRect().height), innerH: innerHeight, docH: document.documentElement.clientHeight };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: out + "-" + w + ".png", clip: { x: 0, y: Math.max(0, info.duoTop - 30), width: +w, height: 60 } });
await browser.close();
