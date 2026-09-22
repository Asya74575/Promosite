// Hero sky: a twinkling star field with depth and the occasional shooting star, drawn on a 2D canvas.
// Hidden among the stars is a faint constellation of the AWRIS canopy: an arc of brighter stars over a small
// cluster, like the logo's arch over the dotted Arab world. Its lines glow only for a moment during the descent,
// so it reads as something to discover rather than a logo stamped on the sky.
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };

function starSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d"), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.2, "rgba(232,244,255,.85)");
  grd.addColorStop(0.5, "rgba(159,214,255,.18)");
  grd.addColorStop(1, "rgba(159,214,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  return c;
}

export function createStars({ canvas, reducedMotion = false }) {
  const ctx = canvas.getContext("2d");
  const sprite = starSprite();
  const haze = document.createElement("canvas"); // brand-blue wash behind the stars, rebuilt on resize
  let w = 0, h = 0, dpr = 1, stars = [], arc = [], cluster = [], comets = [];
  let progress = 0, visible = true, last = performance.now(), clock = 0, nextComet = 1.6;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function layout() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = Math.round(cw * dpr);
    h = canvas.height = Math.round(ch * dpr);
    seed = 19800701; // same sky on every load

    // Stars extend below the frame: the descent lifts them, nearer ones faster
    stars = Array.from({ length: Math.round((cw * ch) / 1500) }, () => {
      const size = rnd() ** 4;
      return {
        x: rnd() * w, y: rnd() * h * 1.35, r: (0.45 + size * 2.1) * dpr, a: 0.3 + rnd() * 0.6,
        speed: 0.5 + rnd() * 2.6, phase: rnd() * TAU, depth: rnd(), sparkle: rnd() > 0.93,
      };
    });

    // Constellation: desktop only, in the empty sky above the headline and clear of the globe
    arc = []; cluster = [];
    if (cw >= 768) {
      const cx = w * 0.27, cy = h * 0.33, rad = Math.min(w * 0.085, h * 0.16);
      for (let i = 0; i < 10; i++) {
        // From just below the left horizon, over the top, to just below the right one
        const ang = Math.PI * (1.12 - 1.24 * (i / 9)) + (rnd() - 0.5) * 0.05, rr = rad * (0.97 + rnd() * 0.06);
        arc.push({ x: cx + Math.cos(ang) * rr, y: cy - Math.sin(ang) * rr, r: (1.25 + rnd() * 0.7) * dpr, a: 0.9, speed: 0.7 + rnd(), phase: rnd() * TAU, depth: 0.5 });
      }
      while (cluster.length < 9) {
        const u = rnd() * 2 - 1, v = rnd() * 2 - 1;
        if (u * u + v * v > 1) continue;
        cluster.push({ x: cx + u * rad * 0.6, y: cy + rad * 0.12 + v * rad * 0.22, r: (0.6 + rnd() * 0.5) * dpr, a: 0.75, speed: 1 + rnd() * 2, phase: rnd() * TAU, depth: 0.5 });
      }
    }

    haze.width = w; haze.height = h;
    const g = haze.getContext("2d"), band = g.createLinearGradient(0, h * 0.95, w, h * 0.05);
    band.addColorStop(0, "rgba(41,125,191,0)");
    band.addColorStop(0.5, "rgba(41,125,191,0.1)");
    band.addColorStop(1, "rgba(41,125,191,0)");
    g.fillStyle = band;
    g.fillRect(0, 0, w, h);
    draw(0);
  }

  const lift = (depth) => progress * h * 0.35 * (0.35 + depth * 0.65);

  function drawStar(x, y, r, a) {
    if (a <= 0.01) return;
    const s = r * 5;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
  }

  function spawnComet() {
    const ang = Math.PI * (0.78 + rnd() * 0.08); // heading down-left, 25–40° below the horizon
    const speed = (0.5 + rnd() * 0.35) * Math.max(w, h);
    comets.push({
      x: w * (0.35 + rnd() * 0.7), y: h * (-0.05 + rnd() * 0.5),
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      age: 0, life: 0.8 + rnd() * 0.6, len: w * (0.09 + rnd() * 0.09), width: (1.2 + rnd() * 0.9) * dpr,
    });
  }

  function draw(dt) {
    if (!w) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(haze, 0, 0);
    ctx.globalCompositeOperation = "lighter";

    for (const s of stars) {
      const y = s.y - lift(s.depth);
      if (y < -12 || y > h + 12) continue;
      const tw = reducedMotion ? 1 : s.sparkle ? 0.35 + 0.65 * Math.max(0, Math.sin(clock * s.speed + s.phase)) ** 2 : 0.65 + 0.35 * Math.sin(clock * s.speed + s.phase);
      drawStar(s.x, y, s.r, s.a * tw);
    }

    // The canopy lines draw in and fade out again early in the descent
    const reveal = reducedMotion ? 0 : seg(progress, 0.1, 0.24) * (1 - seg(progress, 0.4, 0.52));
    if (arc.length) {
      const dy = lift(0.5);
      if (reveal > 0.01) {
        ctx.globalAlpha = 1;
        // Kept faint on purpose: a shape you notice on a second look, not a logo drawn across the sky
        ctx.strokeStyle = `rgba(159,214,255,${(0.18 * reveal).toFixed(3)})`;
        ctx.lineWidth = 0.8 * dpr;
        ctx.beginPath();
        const n = (arc.length - 1) * seg(progress, 0.1, 0.26);
        arc.forEach((p, i) => {
          if (i > Math.ceil(n)) return;
          const q = i <= n ? p : { x: arc[i - 1].x + (p.x - arc[i - 1].x) * (n - i + 1), y: arc[i - 1].y + (p.y - arc[i - 1].y) * (n - i + 1) };
          i ? ctx.lineTo(q.x, q.y - dy) : ctx.moveTo(q.x, q.y - dy);
        });
        ctx.stroke();
      }
      for (const s of arc) drawStar(s.x, s.y - dy, s.r, (0.8 + 0.2 * Math.sin(clock * s.speed + s.phase)) * (0.9 + 0.3 * reveal));
      for (const s of cluster) drawStar(s.x, s.y - dy, s.r, s.a * (0.7 + 0.3 * Math.sin(clock * s.speed + s.phase)));
    }

    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.age += dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.age >= c.life) { comets.splice(i, 1); continue; }
      const a = Math.sin(Math.PI * (c.age / c.life));
      const k = c.len / Math.hypot(c.vx, c.vy), tx = c.x - c.vx * k, ty = c.y - c.vy * k;
      const grd = ctx.createLinearGradient(c.x, c.y, tx, ty);
      grd.addColorStop(0, `rgba(236,246,255,${a.toFixed(3)})`);
      grd.addColorStop(0.3, `rgba(159,214,255,${(a * 0.5).toFixed(3)})`);
      grd.addColorStop(1, "rgba(116,187,244,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grd;
      ctx.lineWidth = c.width;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(c.x, c.y); ctx.stroke();
      drawStar(c.x, c.y, c.width * 1.6, a);
    }
    ctx.globalAlpha = 1;
  }

  function tick() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden || progress > 0.8 || !w || reducedMotion) return;
    clock += dt;
    nextComet -= dt;
    if (nextComet <= 0) {
      spawnComet();
      // More shooting stars while entering the atmosphere, like a meteor shower on the way down
      nextComet = progress > 0.08 && progress < 0.6 ? 0.8 + rnd() * 1.4 : 3.5 + rnd() * 5;
    }
    draw(dt);
  }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }).observe(canvas);
  let resizeRaf = 0;
  new ResizeObserver(() => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(layout); }).observe(canvas);
  layout();

  return {
    tick, // call from gsap.ticker
    // Hero scroll progress 0…1: lifts the stars, reveals the canopy lines, fades the sky out under the atmosphere
    setProgress(p) {
      progress = p;
      canvas.style.opacity = (1 - seg(p, 0.5, 0.74)).toFixed(3);
      if (reducedMotion) draw(0);
    },
  };
}
