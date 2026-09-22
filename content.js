// Data for the optional sections in sections.js. Fill it from the client's real material; never invent figures,
// awards, licences or quotes. Empty arrays are fine: sections without markup or data simply don't render.

// Searchable directory (#dirCountries / #dirPanel): [{ country: "Bahrain", companies: ["Company A", "Company B"] }]
export const MEMBERS = [];

// Newsroom cards (#newsGrid) + in-page reader (dialog#reader):
// [{ id, kind: "assembly|industry|rating|…", tag, date: "2026-07-12", dateLabel: "12 Jul 2026", title, dek,
//    image?: "assets/news/x.webp", poster?: true, alt?, gallery?: ["…webp"], facts?: [["+22.4%", "Net premiums"]],
//    body: ["paragraph", "…"], source: "https://original-article-url" }]
export const ARTICLES = [];
