// Hero globe: coastline + staggered land dots, an invisible depth sphere hiding the far side, member pins with
// halos and arrival pulses, arcs flowing into Bahrain, HTML labels that fade when turning away, gentle sway and drag.
// Styled in AWRIS brand colours: blue dots like the logo's dotted Arab world, a navy body, rim light and the
// canopy arc live in CSS/SVG (index.html, style.css); the sky is stars.js.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const COLORS = {
  coast: "#9fd0f5",  // coastline dots
  land: "#4f89bf",   // interior dots
  pin: "#9fd6ff",    // member markets
  hq: "#ffffff",     // syndicate HQ
  arc: "#74bbf4",    // flows into Bahrain
};

// Countries named on awris.com only: "Countries we serve" (Bahrain, Qatar, Saudi Arabia, UAE, Jordan, Kuwait)
// and the technical board's member-company countries on /about (Egypt, Iraq, Lebanon, Tunisia).
// `side` places the label around its pin so the dense Gulf cluster stays legible.
const PLACES = {
  bahrain: { label: "Bahrain", lat: 26.07, lng: 50.55, side: "left", hq: true },   // syndicate HQ, Seef
  qatar: { label: "Qatar", lat: 25.32, lng: 51.18, side: "right" },
  uae: { label: "UAE", lat: 23.9, lng: 54.3, side: "bottom-right" },
  kuwait: { label: "Kuwait", lat: 29.3, lng: 47.6, side: "top" },
  saudi: { label: "Saudi Arabia", lat: 23.9, lng: 45.1, side: "bottom-left" },
  iraq: { label: "Iraq", lat: 33.0, lng: 43.7, side: "top-left" },
  jordan: { label: "Jordan", lat: 31.2, lng: 36.5, side: "left" },
  lebanon: { label: "Lebanon", lat: 33.9, lng: 35.9, side: "top-left" },
  egypt: { label: "Egypt", lat: 26.47, lng: 29.86, side: "left" },
  tunisia: { label: "Tunisia", lat: 34.0, lng: 9.5, side: "top" },
};
// Member markets pool their war risks with the syndicate in Bahrain
const ROUTES = ["qatar", "uae", "kuwait", "saudi", "iraq", "jordan", "lebanon", "egypt", "tunisia"].map((k) => [k, "bahrain"]);

// Initial orientation: rotation.y = −90° − (longitude facing the camera); rotation.x brings a latitude to centre.
// Desktop shows the globe's left half beside the copy, so it faces ~62°E to put the Arab world centre-left;
// mobile centres a globe wider than the screen, so it faces ~42°E to keep Tunisia…UAE labels inside the
// viewport, with a smaller sway so the edge labels never swing off-screen.
const VIEW = {
  desktop: { y: THREE.MathUtils.degToRad(-90 - 62) + Math.PI * 2, x: 0.36, sway: 0.3 },
  mobile: { y: THREE.MathUtils.degToRad(-90 - 42) + Math.PI * 2, x: 0.42, sway: 0.14 },
};

const R = 1;
function xyz(lat, lng, r = R) {
  const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

// ---- TopoJSON land → polygons [[outer, ...holes]] with rings of [lng, lat] ----
function topoPolygons(topo) {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
  const arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
  });
  const ring = (ids) => {
    const out = [];
    ids.forEach((i) => {
      const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
      a.forEach((p, k) => { if (k > 0 || out.length === 0) out.push(p); });
    });
    return out;
  };
  const polys = [];
  topo.objects.land.geometries.forEach((g) => {
    const list = g.type === "MultiPolygon" ? g.arcs : g.type === "Polygon" ? [g.arcs] : [];
    list.forEach((p) => polys.push(p.map(ring)));
  });
  return polys;
}

function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const wrapLng = (l) => ((((l + 180) % 360) + 360) % 360) - 180;

// Unwrap longitudes continuously along a ring (±360 at each antimeridian jump). The old "add 360 to every
// negative longitude" broke Afro-Eurasia at Greenwich and left holes across Africa and Arabia.
function unwrapRing(ring) {
  let off = 0, prev = ring[0][0];
  return ring.map(([x, y], i) => {
    if (i) { const d = x - prev; if (d > 180) off -= 360; else if (d < -180) off += 360; }
    prev = x;
    return [x + off, y];
  });
}
function unwrapPolygon(poly) {
  const outer = unwrapRing(poly[0]);
  if (Math.abs(outer[outer.length - 1][0] - outer[0][0]) > 180) return poly; // ring circles a pole: keep raw
  const xs = outer.map((p) => p[0]), centre = (Math.min(...xs) + Math.max(...xs)) / 2;
  return [outer, ...poly.slice(1).map((hole) => {
    const u = unwrapRing(hole), hx = u.map((p) => p[0]);
    const k = Math.round((centre - (Math.min(...hx) + Math.max(...hx)) / 2) / 360);
    return k ? u.map(([x, y]) => [x + 360 * k, y]) : u;
  })];
}

function buildDots(polys, tileDeg) {
  const edge = [], fill = [];
  // Coastlines: a dot every tileDeg·0.7 of flat distance along every ring, carrying the remainder
  const spacing = tileDeg * 0.7;
  polys.forEach((poly) => poly.forEach((ring) => {
    let carry = 0;
    edge.push(ring[0]);
    for (let i = 1; i < ring.length; i++) {
      const [x0, y0] = ring[i - 1], [x1, y1] = ring[i];
      let dx = x1 - x0; if (dx > 180) dx -= 360; if (dx < -180) dx += 360;
      const k = Math.cos(THREE.MathUtils.degToRad((y0 + y1) / 2));
      const len = Math.hypot(dx * k, y1 - y0);
      let d = spacing - carry;
      while (d <= len) { const t = d / len; edge.push([wrapLng(x0 + dx * t), y0 + (y1 - y0) * t]); d += spacing; }
      carry = len - (d - spacing);
    }
  }));
  // Interior: staggered lat/lng grid clipped to each polygon (rings unwrapped continuously across the date line)
  const step = Math.min(6, Math.max(0.2, tileDeg));
  polys.forEach((poly) => {
    const rings = unwrapPolygon(poly);
    const lngs = rings[0].map((p) => p[0]);
    const lats = rings[0].map((p) => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    for (let lat = Math.floor((minLat - 1) / step) * step; lat <= Math.ceil((maxLat + 1) / step) * step; lat += step) {
      const lngStep = step / Math.max(0.15, Math.cos(THREE.MathUtils.degToRad(lat)));
      const odd = Math.round(Math.abs(lat / step)) % 2;
      for (let lng = Math.floor((minLng - 1) / lngStep) * lngStep + (odd ? lngStep / 2 : 0); lng <= Math.ceil((maxLng + 1) / lngStep) * lngStep; lng += lngStep) {
        if (!inRing(lng, lat, rings[0])) continue;
        if (rings.slice(1).some((h) => inRing(lng, lat, h))) continue;
        fill.push([wrapLng(lng), lat]);
      }
    }
  });
  return { edge, fill };
}

function dotTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = 32;
  const grd = g.createRadialGradient(r, r, 0, r, r, r - 0.5);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.82, "rgba(255,255,255,1)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.beginPath(); g.arc(r, r, r - 0.5, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}
function haloTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,0.45)"); grd.addColorStop(0.35, "rgba(255,255,255,0.12)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Options: places = { key: { label, lat, lng, side, hq? } }, routes = [[fromKey, toKey]], colors = { coast, land, pin, hq, arc },
// views = { desktop|mobile: { y: rad(-90 - longitudeFacing) + 2π, x: tilt, sway } }. Defaults are the AWRIS set below.
export async function createGlobe({ container, canvas, reducedMotion = false, places = PLACES, routes = ROUTES, colors = COLORS, views = VIEW }) {
  const mobile = () => container.clientWidth < 768 || innerWidth <= 767;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const cameraZ = () => (innerWidth > 991 ? 2.23 : innerWidth > 767 ? 2.8 : 2.7);
  camera.position.set(0, 0, cameraZ());

  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: "absolute", top: "0", left: "0", pointerEvents: "none" });
  container.appendChild(labels.domElement);

  const globe = new THREE.Group();
  let view = mobile() ? views.mobile : views.desktop;
  globe.rotation.set(view.x, view.y, 0.05);
  scene.add(globe);

  const occluder = new THREE.Mesh(new THREE.SphereGeometry(0.99, 32, 32), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }));
  occluder.renderOrder = -1;
  globe.add(occluder);

  // ---- Dots ----
  const topo = await fetch("assets/data/land-110m.json").then((r) => r.json());
  const { edge, fill } = buildDots(topoPolygons(topo), mobile() ? 1.5 : 1.2);
  const tex = dotTexture();
  const cloud = (pts, color, size, opacity) => {
    const arr = new Float32Array(pts.length * 3);
    pts.forEach(([lng, lat], i) => xyz(lat, lng).toArray(arr, i * 3));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity, depthWrite: false, map: tex }));
  };
  globe.add(cloud(edge, colors.coast, 0.005, 1), cloud(fill, colors.land, Math.max(0.005 * 0.8, 0.003), 0.9));

  // ---- Pins, halos, arrival rings, labels ----
  const halo = haloTexture();
  const pinGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.008, 12, 1, false).rotateX(Math.PI / 2).translate(0, 0, 0.004);
  const pinMat = new THREE.MeshBasicMaterial({ color: colors.pin });
  const hqMat = new THREE.MeshBasicMaterial({ color: colors.hq });
  const ringGeo = new THREE.RingGeometry(0.95, 1, 32);
  const pins = {};
  Object.entries(places).forEach(([key, p]) => {
    const color = new THREE.Color(p.hq ? colors.hq : colors.pin);
    const g = new THREE.Group();
    const n = xyz(p.lat, p.lng, 1).normalize();
    g.position.copy(n).multiplyScalar(1.002);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const pin = new THREE.Mesh(pinGeo, p.hq ? hqMat : pinMat);
    if (p.hq) pin.scale.setScalar(1.5);
    g.add(pin);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: colors.arc, map: halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.scale.setScalar(p.hq ? 0.075 : 0.045);
    g.add(sprite);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    ring.scale.setScalar(0.02);
    g.add(ring);
    const el = document.createElement("div");
    el.className = p.hq ? "globe-label is-hq" : "globe-label";
    el.dataset.side = p.side || "top";
    el.innerHTML = `<div class="globe-label-text">${p.label}</div>`;
    g.add(new CSS2DObject(el));
    globe.add(g);
    pins[key] = { group: g, ring, el, unit: n, arrivals: [] };
  });

  // ---- Arcs into Bahrain: a light trace with a brighter head ----
  const uniforms = { uTime: { value: 3.8 }, uColor: { value: new THREE.Color(colors.arc) } };
  const arcMat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute float aOffset; varying float vOffset; varying float vProgress;
      void main(){ vOffset = aOffset; vProgress = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; varying float vOffset; varying float vProgress;
      void main(){
        float pr = mod(uTime * 2.0 + vOffset, 2.5);
        float st = clamp(pr - 1.0, 0.0, 1.0), en = clamp(pr, 0.0, 1.0);
        if (vProgress < st || vProgress > en) discard;
        float head = smoothstep(en - 0.12, en, vProgress);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), head * 0.7), smoothstep(st, en + 0.001, vProgress));
      }`,
  });
  routes.forEach(([a, b], idx) => {
    const A = pins[a].unit.clone().multiplyScalar(1.002), B = pins[b].unit.clone().multiplyScalar(1.002);
    const alt = 0.02 + Math.min(0.5, A.distanceTo(B) * 0.01);
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      pts.push(A.clone().lerp(B, t).normalize().multiplyScalar(1.002 + 4 * alt * t * (1 - t)));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.002, 4, false);
    const offset = 2.5 * (((0.6180339887 * (idx + 1)) % 1));
    geo.setAttribute("aOffset", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(offset), 1));
    globe.add(new THREE.Mesh(geo, arcMat));
    pins[b].arrivals.push({ offset, delay: Math.min(0.08, (pins[a].unit.distanceTo(pins[b].unit) / 1.5) * 0.08) });
  });

  // ---- Interaction ----
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.05, enableZoom: false, enablePan: false });
  let dragging = false;
  controls.addEventListener("start", () => { dragging = true; canvas.style.cursor = "grabbing"; });
  controls.addEventListener("end", () => { dragging = false; canvas.style.cursor = "grab"; });
  canvas.style.cursor = "grab";

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), center = new THREE.Vector3();
  let visible = true, last = performance.now(), sway = 0;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 768 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.position.setLength(cameraZ());
    camera.updateProjectionMatrix();
    controls.enabled = !mobile() && !reducedMotion;
    canvas.style.pointerEvents = controls.enabled ? "auto" : "none";
    view = mobile() ? views.mobile : views.desktop;
    globe.rotation.x = view.x;
  }

  function frame(now = performance.now()) {
    const dt = Math.min(64, now - last); last = now;
    const k = dt / 16.666;
    if (!reducedMotion) {
      // Gentle sway (desktop ±17°, mobile ±8°, ~70 s period) around the Arab world instead of a full spin,
      // so the member markets never rotate out of view
      if (!dragging) sway += dt / 1000;
      globe.rotation.y = view.y + Math.sin(sway * 0.09) * view.sway;
      uniforms.uTime.value += 0.0015 * k;
    } else globe.rotation.y = view.y;
    controls.update();
    const time = uniforms.uTime.value;
    Object.values(pins).forEach((pin) => {
      let best = 0;
      pin.arrivals.forEach(({ offset, delay }) => {
        const e = (((2 * time + offset) % 2.5) + 2.5) % 2.5, r0 = 1 + delay - 0.05;
        if (e >= r0 && e <= r0 + 0.5) best = Math.max(best, 1 - (e - r0) / 0.5 + 1e-6);
      });
      if (best > 0) {
        const kk = 1 - Math.pow(best, 3);
        pin.ring.scale.setScalar(0.02 + 0.02 * kk);
        pin.ring.material.opacity = 1 - kk;
      } else pin.ring.material.opacity = 0;
      pin.group.getWorldPosition(tmpA);
      globe.getWorldPosition(center);
      const facing = tmpB.copy(tmpA).sub(center).normalize().dot(camera.position.clone().sub(tmpA).normalize()) > 0.05;
      pin.el.classList.toggle("is-facing", facing);
    });
    renderer.render(scene, camera);
    labels.render(scene, camera);
  }

  const tick = () => { if (visible && !document.hidden) frame(); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }, { rootMargin: "100px" }).observe(container);
  new ResizeObserver(() => requestAnimationFrame(resize)).observe(container);
  resize();
  frame();

  return {
    tick,                        // call from gsap.ticker
    renderOnce: () => frame(),
    labels: labels.domElement,
    counts: { edge: edge.length, fill: fill.length },
  };
}
