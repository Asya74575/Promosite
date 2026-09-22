// Collect free (non-Unsplash+) photo candidates from Unsplash search pages with a real browser, and build a contact
// sheet so a human can choose. Unsplash License: free for commercial use, no attribution required.
// usage: node tools/qa/stock-unsplash.mjs <outDir> <query> [queryвЂ¦]
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [out, ...queries] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36" });
const all = [];
for (const q of queries) {
  await page.goto(`https://unsplash.com/s/photos/${encodeURIComponent(q)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('img[src*="images.unsplash.com/photo-"]').length > 6, null, { timeout: 45000 }).catch(() => {});
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 1600); await page.waitForTimeout(700); }
  const items = await page.evaluate(() => [...document.querySelectorAll('img[src*="images.unsplash.com/photo-"]')].map((img) => {
    const a = img.closest("a[href*='/photos/']");
    return { src: img.src.split("?")[0], alt: img.alt, page: a ? a.href : "" };
  }).filter((x) => x.page && !x.src.includes("premium")));
  const seen = new Set();
  const uniq = items.filter((x) => !seen.has(x.src) && seen.add(x.src)).slice(0, 18);
  console.log(`${q}: ${uniq.length}`);
  uniq.forEach((x, i) => all.push({ q, i, ...x }));
}
writeFileSync(`${out}/candidates.json`, JSON.stringify(all, null, 1));
// Contact sheet: thumbnails with their index, per query
const html = `<body style="margin:0;background:#111;font:11px sans-serif;color:#ddd">${queries.map((q) => `<h3 style="margin:8px">${q}</h3><div style="display:flex;flex-wrap:wrap;gap:4px;padding:0 8px">${all.filter((x) => x.q === q).map((x) => `<figure style="margin:0;width:220px"><img src="${x.src}?w=440&q=60" style="width:220px;height:146px;object-fit:cover"><figcaption>${x.i} В· ${x.alt.slice(0, 40)}</figcaption></figure>`).join("")}</div>`).join("")}</body>`;
await page.setContent(html);
await page.waitForTimeout(6000);
await page.screenshot({ path: `${out}/sheet.jpg`, fullPage: true, type: "jpeg", quality: 70 });
await browser.close();
