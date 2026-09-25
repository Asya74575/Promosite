// ≤480px (пользователь 2026-09-25): банки в карточках «Продукции» целиком, карточки видео вытянутые.
// usage: node tools/qa/product-480.mjs <out> [w=480] [heights=600,700,900]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out = "tools/qa/shots/p480", w = "480", hs = "600,700,900"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const h of hs.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: +w, height: h } });
  await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3000);
  const go = async (s) => { await page.evaluate((s) => scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY - 70), s); await page.waitForTimeout(1500); };
  await go(".product__carousel");
  const m = await page.evaluate(() => [...document.querySelectorAll(".product__panel")].slice(0, 3).map((p) => {
    const i = p.querySelector(".product__img"); if (!i) return null;
    const a = p.getBoundingClientRect(), b = i.getBoundingClientRect();
    return { cardH: Math.round(a.height), imgBottomGap: Math.round(a.bottom - b.bottom), imgH: Math.round(b.height) };
  }));
  await page.screenshot({ path: `${out}/${w}x${h}-product.jpg`, type: "jpeg", quality: 72 });
  await go(".creators__wall");
  const c = await page.evaluate(() => { const r = document.querySelector(".creators__screen").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  await page.screenshot({ path: `${out}/${w}x${h}-creators.jpg`, type: "jpeg", quality: 72 });
  console.log(w, h, "product", JSON.stringify(m), "creator card", c.join("x"));
  await page.close();
}
await browser.close();
