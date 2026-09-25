// Адаптив 480–645px (пользователь 2026-09-24): скриншоты правленых блоков + замеры отступов.
// usage: node tools/qa/adapt-645.mjs <outDir> [widths=480,560,645] [h=900]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/adapt", widths = "480,560,645", h = "900"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const w of widths.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: +h } });
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 160)));
  await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3500);
  const go = async (y) => { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(1600); };
  const top = (s) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, s);
  const shot = (n) => page.screenshot({ path: `${out}/${w}-${n}.jpg`, type: "jpeg", quality: 72 });

  // 1–3 · hero и преимущества
  await go(0); await shot("1-hero");
  const heroM = await page.evaluate(() => {
    const R = (s) => document.querySelector(s).getBoundingClientRect();
    const c = R(".hero__copy"), l = R(".hero__lede"), b = R(".hero__actions .btn");
    return { copyTop: Math.round(c.top), copyBottom: Math.round(c.bottom), copyCenter: Math.round((c.top + c.bottom) / 2), vh: innerHeight,
             ledeW: Math.round(l.width), btnW: Math.round(b.width), ledeL: Math.round(l.left), btnL: Math.round(b.left) };
  });
  const heroTop = await top("#hero");
  const vh = +h;
  await go(heroTop + vh * 0.8); await shot("1b-hero-mid");
  await go(heroTop + vh * 2.2); await shot("3-perks-a");
  await go(heroTop + vh * 3.6); await shot("3-perks-b");
  // 4 · видео-слайдер
  await go(await top("#creators")); await shot("4-creators");
  // 5 · где купить: начало / середина / конец
  const rw = await top("#retailWall");
  for (const [i, f] of [[0, -0.4], [1, 0.3], [2, 0.9], [3, 1.5]]) { await go(rw + f * vh); await shot(`5-retail-${i}`); }
  // 6 · коллаборация
  await go(await top("#partner")); await shot("6-partner");
  // 7 · футер
  await go(1e6); await shot("7-footer");
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(w, JSON.stringify(heroM), "scrollWidth", sw, errs.length ? errs.join(" | ") : "no errors");
  await page.close();
}
await browser.close();
