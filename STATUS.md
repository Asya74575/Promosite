# Status — DOMA by GUF

Read this first in every session; update it before stopping (`references/budget-pro.md`).

- **Phase:** 3 — hero block built; next is one or two more blocks, hardest-first
- **Run it:** `powershell -ExecutionPolicy Bypass -File tools\serve.ps1` → http://localhost:5173/
- **Live link:** —
- **Done:**
  - Kickoff: workshop checked (`tools/setup.ps1` — all ok), продукция изучена (4 вкуса энергетика, 5 вкусов чипсов, фото в `../Фото продукции/`), ТЗ прочитан (`../ТЗ.docx`)
  - Референсы: Stingray и HelloNutz (оба reut.art), MANA/CIAO/Champion — находки в диалоге; MANA-style hover-карточки — взято на заметку для блока 3 (ещё не сделано)
  - Реальный бренд клиента снят с их живого сайта (`../qa/ref-doma-main/`, `../qa/ref-doma-product/`) — точные hex/шрифты замерены (`#F15923`, Unbounded+Inter)
  - `docs/brief.md`, `docs/brand.md`, `docs/scenario.md` заполнены и обсуждены с пользователем; стиль зафиксирован: дворовая/постсоветская, панельная стена, граффити да, неон нет
  - **Блок 1 (Hero) собран и работает:** `index.html`/`style.css`/`hero-doma.js`. Реальное фото панельного дома (Unsplash, credits в `assets/img/credits.json`) как база, поверх — тёмный «плакатный» слой с зубчатым краем (`clip-path` + CSS-переменная `--tear`, управляется скроллом через `ScrollTrigger` в `main.js`). Банка и пачка — реальные фото клиента (уже с альфа-каналом), выезжают из-под разрыва с лёгким parallax. DOMA-тег в стиле трафарета/граффити на закрывающем слое. Проверено: desktop 1440×900, телефон 390×844, `prefers-reduced-motion` — все ок, ошибок в консоли нет (`shots/hero-*.jpg`)
  - Токены бренда в `style.css` переписаны под DOMA (имена токенов оставлены как в стартере, значения — новые); шрифты подключены (Unbounded/Inter)
  - Старый глобус/звёзды из стартера отключены от boot-последовательности (`stars.js`/`globe.js` не импортируются, но файлы не удалены — можно понадобятся позже под другой блок)
- **Next (in order):**
  1. Блок 3 «Продукция» (самый насыщенный) — переключатель категорий, цвет сцены по вкусу (механика MANA), hover-карточки как понравились пользователю
  2. Блок 5 «Блогеры» — стена экранов (GUF/VK, Собчак/TikTok, trapgladiator)
  3. Оставшиеся спокойные блоки (2, 4, 6, 7, 8) — самая простая часть, делать ближе к концу
  4. Полировка hero: убрать белый шлейф-артефакт под пачкой (тень из исходного фото двух пачек), решить про дополнительные граффити-тэги на стене (сейчас только DOMA-стencil)
- **Open questions for the user:**
  - Дедлайн и площадка финального показа
  - Хостинг для итоговой версии (GitHub Pages / Netlify / Cloudflare / zip)
  - Confidential-статус реквизитов ООО «ДОМА» в футере
  - Нужен ли оригинальный SVG-логотип от клиента (сейчас трассируем с фото)
- **Last QA:** 2026-09-22 — `tools/qa/shot.mjs` на блоке hero, 1440×900 + 390×844 + reduced-motion, 0 ошибок в консоли; скриншоты в `shots/` (не в гите)
