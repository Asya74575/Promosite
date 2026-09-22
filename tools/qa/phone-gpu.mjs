// usage: node phone-gpu.mjs <url> <outDir> [sectionSelector="#story"] [fractions="0.1,0.5"]
// Touch phone viewport (390×844, dpr 3) under GPU limits common on phones, with screenshots of one WebGL section:
//   base           no restrictions
//   noFloatBuffer  EXT_color_buffer_float / _half_float / OES_texture_float_linear unavailable (PMREM env maps and
//                  GPGPU simulations fail; metallic models go black if the scene doesn't adapt)
//   mediump        highp unavailable, so three.js compiles shaders at mediump
// Phone emulation on a desktop GPU alone does not reproduce phone rendering bugs; these variants cover the common ones.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, outDir, selector = "#story", fracs = "0.1,0.5"] = process.argv.slice(2);
if (!url || !outDir) { console.log("usage: node phone-gpu.mjs <url> <outDir> [sectionSelector] [fractions]"); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"] });
for (const variant of ["base", "noFloatBuffer", "mediump"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await context.addInitScript((variant) => {
    window.__qaInstant = true;
    const blocked = /^(EXT_color_buffer_float|EXT_color_buffer_half_float|OES_texture_float_linear)$/;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const getExtension = proto.getExtension, getSupported = proto.getSupportedExtensions, getPrecision = proto.getShaderPrecisionFormat;
      proto.getExtension = function (name) { return variant === "noFloatBuffer" && blocked.test(name) ? null : getExtension.call(this, name); };
      proto.getSupportedExtensions = function () { const list = getSupported.call(this) || []; return variant === "noFloatBuffer" ? list.filter((n) => !blocked.test(n)) : list; };
      proto.getShaderPrecisionFormat = function (shaderType, precisionType) {
        if (variant === "mediump" && precisionType === this.HIGH_FLOAT) return { rangeMin: 0, rangeMax: 0, precision: 0 };
        return getPrecision.call(this, shaderType, precisionType);
      };
    }
  }, variant);
  const page = await context.newPage();
  const logs = [];
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(m.type() + ": " + m.text().slice(0, 150)));
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForFunction(() => !document.getElementById("preloader"), null, { timeout: 90000 }).catch(() => logs.push("preloader never left"));
  await page.waitForFunction((sel) => { const el = document.querySelector(sel); return el && !el.hidden; }, selector, { timeout: 30000 })
    .catch(() => logs.push(`section ${selector} missing or hidden`));
  await page.waitForTimeout(1500);
  for (const f of fracs.split(",").map(Number)) {
    await page.evaluate(([sel, f]) => {
      const el = document.querySelector(sel);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY + f * Math.max(0, el.offsetHeight - innerHeight));
    }, [selector, f]);
    await page.mouse.wheel(0, 2);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${outDir}/${variant}-${String(f).replace(".", "_")}.jpg`, type: "jpeg", quality: 70 });
  }
  console.log(`[${variant}]`, [...new Set(logs)].slice(0, 6).join(" || ") || "no errors");
  await context.close();
}
await browser.close();
