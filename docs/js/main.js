/* ============================================================
   FC Hanley — Shared JavaScript
   js/main.js
   ============================================================ */


// ── Drawer nav ──────────────────────────────────────────────

function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('navOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('open');
  document.body.style.overflow = '';
}


// ── Countdown timer ─────────────────────────────────────────
// Looks for elements with id cd-days, cd-hrs, cd-min, cd-sec.
// Only runs if those elements exist on the page.

function initCountdown(targetDate) {
  const els = {
    days: document.getElementById('cd-days'),
    hrs:  document.getElementById('cd-hrs'),
    min:  document.getElementById('cd-min'),
    sec:  document.getElementById('cd-sec'),
  };

  if (!els.days) return; // no countdown on this page

  function tick() {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return;
    els.days.textContent = String(Math.floor(diff / 864e5)).padStart(2, '0');
    els.hrs.textContent  = String(Math.floor((diff % 864e5) / 36e5)).padStart(2, '0');
    els.min.textContent  = String(Math.floor((diff % 36e5) / 6e4)).padStart(2, '0');
    els.sec.textContent  = String(Math.floor((diff % 6e4) / 1e3)).padStart(2, '0');
  }

  tick();
  setInterval(tick, 1000);
}

// Call with your tournament date — update this when the date changes
initCountdown('2026-07-04T09:00:00');


// ── Scroll fade-up animations ────────────────────────────────

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 70);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}


// ── Header shadow on scroll ──────────────────────────────────

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 40
      ? '0 4px 24px rgba(0,0,0,0.35)'
      : 'none';
  });
}


// ── Init everything on DOM ready ────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initHeaderScroll();
});