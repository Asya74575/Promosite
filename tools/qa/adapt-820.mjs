// Адаптив 820px (пользователь 2026-09-24): кадры hero, «Преимуществ» (номер в карточке, размер продукта), стыка
// hero → «Фото + видео», шапки «Продукции» и слайдера «Блогеров». Ширины списком — проверить и соседние адаптивы.
// usage: node adapt-820.mjs <outDir> [widths=820] [h=1180]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/a820", widths = "820", h = "1180"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const w of widths.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: +h } });
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(4000);
  const go = async (y) => { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(1800); };
  const shot = (n) => page.screenshot({ path: `${out}/${w}-${n}.jpg`, quality: 78, type: "jpeg" });
  const top = (s) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, s);
  const vh = +h;
  await go(0); await shot("1-hero");
  // «Преимущества»: карточка стоит в центре, когда u целое; ищем кадр по видимой карточке ближе всего к центру
  const heroTop = await top("#hero");
  const heroH = await page.evaluate(() => document.getElementById("hero").offsetHeight);
  const span = heroH - vh, screens = span / vh, unit = (screens - 1.35) / (1.35 + 2.5);
  for (const k of [0, 1]) {
    await go(heroTop + (1.35 + (1.35 + k) * unit) * vh);
    await shot(`2-perks-${k}`);
  }
  const nInfo = await page.evaluate(() => [...document.querySelectorAll(".perks__card")].filter((c) => c.style.visibility === "visible").map((c) => {
    const r = c.getBoundingClientRect(), n = c.querySelector(".perks__n").getBoundingClientRect();
    return { cardC: Math.round(r.left + r.width / 2), nC: Math.round(n.left + n.width / 2), cardW: Math.round(r.width) };
  }));
  const duo = await top("#duo");
  await go(duo - vh + 80); await shot("3-duo-seam");
  await go(await top("#product")); await shot("4-product");
  await go(await top("#creators")); await shot("5-creators");
  console.log(w, JSON.stringify(nInfo), errs.length ? errs.join(" | ") : "no errors");
  await page.close();
}
await browser.close();
