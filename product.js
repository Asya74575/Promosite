// Block 3 (Продукция): category tabs → a MANA-style strip of full-height flavour panels (en.manayerbamate.com).
// Each panel is washed in its own pack colour (product-data.js); the arrows step the strip one panel left/right,
// touch swipes it natively (overflow-x + scroll-snap), so the arrows and the swipe never fight over state.
import { CATEGORIES } from "./product-data.js";

// The client's own product page (docs/brief.md → Links)
const PRODUCT_URL = "https://doma.moscow/product";

// Dark text on light pack colours, white on dark ones (relative luminance, WCAG formula)
function inkFor(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "dark" : "light";
}

export function createProduct({ root, reducedMotion = false }) {
  const tabs = [...root.querySelectorAll(".product__cat[data-cat]")];
  const track = root.querySelector(".product__track");
  const prev = root.querySelector(".product__arrow--prev");
  const next = root.querySelector(".product__arrow--next");

  function render(cat) {
    const noun = cat.noun[0].toUpperCase() + cat.noun.slice(1);
    track.dataset.cat = cat.id;
    track.innerHTML = cat.flavors.map((f) => `
      <li class="product__panel" style="--flavor:${f.color}" data-ink="${inkFor(f.color)}">
        <div class="product__label">
          <span class="product__n" aria-hidden="true">№${f.n}</span>
          <h3 class="product__name">${f.name}</h3>
          <p class="mono product__meta">${noun} · ${cat.unit}</p>
        </div>
        <img class="product__img" src="${f.img}" alt="DOMA ${cat.noun} «${f.name}» №${f.n}" loading="lazy" decoding="async">
      </li>`).join("") + (cat.promo ? `
      <li class="product__panel product__panel--promo" data-fit="${cat.promo.fit || "cover"}"${cat.promo.bg ? ` style="--promo-bg:${cat.promo.bg}"` : ""}>
        <img class="product__promo-img" src="${cat.promo.img}" alt="${cat.promo.alt}" loading="lazy" decoding="async">
        <a class="btn btn--solid product__cta" href="${PRODUCT_URL}" target="_blank" rel="noopener">Смотреть продукцию</a>
      </li>` : "");
    track.scrollLeft = 0;
    updateArrows();
  }

  function step() {
    const panel = track.firstElementChild;
    return panel ? panel.getBoundingClientRect().width : track.clientWidth;
  }

  function updateArrows() {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  }

  function selectCategory(i) {
    tabs.forEach((b, bi) => { b.classList.toggle("is-active", bi === i); b.setAttribute("aria-selected", bi === i); });
    if (reducedMotion) { render(CATEGORIES[i]); return; }
    track.classList.add("is-out");
    setTimeout(() => { render(CATEGORIES[i]); track.classList.remove("is-out"); }, 250);
  }

  tabs.forEach((btn, i) => btn.addEventListener("click", () => { if (!btn.classList.contains("is-active")) selectCategory(i); }));
  const behavior = reducedMotion ? "auto" : "smooth";
  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior }));
  next.addEventListener("click", () => track.scrollBy({ left: step(), behavior }));
  track.addEventListener("scroll", updateArrows, { passive: true });
  addEventListener("resize", updateArrows);

  render(CATEGORIES[0]);
  return { selectCategory };
}
