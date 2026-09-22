// usage: node profile.mjs <url>  — CPU profile of boot, aggregated by function and by file
import { chromium } from "playwright-core";
const [url] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
await cdp.send("Profiler.start");
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(11000);
const { profile } = await cdp.send("Profiler.stop");
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas, self = new Map();
profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dt[i] || 0)));
const fn = new Map(), file = new Map();
for (const [id, us] of self) {
  const cf = byId.get(id).callFrame;
  const f = (cf.url.split("/").slice(-1)[0] || "(native)") ;
  const k = `${cf.functionName || "(anon)"} @ ${f}:${cf.lineNumber + 1}`;
  if (["(idle)", "(program)", "(garbage collector)"].includes(cf.functionName)) { fn.set(cf.functionName, (fn.get(cf.functionName) || 0) + us); continue; }
  fn.set(k, (fn.get(k) || 0) + us);
  file.set(f, (file.get(f) || 0) + us);
}
// Inclusive time per top-level-ish function in our own files
const children = new Map(profile.nodes.map((n) => [n.id, n.children || []]));
const incl = (id) => (self.get(id) || 0) + children.get(id).reduce((a, c) => a + incl(c), 0);
const ours = new Map();
for (const n of profile.nodes) {
  const u = n.callFrame.url;
  if (!/127\.0\.0\.1:5173\/[a-z]+\.js/.test(u)) continue;
  const k = `${n.callFrame.functionName || "(anon)"} @ ${u.split("/").slice(-1)[0]}:${n.callFrame.lineNumber + 1}`;
  ours.set(k, (ours.get(k) || 0) + incl(n.id));
}
const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${(v / 1000).toFixed(0).padStart(6)} ms  ${k}`).join("\n");
console.log("== self time by file ==\n" + top(file, 14));
console.log("== self time by function ==\n" + top(fn, 25));
console.log("== inclusive time, our modules ==\n" + top(ours, 30));
await browser.close();
