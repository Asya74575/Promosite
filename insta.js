// Block 5 · Блок Инсты — mechanic from the State of Space reference (behance.net/gallery/246781673), in two acts:
// 1) as the block comes in, big post cards rise one by one along a wide, gentle arc across the bottom of the screen
//    (the visible top of a huge circle), the headline sits above them;
// 2) once the stage is pinned, scrolling shrinks the cards and gathers them into a small oval round the headline —
//    the side cards fly in from off-screen, the bottom of the oval runs off the screen — then the ring drifts.
// Every card keeps its slot j (0 = top/centre, ± = right/left) in both acts, so the morph is one continuous move.
// Oval slots are spaced by arc length (an oval spaced by angle bunches up at the sides). The 12 real posts in
// index.html are cloned round the ring as many times as it needs; clones are aria-hidden and out of the tab order.
// Reduced motion: no pin (sections.css), the final frame (the oval) is drawn once.
import { smooth, reduced } from "./world.js";

const ORBIT = 0.06;         // share of the loop the formed ring drifts per screen of scroll
const TILT = 22;            // deg, oval cards lean: 0 at top and sides, max on the diagonals
const FINAL = 3;            // screens of scroll from "top bottom" to "bottom bottom" (.insta is 300svh)
const MORPH = [1.15, 2.35]; // screens: arc of big cards → small oval (the stage is pinned from 1)
const TITLE_GAP = 24;       // px, headline bottom → top of the big cards in act 1

const lerp = (a, b, t) => a + (b - a) * t;

export function initInsta({ ScrollTrigger }) {
  const root = document.getElementById("insta");
  if (!root) return;
  const stage = root.querySelector(".insta__stage");
  const ring = root.querySelector(".insta__ring");
  const copy = root.querySelector(".insta__copy");
  const title = root.querySelector(".insta__title");
  const handle = root.querySelector(".insta__handle");
  const posts = [...ring.children];

  let tiles = [], H = 0, CX = 0;
  let S = 0, CY = 0, RX = 0, RY = 0, table = [];   // act 2: small oval
  let CYT = 0;                                     // headline centre (same in both acts)
  let SA = 0, RA = 0, TOPA = 0, PITCHA = 0;        // act 1: big arc

  const measure = () => {
    const W = stage.clientWidth;
    H = stage.clientHeight;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 90;
    const narrow = W < 700;                  // phone: bigger, sparser tiles pressed to the screen edges
    CX = W / 2;

    S = Math.round(narrow ? Math.min(76, W * 0.17) : Math.min(130, Math.max(56, Math.min(W * 0.085, H * 0.14))));
    CY = H * 0.62;
    RY = CY - (navH + 8 + S / 2);          // top tile hangs just under the nav bar
    RX = narrow ? W / 2 - S * 0.3 : Math.min(W / 2 - S * 0.75, RY * 1.3);

    SA = Math.round(narrow ? W * 0.42 : Math.min(W * 0.2, H * 0.34));
    PITCHA = SA * 1.12;
    RA = narrow ? W * 1.3 : W * 1.1;

    // arc-length table: fraction of the perimeter → parameter t (t = 0 at the top, clockwise)
    const M = 720, len = [0];
    let px = 0, py = -RY;
    for (let k = 1; k <= M; k++) {
      const t = (k / M) * Math.PI * 2, x = RX * Math.sin(t), y = -RY * Math.cos(t);
      len.push(len[k - 1] + Math.hypot(x - px, y - py));
      px = x; py = y;
    }
    const P = len[M];
    table = len.map((l) => l / P);

    const n = Math.min(30, Math.max(posts.length, Math.round(P / (S * (narrow ? 1.5 : 1.3)))));
    while (ring.children.length > n) ring.lastElementChild.remove();
    while (ring.children.length < n) {
      const c = posts[ring.children.length % posts.length].cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.querySelector("a").tabIndex = -1;
      ring.append(c);
    }
    tiles = [...ring.children];
    tiles.forEach((el) => el.style.setProperty("--s", `${SA}px`)); // drawn at the big size, scaled down: stays sharp
    copy.style.setProperty("--copy-w", `${Math.max(200, 2 * RX - S * (narrow ? 1.2 : 1.6)).toFixed(0)}px`);

    // The headline stands still in the middle of the oval; the big arc is placed so its middle card starts
    // TITLE_GAP under the headline (centre of that card = TOPA). The lower part of the arc is cut off by the screen.
    CYT = CY - RY * 0.1;
    copy.style.setProperty("--cy", `${CYT.toFixed(1)}px`);
    TOPA = Math.min(H - SA * 0.45, CYT - copy.offsetHeight / 2 + title.offsetHeight + TITLE_GAP + SA / 2);
  };

  // arc fraction u (0…1) → parameter t, by binary search in the table
  const paramAt = (u) => {
    let lo = 0, hi = table.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; table[mid] < u ? (lo = mid) : (hi = mid); }
    const f = (u - table[lo]) / (table[hi] - table[lo] || 1);
    return ((lo + f) / (table.length - 1)) * Math.PI * 2;
  };

  const update = (v) => {
    const n = tiles.length;
    const m = smooth(MORPH[0], MORPH[1], v);
    const drift = Math.max(0, v - MORPH[1]) * ORBIT * n;
    tiles.forEach((el, i) => {
      let j = (i < Math.ceil(n / 2) ? i : i - n) + drift;
      j = ((((j + n / 2) % n) + n) % n) - n / 2;     // keep the slot in [-n/2, n/2)
      // act 1 entrance: from the centre card outwards, each rises into place
      const a = 0.45 + Math.min(Math.abs(j), 4) * 0.08;
      const k = smooth(a, a + 0.4, v);
      if (k < 0.01) { el.style.visibility = "hidden"; return; }
      el.style.visibility = "visible";

      const ang = (j * PITCHA) / RA;                   // act 1: on the big circle
      const xA = CX + RA * Math.sin(ang), yA = TOPA + RA * (1 - Math.cos(ang)) + (1 - k) * SA * 0.4;
      const t = paramAt(((j / n) % 1 + 1) % 1);        // act 2: on the oval
      const xB = CX + RX * Math.sin(t), yB = CY - RY * Math.cos(t);

      const x = lerp(xA, xB, m) - SA / 2, y = lerp(yA, yB, m) - SA / 2;
      const rot = lerp(ang * 57.2958, TILT * Math.sin(2 * t), m);
      const sc = lerp(1, S / SA, m) * (0.85 + 0.15 * k);
      el.style.opacity = k.toFixed(3);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    });

    // headline: fades in with the block, then goes soft while the cards sweep over it (as in the reference)
    const tIn = smooth(0.3, 0.8, v), soft = Math.sin(Math.PI * m);
    title.style.opacity = (tIn * (1 - 0.45 * soft)).toFixed(3);
    title.style.transform = `translateY(${((1 - tIn) * 16).toFixed(1)}px)`;
    title.style.filter = soft < 0.01 ? "none" : `blur(${(soft * 10).toFixed(2)}px)`;
    const h = smooth(MORPH[1] - 0.35, MORPH[1] + 0.1, v);
    handle.style.opacity = h.toFixed(3);
    handle.style.transform = `translateY(${((1 - h) * 12).toFixed(1)}px)`;
  };

  measure();
  if (reduced) {
    update(FINAL);
    addEventListener("resize", () => { measure(); update(FINAL); });
    return;
  }

  let last = 0;
  ScrollTrigger.create({
    trigger: root, start: "top bottom", end: "bottom bottom", scrub: true,
    onRefresh: (self) => { measure(); update(self.progress * FINAL); },
    onUpdate: (self) => { last = self.progress * FINAL; update(last); },
  });
  update(last);
}
