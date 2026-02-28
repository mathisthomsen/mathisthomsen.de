/**
 * server/export.js — PDF export server
 *
 * Serves the static site AND exposes a PDF export endpoint.
 *
 * Usage:
 *   node server/export.js
 *
 * Endpoints:
 *   GET /             → serves static files from project root
 *   GET /export/cv.pdf?lang=de|en  → returns A4 PDF of the CV
 *
 * The CV page's active language is pre-set via localStorage injection
 * before Puppeteer captures the page, so the rendered PDF matches
 * the requested language.
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');
const SUPPORTED_LANGS = ['de', 'en'];

/* ── Minimal static file server ───────────────────────────── */

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2':'font/woff2',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
};

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];

  // Directory index
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = path.join(ROOT, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/* ── PDF export handler ────────────────────────────────────── */

async function handlePdfExport(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const lang = SUPPORTED_LANGS.includes(url.searchParams.get('lang'))
    ? url.searchParams.get('lang')
    : 'de';

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Puppeteer not installed. Run: npm install');
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Pre-set language in localStorage before page loads
    await page.evaluateOnNewDocument((lang) => {
      localStorage.setItem('cv-lang', lang);
    }, lang);

    // Navigate to the CV page
    const cvUrl = `http://localhost:${PORT}/cv/?lang=${lang}`;
    await page.goto(cvUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for fonts and CV data to render
    await page.evaluate(() => document.fonts.ready);

    // Ensure CV data has rendered (wait for the name element)
    await page.waitForSelector('.cv-header__name', { timeout: 10000 });

    // Force all bar fills and reveal animations (IntersectionObserver won't
    // fire for off-screen sections in a headless, non-scrolling context)
    await page.evaluate(() => {
      document.querySelectorAll('.cv-skill__bar-fill, .cv-lang__bar-fill').forEach(bar => {
        bar.style.setProperty('--bar-fill', bar.dataset.level);
      });
      document.querySelectorAll('[data-reveal]').forEach(el => {
        el.classList.add('is-visible');
      });
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    });

    const filename = `CV_Mathis_Thomsen_${lang.toUpperCase()}.pdf`;
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);

  } catch (err) {
    console.error('[export] PDF generation failed:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`PDF generation failed: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

/* ── Request router ────────────────────────────────────────── */

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (req.method === 'GET' && urlPath === '/export/cv.pdf') {
    await handlePdfExport(req, res);
  } else if (req.method === 'GET') {
    serveStatic(req, res);
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
  }
});

server.listen(PORT, () => {
  console.log(`
  mathisthomsen.de dev server
  ───────────────────────────
  Site:   http://localhost:${PORT}
  CV:     http://localhost:${PORT}/cv/
  PDF:    http://localhost:${PORT}/export/cv.pdf?lang=de
          http://localhost:${PORT}/export/cv.pdf?lang=en
  `);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT env var to use a different port.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
