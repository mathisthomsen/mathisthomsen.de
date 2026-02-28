/**
 * cv.js — Data fetch, render engine, and i18n for cv/index.html
 *
 * Responsibilities:
 * 1. Fetch /data/cv.json
 * 2. Determine active language (localStorage → navigator.language → 'de')
 * 3. Render all CV sections into the DOM
 * 4. Handle DE|EN toggle without page reload
 * 5. Update html[lang] and localStorage on switch
 * 6. Accept ?lang= query param for PDF export pre-selection
 */

/* ── i18n helpers ─────────────────────────────────────────── */

const SUPPORTED_LANGS = ['de', 'en'];
const STORAGE_KEY = 'cv-lang';

/** Resolve initial language: query param > localStorage > browser > 'de' */
function resolveInitialLang() {
  const params = new URLSearchParams(window.location.search);
  const qLang = params.get('lang');
  if (qLang && SUPPORTED_LANGS.includes(qLang)) return qLang;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

  const browser = (navigator.language || '').toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(browser) ? browser : 'de';
}

/** Get localized string — field can be string or { de, en } */
function t(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field['de'] || '';
}

/** Format "YYYY-MM" → localized month/year */
function formatDate(str, lang) {
  if (!str) return lang === 'de' ? 'heute' : 'present';
  const [year, month] = str.split('-');
  if (!month) return year; // year-only string
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

/** Format period "start – end" */
function formatPeriod(start, end, lang) {
  return `${formatDate(start, lang)} – ${formatDate(end, lang)}`;
}

/* ── DOM helpers ──────────────────────────────────────────── */

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/** Build a segmented bar track + fill */
function buildBar(level, max, label, trackClass, fillClass) {
  const track = el('div', trackClass);
  track.setAttribute('role', 'meter');
  track.setAttribute('aria-valuenow', level);
  track.setAttribute('aria-valuemin', 0);
  track.setAttribute('aria-valuemax', max);
  track.setAttribute('aria-label', `${label}: ${level} ${activeLang === 'de' ? 'von' : 'of'} ${max}`);
  const fill = el('div', fillClass);
  fill.dataset.level = level;
  fill.style.setProperty('--bar-fill', 0); // animated to level by animations.js
  track.appendChild(fill);
  return track;
}

/* ── Section renderers ────────────────────────────────────── */

function renderContact(meta) {
  const contact = document.getElementById('cv-contact');
  if (!contact) return;
  contact.innerHTML = '';

  const items = [
    { icon: '✉', text: meta.email, href: `mailto:${meta.email}`, label: 'E-Mail' },
    { icon: '🌐', text: meta.website, href: `https://${meta.website}`, label: 'Website' },
  ];

  items.forEach(({ icon, text, href, label }) => {
    const li = el('li', 'cv-header__contact-item');
    li.innerHTML = `<span aria-hidden="true">${icon}</span>
      <a href="${href}" aria-label="${label}: ${text}">${text}</a>`;
    contact.appendChild(li);
  });
}

function renderSummary(data, lang) {
  const el = document.getElementById('cv-summary');
  if (el) el.textContent = t(data.summary, lang);
}

function renderExperience(data, lang) {
  const container = document.getElementById('cv-experience');
  if (!container) return;
  container.innerHTML = '';

  data.experience.forEach(job => {
    const entry = document.createElement('article');
    entry.className = 'cv-timeline__entry';

    // Company header
    const companyDiv = el('div', 'cv-timeline__company');
    const nameEl = el('span', 'cv-timeline__company-name');
    if (job.companyUrl) {
      nameEl.innerHTML = `<a href="${job.companyUrl}" target="_blank" rel="noopener noreferrer">${job.company}</a>`;
    } else {
      nameEl.textContent = job.company;
    }

    const periodEl = el('span', 'cv-timeline__period');
    periodEl.textContent = formatPeriod(job.start, job.end, lang);

    companyDiv.appendChild(nameEl);
    companyDiv.appendChild(periodEl);
    entry.appendChild(companyDiv);

    // Job-level description (Sedo pattern: placed between company header and role
    // progression, so it reads as "what I did here" → "how I progressed")
    if (job.description) {
      const descItems = t(job.description, lang);
      if (Array.isArray(descItems) && descItems.length) {
        const ul = el('ul', 'cv-timeline__desc');
        descItems.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        entry.appendChild(ul);
      }
    }

    // Roles
    const rolesDiv = el('div', 'cv-timeline__roles');

    job.roles.forEach(role => {
      const roleDiv = el('div', 'cv-timeline__role');

      // Role header
      const roleHeader = el('div', 'cv-timeline__role-header');
      const titleEl = el('span', 'cv-timeline__role-title');
      titleEl.textContent = t(role.title, lang);
      const rPeriod = el('span', 'cv-timeline__role-period');
      rPeriod.textContent = formatPeriod(role.start, role.end, lang);
      roleHeader.appendChild(titleEl);
      roleHeader.appendChild(rPeriod);
      roleDiv.appendChild(roleHeader);

      // Per-role description (VR-NetWorld pattern: each role has its own)
      if (role.description) {
        const descItems = t(role.description, lang);
        if (Array.isArray(descItems) && descItems.length) {
          const ul = el('ul', 'cv-timeline__desc');
          descItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
          });
          roleDiv.appendChild(ul);
        }
      }

      rolesDiv.appendChild(roleDiv);
    });

    entry.appendChild(rolesDiv);

    // Tags (Sedo only — from top-level job.tags)
    if (job.tags && job.tags.length) {
      const tagsDiv = el('div', 'cv-timeline__tags');
      job.tags.forEach(tag => {
        const span = el('span', 'cv-timeline__tag', tag);
        tagsDiv.appendChild(span);
      });
      entry.appendChild(tagsDiv);
    }

    container.appendChild(entry);
  });
}

function renderEducation(data, lang) {
  const container = document.getElementById('cv-education');
  if (!container) return;
  container.innerHTML = '';

  data.education.forEach(edu => {
    const entry = document.createElement('article');
    entry.className = 'cv-timeline__entry';

    const periodEl = el('span', 'cv-timeline__period');
    periodEl.textContent = formatPeriod(edu.start, edu.end, lang);

    const degreeEl = el('p', 'cv-timeline__degree');
    degreeEl.textContent = t(edu.degree, lang);

    const instEl = el('p', 'cv-timeline__institution');
    instEl.textContent = edu.institution;

    const gradeEl = el('p', 'cv-timeline__grade');
    gradeEl.textContent = lang === 'de' ? `Note: ${edu.grade}` : `Grade: ${edu.grade}`;

    const focusEl = el('p', 'cv-timeline__focus');
    focusEl.textContent = t(edu.focus, lang);

    entry.appendChild(periodEl);
    entry.appendChild(degreeEl);
    entry.appendChild(instEl);
    entry.appendChild(gradeEl);
    entry.appendChild(focusEl);

    container.appendChild(entry);
  });
}

function renderSkills(data, lang) {
  const container = document.getElementById('cv-skills');
  if (!container) return;
  container.innerHTML = '';

  const groupLabels = {
    specialized: { de: 'Spezialisierung', en: 'Specialization' },
    tools: { de: 'Tools & Technologie', en: 'Tools & Technology' },
    misc: { de: 'Weitere Kenntnisse', en: 'Miscellaneous' },
  };

  // Specialized
  const specGroup = el('div', 'cv-skills__group');
  const specTitle = el('p', 'cv-skills__group-title', t(groupLabels.specialized, lang));
  specGroup.appendChild(specTitle);

  data.skills.specialized.forEach(skill => {
    const skillDiv = el('div', 'cv-skill');
    const nameEl = el('span', 'cv-skill__name', t(skill.name, lang));
    const bar = buildBar(skill.level, skill.max, t(skill.name, lang), 'cv-skill__bar-track', 'cv-skill__bar-fill');
    skillDiv.appendChild(nameEl);
    skillDiv.appendChild(bar);
    specGroup.appendChild(skillDiv);
  });
  container.appendChild(specGroup);

  // Tools
  const toolGroup = el('div', 'cv-skills__group');
  const toolTitle = el('p', 'cv-skills__group-title', t(groupLabels.tools, lang));
  toolGroup.appendChild(toolTitle);

  data.skills.tools.forEach(skill => {
    const skillDiv = el('div', 'cv-skill');
    const nameEl = el('span', 'cv-skill__name', skill.name);
    const bar = buildBar(skill.level, skill.max, skill.name, 'cv-skill__bar-track', 'cv-skill__bar-fill');
    skillDiv.appendChild(nameEl);
    skillDiv.appendChild(bar);
    toolGroup.appendChild(skillDiv);
  });
  container.appendChild(toolGroup);

  // Misc tags
  const miscGroup = el('div', 'cv-skills__group');
  const miscTitle = el('p', 'cv-skills__group-title', t(groupLabels.misc, lang));
  miscGroup.appendChild(miscTitle);
  const miscTags = el('div', 'cv-skills__misc');
  const miscItems = t(data.skills.misc, lang);
  if (Array.isArray(miscItems)) {
    miscItems.forEach(item => {
      miscTags.appendChild(el('span', 'cv-skills__misc-tag', item));
    });
  }
  miscGroup.appendChild(miscTags);
  container.appendChild(miscGroup);
}

function renderLanguages(data, lang) {
  const container = document.getElementById('cv-languages');
  if (!container) return;
  container.innerHTML = '';

  data.languages.forEach(language => {
    const langDiv = el('div', 'cv-language');
    const header = el('div', 'cv-language__header');
    header.appendChild(el('span', 'cv-language__name', t(language.name, lang)));
    header.appendChild(el('span', 'cv-language__label', t(language.label, lang)));
    const bar = buildBar(language.level, language.max, t(language.name, lang), 'cv-lang__bar-track', 'cv-lang__bar-fill');
    langDiv.appendChild(header);
    langDiv.appendChild(bar);
    container.appendChild(langDiv);
  });
}

function renderCertifications(data, lang) {
  const container = document.getElementById('cv-certs');
  if (!container) return;
  container.innerHTML = '';

  data.certifications.forEach(cert => {
    const li = el('li', 'cv-cert');
    const titleEl = el('p', 'cv-cert__title', t(cert.title, lang));
    const issuerEl = el('p', 'cv-cert__issuer', cert.issuer);
    li.appendChild(titleEl);
    li.appendChild(issuerEl);
    container.appendChild(li);
  });
}

function renderProjects(data, lang) {
  const container = document.getElementById('cv-projects');
  if (!container) return;
  container.innerHTML = '';

  data.projects.forEach(project => {
    const div = el('div', 'cv-project');

    const titleEl = el('h3', 'cv-project__title', t(project.title, lang));
    div.appendChild(titleEl);

    if (project.start) {
      const periodEl = el('p', 'cv-project__period');
      periodEl.textContent = project.end
        ? `${project.start} – ${project.end}`
        : `${lang === 'de' ? 'seit' : 'since'} ${project.start}`;
      div.appendChild(periodEl);
    }

    const descEl = el('p', 'cv-project__desc', t(project.description, lang));
    div.appendChild(descEl);

    if (project.links && project.links.length) {
      const linksDiv = el('div', 'cv-project__links');
      project.links.forEach(link => {
        const a = el('a', 'cv-project__link', link.label);
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        linksDiv.appendChild(a);
      });
      div.appendChild(linksDiv);
    }

    container.appendChild(div);
  });
}

/* ── i18n section headings ─────────────────────────────────── */

const SECTION_LABELS = {
  'section.about':         { de: 'Über mich',                         en: 'About' },
  'section.experience':    { de: 'Berufserfahrung',                    en: 'Work Experience' },
  'section.education':     { de: 'Ausbildung',                         en: 'Education' },
  'section.skills':        { de: 'Kenntnisse',                         en: 'Skills' },
  'section.languages':     { de: 'Sprachen',                           en: 'Languages' },
  'section.certifications':{ de: 'Weiterbildung & Qualifikationen',     en: 'Further Education & Certifications' },
  'section.projects':      { de: 'Projekte',                           en: 'Projects' },
};

function updateSectionHeadings(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (SECTION_LABELS[key]) {
      el.textContent = SECTION_LABELS[key][lang] || SECTION_LABELS[key]['de'];
    }
  });

  // Update page title
  document.title = lang === 'en'
    ? 'CV — Mathis Thomsen'
    : 'Lebenslauf — Mathis Thomsen';

  // Update meta description
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.content = lang === 'en'
      ? 'CV — Mathis Thomsen, Senior UX/UI Designer. Bonn, Germany.'
      : 'Lebenslauf — Mathis Thomsen, Senior UX/UI Designer. Bonn, Deutschland.';
  }

  // Update PDF download link lang param
  const dlLink = document.querySelector('.cv-topbar__download');
  if (dlLink) {
    dlLink.href = `/export/cv.pdf?lang=${lang}`;
    dlLink.setAttribute('aria-label',
      lang === 'de' ? 'CV als PDF herunterladen' : 'Download CV as PDF'
    );
  }
}

/* ── Full render ───────────────────────────────────────────── */

let cvData = null;
let activeLang = 'de';

function renderAll(data, lang) {
  renderContact(data.meta);
  renderSummary(data, lang);
  renderExperience(data, lang);
  renderEducation(data, lang);
  renderSkills(data, lang);
  renderLanguages(data, lang);
  renderCertifications(data, lang);
  renderProjects(data, lang);
  updateSectionHeadings(lang);
}

/* ── Language toggle handler ───────────────────────────────── */

function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  activeLang = lang;

  // Persist
  localStorage.setItem(STORAGE_KEY, lang);

  // Update html[lang]
  document.documentElement.lang = lang;

  // Update toggle button states
  document.querySelectorAll('.cv-lang-toggle__btn').forEach(btn => {
    const pressed = btn.dataset.lang === lang;
    btn.setAttribute('aria-pressed', String(pressed));
    // Update aria-labels
    if (btn.dataset.lang === 'de') {
      btn.setAttribute('aria-label', lang === 'de' ? 'Deutsch aktiv' : 'Auf Deutsch wechseln');
    } else {
      btn.setAttribute('aria-label', lang === 'en' ? 'English active' : 'Switch to English');
    }
  });

  // Re-render content
  if (cvData) {
    renderAll(cvData, lang);
    document.dispatchEvent(new CustomEvent('cv-rendered'));
  }

  // Fire event for animations.js
  const toggle = document.querySelector('.cv-lang-toggle');
  if (toggle) toggle.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));
}

function initLangToggle() {
  document.querySelectorAll('.cv-lang-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}

/* ── Bootstrap ─────────────────────────────────────────────── */

async function init() {
  activeLang = resolveInitialLang();

  // Set initial lang attribute before render
  document.documentElement.lang = activeLang;

  // Set initial toggle state
  document.querySelectorAll('.cv-lang-toggle__btn').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === activeLang));
  });

  initLangToggle();

  try {
    const response = await fetch('/data/cv.json');
    if (!response.ok) throw new Error(`Failed to load CV data: ${response.status}`);
    cvData = await response.json();
    renderAll(cvData, activeLang);
    document.dispatchEvent(new CustomEvent('cv-rendered'));
  } catch (err) {
    console.error('[cv.js]', err);
    // Show a graceful fallback message
    const main = document.getElementById('main');
    if (main) {
      const errMsg = document.createElement('p');
      errMsg.textContent = activeLang === 'de'
        ? 'CV-Daten konnten nicht geladen werden. Bitte Seite neu laden.'
        : 'Could not load CV data. Please reload the page.';
      errMsg.style.cssText = 'padding:2rem;color:var(--color-text-secondary)';
      main.prepend(errMsg);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
