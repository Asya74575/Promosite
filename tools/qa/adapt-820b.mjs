// 820 и меньше: открытое меню-бургер, «Коллаборация», слайдер «Блогеров» (последний кадр после стрелок).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/a820b", widths = "820,600,390", h = "1180"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const w of widths.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: +h } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.waitForTimeout(3500);
  await page.click(".nav__burger"); await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${w}-menu.jpg`, quality: 70, type: "jpeg" });
  await page.click('.nav__menu a[href="#creators"]'); await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({ open: document.querySelector(".nav").classList.contains("is-open"), cTop: Math.round(document.getElementById("creators").getBoundingClientRect().top) }));
  await page.evaluate(() => scrollTo(0, document.getElementById("creators").getBoundingClientRect().top + scrollY));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${w}-creators.jpg`, quality: 70, type: "jpeg" });
  for (let i = 0; i < 4; i++) { await page.click(".creators__arrow.product__arrow--next", { force: true }).catch(() => {}); await page.waitForTimeout(700); }
  await page.screenshot({ path: `${out}/${w}-creators-end.jpg`, quality: 70, type: "jpeg" });
  await page.evaluate(() => scrollTo(0, document.getElementById("partner").getBoundingClientRect().top + scrollY - 40));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${w}-partner.jpg`, quality: 70, type: "jpeg", fullPage: false });
  const hd = await page.evaluate(() => { const f = document.querySelector(".hero__foot"), l = document.querySelector(".hero__lede"), b = document.querySelector(".hero__actions .btn"); return { lede: Math.round(l.getBoundingClientRect().width), btn: Math.round(b.getBoundingClientRect().width) }; });
  console.log(w, JSON.stringify({ ...st, ...hd }), errs.join("|") || "no errors");
  await page.close();
}
await browser.close();
