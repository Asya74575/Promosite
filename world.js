// The world — one WebGL context for the whole page (Variant B, scroll-3d-site-playbook/references/architecture.md).
//
// Every chapter owns a scene and a camera but not a canvas. A single fixed canvas sits under the page, and each
// frame the renderer draws each chapter into the screen rectangle of its [data-stage] element, scissored to it.
// The DOM stays on top and keeps the scroll, the text and the pointer; the world only paints where it is told.
// Chapters are independent scenes sharing one context/canvas — not one camera flying through one continuous space.
// Adapted from templates/reference-lumara/site/world.js (shipped, client-reviewed pattern) — see STATUS.md 2026-09-24
// for why: the v1 hero used a bespoke single Three.js scene and broke apart under real (non-scripted) scroll.

import * as THREE from "three";

export const coarse = matchMedia("(pointer: coarse)").matches;
export const lite = coarse || Math.min(screen.width, screen.height) < 700;
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("world");
export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !lite,
  alpha: true,
  powerPreference: "high-performance",
  stencil: false,
});
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

const MAX_DPR = lite ? 1.25 : 1.75;
let W = 0, H = 0, dpr = 1;

function fit() {
  const w = innerWidth, h = innerHeight;
  const d = Math.min(devicePixelRatio || 1, MAX_DPR);
  if (w === W && h === H && d === dpr) return;
  W = w; H = h; dpr = d;
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
}
fit();
addEventListener("resize", fit);

// ── Chapters ────────────────────────────────────────────────────────────────
const chapters = [];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const ch = chapters.find((c) => c.el === e.target);
    if (!ch) continue;
    ch.visible = e.isIntersecting;
    ch.onVisible?.(ch.visible);
  }
}, { rootMargin: "8% 0px 8% 0px" });

export function register(chapter) {
  chapter.visible = false;
  chapter.w = 0; chapter.h = 0;
  chapters.push(chapter);
  io.observe(chapter.el);
  return chapter;
}

// Shader compilation is the main source of first-scroll jank. Every chapter compiles while the boot screen is
// still up, off the main thread where the driver allows it.
export async function compileAll() {
  await Promise.all(chapters.map((c) => renderer.compileAsync(c.scene, c.camera).catch(() => {})));
}

// ── Frame ───────────────────────────────────────────────────────────────────
let last = performance.now();
const clock = { t: 0 };

export function frame() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock.t += dt;

  fit();
  renderer.setScissorTest(false);
  renderer.clear(true, true, false);
  renderer.setScissorTest(true);

  for (const ch of chapters) {
    if (!ch.visible) continue;
    const r = ch.el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= H || r.width < 2 || r.height < 2) continue;
    if (r.width !== ch.w || r.height !== ch.h) {
      ch.w = r.width; ch.h = r.height;
      if (ch.camera.isPerspectiveCamera) { ch.camera.aspect = ch.w / ch.h; ch.camera.updateProjectionMatrix(); }
      ch.resize?.(ch.w, ch.h);
    }
    ch.update(dt, clock.t, r);
    // The viewport is the whole stage, so the picture scrolls with its section; the scissor keeps it off the rest
    const y = H - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height);
    const top = Math.max(0, r.top), bottom = Math.min(H, r.bottom);
    renderer.setScissor(r.left, H - bottom, r.width, bottom - top);
    renderer.toneMapping = ch.toneMapping ?? THREE.NoToneMapping;
    renderer.toneMappingExposure = ch.exposure ?? 1;
    renderer.clearDepth();
    renderer.render(ch.scene, ch.camera);
  }
}

// ── Shared helpers ──────────────────────────────────────────────────────────

// Pointer in stage space, -1..1, eased — every chapter's parallax reads the same softened hand
export function pointerFor(el) {
  const p = { x: 0, y: 0, tx: 0, ty: 0, inside: false };
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    p.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    p.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    p.inside = true;
  }, { passive: true });
  el.addEventListener("pointerleave", () => { p.inside = false; p.tx = 0; p.ty = 0; });
  p.ease = (dt, k = 3) => {
    const a = 1 - Math.exp(-k * dt);
    p.x += (p.tx - p.x) * a; p.y += (p.ty - p.y) * a;
  };
  return p;
}

export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
