/**
 * animations.js — Progressive enhancement layer
 * All motion effects guarded by prefers-reduced-motion.
 * Works on both index.html (card) and cv/index.html (CV).
 */

const prefersMotion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const isDesktop = window.matchMedia('(min-width: 48rem)');

/* ── 1. Character-reveal for .card__name ──────────────────── */
function initCharReveal() {
  const nameInner = document.querySelector('.card__name-inner');
  if (!nameInner) return;

  const text = nameInner.textContent.trim();
  const nameEl = nameInner.closest('.card__name');

  // Set data-glitch for CSS pseudo-elements
  if (nameEl) nameEl.setAttribute('data-glitch', text);

  if (!prefersMotion.matches) {
    // No motion: leave text as-is, fully visible
    return;
  }

  // Split into character spans with staggered delay
  nameInner.innerHTML = '';
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.animationDelay = `${80 + i * 35}ms`;
    nameInner.appendChild(span);
  });
}

/* ── 2. Grid overlay parallax (desktop only) ──────────────── */
function initGridParallax() {
  const overlay = document.querySelector('.grid-overlay');
  if (!overlay || !prefersMotion.matches || !isDesktop.matches) return;

  // Show overlay
  requestAnimationFrame(() => overlay.classList.add('is-ready'));

  let raf = null;
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (e) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    targetX = ((e.clientX - centerX) / centerX) * 3;
    targetY = ((e.clientY - centerY) / centerY) * 3;

    if (!raf) {
      raf = requestAnimationFrame(animateGrid);
    }
  });

  function animateGrid() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    overlay.style.transform = `translate(${currentX}px, ${currentY}px)`;

    const delta = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    if (delta > 0.01) {
      raf = requestAnimationFrame(animateGrid);
    } else {
      raf = null;
    }
  }
}

/* ── 3. Scroll-reveal for CV sections ─────────────────────── */
function initScrollReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (!prefersMotion.matches) {
    // Immediately visible without motion
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  targets.forEach(el => observer.observe(el));
}

/* ── 4. Skill + language bar animation on scroll entry ────── */
// Tracks whether the scroll-triggered animation has already fired.
// On language re-render (second+ call) we skip the observer and fill immediately.
let _barsAnimated = false;

function initSkillBars() {
  const BAR_SELECTOR = '.cv-skill__bar-fill, .cv-lang__bar-fill';

  // Observe the static container IDs (exist in HTML shell before cv.js renders).
  // .cv-skills__group is created dynamically by cv.js, so target #cv-skills instead.
  const targets = [
    document.getElementById('cv-skills'),
    document.getElementById('cv-languages'),
  ].filter(Boolean);

  if (!targets.length) return;

  // No-motion or language re-render: fill immediately, no animation
  if (!prefersMotion.matches || _barsAnimated) {
    targets.forEach(t => {
      t.querySelectorAll(BAR_SELECTOR).forEach(bar => {
        bar.style.setProperty('--bar-fill', bar.dataset.level);
      });
    });
    return;
  }

  // First render with motion: animate on scroll entry
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll(BAR_SELECTOR).forEach((bar, i) => {
          setTimeout(() => {
            bar.style.setProperty('--bar-fill', bar.dataset.level);
          }, i * 80);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  _barsAnimated = true;
  targets.forEach(t => observer.observe(t));
}

/* ── 5. Language toggle transition ───────────────────────── */
function initLangToggle() {
  const toggle = document.querySelector('.cv-lang-toggle');
  if (!toggle) return;

  toggle.addEventListener('lang-changed', () => {
    if (!prefersMotion.matches) return;

    const main = document.getElementById('main');
    if (!main) return;

    main.classList.add('lang-transition');
    setTimeout(() => main.classList.remove('lang-transition'), 300);
  });
}

/* ── Init ─────────────────────────────────────────────────── */
function init() {
  initCharReveal();
  initGridParallax();
  initScrollReveal();
  // initSkillBars runs after cv.js fires 'cv-rendered' — bars don't exist
  // in the DOM until the fetch + render completes. Also fires on language switch.
  document.addEventListener('cv-rendered', initSkillBars);
  // portfolio.js fires 'portfolio-rendered' after dynamic content is in the DOM.
  // initScrollReveal targets any [data-reveal] element, so it works on all pages.
  document.addEventListener('portfolio-rendered', initScrollReveal);
  initLangToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
