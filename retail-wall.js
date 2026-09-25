// Block 6b · Где купить — вариант 2: колонки-масонри сходятся низами — механика блока «Наши клиенты» на
// liqium.ru/services: цель — низ самой короткой колонки, остальные подтягиваются вверх, margin-bottom сетки
// сжимается следом; ход колонок откалиброван по замеру референса (ступенька в sections.css + высоты колонок в
// index.html, 0/133/287/212px @1900). Диапазон — по просьбе пользователя 2026-09-24 длиннее, чем у референса
// (у них всё заканчивается, когда верх сетки у верха экрана, и сами низы в этот момент ещё под экраном): прогресс
// идёт всё время, пока листаешь блок, от «верх сетки у низа экрана» до «линия схождения низов на 35% выше низа
// экрана», с ease-in (p^1.6) — последние ~40–70px схождения низов происходят уже на экране, линия собирается на глазах. Reduced motion: world.js `reduced` — модуль не запускается,
// остаётся статичная лесенка (sections.css media query).
import { reduced } from "./world.js";

export function initRetailWall({ ScrollTrigger }) {
  const section = document.getElementById("retailWall");
  const grid = section?.querySelector("[data-retail-wall]");
  if (!section || !grid || reduced) return;

  const cols = [...grid.querySelectorAll(".retailWall__col")];
  // Same breakpoint as sections.css: at ≤900px the wall is a plain grid of equal cards, no animation
  // (пользователь 2026-09-24) — the module keeps every offset at zero there.
  const narrow = window.matchMedia("(max-width: 900px)");
  let deltas = cols.map(() => 0), maxDelta = 0, alignLine = 0;

  // alignLine: document-Y of the shortest column's bottom — that column never moves, so it's where every bottom
  // ends up. A column may rise above the grid top (as on the reference) into the heading's margin; by then the
  // heading is already above the viewport, so the travel isn't capped by it.
  const measure = () => {
    cols.forEach((c) => { c.style.transform = "none"; });
    grid.style.marginBottom = "";
    const rects = cols.map((c) => c.getBoundingClientRect());
    const minBottom = Math.min(...rects.map((r) => r.bottom));
    alignLine = minBottom + window.scrollY;
    if (narrow.matches) { deltas = cols.map(() => 0); maxDelta = 0; return; }
    deltas = rects.map((r) => r.bottom - minBottom);
    maxDelta = Math.max(...deltas);
  };

  // Eased so the last part of the convergence (bottoms closing into one line) is still happening while the
  // bottoms are on screen, not all used up while only the tops are visible.
  const update = (p) => {
    const e = Math.pow(p, 1.6);
    cols.forEach((c, i) => { c.style.transform = `translateY(${(-deltas[i] * e).toFixed(1)}px)`; });
    grid.style.marginBottom = `${(-maxDelta * e).toFixed(1)}px`;
  };

  measure();
  update(0);

  // end is a function so it's recomputed on every refresh (resize, load); measuring inside it resets transforms,
  // so onRefresh re-applies the current progress right after.
  const st = ScrollTrigger.create({
    trigger: grid, start: "top bottom",
    end: () => { measure(); return alignLine - window.innerHeight * 0.65; },
    scrub: true,
    onRefresh: (self) => update(self.progress),
    onUpdate: (self) => update(self.progress),
  });
  update(st.progress);
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
