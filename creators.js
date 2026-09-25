// Block 5 · Блогеры: на ≤900px стена роликов становится лентой-слайдером (пользователь 2026-09-24), по образцу
// «Продукции» (product.js): свайп нативный (overflow-x + scroll-snap, sections.css), стрелки сдвигают ленту на одну
// карточку. Вне диапазона стрелки скрыты CSS, лента не прокручивается — модуль ничего не меняет.
export function initCreators({ reducedMotion = false } = {}) {
  const root = document.getElementById("creators");
  const track = root?.querySelector(".creators__wall");
  const prev = root?.querySelector(".creators__arrow.product__arrow--prev");
  const next = root?.querySelector(".creators__arrow.product__arrow--next");
  if (!track || !prev || !next) return;

  const step = () => {
    const card = track.firstElementChild;
    return card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth;
  };
  const updateArrows = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  };

  const behavior = reducedMotion ? "auto" : "smooth";
  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior }));
  next.addEventListener("click", () => track.scrollBy({ left: step(), behavior }));
  track.addEventListener("scroll", updateArrows, { passive: true });
  addEventListener("resize", updateArrows);
  updateArrows();
}
