// Contact sheet: many screenshots on one labelled image, so a review costs one image instead of twenty.
// On a Claude Pro budget this is the cheapest way to look at a whole tour: read the sheet first, and open a
// full-size shot only for the frames that look wrong.
// usage: node sheet.mjs <folder> <out.jpg> [filter] [columns] [thumbWidth]
//   node sheet.mjs shots d-sheet.jpg d- 4 360     → every shots/d-*.jpg, four across
import { chromium } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [dir, out, filter = "", cols = "4", tw = "360"] = process.argv.slice(2);
if (!dir || !out) { console.log("usage: node sheet.mjs <folder> <out.jpg> [filter] [columns] [thumbWidth]"); process.exit(1); }
const files = readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f) && f.includes(filter) && join(dir, f) !== out).sort();
if (!files.length) { console.log("no images match"); process.exit(1); }
const cells = files.map((f) => {
  const mime = /\.png$/i.test(f) ? "image/png" : "image/jpeg";
  return `<figure><img src="data:${mime};base64,${readFileSync(join(dir, f)).toString("base64")}"><figcaption>${f}</figcaption></figure>`;
}).join("");
const html = `<body style="margin:0;background:#111;color:#ccc;font:12px/1.3 system-ui,sans-serif">
<div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:6px;padding:6px">${cells}</div>
<style>figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 0 4px}</style></body>`;
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: Number(cols) * (Number(tw) + 6) + 6, height: 800 } });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 72 });
await browser.close();
console.log(`${files.length} images → ${out}`);
