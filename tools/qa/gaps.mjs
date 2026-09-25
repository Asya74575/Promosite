// Межблочные отступы: от низа видимого контента блока до верха видимого контента следующего. usage: node tools/qa/gaps.mjs [w=480] [h=800]
import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [w = "480", h = "800"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const secs = [...document.querySelectorAll("body > main > section, body > section, body > footer, main > section, main > footer")].filter((s, i, a) => a.indexOf(s) === i && s.offsetHeight > 0);
  return secs.map((s) => {
    const R = s.getBoundingClientRect(), cs = getComputedStyle(s);
    let t = Infinity, b = -Infinity;
    for (const el of s.querySelectorAll("h2, p, ul, img, video, form, dl, a, button, figure")) {
      if (!el.offsetWidth || getComputedStyle(el).visibility === "hidden") continue;
      const q = el.getBoundingClientRect(); if (q.height < 2) continue;
      t = Math.min(t, q.top); b = Math.max(b, Math.min(q.bottom, R.bottom));
    }
    return { id: s.id || s.className, top: Math.round(R.top + scrollY), h: Math.round(R.height), pt: cs.paddingTop, pb: cs.paddingBottom, cTop: Math.round(t - R.top), cBot: Math.round(R.bottom - b) };
  });
});
for (let i = 0; i < r.length; i++) {
  const s = r[i], n = r[i + 1];
  console.log(`${s.id.padEnd(12)} h ${s.h} pad ${s.pt}/${s.pb} content-in ${s.cTop}/${s.cBot}` + (n ? `  → gap to ${n.id}: ${s.cBot + n.cTop}` : ""));
}
await browser.close();
