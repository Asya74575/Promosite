// Block 2 · Преимущества — lives inside the hero's sticky stage (index.html), mechanic from MANA's home page
// (en.manayerbamate.com, filmed with real wheel steps in qa/ref-mana-cards): the product has already travelled to
// the centre of the second screen (hero-doma.js), and the cards roll past above it on the rim of a big wheel whose
// pivot sits far below the screen — a card enters from the right tilted clockwise, straightens and dwells in the
// centre, then leaves left tilted counter-clockwise. Reduced motion: static grid (sections.css), module does nothing.
import { smooth, reduced } from "./world.js";

// Scroll timeline in screens (1 = one viewport height of scroll) — shared with hero-doma.js
export const TRAVEL_END = 1.6;    // product has landed in the centre (after the zoom-in, hero-doma.js)
const CARDS_START = 1.35;          // first card starts entering while the product settles
const LEAD = 1.35;                // steps before the first card = off-screen
// The wheel stops half-way between the last two cards (3 and 4 both on screen, user 2026-09-24) and the section
// unpins right there — the page scrolls on with that frame (END = n - 1.5). .hero height (style.css) is sized for it.
// px the last frame's cards hang below the stage on ≤900px (0 otherwise) — hero-doma.js extends the can + pack layer
// down by the same amount, so the product is cut at the top of «Фото + видео», not at the stage edge
export let perksSpill = 0;
// Stage y (px) of the top of the numbers on the two cards of the last frame, averaged — hero-doma.js lifts the
// pair up to it on 646–820px (user 2026-09-25)
export let perksNumTop = 0;
const TITLE_GAP = () => Math.min(48, Math.max(24, innerHeight * 0.04)); // title bottom → top of the resting card

export function initPerks({ ScrollTrigger }) {
  const section = document.getElementById("hero");
  const root = document.getElementById("perks");
  if (!section || !root) return;

  // Card look is still being chosen by the user — ?cards=a|b|c switches it (sections.css .perks--a/b/c)
  const look = new URLSearchParams(location.search).get("cards");
  root.classList.add(`perks--${/^[abc]$/.test(look) ? look : "a"}`);
  if (reduced) {
    // No pin, no scrub: the block reads as an ordinary dark section right under the hero
    const plain = document.createElement("section");
    plain.dataset.ground = "dark";
    section.after(plain);
    plain.append(root);
    return;
  }

  const eyebrow = root.querySelector(".perks__eyebrow");
  const cards = [...root.querySelectorAll(".perks__card")];
  const n = cards.length;
  // ≤499px (the 480 adaptive, user 2026-09-25; 499 because DevTools "480" on a 2x screen gives 481): cards 3+4 half-way are cut by the narrow screen — the wheel rolls on until card 4
  // rests in the centre; .hero is longer there by the extra half step (style.css), so the wheel speed is the same
  const lastMQ = matchMedia("(max-width: 499px)");
  let end = n - 1.5;
  const deck = root.querySelector(".perks__cards");
  let W = 0, R = 0, step = 0;
  // ≤900px (user 2026-09-25): on a low window the last frame (cards 3+4 half-way) hangs below the stage and the
  // stage clips the bottoms with the numbers. A dark spill strip right after the hero pushes «Фото + видео» down by
  // exactly the overflow; the stage lets the cards paint down into it (style.css .hero__stage ≤900).
  const spillMQ = matchMedia("(max-width: 900px)");
  const spill = document.createElement("div");
  spill.className = "perks__spill";
  spill.setAttribute("aria-hidden", "true");
  section.after(spill);
  let spillH = 0, measured = false;
  const SPILL_PAD = 24; // air under the lowest card bottom
  const endOverflow = (cw, ch, deckTop) => {
    let bottom = -Infinity;
    cards.forEach((_, i) => {
      const d = i - end;
      if (Math.abs(d) > LEAD + 0.2) return;
      const a = d * step, rot = a + Math.sin(d * Math.PI) * 2.5 / 57.2958;
      const hw = (cw * Math.abs(Math.cos(rot)) + ch * Math.abs(Math.sin(rot))) / 2;
      const hh = (cw * Math.abs(Math.sin(rot)) + ch * Math.abs(Math.cos(rot))) / 2;
      if (Math.abs(R * Math.sin(a)) - hw >= W / 2) return; // off screen sideways — the stage still clips it
      bottom = Math.max(bottom, deckTop + R * (1 - Math.cos(a)) + hh);
    });
    return Math.max(0, Math.ceil(bottom + SPILL_PAD - root.clientHeight));
  };
  const measure = () => {
    end = lastMQ.matches ? n - 1 : n - 1.5;
    W = root.clientWidth;
    const cw = cards[0].offsetWidth;
    // The resting card hangs below the title, never over it: its top edge sits TITLE_GAP under the title's bottom
    const ch = Math.max(...cards.map((el) => el.offsetHeight));
    const deckTop = eyebrow.offsetTop + eyebrow.offsetHeight + TITLE_GAP() + ch / 2;
    deck.style.top = `${deckTop.toFixed(1)}px`;
    // neighbour sits just past the screen edge at rest (MANA shows only a sliver of it mid-transition)
    const spacing = Math.max(W * 0.52, cw * 1.18);
    R = Math.max(W * 2.2, spacing * 3.4);
    step = Math.asin(Math.min(0.9, spacing / R));
    // Numbers of the two half-way cards (d = ±0.5): number offset from the card centre, turned with the card
    let sum = 0, cnt = 0;
    cards.forEach((el, i) => {
      const d = i - end;
      if (Math.abs(d) !== 0.5) return;
      const nEl = el.querySelector(".perks__n");
      const a = d * step, rot = a + Math.sin(d * Math.PI) * 2.5 / 57.2958;
      const dx = nEl.offsetLeft + nEl.offsetWidth / 2 - el.offsetWidth / 2;
      const dy = nEl.offsetTop + nEl.offsetHeight / 2 - el.offsetHeight / 2;
      sum += deckTop + R * (1 - Math.cos(a)) + dx * Math.sin(rot) + dy * Math.cos(rot) - nEl.offsetHeight / 2;
      cnt++;
    });
    perksNumTop = cnt ? sum / cnt : 0;
    const h = spillMQ.matches ? endOverflow(cw, ch, deckTop) : 0;
    if (h !== spillH) {
      spillH = perksSpill = h;
      spill.style.height = `${h}px`;
      section.style.setProperty("--perks-spill", `${h}px`);
      if (measured) requestAnimationFrame(() => ScrollTrigger.refresh()); // everything below moved by the change
    }
    measured = true;
  };
  measure();
  addEventListener("resize", measure);

  const update = (v, unit) => {
    // u runs -LEAD … end (cards 3+4 half-way); the integer part holds still in the centre for a moment (dwell), like MANA
    const u = (v - CARDS_START) / unit - LEAD;
    const k = Math.floor(u);
    const s = k + smooth(0.18, 0.82, u - k);
    cards.forEach((el, i) => {
      const d = i - s;
      const a = d * step;
      if (Math.abs(d) > LEAD + 0.2) { el.style.visibility = "hidden"; return; }
      el.style.visibility = "visible";
      const x = R * Math.sin(a), y = R * (1 - Math.cos(a));
      const wobble = Math.sin(d * Math.PI) * 2.5; // a small extra swing between stops, zero at rest
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(a * 57.2958 + wobble).toFixed(2)}deg)`;
    });
    const inE = smooth(1.1, 1.5, v);
    eyebrow.style.opacity = inE;
    eyebrow.style.transform = `translateY(${((1 - inE) * 16).toFixed(1)}px)`;
  };

  ScrollTrigger.create({
    trigger: section, start: "top top", end: "bottom bottom", scrub: true,
    onRefresh: measure,
    onUpdate: (self) => {
      const screens = (self.end - self.start) / innerHeight;
      const unit = (screens - CARDS_START) / (LEAD + end);
      update(self.progress * screens, unit);
    },
  });
  update(0, 1);
}
