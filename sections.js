// Content sections (origin: the AWRIS demo): history rail, searchable directory, newsroom with an in-page article
// reader, FAQ accordion and a fitted SVG footer wordmark. Data lives in content.js; this file renders and wires it.
// Every section is optional: its init returns early when the markup is missing.
import { MEMBERS, ARTICLES } from "./content.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Length-preserving normalisation, so match offsets found in it are valid in the original name
const norm = (s) => s.toLowerCase().replace(/[’‘`]/g, "'");

export function initSections({ gsap, ScrollTrigger, lenis, reduce }) {
  // Filters, search and accordions change the page height; re-measure the triggers below once it settles
  let refreshTimer = 0;
  const queueRefresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 260); };

  initHistory({ gsap, ScrollTrigger, reduce });
  initDirectory({ queueRefresh });
  initNews({ queueRefresh });
  initFaq({ gsap, reduce, queueRefresh });
  initWordmark({ gsap, reduce, queueRefresh });
  const reader = initReader({ gsap, lenis, reduce });

  // Anything carrying data-article opens that story in the reader; the href stays as a no-JS fallback
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-article]");
    if (!trigger || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (reader.open(trigger.dataset.article)) e.preventDefault();
  });
}

// ---------- Footer wordmark: Cairo letters in an SVG whose viewBox is fitted to their ink ----------
// It spans the grid exactly at every width, can't spill onto the legal bar, and rises in letter by letter.
function initWordmark({ gsap, reduce, queueRefresh }) {
  const svg = $("#wordmark");
  if (!svg) return;
  // data-word, data-weight and data-track on the <svg> set the letters; the font stack is the SVG's own CSS font-family
  const NS = "http://www.w3.org/2000/svg", WORD = svg.dataset.word || "BRAND", SIZE = 1000, TRACK = +(svg.dataset.track || 0.05);
  const FAMILY = getComputedStyle(svg).fontFamily || "sans-serif", WEIGHT = svg.dataset.weight || "700";
  const FONT = `${WEIGHT} ${SIZE}px ${FAMILY}`;
  const FIRST = FAMILY.split(",")[0].replace(/["']/g, "").trim();
  let tween = null;

  const draw = () => {
    tween?.scrollTrigger?.kill();
    tween?.kill();
    svg.querySelectorAll("text").forEach((t) => t.remove());
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = FONT;
    let x = 0, left = Infinity, right = -Infinity, top = 0, bottom = 0;
    const letters = [...WORD].map((ch) => {
      const m = ctx.measureText(ch);
      left = Math.min(left, x - m.actualBoundingBoxLeft);
      right = Math.max(right, x + m.actualBoundingBoxRight);
      top = Math.max(top, m.actualBoundingBoxAscent);
      bottom = Math.max(bottom, m.actualBoundingBoxDescent);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", x.toFixed(1));
      t.setAttribute("y", "0");
      t.textContent = ch;
      svg.appendChild(t);
      x += m.width + TRACK * SIZE;
      return t;
    });
    svg.setAttribute("viewBox", [left, -top, right - left, top + bottom].map((v) => v.toFixed(1)).join(" "));
    queueRefresh();
    if (!reduce) tween = gsap.fromTo(letters, { y: (top + bottom) * 1.05 }, {
      y: 0, ease: "power3.out", stagger: 0.08,
      scrollTrigger: { trigger: svg, start: "top 98%", end: "bottom 90%", scrub: 0.6 },
    });
  };

  // The font stylesheet is non-blocking: lay out with fallback metrics now, and again once the wordmark font has loaded
  const fontLoaded = () => [...document.fonts].some((f) => f.family.replace(/["']/g, "") === FIRST && String(f.weight) === WEIGHT && f.status === "loaded");
  draw();
  if (fontLoaded()) return;
  const onFonts = () => {
    if (!fontLoaded()) return;
    document.fonts.removeEventListener("loadingdone", onFonts);
    draw();
  };
  document.fonts.addEventListener("loadingdone", onFonts);
}

// ---------- History: the big year follows whichever milestone crosses the reading line ----------
function initHistory({ gsap, ScrollTrigger, reduce }) {
  const track = $("#historyTrack");
  if (!track) return;
  const moments = $$(".moment", track), yearEl = $("#historyYear"), fill = $(".history__fill", track);
  const shown = { y: +moments[0].dataset.year };
  let target = shown.y;

  const setYear = (y) => {
    if (y === target) return;
    target = y;
    if (reduce) { yearEl.textContent = y; return; }
    gsap.to(shown, {
      y, duration: Math.min(1.4, 0.35 + Math.abs(y - shown.y) * 0.025), ease: "power2.out", overwrite: true,
      onUpdate: () => (yearEl.textContent = Math.round(shown.y)),
    });
  };
  const activate = (i) => {
    moments.forEach((m, j) => { m.classList.toggle("is-active", j === i); m.classList.toggle("is-past", j < i); });
    setYear(+moments[i].dataset.year);
  };

  moments.forEach((m, i) => ScrollTrigger.create({
    trigger: m, start: "top 62%", end: "bottom 62%",
    onToggle: (s) => { if (s.isActive) activate(i); },
  }));
  activate(0);
  if (reduce) gsap.set(fill, { scaleY: 1 });
  else gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: track, start: "top 62%", end: "bottom 62%", scrub: true } });
}

// ---------- Member directory: country tabs + search across every company ----------
function initDirectory({ queueRefresh }) {
  const countriesEl = $("#dirCountries"), panel = $("#dirPanel"), input = $("#dirSearch"), status = $("#dirStatus");
  if (!countriesEl || !panel) return;

  const total = MEMBERS.reduce((n, m) => n + m.companies.length, 0);
  const max = Math.max(...MEMBERS.map((m) => m.companies.length));
  const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");
  $("#dirTotal").textContent = total;

  countriesEl.innerHTML = MEMBERS.map((m) => `
    <button class="country-tab" type="button" role="tab" id="tab-${slug(m.country)}" aria-controls="dirPanel" data-country="${esc(m.country)}">
      <span class="country-tab__name">${esc(m.country)}</span>
      <span class="country-tab__count">${m.companies.length}</span>
      <i style="--w:${(m.companies.length / max).toFixed(3)}"></i>
    </button>`).join("");
  const tabs = $$(".country-tab", countriesEl);

  let current = MEMBERS[0].country, query = "";

  const highlight = (name) => {
    const i = norm(name).indexOf(query);
    if (!query || i < 0) return esc(name);
    return `${esc(name.slice(0, i))}<mark>${esc(name.slice(i, i + query.length))}</mark>${esc(name.slice(i + query.length))}`;
  };
  // The name sits in its own span: li is a two-column grid, so a bare <mark> would become a grid cell
  const list = (names, tag = "ol") => `<${tag} class="dir-list">${names.map((c, i) => `<li style="--i:${i}"><span>${highlight(c)}</span></li>`).join("")}</${tag}>`;

  function render() {
    if (query) {
      const groups = MEMBERS.map((m) => ({ ...m, hits: m.companies.filter((c) => norm(c).includes(query)) })).filter((g) => g.hits.length);
      const n = groups.reduce((a, g) => a + g.hits.length, 0);
      tabs.forEach((t) => {
        const g = groups.find((x) => x.country === t.dataset.country);
        t.classList.toggle("is-dim", !g);
        t.setAttribute("aria-selected", "false");
        t.querySelector(".country-tab__count").textContent = g ? g.hits.length : 0;
      });
      panel.removeAttribute("aria-labelledby");
      status.textContent = n ? `${n} ${n === 1 ? "match" : "matches"} in ${groups.length} ${groups.length === 1 ? "country" : "countries"}` : "No matches";
      panel.innerHTML = n
        ? groups.map((g) => `<div class="dir-group"><h3>${esc(g.country)} <span class="mono">${g.hits.length}</span></h3>${list(g.hits, "ul")}</div>`).join("")
        : `<p class="dir-empty">No member company matches “${esc(input.value.trim())}”. Try a shorter name, or <a href="mailto:Info@awris.com">ask the AWRIS team</a>.</p>`;
    } else {
      const m = MEMBERS.find((x) => x.country === current);
      tabs.forEach((t) => {
        const on = t.dataset.country === current;
        t.classList.remove("is-dim");
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        t.querySelector(".country-tab__count").textContent = MEMBERS.find((x) => x.country === t.dataset.country).companies.length;
      });
      panel.setAttribute("aria-labelledby", `tab-${slug(current)}`);
      status.textContent = `${total} companies · ${MEMBERS.length} countries`;
      panel.innerHTML = `
        <div class="dir-head"><h3>${esc(m.country)}</h3><span class="dir-head__count"><b>${m.companies.length}</b><span class="mono">member companies</span></span></div>
        ${list(m.companies)}`;
    }
    queueRefresh();
  }

  const select = (country) => {
    if (query) { query = ""; input.value = ""; }
    current = country;
    render();
    const tab = tabs.find((t) => t.dataset.country === country);
    if (countriesEl.scrollWidth > countriesEl.clientWidth) countriesEl.scrollTo({ left: tab.offsetLeft - 16, behavior: "smooth" });
  };

  countriesEl.addEventListener("click", (e) => {
    const tab = e.target.closest(".country-tab");
    if (tab) select(tab.dataset.country);
  });
  countriesEl.addEventListener("keydown", (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0 || (!step && e.key !== "Home" && e.key !== "End")) return;
    e.preventDefault();
    const j = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + step + tabs.length) % tabs.length;
    select(tabs[j].dataset.country);
    tabs[j].focus();
  });

  let typing = 0;
  input.addEventListener("input", () => {
    clearTimeout(typing);
    typing = setTimeout(() => { query = norm(input.value.trim()); render(); }, 120);
  });

  render();
}

// ---------- Newsroom cards + filters ----------
function initNews({ queueRefresh }) {
  const grid = $("#newsGrid");
  if (!grid) return;
  grid.innerHTML = ARTICLES.map((a) => `
    <article class="story" data-kind="${a.kind}">
      <a class="story__link" href="${a.source}" data-article="${a.id}">
        <div class="story__media${a.image ? (a.poster ? " story__media--poster" : "") : " story__media--rating"}">
          ${a.image
            ? `<img src="${a.image}" alt="${esc(a.alt)}" loading="lazy">`
            : `<span class="story__grade">B++</span><span class="mono">AM Best · stable outlook</span>`}
        </div>
        <div class="story__body">
          <span class="story__meta mono">${esc(a.tag)} · <time datetime="${a.date}">${a.dateLabel}</time></span>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.dek)}</p>
          <span class="story__more mono">Read the story <span aria-hidden="true">→</span></span>
        </div>
      </a>
    </article>`).join("");

  const cards = $$(".story", grid), filters = $$("[data-filter]");
  const apply = (kind) => {
    filters.forEach((b) => { const on = b.dataset.filter === kind; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
    let lead = true;
    cards.forEach((c) => {
      const show = kind === "all" || c.dataset.kind === kind;
      c.hidden = !show;
      c.classList.toggle("story--lead", show && lead);  // newest visible story gets the wide card
      if (show) lead = false;
    });
  };
  filters.forEach((b) => b.addEventListener("click", () => { apply(b.dataset.filter); queueRefresh(); }));
  apply("all");
}

// ---------- FAQ: one open answer at a time, animated height, topic filter ----------
function initFaq({ gsap, reduce, queueRefresh }) {
  const listEl = $("#faqList");
  if (!listEl) return;
  const items = $$(".qa", listEl);

  const open = (d) => {
    d.open = true;
    if (reduce) return queueRefresh();
    gsap.fromTo($(".qa__a", d), { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "height,opacity", onComplete: queueRefresh });
  };
  const close = (d) => {
    if (reduce) { d.open = false; return queueRefresh(); }
    gsap.to($(".qa__a", d), {
      height: 0, opacity: 0, duration: 0.35, ease: "power2.inOut",
      onComplete: () => { d.open = false; gsap.set($(".qa__a", d), { clearProps: "height,opacity" }); queueRefresh(); },
    });
  };
  items.forEach((d) => $("summary", d).addEventListener("click", (e) => {
    e.preventDefault();
    if (d.open) return close(d);
    items.forEach((o) => o !== d && o.open && close(o));
    open(d);
  }));

  const topics = $$("[data-topic-filter]");
  topics.forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.topicFilter;
    topics.forEach((o) => { const on = o === b; o.classList.toggle("is-active", on); o.setAttribute("aria-pressed", String(on)); });
    items.forEach((d) => (d.hidden = t !== "all" && d.dataset.topic !== t));
    queueRefresh();
  }));
}

// ---------- Reader: a side sheet that renders a story from content.js ----------
function initReader({ gsap, lenis, reduce }) {
  const dlg = $("#reader");
  if (!dlg || typeof dlg.showModal !== "function") return { open: () => false };
  const content = $("#readerContent"), sheet = $("#readerSheet"), panel = $(".reader__panel", dlg), scrim = $(".reader__scrim", dlg);
  let index = -1, lastFocus = null, closing = false;

  const paint = (i) => {
    const a = ARTICLES[i], newer = ARTICLES[i - 1], older = ARTICLES[i + 1];
    index = i;
    content.innerHTML = `
      <header class="reader__head">
        <span class="mono">${esc(a.tag)} · <time datetime="${a.date}">${a.dateLabel}</time></span>
        <h2 id="readerTitle">${esc(a.title)}</h2>
        <p class="reader__dek">${esc(a.dek)}</p>
      </header>
      ${a.image
        ? `<figure class="reader__hero${a.poster ? " reader__hero--poster" : ""}"><img src="${a.image}" alt="${esc(a.alt)}"></figure>`
        : `<div class="reader__badge"><span class="story__grade">B++</span><span class="mono">AM Best · financial strength · stable outlook</span></div>`}
      ${a.facts ? `<dl class="reader__facts">${a.facts.map(([v, l]) => `<div><dt class="mono">${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
      <div class="reader__body">${a.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      ${a.gallery ? `<div class="reader__gallery">${a.gallery.map((src) => `<img src="${src}" alt="Photo from the ${esc(a.title)}" loading="lazy">`).join("")}</div>` : ""}
      <footer class="reader__foot">
        <a class="mono" href="${a.source}" target="_blank" rel="noopener">Original on awris.com ↗</a>
        <div class="reader__nav">
          ${newer ? `<button type="button" class="reader__step reader__step--newer" data-step="-1"><span class="mono">← Newer</span>${esc(newer.title)}</button>` : ""}
          ${older ? `<button type="button" class="reader__step reader__step--older" data-step="1"><span class="mono">Older →</span>${esc(older.title)}</button>` : ""}
        </div>
      </footer>`;
    sheet.scrollTop = 0;
  };

  const open = (id) => {
    const i = ARTICLES.findIndex((a) => a.id === id);
    if (i < 0) return false;
    paint(i);
    if (dlg.open) {
      if (!reduce) gsap.fromTo(content, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" });
      return true;
    }
    lastFocus = document.activeElement;
    dlg.showModal();
    document.documentElement.classList.add("is-reading");
    lenis?.stop();
    $(".reader__close", dlg).focus({ preventScroll: true });
    if (!reduce) {
      gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none" });
      gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.7, ease: "power4.out" });
    }
    return true;
  };

  const close = () => {
    if (!dlg.open || closing) return;
    if (reduce) return dlg.close();
    closing = true;
    gsap.to(scrim, { opacity: 0, duration: 0.35, ease: "none" });
    gsap.to(panel, { xPercent: 100, duration: 0.45, ease: "power3.in", onComplete: () => { closing = false; dlg.close(); } });
  };

  dlg.addEventListener("close", () => {
    document.documentElement.classList.remove("is-reading");
    lenis?.start();
    lastFocus?.focus?.({ preventScroll: true });
  });
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  dlg.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return close();
    const step = e.target.closest("[data-step]");
    if (step && ARTICLES[index + +step.dataset.step]) open(ARTICLES[index + +step.dataset.step].id);
  });

  return { open };
}
