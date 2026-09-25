// Block 8 · Коллаборация — лёгкий параллакс банок при скролле (выбор пользователя 2026-09-24): пока секция проходит
// через экран, банки едут по вертикали с разной скоростью и чуть доворачиваются в разные стороны; скролл стоит —
// стоят и банки. Сдвиг пишется в CSS-переменные (--py/--pr), базовый наклон остаётся в sections.css.
// Reduced motion: модуль не запускается, банки статичны.
import { reduced } from "./world.js";

// ход за весь проход секции через экран: y — px от центра пути (−y/2 … +y/2), r — градусы доворота
const MOVES = { guf: { y: 140, r: 5 }, front: { y: 80, r: -4 } };

export function initPartnerCans({ ScrollTrigger }) {
  const section = document.getElementById("partner");
  const cans = section ? [...section.querySelectorAll(".partner__can")] : [];
  if (!cans.length || reduced) return;
  const phone = window.matchMedia("(max-width: 820px)");

  // Секция последняя перед футером: страница кончается раньше, чем её низ уходит за верх экрана, поэтому ход идёт до
  // самого низа страницы. Низ считается на каждом кадре, а не при refresh: «Где купить» (retail-wall.js) во время
  // скролла сжимает свой margin-bottom, и страница становится короче уже после расчёта триггера.
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "max",
    onUpdate: (self) => {
      const span = Math.max(1, ScrollTrigger.maxScroll(window) - self.start);
      const progress = Math.min(1, Math.max(0, (self.scroll() - self.start) / span));
      const c = progress - 0.5, k = phone.matches ? 0.4 : 1;  // на телефоне банки мельче — и ход меньше
      cans.forEach((el) => {
        const m = MOVES[el.classList.contains("partner__can--guf") ? "guf" : "front"];
        el.style.setProperty("--py", `${(-c * m.y * k).toFixed(1)}px`);
        el.style.setProperty("--pr", `${(c * m.r).toFixed(2)}deg`);
      });
    },
  });
}
