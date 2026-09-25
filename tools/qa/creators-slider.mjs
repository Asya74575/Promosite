// Слайдер «Блогеров» на 480–645px: клик по стрелке сдвигает ленту на одну карточку, стрелки гаснут на краях.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 560, height: 900 } });
await p.goto("http://localhost:5173/", { waitUntil: "load" }); await p.waitForTimeout(3000);
await p.evaluate(() => document.getElementById("creators").scrollIntoView());
await p.waitForTimeout(800);
const st = () => p.evaluate(() => { const t = document.querySelector(".creators__wall"); return [Math.round(t.scrollLeft), document.querySelector(".creators__arrow.product__arrow--prev").disabled, document.querySelector(".creators__arrow.product__arrow--next").disabled]; });
console.log("start", await st());
for (let i = 0; i < 3; i++) { await p.click(".creators__arrow.product__arrow--next"); await p.waitForTimeout(900); console.log("next", await st()); }
await p.click(".creators__arrow.product__arrow--prev"); await p.waitForTimeout(900); console.log("prev", await st());
await b.close();
