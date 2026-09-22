// Starter pinned scene: a field of instanced towers that rise from the centre outwards while the camera orbits in and
// lowers with scroll. It reads as a city (real estate) or a landscape of bars (fintech) and demonstrates the scene
// contract: createTowers({ canvas, reducedMotion }) → { setProgress(p), ready }. Replace the content, keep the contract.
import * as THREE from "three";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export function createTowers({ canvas, reducedMotion = false }) {
  const lite = window.matchMedia("(pointer: coarse)").matches; // phones: fewer towers, lower pixel ratio, no antialias

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const mist = new THREE.Color(css("--mist", "#eef2f6"));
  scene.fog = new THREE.Fog(mist, 70, 200);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 600);
  scene.add(new THREE.HemisphereLight("#ffffff", css("--steel", "#5f7386"), 1.5));
  const sun = new THREE.DirectionalLight("#ffffff", 2.4);
  sun.position.set(-40, 80, 30);
  scene.add(sun);

  // Towers on a grid, taller towards the centre; each rises after a delay proportional to its distance
  const N = lite ? 16 : 24, SPACING = 4.4, MAX_D = ((N - 1) / 2) * SPACING * Math.SQRT2;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const towers = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = (i - (N - 1) / 2) * SPACING, z = (j - (N - 1) / 2) * SPACING, d = Math.hypot(x, z);
      towers.push({ x, z, w: 1.8 + rnd() * 1.6, h: (2 + rnd() * 6) * (1 + 3.2 * Math.exp(-(d * d) / 700)), delay: d / MAX_D, accent: rnd() > 0.95 });
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const plain = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: css("--paper", "#f7f9fb"), roughness: 0.6, metalness: 0.05 }), towers.filter((t) => !t.accent).length);
  const accent = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: css("--blue", "#2f7dd1"), roughness: 0.4, metalness: 0.1 }), towers.filter((t) => t.accent).length);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: mist, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(plain, accent, ground);

  const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), pos = new THREE.Vector3(), size = new THREE.Vector3();
  function layout(rise) {
    let a = 0, b = 0;
    for (const t of towers) {
      const k = seg(rise, t.delay * 0.6, t.delay * 0.6 + 0.4);
      size.set(t.w, Math.max(0.001, t.h * k), t.w);
      pos.set(t.x, 0, t.z);
      m4.compose(pos, quat, size);
      if (t.accent) accent.setMatrixAt(b++, m4); else plain.setMatrixAt(a++, m4);
    }
    plain.instanceMatrix.needsUpdate = accent.instanceMatrix.needsUpdate = true;
  }

  // Camera keyframes blended by progress: wide and high → orbiting in → low between the towers
  function pose(p) {
    const ang = -0.7 + 1.6 * p, r = 115 - 55 * seg(p, 0, 1), y = 88 - 60 * seg(p, 0.1, 1);
    camera.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    camera.lookAt(0, 7 * seg(p, 0.3, 1), 0);
  }

  let target = 0, cur = 0, raf = 0, visible = false, dirty = true;
  function render() {
    layout(seg(cur, 0, 0.55));
    pose(cur);
    renderer.render(scene, camera);
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    const snap = reducedMotion || window.__qaInstant;
    const next = snap ? target : cur + (target - cur) * 0.12;
    if (!dirty && Math.abs(next - cur) < 1e-4) return;
    cur = Math.abs(target - next) < 1e-4 ? target : next;
    dirty = false;
    render();
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 48 : 35;
    camera.updateProjectionMatrix();
    dirty = true; // no render here: the loop draws the next frame only if the canvas is on screen
  }

  // Render only while the canvas is near the viewport
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { dirty = true; loop(); }
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: "50% 0px" }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  resize();
  layout(0);
  pose(0);

  // Link shader programs off the main thread before the first visible frame
  const ready = renderer.compileAsync(scene, camera).catch((err) => console.warn("Story scene compile:", err));

  return {
    ready,
    setProgress(p) {
      target = clamp(p);
      dirty = true;
      if (reducedMotion && visible) { cur = target; render(); }
    },
  };
}
