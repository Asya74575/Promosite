// DOMA by GUF v2 boot: Lenis + ScrollTrigger, world.js's shared WebGL frame loop, chapters (hero-doma.js, …) and
// the remaining DOM blocks (product.js and the rest of docs/scenario.md's structure). Preloader is deferred
// (scenario.md 2026-09-24) — the page opens straight on the hero, no curtain to gate behind.
// Rules: .claude/skills/scroll-3d-site-playbook/references/.
import { frame, compileAll, reduced } from "./world.js";
import { initHero } from "./hero-doma.js?v=09251452";
import { initPerks } from "./perks.js";
import { createProduct } from "./product.js";
import { initCreators } from "./creators.js";
import { initRetailWall } from "./retail-wall.js";
import { initInsta } from "./insta.js";
import { initPartnerCans } from "./partner-cans.js";

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
// ---------- Burger menu (≤820px): opens the full-screen link panel, page scroll stops while it is open ----------
const nav = $(".nav");
const burger = $(".nav__burger");
const setMenu = (open) => {
  nav.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", open);
  burger.setAttribute("aria-label", open ? "Закрыть меню" : "Меню");
  if (lenis) open ? lenis.stop() : lenis.start();
  document.documentElement.style.overflow = open ? "hidden" : "";
};
burger?.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
$$(".nav__menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); burger.focus(); } });
matchMedia("(min-width: 821px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

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
  initCreators({ reducedMotion: reduced });
  initRetailWall({ ScrollTrigger });
  initInsta({ ScrollTrigger });
  initPartnerCans({ ScrollTrigger });

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
// All four fields are required; errors are our own copy (novalidate) under each field. They appear on submit,
// then re-check live on input, and a non-empty field is also checked on blur.
const partnerForm = $("#partnerForm");
const partnerChecks = {
  name(v) {
    v = v.trim();
    if (!v) return "Введите имя";
    if (!/^[A-Za-zА-Яа-яЁё]+(?:[ '-][A-Za-zА-Яа-яЁё]+)*$/.test(v)) return "Имя может содержать только буквы, пробел и дефис";
    if (v.length < 2) return "Имя слишком короткое";
    return "";
  },
  phone(v) {
    v = v.trim();
    if (!v) return "Введите номер телефона";
    if (/[^\d\s()+-]/.test(v)) return "В номере могут быть только цифры";
    const d = v.replace(/\D/g, "");
    if (d.length !== 11 || !/^[78]/.test(d)) return "Номер должен состоять из 11 цифр, например +7 965 314 93 78";
    return "";
  },
  email(v) {
    v = v.trim();
    if (!v) return "Введите электронную почту";
    if (!v.includes("@")) return "В адресе не хватает символа «@»";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(v)) return "Проверьте адрес, например name@mail.ru";
    return "";
  },
  consent: (_, el) => (el.checked ? "" : "Нужно согласие на обработку персональных данных"),
};
const checkPartnerField = (el) => {
  const msg = partnerChecks[el.name](el.value, el);
  const err = document.getElementById(el.getAttribute("aria-describedby"));
  err.textContent = msg;
  err.hidden = !msg;
  el.setAttribute("aria-invalid", msg ? "true" : "false");
  return !msg;
};
// Ссылка на политику в строке согласия — заглушка, пока нет адреса страницы: не прыгать наверх и не ставить галочку.
partnerForm?.querySelector('.partner__check a[href="#"]')?.addEventListener("click", (e) => e.preventDefault());
partnerForm?.addEventListener("input", (e) => {
  if (e.target.getAttribute("aria-invalid")) checkPartnerField(e.target);
});
partnerForm?.addEventListener("change", (e) => {
  if (e.target.type === "checkbox") checkPartnerField(e.target);
});
partnerForm?.addEventListener("focusout", (e) => {
  if (e.target.name in partnerChecks && e.target.type !== "checkbox" && e.target.value.trim()) checkPartnerField(e.target);
});
partnerForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fields = [...partnerForm.querySelectorAll("input")];
  const bad = fields.filter((el) => !checkPartnerField(el));
  if (bad.length) { bad[0].focus(); return; }
  partnerForm.querySelectorAll("input").forEach((i) => (i.disabled = true));
  partnerForm.querySelector(".btn").hidden = true;
  partnerForm.querySelector(".partner__done").hidden = false;
});

boot();
