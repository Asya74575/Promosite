// Block 3 (Продукция) content — real SKUs only, values off the client's own pack renders
// (Фото продукции/PHOTO DOMA BY GUF FMCG/). Adding a flavour or a category is a data edit here, not a rebuild.
// Colours are read off each pack's accent panel (not measured with a tool like the brand palette) — close enough
// for a scene wash, not claimed as exact brand hex.

export const CATEGORIES = [
  {
    id: "energy",
    label: "Энергетики",
    unit: "0,45 л",
    noun: "энергетик",
    common: "Кофеин 30 мг / Таурин 240 мг на 100 мл напитка",
    // Last card of the strip: the real Auchan campaign poster with the whole line-up (Фото для сайта/)
    // Photo 2409, its dark background extended to a tall frame (tools/promo-extend.py): fills the card, no can cropped
    promo: { img: "assets/img/promo-energy.webp", alt: "Энергетики DOMA by GUF: все 4 вкуса" },
    flavors: [
      { n: "01", name: "Ориджинал", color: "#F15923", img: "assets/img/can-01.webp" },
      { n: "02", name: "Энергия", color: "#EF3E54", img: "assets/img/can-02.webp" },
      { n: "03", name: "Тропик", color: "#8DC63F", img: "assets/img/can-03.webp" },
      { n: "04", name: "Персик", color: "#9C6B3F", img: "assets/img/can-04.webp" },
    ],
  },
  {
    id: "chips",
    label: "Чипсы",
    unit: "рифлёные",
    noun: "чипсы",
    common: "Из отборного картофеля",
    promo: { img: "assets/img/promo-chips.webp", alt: "Чипсы DOMA by GUF: все 5 вкусов" },
    flavors: [
      { n: "01", name: "Краб", color: "#E8501F", img: "assets/img/bag-01.webp", kcal: "530 ккал", kj: "2210 кДж" },
      { n: "02", name: "Сметана и зелень", color: "#8BC53F", img: "assets/img/bag-02.webp", kcal: "530 ккал", kj: "2230 кДж" },
      { n: "03", name: "Стейк на гриле", color: "#A9764B", img: "assets/img/bag-03.webp", kcal: "530 ккал", kj: "2230 кДж" },
      { n: "04", name: "Сыр начо", color: "#F2A81D", img: "assets/img/bag-04.webp", kcal: "540 ккал", kj: "2250 кДж" },
      { n: "05", name: "Сметана и лук", color: "#34B35A", img: "assets/img/bag-05.webp", kcal: "530 ккал", kj: "2220 кДж" },
    ],
  },
];

// "Мохito — скоро": a placeholder slot, not a real category yet (no flavors, no live tab)
export const SOON = { label: "Мохито", note: "скоро" };
