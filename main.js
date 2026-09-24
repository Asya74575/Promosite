// DOMA by GUF v2 boot: Lenis + ScrollTrigger, world.js's shared WebGL frame loop, chapters (hero-doma.js, …) and
// the remaining DOM blocks (product.js and the rest of docs/scenario.md's structure). Preloader is deferred
// (scenario.md 2026-09-24) — the page opens straight on the hero, no curtain to gate behind.
// Rules: .claude/skills/scroll-3d-site-playbook/references/.
import { frame, compileAll, reduced } from "./world.js";
import { initHero } from "./hero-doma.js";
import { initPerks } from "./perks.js";
import { createProduct } from "./product.js";
import { initRetailWall } from "./retail-wall.js";
import { initInsta } from "./insta.js";

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
if (new URLSearchParams(location.search).has("instant")) window.__qaInstant = true;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- Smooth scroll (one engine: Lenis) ----------
let lenis = null;
if (!reduced && Lenis) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const el = $(a.getAttribute("href"));
  if (!el) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView();
}));

// world.js draws every visible chapter once per GSAP tick, scissored into its own stage's rectangle
gsap.ticker.add(frame);

// ---------- Boot ----------
async function boot() {
  await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

  const { chapter: heroChapter } = initHero({ gsap, ScrollTrigger });
  initPerks({ gsap, ScrollTrigger });
  createProduct({ root: $("#product"), reducedMotion: reduced });
  initRetailWall({ ScrollTrigger });
  initInsta({ ScrollTrigger });

  await compileAll(); // shader warm-up for every registered chapter, off the render path until visible
  initScroll();
  window.__ready = true;
}

// ---------- Scroll-linked page chrome ----------
function initScroll() {
  // Nav colour follows the [data-ground] of the section under the bar (the hero stays dark throughout)
  const grounds = $$("[data-ground]");
  const updateGround = () => {
    let light = false;
    for (const sec of grounds) {
      const r = sec.getBoundingClientRect();
      if (r.top <= 40 && r.bottom > 40) { light = sec.dataset.ground === "light"; break; }
    }
    document.body.classList.toggle("ground-light", light);
  };
  let groundRaf = 0;
  const queueGround = () => { if (!groundRaf) groundRaf = requestAnimationFrame(() => { groundRaf = 0; updateGround(); }); };
  window.addEventListener("scroll", queueGround, { passive: true });
  window.addEventListener("resize", queueGround);
  lenis?.on("scroll", queueGround);
  ScrollTrigger.addEventListener("refresh", queueGround);
  updateGround();

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

let refreshTimer;
window.addEventListener("resize", () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 250); });

// ---------- Block 8 form: no backend on this concept demo, so submit shows the same confirmation copy a real
// integration would return instead of silently doing nothing or faking a network call.
const partnerForm = $("#partnerForm");
partnerForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  partnerForm.querySelectorAll("input").forEach((i) => (i.disabled = true));
  partnerForm.querySelector(".btn").hidden = true;
  partnerForm.querySelector(".partner__done").hidden = false;
});

boot();
