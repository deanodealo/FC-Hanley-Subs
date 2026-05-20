/**
 * FC Hanley – Add to Home Screen popup
 * Place at: add-to-home.js (same folder as index.html)
 * Add to every page <head>: <script src="add-to-home.js" defer></script>
 */

(function () {
  'use strict';

  const DISMISSED_KEY = 'fchanley_aths_dismissed';
  const INSTALL_KEY   = 'fchanley_aths_installed';

  function isDismissed() {
    return sessionStorage.getItem(DISMISSED_KEY) === '1' ||
           localStorage.getItem(INSTALL_KEY)     === '1';
  }
  function dismiss(permanent) {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    if (permanent) localStorage.setItem(INSTALL_KEY, '1');
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function isInStandaloneMode() {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
  }

  /* ── CSS ──────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('aths-styles')) return;
    const style = document.createElement('style');
    style.id = 'aths-styles';
    style.textContent = `
      @keyframes athsFadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes athsSlideUp {
        from { transform:translateX(-50%) translateY(40px); opacity:0 }
        to   { transform:translateX(-50%) translateY(0);    opacity:1 }
      }
      @keyframes athsBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }

      #aths-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 9000;
        animation: athsFadeIn 0.25s ease;
      }
      #aths-backdrop.visible { display: block; }

      #aths-card {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        width: min(360px, calc(100vw - 32px));
        background: #002244;
        border-radius: 16px;
        border-top: 4px solid #ffcc00;
        border-bottom: 4px solid #ffcc00;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 9100;
        overflow: visible;
        animation: athsSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);
        font-family: 'Poppins', sans-serif;
        box-sizing: border-box;
      }

      /* X button — width/margin reset beats the site's global button rule */
      #aths-close {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        width: auto !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 2px 6px !important;
        background: none !important;
        border: none !important;
        border-radius: 0 !important;
        color: rgba(255,255,255,0.55);
        font-size: 22px !important;
        line-height: 1;
        cursor: pointer;
        z-index: 10;
        transition: color 0.2s;
      }
      #aths-close:hover { color: #fff; background: none !important; }

      /* Header: logo + title */
      #aths-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 40px 0 14px;
      }

      #aths-logo {
        width: 48px !important;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        border: 2px solid #ffcc00;
        margin: 0;
      }

      #aths-title {
        font-size: 0.92rem;
        font-weight: 600;
        color: #ffcc00;
        margin: 0;
        line-height: 1.3;
      }

      /* Body */
      #aths-body {
        font-size: 0.78rem;
        color: rgba(255,255,255,0.85);
        margin: 10px 14px 14px;
        line-height: 1.5;
      }

      /* iOS bounce hint */
      #aths-ios-hint {
        text-align: center;
        color: rgba(255,255,255,0.65);
        font-size: 0.72rem;
        padding: 0 16px 14px;
        line-height: 1.5;
      }
      #aths-ios-hint svg {
        display: block;
        margin: 0 auto 4px;
        animation: athsBounce 1.2s ease-in-out infinite;
      }

      /* Action buttons — also reset against the global button rule */
      #aths-actions {
        display: flex;
        gap: 8px;
        padding: 0 14px 16px;
      }
      .aths-btn {
        flex: 1;
        width: auto !important;
        margin: 0 !important;
        padding: 10px 14px !important;
        border-radius: 8px !important;
        border: none;
        font-family: 'Poppins', sans-serif;
        font-size: 0.82rem !important;
        font-weight: 600;
        cursor: pointer;
        transition: filter 0.2s, transform 0.1s;
      }
      .aths-btn:active { transform: scale(0.97); }
      .aths-btn-primary { background: #ffcc00 !important; color: #002244 !important; }
      .aths-btn-primary:hover { filter: brightness(1.08); background: #ffcc00 !important; }
      .aths-btn-secondary {
        background: rgba(255,255,255,0.08) !important;
        color: rgba(255,255,255,0.7) !important;
        border: 1px solid rgba(255,255,255,0.18);
      }
      .aths-btn-secondary:hover { background: rgba(255,255,255,0.16) !important; }
    `;
    document.head.appendChild(style);
  }

  /* ── Build Card ───────────────────────────────────────────── */
  function buildCard(isIOSDevice) {
    injectStyles();

    const backdrop = document.createElement('div');
    backdrop.id = 'aths-backdrop';
    if (!isIOSDevice) backdrop.addEventListener('click', () => hideAll(false));

    const card = document.createElement('div');
    card.id = 'aths-card';

    const bodyText = isIOSDevice
      ? `Tap the <strong style="color:#ffcc00">Share</strong>
         <svg style="display:inline-block;vertical-align:middle;margin:0 2px" width="15" height="15"
              viewBox="0 0 24 24" fill="none" stroke="#ffcc00" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round">
           <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
           <polyline points="16 6 12 2 8 6"/>
           <line x1="12" y1="2" x2="12" y2="15"/>
         </svg>
         button in your browser bar, then choose
         <strong style="color:#ffcc00">"Add to Home Screen"</strong>`
      : `Get quick access to fixtures, news and camps — install the FC Hanley app!`;

    card.innerHTML = `
      <button id="aths-close" aria-label="Close">&times;</button>
      <div id="aths-header">
        <img id="aths-logo" src="./images/HanleyBadge2.png" alt="FC Hanley">
        <p id="aths-title">Add FC Hanley to your home screen</p>
      </div>
      <p id="aths-body">${bodyText}</p>
      ${isIOSDevice ? `
        <div id="aths-ios-hint">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="#ffcc00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </svg>
          Tap the share icon in your browser bar
        </div>` : ''}
      <div id="aths-actions">
        ${isIOSDevice
          ? `<button class="aths-btn aths-btn-secondary" id="aths-later">Maybe later</button>`
          : `<button class="aths-btn aths-btn-primary"   id="aths-install">Install</button>
             <button class="aths-btn aths-btn-secondary" id="aths-later">Not now</button>`
        }
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(card);

    card.querySelector('#aths-close').addEventListener('click', () => hideAll(false));
    card.querySelector('#aths-later').addEventListener('click', () => hideAll(false));

    return card;
  }

  function hideAll(permanent) {
    dismiss(permanent);
    document.getElementById('aths-card')?.remove();
    document.getElementById('aths-backdrop')?.remove();
  }

  /* ── Service Worker ───────────────────────────────────────── */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    registerSW();
    if (isDismissed() || isInStandaloneMode()) return;

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(() => {
        if (isDismissed()) return;
        const card = buildCard(false);
        document.getElementById('aths-backdrop').classList.add('visible');
        card.querySelector('#aths-install').addEventListener('click', async () => {
          hideAll(false);
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') dismiss(true);
          deferredPrompt = null;
        });
      }, 3000);
    });

    window.addEventListener('appinstalled', () => dismiss(true));

    if (isIOS()) {
      const isSafari = /safari/i.test(navigator.userAgent) &&
                       !/crios|fxios|opios|mercury/i.test(navigator.userAgent);
      if (!isSafari) return;
      setTimeout(() => {
        if (isDismissed()) return;
        buildCard(true);
      }, 3500);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();