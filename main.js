// DOMA by GUF choreography: CSS preloader (brick wall, tears open — same jagged mask as the hero) → Lenis +
// ScrollTrigger → hero (panel wall tears to reveal the can + bag). Blocks 2–8 of docs/scenario.md are not built
// yet — see STATUS.md for the order. Rules: .claude/skills/scroll-3d-site-playbook/references/.
import { createHero } from "./hero-doma.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Resolves after n animation frames, so the browser gets to paint between heavy boot steps
const frames = (n = 2) => new Promise((resolve) => { const step = () => (--n > 0 ? requestAnimationFrame(step) : resolve()); requestAnimationFrame(step); });

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

let hero = null;

// ---------- Boot: heavy work happens behind the CSS-animated preloader ----------
async function boot() {
  const pre = $("#preloader"), bar = $("#preBar");
  const minShow = wait(reduce ? 0 : 2100);

  // Fonts only refine layout; a slow font CDN must not hold the page
  await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1500)]);
  hero = createHero({ root: $("#hero"), reducedMotion: reduce });
  await frames();
  initScroll();
  await frames();

  if (reduce) { pre.remove(); return; }
  await minShow;

  const shown = getComputedStyle(bar).transform;
  bar.style.animation = "none";
  gsap.timeline({ onComplete: () => { pre.remove(); lenis?.start(); ScrollTrigger.refresh(); } })
    .fromTo(bar, { scaleX: shown && shown !== "none" ? new DOMMatrix(shown).a : 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, 0)
    // The preloader tears open on the same jagged mask as the hero (.tear-mask, --tear 0в†’1) instead of sliding away
    .to(pre, { "--tear": 1, duration: 1.3, ease: "power3.inOut" }, 0.3)
    .from(".hero__tag", { autoAlpha: 0, y: 20, duration: 1.1, ease: "power3.out" }, 0.55)
    .from(".hero h1 .line > span", { yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.09 }, 0.75)
    .from(".hero__eyebrow, .hero__foot", { y: 24, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 1.1)
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

  if (reduce) return;

  // Hero: the wall tears open as the section scrolls past (hero-doma.js owns the clip-path + product parallax)
  ScrollTrigger.create({ trigger: "#hero", start: "top top", end: "bottom bottom", scrub: true, onUpdate: ({ progress }) => hero?.setProgress(progress) });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

boot();
