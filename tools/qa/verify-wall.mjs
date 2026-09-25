import { chromium } from "playwright-core";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--enable-gpu"] });

async function run(w, h, tag, shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3500);
  const state = () => page.evaluate(() => {
    const head = document.querySelector(".retailWall__head").getBoundingClientRect();
    const grid = document.querySelector("[data-retail-wall]").getBoundingClientRect();
    const cols = [...document.querySelectorAll(".retailWall__col")];
    const st = window.ScrollTrigger.getAll().find((t) => t.trigger?.matches?.("[data-retail-wall]"));
    return {
      p: st ? +st.progress.toFixed(2) : null,
      shift: cols.map((c) => { const m = /translateY\(([-\d.]+)px\)/.exec(c.style.transform); return m ? Math.round(-m[1]) : 0; }),
      gapToHead: Math.round(Math.min(...cols.map((c) => c.getBoundingClientRect().top)) - head.bottom),
      gridTopOnScreen: Math.round(grid.top),
      bottoms: cols.map((c) => Math.round(c.getBoundingClientRect().bottom)),
    };
  });
  const y0 = await page.evaluate(() => document.querySelector("[data-retail-wall]").getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo(0, y - innerHeight - 40), y0);
  await page.waitForTimeout(500);
  let i = 0, minGap = Infinity;
  const marks = [0, 0.5, 1];
  const taken = new Set();
  for (let step = 0; step < 80; step++) {
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(35);
    if (step % 4 === 0) {
      await page.waitForTimeout(150);
      const s = await state();
      minGap = Math.min(minGap, s.gapToHead);
      console.log(tag, JSON.stringify(s));
      for (const m of marks) {
        if (shots && !taken.has(m) && Math.abs(s.p - m) < 0.08) {
          taken.add(m);
          await page.screenshot({ path: `${out}/${tag}-p${m}.jpg`, quality: 78, type: "jpeg" });
        }
      }
      if (s.p >= 1 && taken.has(1)) break;
    }
  }
  console.log(tag, "min gap cards→heading:", minGap, "errors:", errors.length ? errors : "none");
  await page.close();
}
await run(1600, 900, "d1600", true);
await run(1900, 900, "d1900", false);
await run(390, 844, "phone", true);
await browser.close();
