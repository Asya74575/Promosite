// Hero chapter — DOMA v2 (scenario.md "Тёмная product-stage"). One of world.js's independent chapters: its own
// scene/camera, scissored into #heroStage's rectangle on the shared canvas. Can + pack are THREE.Sprite, not
// plane meshes — a sprite always faces the camera by construction, so it cannot end up "cut off at an angle"
// the way the v1 Three.js hero did under real mouse-wheel scroll (see STATUS.md 2026-09-24). No tear-mask reveal
// (removed 2026-09-24 — its partially-open jagged edge read as an unwanted triangle in the frame): the stage is
// plain dark, objects fade/rise straight in (scan-line removed 2026-09-25, user request). The two real shader
// bugs found in the v1 attempt (sRGB encoding, smoothstep(a,b) needing a<b) are gone because there is no
// custom fragment shader here at all.
import * as THREE from "three";
import { register, pointerFor, smooth, damp, reduced, lite } from "./world.js";
import { TRAVEL_END, perksSpill, perksNumTop } from "./perks.js";

const loader = new THREE.TextureLoader();
function loadSprite(url, { z = 0, rotation = 0 } = {}) {
  // SpriteMaterial.rotation (radians, CCW) tilts the flat image independent of the camera — the composition
  // angle comes from here, not from the source photo, so it can match a reference layout regardless of how
  // each product was originally shot.
  const material = new THREE.SpriteMaterial({ map: null, transparent: true, depthWrite: false, rotation });
  const sprite = new THREE.Sprite(material);
  sprite.position.z = z;
  sprite.scale.set(0.0001, 0.0001, 1); // avoid a 0-scale NaN in the matrix before the texture arrives
  loader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    material.map = tex;
    material.needsUpdate = true;
    sprite.userData.aspect = tex.image.width / tex.image.height;
    sprite.userData.pts = opaquePoints(tex.image);
    sprite.userData.loaded = true;
  });
  return sprite;
}

// Opaque outline of a product photo as sprite-local points (x, y in −0.5…0.5, y up), sampled on a coarse grid.
// The 480–645px layout frames the pair by what is actually drawn, not by the transparent sprite rectangle around it.
function opaquePoints(img) {
  const N = 72, a = img.width / img.height;
  const cw = a >= 1 ? N : Math.round(N * a), ch = a >= 1 ? Math.round(N / a) : N;
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, cw, ch);
  const d = g.getImageData(0, 0, cw, ch).data, pts = [];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (d[(y * cw + x) * 4 + 3] > 40) pts.push((x + 0.5) / cw - 0.5, 0.5 - (y + 0.5) / ch);
  }
  return pts;
}

// A soft radial "spotlight pool" on the floor — the practical-light look without a real shadow map (lite-friendly)
function poolTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,235,210,0.55)");
  grad.addColorStop(0.45, "rgba(255,225,190,0.18)");
  grad.addColorStop(1, "rgba(255,225,190,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initHero({ gsap, ScrollTrigger }) {
  const section = document.getElementById("hero");
  const stage = document.getElementById("heroStage");
  const scene = new THREE.Scene();
  // The scene, not the DOM, owns the dark stage colour: .hero has no opaque background (it would paint over the
  // canvas — see style.css) and the renderer's own clear is transparent, so empty canvas area must come from
  // here or it shows the light page background through.
  scene.background = new THREE.Color(0x0b0b0a);
  // Фон hero — текстура карты (user 2026-09-24), заполняет сцену как background-size: cover. До загрузки — тёмный цвет.
  let bgTex = null;
  const fitBg = () => {
    if (!bgTex || !vw || !vh) return;
    const img = bgTex.image.width / bgTex.image.height, view = vw / vh;
    const sx = Math.min(1, view / img), sy = Math.min(1, img / view);
    bgTex.repeat.set(sx, sy);
    bgTex.offset.set((1 - sx) / 2, (1 - sy) / 2);
  };
  loader.load("assets/img/hero-bg.webp", (src) => {
    // Затемнение фона: чёрный слой 80% поверх картинки (user 2026-09-24)
    const c = document.createElement("canvas");
    c.width = src.image.width;
    c.height = src.image.height;
    const g = c.getContext("2d");
    g.drawImage(src.image, 0, 0);
    g.fillStyle = "rgba(0,0,0,0.8)";
    g.fillRect(0, 0, c.width, c.height);
    src.dispose();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    bgTex = tex;
    fitBg();
    scene.background = tex;
  });
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0.3, 9);

  // Practical light: one warm key (the "фонарь"), a cool dim rim, faint ambient fill — no RGB/neon per brand.md
  scene.add(new THREE.AmbientLight(0x9fb0c0, 0.22));
  const key = new THREE.PointLight(0xffe6c2, 24, 18, 2);
  key.position.set(2.2, 3.4, 4.5);
  scene.add(key);
  const rim = new THREE.PointLight(0x6f7f95, 8, 16, 2);
  rim.position.set(-3, 1.5, -2);
  scene.add(rim);

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  pool.position.set(2.9, -1.55, 0);
  scene.add(pool);

  // Can + pack — real client photography (alpha-cut), always facing the camera. Composition matches the
  // reference the user sent (2026-09-24): the two are near-equal in height, tucked into one tight cluster
  // with a real overlap, can back-left, bag front-right — the bag's left edge sits in front of the can,
  // not behind it, since a sprite pair without depthWrite is painted back-to-front by distance to camera.
  // Both source photos are themselves shot on a diagonal, off-centre in their alpha-cut canvas, so
  // SpriteMaterial.rotation orbits the visible object around that off-centre pivot rather than just
  // spinning it in place — these values were converged on by rendering, not derived analytically.
  // Reference: can stands almost upright; bag leans the opposite way from the can, not the same way
  // (confirmed against the reference 2026-09-24 — an earlier pass wrongly matched the bag to the can's tilt).
  const can = loadSprite("assets/img/hero-can.webp", { z: -0.35, rotation: 0.75 });
  const bag = loadSprite("assets/img/hero-bag.webp", { z: 0.45, rotation: -0.05 });
  const CAN_REST_Y = -0.05, BAG_REST_Y = 0.05;
  const CAN_X = 1.65, BAG_X = 3.45, SPREAD = -0.03;
  can.position.set(CAN_X, CAN_REST_Y, 0);
  bag.position.set(BAG_X, BAG_REST_Y, 0);
  can.renderOrder = 0;
  bag.renderOrder = 1; // explicit, so the bag always paints over the can regardless of distance-sort quirks
  // The perks cards (DOM, #perks) roll past BEHIND the product (user 2026-09-24), but the shared world canvas sits
  // under all DOM. So can + pack get their own transparent scene and canvas, layered in #heroStage right above the
  // cards; the dark background and the floor pool stay on the world canvas below them. Same camera, same tone mapping.
  const front = new THREE.Scene();
  front.add(can, bag);
  const frontCanvas = document.createElement("canvas");
  frontCanvas.className = "hero__front";
  frontCanvas.setAttribute("aria-hidden", "true");
  const perksEl = document.getElementById("perks");
  if (perksEl) perksEl.after(frontCanvas); else stage.prepend(frontCanvas);
  const frontRenderer = new THREE.WebGLRenderer({ canvas: frontCanvas, antialias: !lite, alpha: true, stencil: false });
  frontRenderer.setClearColor(0x000000, 0);
  frontRenderer.outputColorSpace = THREE.SRGBColorSpace;
  frontRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  frontRenderer.toneMappingExposure = 1.05;

  const CAN_H = 3.05, BAG_H = 3.25; // resting heights in world units, aspect-corrected once the texture loads
  const sizeSprite = (sprite, h) => {
    const a = sprite.userData.aspect;
    if (!a) return;
    sprite.scale.set(h * a, h, 1);
  };

  const pointer = pointerFor(stage);
  // v = screens scrolled into the pinned hero+perks stage (1 = one viewport height). The product travels from
  // its hero composition to the centre of the second screen over 0…TRAVEL_END, then holds while perks.js rolls
  // the cards past above it (MANA mechanic, see perks.js).
  let v = 0;
  if (!reduced) {
    ScrollTrigger.create({
      trigger: section, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (s) => (v = s.progress * (s.end - s.start) / innerHeight),
    });
  }
  const copyEl = document.getElementById("heroCopy");
  const cueEl = section.querySelector(".hero__cue");

  // Reveal progress: boot-in on load, continuing via scroll — `max(boot, scroll)`, read fresh every frame in
  // update() below so a plain object, not a DOM style property, is the single source of truth.
  const bootReveal = { v: reduced ? 1 : 0 };

  if (!reduced) {
    gsap.to(bootReveal, { v: 1, duration: 1.1, ease: "power3.out", delay: 0.15 });
    gsap.from(".hero h1 .line > span", { yPercent: 110, duration: 0.65, ease: "power4.out", stagger: 0.055, delay: 0.6 });
    gsap.from(".hero__foot", { y: 18, autoAlpha: 0, duration: 0.5, ease: "power3.out", delay: 0.85 });
    gsap.from(".hero__cue", { autoAlpha: 0, duration: 0.45, delay: 1.15 });
  }

  let vw = 0, vh = 0, dolly = 0, travel = 0, frontSpill = 0;
  const PERKS_DROP = 50; // ≤900px second screen: extra downward shift (px) of the pair under the perks cards

  // ≤645px (user 2026-09-24 for 480–645, 2026-09-25 for all ≤645): the hero copy is centred and the pair stands centred under it, 40px below the
  // button, the whole group centred in the stage under the nav. On the second screen the pair grows to the content
  // width and sinks past the bottom edge the way it does on desktop. Both frames are a zoom + shift of the same rest
  // camera (setViewOffset with a larger full size), solved from the pair's real outline in that camera's view.
  const midMQ = matchMedia("(max-width: 699px)");
  const MID_GAP = 40, MID_TOP = 50, MID_SHOW = 0.55; // SHOW: share of the pair's height left on screen (desktop look)
  // ≤479px (user 2026-09-25, адаптив 390): while the copy fades, the pair grows to the full screen height under the
  // nav (frameZ, centred), then shrinks into the second-screen landing (frame1) as before. The zoom is done by the
  // view offset only, so the camera stays at the rest distance the frames are solved for.
  const zoomMQ = matchMedia("(max-width: 479px)");
  let mid = false, midLaid = false, frame0 = null, frame1 = null, frameZ = null;
  const baseCam = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const tmp = new THREE.Vector3();
  // Screen bounds (px) of the drawn pair at rest, seen by the un-offset rest camera (pointer centred, no dolly)
  // (z, spread: another camera distance and the second-screen parting, for the 646–820px landing below)
  const pairBounds = (w, h, z = 9, spread = 0) => {
    baseCam.aspect = w / h;
    baseCam.position.set(1.15, 0.3, z);
    baseCam.lookAt(2.9, -0.1, 0);
    baseCam.updateMatrixWorld();
    const t = Math.tan(THREE.MathUtils.degToRad(baseCam.fov / 2));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [s, H, X, Y] of [[can, CAN_H, CAN_X - spread, CAN_REST_Y], [bag, BAG_H, BAG_X + spread, BAG_REST_Y]]) {
      tmp.set(X, Y, s.position.z).applyMatrix4(baseCam.matrixWorldInverse);
      const k = h / 2 / (-tmp.z * t), cx = w / 2 + tmp.x * k, cy = h / 2 - tmp.y * k;
      const sx = H * s.userData.aspect, r = s.material.rotation, c = Math.cos(r), sn = Math.sin(r), pts = s.userData.pts;
      for (let i = 0; i < pts.length; i += 2) {
        const lx = pts[i] * sx, ly = pts[i + 1] * H;
        const px = cx + (c * lx - sn * ly) * k, py = cy - (sn * lx + c * ly) * k;
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
    }
    return { y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2 };
  };
  // 646–820px (user 2026-09-25): on the second screen the pair lands like on 900px — its top level with the top of
  // the numbers of the last frame's cards (perks.js perksNumTop) and cut by the top of «Фото + видео» with MID_SHOW
  // of its height left on screen. It grows (a zoom of the view, as on 480–645) until it reaches that cut, but never
  // wider than the content; then it sinks below the numbers instead. Solved once per size.
  let tabEnd = null;
  const tabFrame = () => {
    const key = `${perksSpill} ${perksNumTop}`; // perks.js re-measures on its own refreshes
    if (tabEnd && tabEnd.key === key) return tabEnd;
    const b = pairBounds(vw, vh, 9, SPREAD);
    const cut = vh + perksSpill, pad = copyEl.offsetLeft;
    const k = Math.min((cut - perksNumTop) / (MID_SHOW * b.h), (vw - 2 * pad) / b.w);
    const top = Math.max(perksNumTop, cut - MID_SHOW * b.h * k);
    // + PERKS_DROP: update() takes the ≤900px drop off every frame; this landing is already exact
    return (tabEnd = { key, k, x: k * b.cx - vw / 2, y: k * b.y0 - top + PERKS_DROP });
  };
  // ≤479px (user 2026-09-25, Safari on iPhone: the pair landed small and far under the card): the second-screen
  // landing works like tabFrame — the pair's top level with the top of the №04 digits (perks.js perksNumTop), grown
  // until PHONE_SHOW of its height reaches the cut at the top of «Фото + видео», but never wider than the screen;
  // then it sinks below the digits instead. Measured from the real card, so the window height (Safari bars) doesn't matter.
  const PHONE_SHOW = 0.75;
  let phoneEnd = null;
  const phoneFrame = () => {
    const key = `${perksSpill} ${perksNumTop}`;
    if (phoneEnd && phoneEnd.key === key) return phoneEnd;
    const b = pairBounds(vw, vh, 9, SPREAD);
    const cut = vh + perksSpill;
    const k = Math.min((cut - perksNumTop) / (PHONE_SHOW * b.h), vw / b.w);
    const top = Math.max(perksNumTop, cut - PHONE_SHOW * b.h * k);
    return (phoneEnd = { key, k, x: k * b.cx - vw / 2, y: k * b.y0 - top + PERKS_DROP });
  };
  const layoutMid = () => {
    midLaid = true;
    copyEl.style.top = "";
    frame0 = frame1 = frameZ = null;
    mid = midMQ.matches && !reduced;
    if (!mid) return;
    const b = pairBounds(vw, vh);
    const nav = copyEl.offsetTop; // CSS puts the copy's top at --nav-h in this range
    const maxW = vw - 2 * copyEl.offsetLeft, copyH = copyEl.offsetHeight;
    // text 50px under the nav (user 2026-09-25); the pair is always as wide as the content, 40px under the button,
    // and on a short window the bottom edge cuts it (user 2026-09-25: it shrank to nothing on 645×513)
    const objH = maxW * b.h / b.w;
    const top = nav + MID_TOP;
    copyEl.style.top = `${top.toFixed(1)}px`;
    const k0 = objH / b.h, k1 = maxW / b.w;
    frame0 = { k: k0, x: k0 * b.cx - vw / 2, y: k0 * b.y0 - (top + copyH + MID_GAP) };
    frame1 = { k: k1, x: k1 * b.cx - vw / 2, y: k1 * b.y0 - (vh - MID_SHOW * b.h * k1) };
    if (zoomMQ.matches) {
      const kz = (vh - nav) / b.h;
      frameZ = { k: kz, x: kz * b.cx - vw / 2, y: kz * b.y0 - nav };
    }
  };

  const chapter = register({
    el: stage, scene, camera,
    toneMapping: THREE.ACESFilmicToneMapping, exposure: 1.05,
    // Objects sit right of centre in the frame (not by moving them in world space — camera.lookAt always
    // centres its target regardless of world position, see STATUS.md 2026-09-24) via an asymmetric view
    // offset, the same trick reference-site1/site/keystone.js uses to frame the arch off-centre.
    // The travel to the second screen animates the same offset toward centre-bottom (update() below).
    resize(w, h) {
      vw = w; vh = h;
      fitBg();
      camera.setViewOffset(w, h, -w * 0.34, 0, w, h);
      frontRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.75));
      frontRenderer.setSize(w, h + perksSpill, false);
      frontSpill = perksSpill;
      midLaid = false;
      tabEnd = phoneEnd = null;
    },
    update(dt) {
      pointer.ease(dt, 2.2);

      // Two moves, one scroll (user, 2026-09-24): first the camera edges in on the pair where it stands (the
      // original hero dolly, z 9 → 5.4), then the pair travels down from the right into the centre of the second
      // screen and shrinks back to exactly its load-time size (z back to 9). Only the view offset carries it to
      // the centre. Both damped, so a fast wheel flick still reads as one smooth move.
      dolly = damp(dolly, smooth(0, 0.6, v), 5, dt);
      travel = damp(travel, smooth(0.55, TRAVEL_END, v), 5, dt);
      const zoom = dolly * (1 - travel);
      // Phone: at load size the pair is wider than a 390px screen and cannot sit centred, so it lands smaller
      if (!midLaid && vw && can.userData.pts && bag.userData.pts) layoutMid();
      // 646–820px (user 2026-09-24): the pair lands twice as large as on phone and sinks past the bottom edge, as on desktop
      const tab = vw >= 700 && vw < 821;
      const zPhone = vw && vw < 821 && !mid && !tab ? 12 * travel : 0;
      const camZoom = frameZ ? 0 : zoom; // ≤479px: the zoom is the view offset (frameZ), not the camera dolly
      camera.position.z = 9 - 3.6 * camZoom + zPhone;
      camera.position.y = 0.3 - 0.15 * camZoom;
      camera.position.x = damp(camera.position.x, 1.15 + pointer.x * 0.22, 4, dt);
      camera.lookAt(2.9, -0.1 + pointer.y * 0.08, 0);
      // ≤900px (user 2026-09-25): on the second screen the pair sits PERKS_DROP px lower so it clears the card text
      const drop = vw && vw <= 900 ? PERKS_DROP * travel : 0;
      let off = null; // [fullW, fullH, x, y] of the view offset, reused below for the taller front layer
      if (vw && frame0) {
        // ≤479px: hero frame → full-height frame (dolly), then → second-screen landing (travel)
        const mix = (a, b, t) => a + (b - a) * t;
        const f0 = frameZ ? { k: mix(frame0.k, frameZ.k, dolly), x: mix(frame0.x, frameZ.x, dolly), y: mix(frame0.y, frameZ.y, dolly) } : frame0;
        const f1 = frameZ && perksNumTop ? phoneFrame() : frame1;
        const lerp = (a, b) => a + (b - a) * travel, k = lerp(f0.k, f1.k);
        off = [vw * k, vh * k, lerp(f0.x, f1.x), lerp(f0.y, f1.y) - drop];
      } else if (vw && tab && can.userData.pts && bag.userData.pts) {
        // from the hero frame (no zoom, pair right of centre) to the 646–820px landing (tabFrame)
        const f = tabFrame(), lerp = (a, b) => a + (b - a) * travel, k = lerp(1, f.k);
        off = [vw * k, vh * k, lerp(-vw * 0.34, f.x), lerp(0, f.y) - drop];
      } else if (vw) {
        const narrow = vw < 821;
        const xEnd = narrow ? -vw * 0.035 : -vw * 0.04;
        // Second screen (user reference 2026-09-24): the pair stands centred and sinks a little past the bottom edge
        const yEnd = tab ? -vh * 0.46 : narrow ? -vh * 0.34 : -vh * 0.49;
        off = [vw, vh, -vw * 0.34 + (xEnd + vw * 0.34) * travel, yEnd * travel - drop];
      }
      if (off) camera.setViewOffset(...off, vw, vh);
      // Hero copy lifts away as the pair starts its travel; the cue goes first
      if (!reduced) {
        // ≤479px: the copy fades from the first scroll, together with the pair growing to full height (frameZ)
        const out = frameZ ? smooth(0, 0.4, v) : smooth(0.3, 0.85, v);
        copyEl.style.opacity = 1 - out;
        copyEl.style.transform = out ? `translateY(${(-out * 22).toFixed(2)}vh)` : "";
        copyEl.style.visibility = out >= 1 ? "hidden" : "";
        cueEl.style.opacity = 1 - smooth(0, 0.2, v);
      }

      // Reveal = whichever is further along, boot-in or scroll
      const revealProg = reduced ? 1 : Math.max(bootReveal.v, smooth(0, 0.3, v));

      // Objects fade and rise into their resting position as revealProg advances
      const e = 1 - Math.pow(1 - revealProg, 3);
      if (can.userData.loaded) sizeSprite(can, CAN_H * (0.85 + e * 0.15));
      if (bag.userData.loaded) sizeSprite(bag, BAG_H * (0.85 + e * 0.15));
      can.material.opacity = e;
      bag.material.opacity = e;
      can.position.y = CAN_REST_Y - (1 - e) * 0.6;
      bag.position.y = BAG_REST_Y - (1 - e) * 0.6;
      // On the second screen can and pack part slightly — side by side with a small gap, as in the reference
      can.position.x = CAN_X - SPREAD * travel;
      bag.position.x = BAG_X + SPREAD * travel;

      // ≤900px low window (user 2026-09-25): the stage is followed by a dark spill strip (perks.js) and the can + pack
      // layer runs down over it, so the pair is cut at the top of «Фото + видео». Same camera and scale, only the
      // view window is taller; the world canvas keeps the stage-sized window.
      if (frontSpill !== perksSpill && vw) { frontSpill = perksSpill; frontRenderer.setSize(vw, vh + frontSpill, false); }
      if (off && frontSpill) camera.setViewOffset(...off, vw, vh + frontSpill);
      frontRenderer.render(front, camera);
      if (off && frontSpill) camera.setViewOffset(...off, vw, vh);

      key.intensity = lite ? 16 : 24;
    },
  });

  return { chapter };
}
