# Status — DOMA by GUF

Read this first in every session; update it before stopping (`references/budget-pro.md`).

- **Phase:** 2 — scaffold done; next is the hardest block first (hero)
- **Run it:** `powershell -ExecutionPolicy Bypass -File tools\serve.ps1` → http://localhost:5173/
- **Live link:** —
- **Done:**
  - Kickoff: workshop checked (`tools/setup.ps1` — all ok), продукция изучена (4 вкуса энергетика, 5 вкусов чипсов, фото в `../Фото продукции/`), ТЗ прочитан (`../ТЗ.docx`)
  - Референсы: Stingray и HelloNutz (оба reut.art) — захвачены в `../qa/ref-stingray` не сохранён (только текстовый разбор), `../qa/ref-nutzz/` (кадры), MANA/CIAO/Champion — текстовые находки в диалоге
  - Реальный бренд клиента снят с их живого сайта: `../qa/ref-doma-main/` (лейбл, артисты), `../qa/ref-doma-product/` (текущий статичный лендинг продукции) — точные hex/шрифты замерены (`#F15923`, Unbounded+Inter)
  - `docs/brief.md`, `docs/brand.md`, `docs/scenario.md` заполнены и обсуждены с пользователем
  - Стилистика зафиксирована: дворовая/постсоветская, стена панельного дома как поверхность разрыва, граффити да, неон нет
- **Next (in order):**
  1. Собрать первую версию hero-блока (блок 1): разрыв стены → банка+пачка как 3D-объекты — самый рискованный блок, делать первым
  2. Достать/подготовить текстуры панельной стены и граффити (бесплатные источники — Higgsfield недоступен)
  3. Настроить материал банки (металл+печать) и пачки (матовая плёнка+печать) по механике Stingray
  4. Показать hero пользователю как контрольную точку перед остальными блоками
- **Open questions for the user:**
  - Дедлайн и площадка финального показа
  - Хостинг для итоговой версии (GitHub Pages / Netlify / Cloudflare / zip)
  - Confidential-статус реквизитов ООО «ДОМА» в футере
  - Нужен ли оригинальный SVG-логотип от клиента (сейчас трассируем с фото)
- **Last QA:** — не проводилась, блоков ещё нет
