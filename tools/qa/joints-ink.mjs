// Межблочные стыки по пикселям (как видит глаз): низ контента блока → граница фона → верх букв заголовка следующего.
// usage: node tools/qa/joints-ink.mjs [w=480] [h=567] [out=tools/qa/shots/ink]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [w = "480", h = "567", out = "tools/qa/shots/ink"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(3000);
const joints = [
  ["duo → Продукция", "#duo", null, "#product .product__title"],
  ["Продукция → Инста", ".product__track", null, ".insta__title"],
  ["Инста → Нас выбирают", ".insta__tile", null, "#creators .product__title"],
  ["Нас выбирают → Где купить", ".creators__wall", "#retailWall", "#retailWall h2"],
  ["Где купить → Коллаборация", ".retailWall__grid", "#partner", "#partner h2"],
  ["Контакты → футер", ".partner__contacts", ".footer", ".footer__legal"],
];
for (const [name, prev, border, head] of joints) {
  const y = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, head);
  await page.evaluate((y) => scrollTo(0, y), Math.round(y - +h * 0.55)); await page.waitForTimeout(1500);
  const m = await page.evaluate(([prev, border, head]) => {
    const bottom = Math.max(...[...document.querySelectorAll(prev)].map((e) => e.getBoundingClientRect().bottom));
    const hr = document.querySelector(head).getBoundingClientRect();
    return { bottom, border: border ? document.querySelector(border).getBoundingClientRect().top : null, headTop: hr.top, headL: hr.left, headR: hr.right, headB: hr.bottom };
  }, [prev, border, head]);
  const file = `${out}/${w}x${h}-${name.replace(/[^a-zA-Zа-яА-Я]+/g, "_")}.png`;
  await page.screenshot({ path: file });
  // ink top: first row inside the heading box (from 10px above it) with bright text pixels
  const ink = await page.evaluate(async ([src, m]) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const k = img.width / innerWidth;
    for (let yy = Math.round((m.headTop - 10) * k); yy < m.headB * k; yy++) {
      const d = x.getImageData(Math.round(m.headL * k), yy, Math.round((m.headR - m.headL) * k), 1).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) n++;
      if (n > 3) return yy / k;
    }
    return null;
  }, ["data:image/png;base64," + (await import("node:fs")).readFileSync(file).toString("base64"), m]);
  const f = (v) => (v == null ? "—" : Math.round(v));
  console.log(`${name.padEnd(28)} контент→буквы ${f(ink - m.bottom)}  (контент→фон ${m.border == null ? "—" : f(m.border - m.bottom)}, фон→буквы ${m.border == null ? "—" : f(ink - m.border)}; коробка заголовка ${f(m.headTop - m.bottom)})`);
}
await browser.close();
