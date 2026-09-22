// DOMA by GUF choreography: CSS preloader → Lenis + ScrollTrigger → panel-wall hero that tears open (hero-doma.js)
// → odometer stats → pinned 3D story → FAQ → CTA. Story/about/faq/cta are still starter placeholders — blocks
// 2–8 of docs/scenario.md land in later sessions (see STATUS.md). Rules: .claude/skills/scroll-3d-site-playbook/references/.
import { createHero } from "./hero-doma.js";
import { createTowers } from "./scene-towers.js";
import { initSections } from "./sections.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Resolves after n animation frames, so the browser gets to paint between heavy boot steps
const frames = (n = 2) => new Promise((resolve) => { const step = () => (--n > 0 ? requestAnimationFrame(step) : resolve()); requestAnimationFrame(step); });
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const DIGITS = [..."01234567890123456789"].map((d) => `<span>${d}</span>`).join("");

// ---------- Smooth scroll (one engine: Lenis) ----------
let lenis = null;
if (!reduce && Lenis) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  // Lenis is stopped only while the preloader is up and while a dialog is open; if anything else leaves it stopped,
  // the next wheel or key press restarts it instead of leaving the mouse wheel dead
  const unfreeze = () => { if (lenis.isStopped && !$("#preloader") && !$("dialog[open]")) lenis.start(); };
  window.addEventListener("wheel", unfreeze, { passive: true, capture: true });
  window.addEventListener("keydown", unfreeze);
}
$$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const el = $(a.getAttribute("href"));
  if (!el) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView();
}));

let hero = null, towers = null;

// ---------- Boot: heavy work happens behind the CSS-animated preloader ----------
async function boot() {
  const pre = $("#preloader"), bar = $("#preBar");
  const minShow = wait(reduce ? 0 : 2100); // the year roll always completes

  // Fonts only refine layout; a slow font CDN must not hold the page
  await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1500)]);
  hero = createHero({ root: $("#hero"), reducedMotion: reduce });
  await frames();
  try {
    towers = createTowers({ canvas: $("#storyCanvas"), reducedMotion: reduce });
  } catch (err) {
    console.warn("Story scene unavailable:", err);
    $("#storyCanvas").style.display = "none";
  }
  initScroll();
  // Shader warm-up stays behind the preloader (capped, so a slow network never holds the page)
  if (towers?.ready) await Promise.race([towers.ready, wait(9000)]);
  await frames();

  if (reduce) { pre.remove(); return; }
  await minShow;

  const shown = getComputedStyle(bar).transform;
  bar.style.animation = "none";
  gsap.timeline({ onComplete: () => { pre.remove(); lenis?.start(); ScrollTrigger.refresh(); } })
    .fromTo(bar, { scaleX: shown && shown !== "none" ? new DOMMatrix(shown).a : 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, 0)
    .to(pre, { yPercent: -100, duration: 1, ease: "power4.inOut" }, 0.3)
    .from(".hero__tag", { autoAlpha: 0, y: 20, duration: 1.1, ease: "power3.out" }, 0.5)
    .from(".hero h1 .line > span", { yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.09 }, 0.7)
    .from(".hero__eyebrow, .hero__foot", { y: 24, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 1.05)
    .from(".hero__cue", { autoAlpha: 0, duration: 0.8 }, 1.6);
}

// ---------- Scroll-linked scenes ----------
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

  // Odometer counters: the element's text is the final value; each digit column spins into place once
  $$("[data-count]").forEach((el) => {
    if (reduce) return;
    const final = el.textContent.trim(), digits = [...final].filter((c) => /\d/.test(c)).map(Number);
    el.classList.add("odo");
    el.innerHTML = `<span class="sr-only">${final}</span>` + [...final].map((ch) => (/\d/.test(ch)
      ? `<span class="odo__col" aria-hidden="true"><span class="odo__strip">${DIGITS}</span></span>`
      : `<span class="odo__sym" aria-hidden="true">${ch}</span>`)).join("");
    const strips = $$(".odo__strip", el), syms = $$(".odo__sym", el);
    const item = el.closest('[role="listitem"]');
    const order = item ? [...item.parentElement.children].indexOf(item) : 0;
    if (syms.length) gsap.set(syms, { autoAlpha: 0, yPercent: 60 }); // plain numbers ("36") have no symbols to animate
    ScrollTrigger.create({
      trigger: el, start: "top 95%", once: true,
      onEnter: () => {
        const delay = 0.2 + order * 0.14;
        strips.forEach((s, i) => gsap.to(s, { yPercent: -((10 + digits[i]) / 20) * 100, duration: 1.3 + i * 0.22, delay, ease: "expo.out" }));
        if (syms.length) gsap.to(syms, { autoAlpha: 1, yPercent: 0, duration: 0.7, delay: delay + 0.35, ease: "power3.out", stagger: 0.06 });
      },
    });
  });

  // FAQ, fitted wordmark and any other sections.js pattern present in the markup
  initSections({ gsap, ScrollTrigger, lenis, reduce });

  if (reduce) { towers?.setProgress(0.5); return; }

  // Hero: the wall tears open as the section scrolls past (hero-doma.js owns the clip-path + product parallax)
  ScrollTrigger.create({ trigger: "#hero", start: "top top", end: "bottom bottom", scrub: true, onUpdate: ({ progress }) => hero?.setProgress(progress) });

  // Pinned story: one trigger feeds the 3D scene, the caption windows and the progress bar
  const captions = $$(".caption"), storyBar = $("#storyBar");
  const storyUpdate = (p) => {
    towers?.setProgress(p);
    captions.forEach((c) => {
      const a = seg(p, +c.dataset.from - 0.03, +c.dataset.from + 0.01) * (1 - seg(p, +c.dataset.to - 0.02, +c.dataset.to + 0.02));
      c.style.opacity = a.toFixed(3);
      c.style.transform = `translateY(${((1 - a) * 18).toFixed(1)}px)`;
    });
    storyBar.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  storyUpdate(0);
  ScrollTrigger.create({ trigger: "#story", start: "top top", end: "bottom bottom", scrub: true, onUpdate: ({ progress }) => storyUpdate(progress) });

  // Reveals from a visible resting state (never add them to elements another script animates)
  $$(".about__statement, .stat__label, .faq__aside, .qa, .cta__row").forEach((el) => {
    gsap.from(el, { y: 36, autoAlpha: 0, duration: 1, ease: "power4.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

boot();
