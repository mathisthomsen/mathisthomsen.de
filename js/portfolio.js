/**
 * portfolio.js — Portfolio render engine
 *
 * Serves both the overview page (portfolio.html) and individual
 * case study pages (portfolio/[slug]/index.html).
 *
 * Page detection: looks for #portfolio-overview or #portfolio-detail in the DOM.
 * Content is fetched from /data/portfolio.json and rendered entirely by JS.
 * Language toggle reuses the same localStorage key ('cv-lang') as cv.js for
 * site-wide language persistence.
 */

/* ── i18n & language ─────────────────────────────────────────── */

const SUPPORTED_LANGS = ['de', 'en'];
const STORAGE_KEY = 'cv-lang'; // shared with cv.js for site-wide persistence

let activeLang = 'de';
let portfolioData = null;

function resolveInitialLang() {
  const params = new URLSearchParams(window.location.search);
  const qLang = params.get('lang');
  if (qLang && SUPPORTED_LANGS.includes(qLang)) return qLang;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

  const browser = (navigator.language || '').toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(browser) ? browser : 'de';
}

function t(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field['de'] || '';
}

/* ── DOM helper ──────────────────────────────────────────────── */

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* ── Method icons ────────────────────────────────────────────── */
/* Minimal inline SVGs — 24×24, stroke: currentColor, no fill   */
/* Icon identifiers used in portfolio.json "icon" field          */

const ICONS = {
  cards: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="9" width="13" height="10" rx="1"/>
    <path d="M7 9V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3"/>
  </svg>`,

  layers: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>`,

  tree: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="4" r="2"/>
    <circle cx="5" cy="19" r="2"/>
    <circle cx="12" cy="19" r="2"/>
    <circle cx="19" cy="19" r="2"/>
    <line x1="12" y1="6" x2="12" y2="13"/>
    <line x1="12" y1="13" x2="5" y2="17"/>
    <line x1="12" y1="13" x2="12" y2="17"/>
    <line x1="12" y1="13" x2="19" y2="17"/>
  </svg>`,

  network: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <circle cx="4"  cy="5"  r="2"/>
    <circle cx="20" cy="5"  r="2"/>
    <circle cx="4"  cy="19" r="2"/>
    <circle cx="20" cy="19" r="2"/>
    <line x1="9.5"  y1="10.5" x2="5.5"  y2="6.5"/>
    <line x1="14.5" y1="10.5" x2="18.5" y2="6.5"/>
    <line x1="9.5"  y1="13.5" x2="5.5"  y2="17.5"/>
    <line x1="14.5" y1="13.5" x2="18.5" y2="17.5"/>
  </svg>`,

  ai: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2l1.5 8.5L22 12l-8.5 1.5L12 22l-1.5-8.5L2 12l8.5-1.5Z"/>
  </svg>`,

  database: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>`,

  code: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
    <line x1="14" y1="4" x2="10" y2="20"/>
  </svg>`,

  research: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,

  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
    <line x1="3"  y1="20" x2="21" y2="20"/>
  </svg>`,

  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,

  split: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="6" y1="3" x2="6" y2="15"/>
    <circle cx="18" cy="6" r="3"/>
    <circle cx="6"  cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </svg>`,

  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`,

  balance: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="12" y1="3" x2="12" y2="21"/>
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    <path d="M7 21h10"/>
    <path d="M16 7l3 9c-.87.65-1.92 1-3 1s-2.13-.35-3-1l3-9z"/>
    <path d="M8 7l-3 9c.87.65 1.92 1 3 1s2.13-.35 3-1L8 7z"/>
  </svg>`,

  cart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>`,

  refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>`,

  users: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>`,

  grid: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3"  y="3"  width="7" height="7"/>
    <rect x="14" y="3"  width="7" height="7"/>
    <rect x="3"  y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
  </svg>`,
};

/* ── Block renderers (case study detail) ─────────────────────── */

function renderStatBar(block) {
  const wrap = el('div', 'cs-stat-bar');
  (block.stats || []).forEach(stat => {
    const item = el('div', 'cs-stat');
    item.appendChild(el('span', 'cs-stat__value', t(stat.value, activeLang)));
    item.appendChild(el('span', 'cs-stat__label', t(stat.label, activeLang)));
    wrap.appendChild(item);
  });
  return wrap;
}

function renderText(block) {
  const p = el('p', 'cs-text', t(block.content, activeLang));
  return p;
}

function renderTimeline(block) {
  const wrap = document.createDocumentFragment();

  const label = el('p', 'cs-section-label');
  label.textContent = activeLang === 'de' ? 'Prozess' : 'Process';
  wrap.appendChild(label);

  const timeline = el('div', 'cs-timeline');
  (block.phases || []).forEach(phase => {
    const isWip = phase.wip === true;
    const entry = el('div', isWip
      ? 'cs-timeline__phase-entry cs-timeline__phase-entry--wip'
      : 'cs-timeline__phase-entry'
    );

    const rawLabel = t(phase.phase, activeLang);
    const num = el('p', 'cs-timeline__phase-num');
    num.textContent = /^\d+$/.test(rawLabel) ? `Phase ${rawLabel}` : rawLabel;
    entry.appendChild(num);

    if (isWip) {
      entry.appendChild(el('span', 'cs-timeline__phase-wip-badge',
        activeLang === 'de' ? 'In Arbeit' : 'In Progress'
      ));
    }

    entry.appendChild(el('h3', 'cs-timeline__phase-title', t(phase.title, activeLang)));
    entry.appendChild(el('p', 'cs-timeline__phase-desc', t(phase.description, activeLang)));

    timeline.appendChild(entry);
  });
  wrap.appendChild(timeline);

  const container = el('div');
  container.appendChild(wrap);
  return container;
}

function renderMethodGrid(block) {
  const wrap = document.createDocumentFragment();

  const label = el('p', 'cs-section-label');
  label.textContent = activeLang === 'de' ? 'Methoden' : 'Methods';
  wrap.appendChild(label);

  const grid = el('div', 'cs-method-grid');
  (block.methods || []).forEach(method => {
    const card = el('div', 'cs-method');

    const iconWrap = el('div', 'cs-method__icon');
    iconWrap.innerHTML = ICONS[method.icon] || '';
    card.appendChild(iconWrap);

    card.appendChild(el('h3', 'cs-method__title', t(method.title, activeLang)));
    card.appendChild(el('p', 'cs-method__desc', t(method.description, activeLang)));

    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  const container = el('div');
  container.appendChild(wrap);
  return container;
}

function renderInsight(block) {
  const wrap = el('aside', 'cs-insight');
  wrap.appendChild(el('p', 'cs-insight__text', t(block.content, activeLang)));
  return wrap;
}

function renderChallengeApproachOutcome(block) {
  const wrap = el('div', 'cs-outcome');

  const LABELS = {
    challenge: { de: 'Challenge',  en: 'Challenge' },
    approach:  { de: 'Vorgehen',   en: 'Approach' },
    outcome:   { de: 'Ergebnis',   en: 'Outcome' },
  };

  ['challenge', 'approach', 'outcome'].forEach(key => {
    if (!block[key]) return;
    const item = el('div', 'cs-outcome__item');
    item.appendChild(el('p', 'cs-outcome__label', LABELS[key][activeLang]));
    item.appendChild(el('p', 'cs-outcome__text', t(block[key], activeLang)));
    wrap.appendChild(item);
  });

  return wrap;
}

function renderDisclaimer() {
  const wrap = el('aside', 'cs-disclaimer');

  wrap.appendChild(el('p', 'cs-disclaimer__label',
    activeLang === 'de' ? 'Vertraulich' : 'Confidential'
  ));

  const text = activeLang === 'de'
    ? 'Aus Vertraulichkeitsgründen sind Details und Dokumentation dieses Projekts nicht öffentlich verfügbar. Ich teile sie gerne im persönlichen Gespräch.'
    : 'Due to confidentiality, detailed documentation of this project is not publicly available. I\'m happy to walk you through it in a personal conversation.';

  wrap.appendChild(el('p', 'cs-disclaimer__text', text));
  return wrap;
}

function renderVisualSlots(block) {
  const wrap = document.createDocumentFragment();

  const label = el('p', 'cs-section-label');
  label.textContent = activeLang === 'de' ? 'Visuals' : 'Visuals';
  wrap.appendChild(label);

  const grid = el('div', 'cs-visual-slots');
  (block.slots || []).forEach(slot => {
    const item = el('div', 'cs-visual-slot');

    const area = el('div', 'cs-visual-slot__area');
    area.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="cs-visual-slot__icon"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

    item.appendChild(area);
    item.appendChild(el('p', 'cs-visual-slot__caption', t(slot.caption, activeLang)));
    grid.appendChild(item);
  });
  wrap.appendChild(grid);

  const container = el('div');
  container.appendChild(wrap);
  return container;
}

function renderKeyTakeaways(block) {
  const wrap = document.createDocumentFragment();

  const label = el('p', 'cs-section-label');
  label.textContent = activeLang === 'de' ? 'Key Takeaways' : 'Key Takeaways';
  wrap.appendChild(label);

  const grid = el('div', 'cs-key-takeaways');
  (block.takeaways || []).forEach(item => {
    const card = el('div', 'cs-key-takeaway');
    card.appendChild(el('h3', 'cs-key-takeaway__title', t(item.title, activeLang)));
    card.appendChild(el('p', 'cs-key-takeaway__desc', t(item.description, activeLang)));
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  const container = el('div');
  container.appendChild(wrap);
  return container;
}

function renderBlock(block) {
  switch (block.type) {
    case 'stat_bar':                  return renderStatBar(block);
    case 'text':                      return renderText(block);
    case 'timeline':                  return renderTimeline(block);
    case 'method_grid':               return renderMethodGrid(block);
    case 'insight':                   return renderInsight(block);
    case 'challenge_approach_outcome':return renderChallengeApproachOutcome(block);
    case 'visual_slots':              return renderVisualSlots(block);
    case 'key_takeaways':             return renderKeyTakeaways(block);
    default: return null;
  }
}

/* ── Case study header ───────────────────────────────────────── */

function buildCaseStudyHeader(project) {
  const header = el('header', 'case-study-header');
  const inner  = el('div', 'case-study-header__inner container');

  inner.appendChild(el('p', 'case-study-header__label', 'Portfolio'));

  if (project.wip) {
    inner.appendChild(el('span', 'case-study-header__wip-badge',
      activeLang === 'de' ? 'In Arbeit · Work in Progress' : 'Work in Progress · In Arbeit'
    ));
  }

  inner.appendChild(el('h1', 'case-study-header__title', t(project.title, activeLang)));

  // Meta row
  const meta = el('dl', 'case-study-header__meta');
  const META_FIELDS = [
    { key: 'year',     label: { de: 'Jahr',    en: 'Year' } },
    { key: 'duration', label: { de: 'Dauer',   en: 'Duration' } },
    { key: 'client',   label: { de: 'Kunde',   en: 'Client' } },
    { key: 'role',     label: { de: 'Rolle',   en: 'Role' } },
  ];
  META_FIELDS.forEach(({ key, label }) => {
    const val = t(project[key], activeLang);
    if (!val) return;
    const item = el('div', 'case-study-header__meta-item');
    item.appendChild(el('dt', 'case-study-header__meta-label', label[activeLang]));
    item.appendChild(el('dd', 'case-study-header__meta-value', val));
    meta.appendChild(item);
  });
  inner.appendChild(meta);

  // Tags
  if (project.tags && project.tags.length) {
    const ul = el('ul', 'case-study-header__tags');
    project.tags.forEach(tag => {
      ul.appendChild(el('li', 'case-study-header__tag', tag));
    });
    inner.appendChild(ul);
  }

  // External URL (for non-confidential projects with a live site)
  if (project.url) {
    const urlLink = el('a', 'case-study-header__url');
    urlLink.href = project.url;
    urlLink.target = '_blank';
    urlLink.rel = 'noopener noreferrer';
    urlLink.textContent = project.url.replace(/^https?:\/\//, '') + ' ↗';
    inner.appendChild(urlLink);
  }

  header.appendChild(inner);
  return header;
}

/* ── Detail page renderer ────────────────────────────────────── */

function renderDetail(data, slug) {
  const project = (data.projects || []).find(p => p.slug === slug);
  const container = document.getElementById('portfolio-detail');
  if (!project || !container) return;

  // Update page title and meta
  document.title = `${t(project.title, activeLang)} — Mathis Thomsen`;

  container.innerHTML = '';

  // Topbar
  container.appendChild(buildDetailTopbar());

  // Main
  const main = el('main', 'case-study-main');
  main.id = 'main';

  // Header section
  main.appendChild(buildCaseStudyHeader(project));

  // Content body
  const body = el('div', 'case-study-body');
  const bodyInner = el('div', 'container');

  // Render all section blocks
  (project.sections || []).forEach(block => {
    const rendered = renderBlock(block);
    if (!rendered) return;
    const wrapper = el('div', 'case-study__block');
    wrapper.setAttribute('data-reveal', '');
    wrapper.appendChild(rendered);
    bodyInner.appendChild(wrapper);
  });

  // Disclaimer (auto-appended for confidential projects)
  if (project.confidential) {
    const wrapper = el('div', 'case-study__block');
    wrapper.setAttribute('data-reveal', '');
    wrapper.appendChild(renderDisclaimer());
    bodyInner.appendChild(wrapper);
  }

  body.appendChild(bodyInner);
  main.appendChild(body);
  container.appendChild(main);

  // Footer
  container.appendChild(buildFooter());
}

/* ── Overview page renderer ──────────────────────────────────── */

function renderOverview(data) {
  const container = document.getElementById('portfolio-overview');
  if (!container) return;

  container.innerHTML = '';

  // Update the bilingual header subtitle (static in HTML, updated on lang switch)
  const sub = document.getElementById('portfolio-header-sub');
  if (sub) {
    sub.textContent = activeLang === 'de'
      ? 'Ausgewählte Projekte aus UX Research, Information Architecture und Interaction Design.'
      : 'Selected projects in UX research, information architecture and interaction design.';
  }

  const projects = data.projects || [];

  // Filter bar (hidden until > 4 projects)
  if (projects.length > 4) {
    container.appendChild(buildFilterBar(projects));
  }

  const grid = el('div', 'portfolio-grid');
  const inner = el('div', 'portfolio-grid__list');

  projects.forEach(project => {
    inner.appendChild(buildProjectCard(project));
  });

  grid.appendChild(inner);
  container.appendChild(grid);
}

function buildProjectCard(project) {
  const href = `/portfolio/${project.slug}/`;

  const card = el('a', 'portfolio-card');
  card.href = href;
  if (project.confidential) card.classList.add('portfolio-card--confidential');
  if (project.wip)          card.classList.add('portfolio-card--wip');
  card.setAttribute('data-reveal', '');

  // Meta row: year + type indicator
  const meta = el('div', 'portfolio-card__meta');
  meta.appendChild(el('span', 'portfolio-card__year', project.year));
  if (project.wip) {
    meta.appendChild(el('span', 'portfolio-card__type portfolio-card__type--wip',
      activeLang === 'de' ? 'In Arbeit' : 'In Progress'
    ));
  } else if (project.confidential) {
    meta.appendChild(el('span', 'portfolio-card__type',
      activeLang === 'de' ? 'Vertraulich' : 'Confidential'
    ));
  }
  card.appendChild(meta);

  card.appendChild(el('h2', 'portfolio-card__title', t(project.title, activeLang)));
  card.appendChild(el('p', 'portfolio-card__teaser', t(project.teaser, activeLang)));

  // Tags
  if (project.tags && project.tags.length) {
    const ul = el('ul', 'portfolio-card__tags');
    project.tags.forEach(tag => {
      ul.appendChild(el('li', 'portfolio-card__tag', tag));
    });
    card.appendChild(ul);
  }

  // CTA
  const cta = el('span', 'portfolio-card__cta');
  const ctaLabel = el('span', null, activeLang === 'de' ? 'Zum Projekt' : 'View project');
  const ctaArrow = el('span', 'portfolio-card__cta-arrow', '→');
  cta.appendChild(ctaLabel);
  cta.appendChild(ctaArrow);
  card.appendChild(cta);

  return card;
}

function buildFilterBar(projects) {
  const allTags = [...new Set(projects.flatMap(p => p.tags || []))];

  const bar = el('div', 'portfolio-filter portfolio-filter--visible');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', activeLang === 'de' ? 'Nach Thema filtern' : 'Filter by topic');

  allTags.forEach(tag => {
    const btn = el('button', 'portfolio-filter__btn', tag);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      btn.setAttribute('aria-pressed',
        btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'
      );
      // TODO: implement filter logic when multiple projects exist
    });
    bar.appendChild(btn);
  });

  return bar;
}

/* ── Shared topbar builders ──────────────────────────────────── */

function buildOverviewTopbar() {
  const nav = el('nav', 'portfolio-topbar');
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', activeLang === 'de' ? 'Seiten-Navigation' : 'Page navigation');

  const back = el('a', 'portfolio-topbar__back');
  back.href = '/';
  back.innerHTML = '<span aria-hidden="true">←</span>';
  back.appendChild(document.createTextNode('\u00A0Mathis Thomsen'));
  nav.appendChild(back);

  nav.appendChild(buildLangToggle());
  return nav;
}

function buildDetailTopbar() {
  const nav = el('nav', 'portfolio-topbar case-study-topbar');
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', activeLang === 'de' ? 'Seiten-Navigation' : 'Page navigation');

  const back = el('a', 'portfolio-topbar__back');
  back.href = '/portfolio/';
  back.innerHTML = '<span aria-hidden="true">←</span>';
  back.appendChild(document.createTextNode(
    '\u00A0' + (activeLang === 'de' ? 'Portfolio' : 'Portfolio')
  ));
  nav.appendChild(back);

  nav.appendChild(buildLangToggle());
  return nav;
}

function buildLangToggle() {
  const wrap = el('div', 'portfolio-topbar__lang');
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label',
    activeLang === 'de' ? 'Sprache wählen' : 'Select language'
  );

  SUPPORTED_LANGS.forEach((lang, i) => {
    if (i > 0) {
      wrap.appendChild(el('span', 'portfolio-topbar__lang-sep', '|'))
        .setAttribute('aria-hidden', 'true');
    }

    const btn = el('button', 'portfolio-topbar__lang-btn');
    btn.dataset.lang = lang;
    btn.textContent = lang.toUpperCase();
    btn.setAttribute('aria-pressed', lang === activeLang ? 'true' : 'false');
    btn.setAttribute('aria-label',
      lang === 'de' ? 'Auf Deutsch wechseln' : 'Switch to English'
    );
    btn.addEventListener('click', () => setLang(lang));
    wrap.appendChild(btn);
  });

  return wrap;
}

function buildFooter() {
  const footer = el('footer', 'site-footer');
  footer.innerHTML = `
    <span>© 2026 Mathis Thomsen</span>
    <span class="site-footer__sep">·</span>
    <a href="/impressum.html">Impressum</a>
    <span class="site-footer__sep">·</span>
    <a href="/datenschutz.html">Datenschutz</a>
  `;
  return footer;
}

/* ── Language toggle ─────────────────────────────────────────── */

function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  activeLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;

  // Update all toggle buttons on page
  document.querySelectorAll('.portfolio-topbar__lang-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
  });

  // Re-render the active page
  if (portfolioData) {
    const overview = document.getElementById('portfolio-overview');
    const detail   = document.getElementById('portfolio-detail');
    if (overview) renderOverview(portfolioData);
    if (detail)   renderDetail(portfolioData, detail.dataset.slug);
    document.dispatchEvent(new CustomEvent('portfolio-rendered'));
  }
}

/* ── Init ────────────────────────────────────────────────────── */

async function init() {
  activeLang = resolveInitialLang();
  document.documentElement.lang = activeLang;

  let data;
  try {
    const res = await fetch('/data/portfolio.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error('[portfolio] Failed to load portfolio.json:', err.message);
    return;
  }

  portfolioData = data;

  const overview = document.getElementById('portfolio-overview');
  const detail   = document.getElementById('portfolio-detail');

  if (overview) {
    // Inject topbar into the static topbar placeholder
    const topbarPlaceholder = document.getElementById('portfolio-topbar-placeholder');
    if (topbarPlaceholder) {
      topbarPlaceholder.replaceWith(buildOverviewTopbar());
    }
    renderOverview(data);
  }

  if (detail) {
    renderDetail(data, detail.dataset.slug);
  }

  document.dispatchEvent(new CustomEvent('portfolio-rendered'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
