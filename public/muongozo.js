/**
 * Muongozo — Smart AI Guide Widget
 * Drop-in embed script for any web application.
 *
 * Usage:
 *   <script src="https://your-muongozo-host/muongozo.js"
 *           data-org-id="your-org-id"
 *           data-api-key="your-widget-api-key"
 *           data-position="bottom-right"
 *           async></script>
 */
(function (w, d) {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────────────
  var script = d.currentScript || d.querySelector('script[data-org-id]');
  if (!script) return;

  var orgId = script.getAttribute('data-org-id');
  var apiKey = script.getAttribute('data-api-key');
  var position = script.getAttribute('data-position') || 'bottom-right';
  var baseUrl = script.src.substring(0, script.src.lastIndexOf('/'));

  if (!orgId || !apiKey) {
    console.warn('[Muongozo] Missing data-org-id or data-api-key. Widget not loaded.');
    return;
  }

  // ── State ───────────────────────────────────────────────────────────────────
  var isOpen = false;
  var sessionId = 'mz_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
  var iframe = null;
  var button = null;
  var badge = null;
  var container = null;
  var inactivityTimer = null;
  var rageClick = { el: null, count: 0, timer: null };

  // Configurable inactivity delay (default 40 s — synced from settings page)
  var INACTIVITY_DELAY_MS = 40000;

  // ── Styles ───────────────────────────────────────────────────────────────────
  function injectStyles() {
    var isRight = position.includes('right');
    var style = d.createElement('style');
    style.textContent = [
      '#mz-container{',
        'position:fixed;z-index:2147483647;',
        (isRight ? 'right:20px' : 'left:20px') + ';',
        'bottom:20px;',
        'display:flex;flex-direction:column;',
        'align-items:' + (isRight ? 'flex-end' : 'flex-start') + ';',
        'gap:12px;',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      '}',

      '#mz-iframe{',
        'width:380px;height:580px;border:none;',
        'border-radius:16px;',
        'box-shadow:0 20px 60px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);',
        'opacity:0;pointer-events:none;',
        'transform:translateY(12px) scale(.96);',
        'transition:opacity .22s ease,transform .22s ease;',
        'background:#fff;',
      '}',
      '#mz-iframe.mz-open{opacity:1;pointer-events:all;transform:translateY(0) scale(1);}',

      '#mz-btn{',
        'width:56px;height:56px;border-radius:50%;',
        'background:#6366f1;border:none;cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;',
        'box-shadow:0 4px 16px rgba(99,102,241,.4);',
        'transition:transform .18s ease,box-shadow .18s ease;',
        'position:relative;padding:0;outline:none;',
      '}',
      '#mz-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(99,102,241,.5);}',
      '#mz-btn svg{width:26px;height:26px;color:#fff;flex-shrink:0;}',

      '#mz-badge{',
        'position:absolute;top:-3px;right:-3px;',
        'width:16px;height:16px;background:#ef4444;',
        'border-radius:50%;border:2px solid #fff;',
        'display:none;',
      '}',
      '#mz-badge.mz-show{display:block;}',

      '.mz-popup{',
        'background:#fff;border-radius:14px;',
        'padding:14px 18px;',
        'box-shadow:0 4px 24px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.05);',
        'max-width:280px;cursor:pointer;',
        'animation:mz-in .28s ease;',
      '}',
      '.mz-popup-title{font-size:13px;font-weight:600;color:#111;margin-bottom:2px;}',
      '.mz-popup-body{font-size:12px;color:#666;line-height:1.4;}',

      '.mz-highlight{',
        'position:fixed;pointer-events:none;z-index:2147483646;',
        'border-radius:6px;',
        'box-shadow:0 0 0 3px #6366f1,0 0 0 6px rgba(99,102,241,.22);',
        'transition:all .3s ease;',
      '}',
      '.mz-highlight-label{',
        'position:absolute;bottom:calc(100% + 8px);left:50%;',
        'transform:translateX(-50%);',
        'background:#111;color:#fff;',
        'padding:4px 10px;border-radius:6px;',
        'font-size:12px;white-space:nowrap;',
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;",
      '}',

      '@keyframes mz-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
    ].join('');
    d.head.appendChild(style);
  }

  // ── Widget DOM ───────────────────────────────────────────────────────────────
  function buildWidget() {
    container = d.createElement('div');
    container.id = 'mz-container';

    iframe = d.createElement('iframe');
    iframe.id = 'mz-iframe';
    iframe.title = 'AI Guide';
    iframe.allow = 'microphone';
    iframe.src =
      baseUrl +
      '/embed?orgId=' +
      encodeURIComponent(orgId) +
      '&apiKey=' +
      encodeURIComponent(apiKey) +
      '&sessionId=' +
      encodeURIComponent(sessionId);

    button = d.createElement('button');
    button.id = 'mz-btn';
    button.setAttribute('aria-label', 'Open AI Guide');
    badge = d.createElement('span');
    badge.id = 'mz-badge';
    button.appendChild(badge);
    setButtonIcon('chat');
    button.addEventListener('click', toggle);

    container.appendChild(iframe);
    container.appendChild(button);
    d.body.appendChild(container);
  }

  function setButtonIcon(type) {
    // Remove existing SVG (keep badge)
    var existing = button.querySelector('svg');
    if (existing) button.removeChild(existing);

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = d.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    if (type === 'chat') {
      var path = d.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
      svg.appendChild(path);
    } else {
      // Close X
      var l1 = d.createElementNS(svgNS, 'line');
      l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6');
      l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
      var l2 = d.createElementNS(svgNS, 'line');
      l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6');
      l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
      svg.appendChild(l1);
      svg.appendChild(l2);
    }
    button.insertBefore(svg, badge);
  }

  // ── Open / Close ─────────────────────────────────────────────────────────────
  function toggle() {
    if (isOpen) close(); else open('user');
  }

  function open(trigger) {
    if (isOpen) return;
    isOpen = true;
    iframe.classList.add('mz-open');
    setButtonIcon('close');
    clearBadge();
    removePopups();
    clearInactivityTimer();
    sendToWidget({ type: 'PAGE_CONTEXT', url: location.href, title: d.title, trigger: trigger });
    logEvent('widget_open', { trigger: trigger || 'user', url: location.href });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    iframe.classList.remove('mz-open');
    setButtonIcon('chat');
    logEvent('widget_close', { url: location.href });
    resetInactivityTimer();
  }

  // ── postMessage ──────────────────────────────────────────────────────────────
  function sendToWidget(msg) {
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(Object.assign({}, msg, { source: 'muongozo-parent' }), '*');
    }
  }

  w.addEventListener('message', function (e) {
    if (!e.data || e.data.source !== 'muongozo-widget') return;
    var type = e.data.type;
    if (type === 'CLOSE') {
      close();
    } else if (type === 'SCREENSHOT_REQUEST') {
      captureScreenshot().then(function (data) {
        sendToWidget({ type: 'SCREENSHOT_RESPONSE', screenshot: data });
      });
    } else if (type === 'HIGHLIGHT_ELEMENT') {
      highlightElement(e.data.data.selector, e.data.data.label);
    } else if (type === 'CLEAR_HIGHLIGHT') {
      clearHighlights();
    } else if (type === 'LOG_EVENT') {
      logEvent(e.data.data.type, e.data.data);
    }
  });

  // ── Screenshot ───────────────────────────────────────────────────────────────
  function captureScreenshot() {
    return new Promise(function (resolve) {
      if (w.html2canvas) {
        w.html2canvas(d.body, { scale: 0.5, useCORS: true, allowTaint: true, logging: false })
          .then(function (canvas) {
            resolve(canvas.toDataURL('image/jpeg', 0.65).replace('data:image/jpeg;base64,', ''));
          })
          .catch(function () { resolve(null); });
      } else {
        resolve(null);
      }
    });
  }

  // ── Element Highlight ────────────────────────────────────────────────────────
  function highlightElement(selector, label) {
    clearHighlights();
    var el = selector ? d.querySelector(selector) : null;
    if (!el) return;

    var rect = el.getBoundingClientRect();
    var pad = 5;
    var overlay = d.createElement('div');
    overlay.className = 'mz-highlight';
    overlay.style.cssText =
      'top:' + (rect.top - pad) + 'px;' +
      'left:' + (rect.left - pad) + 'px;' +
      'width:' + (rect.width + pad * 2) + 'px;' +
      'height:' + (rect.height + pad * 2) + 'px;';

    if (label) {
      var tip = d.createElement('div');
      tip.className = 'mz-highlight-label';
      tip.textContent = label;
      overlay.appendChild(tip);
    }

    d.body.appendChild(overlay);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(clearHighlights, 4000);
  }

  function clearHighlights() {
    d.querySelectorAll('.mz-highlight').forEach(function (el) { el.remove(); });
  }

  // ── Smart Triggers ───────────────────────────────────────────────────────────

  /** Inactivity trigger: user hasn't interacted in INACTIVITY_DELAY_MS */
  function resetInactivityTimer() {
    clearInactivityTimer();
    if (isOpen) return;
    inactivityTimer = setTimeout(function () {
      if (!isOpen) {
        showPopup('Need help on this page?', 'I can answer questions or walk you through anything.', 'inactivity');
      }
    }, INACTIVITY_DELAY_MS);
  }

  function clearInactivityTimer() {
    if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
  }

  /** Rage-click trigger: 3+ clicks on the same element within 2 s */
  function onDocClick(e) {
    if (isOpen) return;
    var target = e.target;
    if (rageClick.el === target) {
      rageClick.count++;
      if (rageClick.count >= 3) {
        clearTimeout(rageClick.timer);
        rageClick.el = null; rageClick.count = 0;
        showPopup("That doesn't seem to be working", 'Let me help you figure out what you need.', 'rage_click');
      }
    } else {
      clearTimeout(rageClick.timer);
      rageClick.el = target; rageClick.count = 1;
      rageClick.timer = setTimeout(function () { rageClick.el = null; rageClick.count = 0; }, 2000);
    }
  }

  /** Error trigger: unhandled JS error / promise rejection */
  function onPageError() {
    if (isOpen) return;
    setTimeout(function () {
      if (!isOpen) showPopup("Something went wrong", "I noticed an error. I can help troubleshoot.", 'error');
    }, 1500);
  }

  function setupSmartTriggers() {
    var events = ['mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(function (ev) {
      d.addEventListener(ev, resetInactivityTimer, { passive: true });
    });
    resetInactivityTimer();

    d.addEventListener('click', onDocClick, true);
    w.addEventListener('error', onPageError);
    w.addEventListener('unhandledrejection', onPageError);
  }

  // ── Proactive Popup ──────────────────────────────────────────────────────────
  function showPopup(title, body, trigger) {
    removePopups();
    showBadge();

    var popup = d.createElement('div');
    popup.className = 'mz-popup';
    popup.innerHTML =
      '<div class="mz-popup-title">' + escHtml(title) + '</div>' +
      '<div class="mz-popup-body">' + escHtml(body) + '</div>';
    popup.addEventListener('click', function () {
      removePopups();
      open(trigger);
    });

    container.insertBefore(popup, button);

    // Auto-dismiss after 10 s
    setTimeout(function () {
      if (popup.parentNode) {
        popup.style.opacity = '0';
        popup.style.transform = 'translateY(6px)';
        popup.style.transition = 'opacity .3s,transform .3s';
        setTimeout(function () { popup.remove(); }, 350);
      }
    }, 10000);

    logEvent('trigger_fired', { trigger: trigger, url: location.href });
  }

  function removePopups() {
    d.querySelectorAll('.mz-popup').forEach(function (el) { el.remove(); });
  }

  function showBadge() { if (badge) badge.classList.add('mz-show'); }
  function clearBadge() { if (badge) badge.classList.remove('mz-show'); }

  // ── Analytics ────────────────────────────────────────────────────────────────
  function logEvent(type, data) {
    try {
      fetch(baseUrl + '/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: orgId, sessionId: sessionId, type: type, data: data || {} }),
      }).catch(function () {});
    } catch (e) { /* silently swallow */ }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();
    setupSmartTriggers();
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
