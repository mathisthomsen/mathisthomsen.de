# mathisthomsen.de

Personal website for Mathis Thomsen — digital business card, interactive bilingual CV, and portfolio of UX/product design case studies.

**Stack:** HTML · CSS · Vanilla JS · Node.js (PDF export only)

---

## Setup

### View the site (no build step needed)

Open any HTML file directly in a browser **or** run the dev server (required for CV data fetch and PDF export):

```bash
npm install
npm start
```

Then visit:
- **Business card:** http://localhost:3000
- **CV:** http://localhost:3000/cv/
- **Portfolio:** http://localhost:3000/portfolio/
- **Case study:** http://localhost:3000/portfolio/b2b-platform-ia/
- **PDF (DE):** http://localhost:3000/export/cv.pdf?lang=de
- **PDF (EN):** http://localhost:3000/export/cv.pdf?lang=en

The server is a single zero-dependency Node.js file (`server/export.js`) that serves static files and handles PDF generation via Puppeteer.

---

## Project Structure

```
/
├── index.html                          # Digital business card
├── impressum.html                      # Imprint (German, legally required)
├── datenschutz.html                    # Privacy policy (German)
├── portfolio/
│   ├── index.html                      # Portfolio overview
│   ├── b2b-platform-ia/
│   │   └── index.html                  # Case study shell (HTML only)
│   └── evidoxa/
│       └── index.html                  # Case study shell (HTML only)
├── cv/
│   └── index.html                      # Interactive CV — bilingual (DE/EN)
├── data/
│   ├── cv.json                         # All CV content — single source of truth
│   ├── config.json                     # Business card content
│   └── portfolio.json                  # All portfolio content — single source of truth
├── css/
│   ├── base.css                        # Design tokens, reset, typography
│   ├── card.css                        # Business card styles
│   ├── cv.css                          # CV styles + @media print
│   ├── legal.css                       # Impressum/Datenschutz styles
│   └── portfolio.css                   # Portfolio overview + case study styles + @media print
├── js/
│   ├── cv.js                           # CV render engine + i18n
│   ├── portfolio.js                    # Portfolio render engine + i18n
│   └── animations.js                   # Progressive enhancement layer
├── assets/
│   ├── photo.jpg                       # Profile photo
│   ├── fonts/
│   │   ├── Inter-Variable.woff2
│   │   └── SpaceGrotesk-Variable.woff2
│   └── logos/                          # Optional company logos (SVG)
└── server/
    └── export.js                       # Puppeteer PDF + static file server
```

---

## Adding a new portfolio project

1. Add an entry to `data/portfolio.json` — no other file needs changing.
2. Create the case study shell: copy `portfolio/b2b-platform-ia/index.html` to `portfolio/[slug]/index.html` and update `data-slug`.
3. All content (title, teaser, sections, tags) is rendered by `portfolio.js` from the JSON.

### Section block types

| Type | Description |
|------|-------------|
| `stat_bar` | Row of large number stats with labels |
| `text` | Prose paragraph |
| `insight` | Pull-quote with accent left border |
| `timeline` | Vertical process phases |
| `method_grid` | 2-col grid of method cards with inline SVG icons |
| `visual_slots` | Placeholder image slots with captions (for WIP projects) |
| `key_takeaways` | 2-col grid of takeaway cards |
| `challenge_approach_outcome` | Labelled outcome block (any fields optional) |

Confidential projects (`"confidential": true`) auto-append a disclaimer block.
WIP projects (`"wip": true`) show a badge in the card and case study header.

### Method icon identifiers

Available icons for `method_grid` blocks:

| Identifier | Icon |
|------------|------|
| `cards` | Stacked cards |
| `layers` | Layered polygons |
| `tree` | Hierarchy tree |
| `network` | Connected nodes |
| `ai` | 4-pointed sparkle |
| `database` | Cylinder |
| `code` | `</>` brackets |
| `research` | Magnifying glass |

---

## Updating CV content

All CV content lives in `data/cv.json`. Edit it directly — no rebuild needed, just refresh the browser.

**Bilingual fields** use the pattern:
```json
{ "de": "Über mich", "en": "About" }
```

**String-only fields** (like company name, grade) are language-agnostic and need no translation object.

---

## Language switching

All pages default to the browser's language (`navigator.language`). The DE|EN toggle in the top bar switches languages without a page reload. The choice is saved to `localStorage` under the key `cv-lang` and persists site-wide across all pages.

For PDF export, pass `?lang=de` or `?lang=en` to the `/export/cv.pdf` endpoint.

---

## Adding company logos

Place SVG logos in `/assets/logos/` using the filenames referenced in `cv.json`. If a logo file is absent, only the company name is displayed — no broken images.

---

## Accessibility

- WCAG AA minimum contrast throughout
- All animations respect `prefers-reduced-motion`
- Skip link, semantic landmarks, proper heading hierarchy
- Keyboard-accessible language toggle with `aria-pressed` state
- Screen-reader labels on all interactive controls

---

## Deployment

### Static site (automatic via GitHub Actions)

On every push to `main`, the workflow in `.github/workflows/deploy.yml` deploys all static files to the Ionos server via SFTP. The PDF export server is **not** included — it requires separate Node.js hosting.

**Required GitHub repository secrets:**

| Secret | Value |
|--------|-------|
| `FTP_SERVER` | Ionos SFTP hostname (e.g. `home12345678.1and1-data.host`) |
| `FTP_USERNAME` | FTP/SFTP username from Ionos control panel |
| `FTP_PASSWORD` | FTP/SFTP password |
| `FTP_SERVER_DIR` | Remote root directory (typically `/` or `/htdocs/`) |

Set these at: **GitHub → Settings → Secrets and variables → Actions → New repository secret**

### PDF export server (manual)

Deploy `server/export.js` separately to any Node.js host and point the `/export/cv.pdf` links in `cv/index.html` to the hosted endpoint. The server only requires `puppeteer` and the static CV files to be accessible at its host.

### Manual deployment (without GitHub Actions)

Upload everything except `server/`, `node_modules/`, `.claude/`, `package.json`, `package-lock.json`, and `README.md` to the web root of any static host.
