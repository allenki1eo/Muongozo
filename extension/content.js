/**
 * Content script — injected into every page.
 * Fetches config from background, then builds the Muongozo widget
 * directly in the page DOM (no cross-origin iframe needed).
 */

(function () {
  'use strict';

  // Prevent double-injection on SPA navigations
  if (window.__muongozo_loaded) return;
  window.__muongozo_loaded = true;

  // ── Fetch config from background ──────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, function (config) {
    if (!config || !config.orgId || !config.apiKey) return; // not configured yet

    // Check disabled domains
    if (config.disabledDomains) {
      const current = location.hostname;
      const blocked = config.disabledDomains.split(',').map(d => d.trim().toLowerCase());
      if (blocked.some(d => current === d || current.endsWith('.' + d))) return;
    }

    init(config);
  });

  // ── Widget initialiser ────────────────────────────────────────────────────
  function init(config) {
    const BASE = config.serverUrl.replace(/\/$/, '');
    const IS_RIGHT = config.position !== 'bottom-left';
    const SESSION_ID = 'mz_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();

    // ── State ────────────────────────────────────────────────────────────────
    let isOpen = false;
    let inactivityTimer = null;
    let rageClick = { el: null, count: 0, timer: null };
    let orgSettings = { assistantName: 'Aria', primaryColor: '#6366f1', smartTriggers: { inactivity: true, inactivityDelay: 40, rageClick: true, errorDetection: true } };
    let badge, button, panel, container;

    // Load org settings for branding
    fetch(BASE + '/api/settings')
      .then(r => r.json())
      .then(s => {
        orgSettings = { ...orgSettings, ...s };
        applyBranding();
      })
      .catch(() => {});

    // ── Styles ───────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.id = 'mz-styles';
    style.textContent = buildStyles(IS_RIGHT);
    document.head.appendChild(style);

    // ── Container ────────────────────────────────────────────────────────────
    container = document.createElement('div');
    container.id = 'mz-container';

    // Widget iframe — points at the hosted embed page
    panel = document.createElement('iframe');
    panel.id = 'mz-panel';
    panel.title = 'AI Guide';
    panel.allow = 'microphone';
    panel.src =
      BASE + '/embed?orgId=' + encodeURIComponent(config.orgId) +
      '&apiKey=' + encodeURIComponent(config.apiKey) +
      '&sessionId=' + encodeURIComponent(SESSION_ID);

    // Floating button
    button = document.createElement('button');
    button.id = 'mz-btn';
    button.setAttribute('aria-label', 'Open AI Guide');
    badge = document.createElement('span');
    badge.id = 'mz-badge';
    button.appendChild(badge);
    setIcon('chat');
    button.addEventListener('click', toggle);

    container.appendChild(panel);
    container.appendChild(button);
    document.body.appendChild(container);

    setupSmartTriggers();
    setupMessageBridge();

    function applyBranding() {
      const color = orgSettings.primaryColor || '#6366f1';
      document.getElementById('mz-styles')?.remove();
      const newStyle = document.createElement('style');
      newStyle.id = 'mz-styles';
      newStyle.textContent = buildStyles(IS_RIGHT, color);
      document.head.appendChild(newStyle);
    }

    // ── Open / Close ─────────────────────────────────────────────────────────
    function toggle() { isOpen ? close() : open('user'); }

    function open(trigger) {
      if (isOpen) return;
      isOpen = true;
      panel.classList.add('mz-open');
      setIcon('close');
      clearBadge();
      removePopups();
      clearInactivityTimer();
      sendToWidget({ type: 'PAGE_CONTEXT', url: location.href, title: document.title, trigger });
      log('widget_open', { trigger: trigger || 'user', url: location.href });
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      panel.classList.remove('mz-open');
      setIcon('chat');
      log('widget_close', { url: location.href });
      resetInactivityTimer();
    }

    // ── postMessage bridge ───────────────────────────────────────────────────
    function setupMessageBridge() {
      window.addEventListener('message', function (e) {
        if (!e.data || e.data.source !== 'muongozo-widget') return;
        const { type } = e.data;
        if (type === 'CLOSE') close();
        else if (type === 'HIGHLIGHT_ELEMENT') highlightElement(e.data.data.selector, e.data.data.label);
        else if (type === 'CLEAR_HIGHLIGHT') clearHighlights();
        else if (type === 'LOG_EVENT') log(e.data.data.type, e.data.data);
        else if (type === 'SCREENSHOT_REQUEST') {
          // Extension content scripts can use html2canvas if loaded, else null
          Promise.resolve(null).then(screenshot => sendToWidget({ type: 'SCREENSHOT_RESPONSE', screenshot }));
        }
      });
    }

    function sendToWidget(msg) {
      panel?.contentWindow?.postMessage({ ...msg, source: 'muongozo-parent' }, '*');
    }

    // ── Element highlight ────────────────────────────────────────────────────
    function highlightElement(selector, label) {
      clearHighlights();
      const el = selector ? document.querySelector(selector) : null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pad = 5;
      const ov = document.createElement('div');
      ov.className = 'mz-highlight';
      ov.style.cssText =
        `top:${rect.top + window.scrollY - pad}px;left:${rect.left + window.scrollX - pad}px;` +
        `width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;`;
      if (label) {
        const tip = document.createElement('div');
        tip.className = 'mz-highlight-tip';
        tip.textContent = label;
        ov.appendChild(tip);
      }
      document.body.appendChild(ov);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(clearHighlights, 4000);
    }

    function clearHighlights() {
      document.querySelectorAll('.mz-highlight').forEach(el => el.remove());
    }

    // ── Smart triggers ───────────────────────────────────────────────────────
    function setupSmartTriggers() {
      const triggers = orgSettings.smartTriggers;

      if (triggers.inactivity) {
        const delay = (triggers.inactivityDelay || 40) * 1000;
        const reset = () => {
          clearInactivityTimer();
          if (!isOpen) {
            inactivityTimer = setTimeout(() => {
              if (!isOpen) showPopup("Need help on this page?", "Ask me anything — I know your product.", 'inactivity');
            }, delay);
          }
        };
        ['mousemove','keydown','scroll','click','touchstart'].forEach(ev =>
          document.addEventListener(ev, reset, { passive: true })
        );
        reset();
      }

      if (triggers.rageClick) {
        document.addEventListener('click', (e) => {
          if (isOpen) return;
          const t = e.target;
          if (rageClick.el === t) {
            rageClick.count++;
            if (rageClick.count >= 3) {
              clearTimeout(rageClick.timer);
              rageClick.el = null; rageClick.count = 0;
              showPopup("That doesn't seem to be working", "I can help you find what you need.", 'rage_click');
            }
          } else {
            clearTimeout(rageClick.timer);
            rageClick.el = t; rageClick.count = 1;
            rageClick.timer = setTimeout(() => { rageClick.el = null; rageClick.count = 0; }, 2000);
          }
        }, true);
      }

      if (triggers.errorDetection) {
        window.addEventListener('error', () => {
          if (!isOpen) setTimeout(() => { if (!isOpen) showPopup("Something went wrong", "An error occurred. I can help troubleshoot.", 'error'); }, 1500);
        });
      }
    }

    function clearInactivityTimer() {
      if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
    }

    function resetInactivityTimer() {
      clearInactivityTimer();
      // Will be reset by the next user interaction via event listeners
    }

    // ── Proactive popup ──────────────────────────────────────────────────────
    function showPopup(title, body, trigger) {
      removePopups();
      showBadge();
      const p = document.createElement('div');
      p.className = 'mz-popup';
      p.innerHTML = `<div class="mz-popup-title">${esc(title)}</div><div class="mz-popup-body">${esc(body)}</div>`;
      p.addEventListener('click', () => { removePopups(); open(trigger); });
      container.insertBefore(p, button);
      setTimeout(() => {
        if (p.parentNode) { p.style.cssText += 'opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s;'; setTimeout(() => p.remove(), 350); }
      }, 10000);
      log('trigger_fired', { trigger, url: location.href });
    }

    function removePopups() { document.querySelectorAll('.mz-popup').forEach(el => el.remove()); }
    function showBadge() { badge?.classList.add('mz-show'); }
    function clearBadge() { badge?.classList.remove('mz-show'); }

    // ── Analytics ────────────────────────────────────────────────────────────
    function log(type, data) {
      fetch(BASE + '/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: config.orgId, sessionId: SESSION_ID, type, data: data || {} }),
      }).catch(() => {});
    }

    // ── Button icon ──────────────────────────────────────────────────────────
    function setIcon(type) {
      button.querySelector('svg')?.remove();
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      if (type === 'chat') {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
        svg.appendChild(p);
      } else {
        ['6 18','6 6'].forEach((coords, i) => {
          const l = document.createElementNS(ns, 'line');
          const [sx, sy] = i === 0 ? [18,6] : [18,18];
          const [ex, ey] = coords.split(' ').map(Number);
          l.setAttribute('x1', sx); l.setAttribute('y1', sy);
          l.setAttribute('x2', ex); l.setAttribute('y2', ey);
          svg.appendChild(l);
        });
      }
      button.insertBefore(svg, badge);
    }

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
  }

  // ── CSS builder ───────────────────────────────────────────────────────────
  function buildStyles(isRight, color) {
    color = color || '#6366f1';
    const side = isRight ? 'right:20px' : 'left:20px';
    const align = isRight ? 'flex-end' : 'flex-start';
    return `
      #mz-container{position:fixed;z-index:2147483647;${side};bottom:20px;display:flex;flex-direction:column;align-items:${align};gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
      #mz-panel{width:380px;height:580px;border:none;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);opacity:0;pointer-events:none;transform:translateY(12px) scale(.96);transition:opacity .22s ease,transform .22s ease;background:#fff;}
      #mz-panel.mz-open{opacity:1;pointer-events:all;transform:none;}
      #mz-btn{width:56px;height:56px;border-radius:50%;background:${color};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px ${color}66;transition:transform .18s,box-shadow .18s;position:relative;padding:0;outline:none;}
      #mz-btn:hover{transform:scale(1.08);}
      #mz-btn svg{width:26px;height:26px;color:#fff;}
      #mz-badge{position:absolute;top:-3px;right:-3px;width:16px;height:16px;background:#ef4444;border-radius:50%;border:2px solid #fff;display:none;}
      #mz-badge.mz-show{display:block;}
      .mz-popup{background:#fff;border-radius:14px;padding:14px 18px;box-shadow:0 4px 24px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.05);max-width:280px;cursor:pointer;animation:mz-in .28s ease;}
      .mz-popup-title{font-size:13px;font-weight:600;color:#111;margin-bottom:2px;}
      .mz-popup-body{font-size:12px;color:#666;line-height:1.4;}
      .mz-highlight{position:absolute;pointer-events:none;z-index:2147483646;border-radius:6px;box-shadow:0 0 0 3px ${color},0 0 0 6px ${color}33;}
      .mz-highlight-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;white-space:nowrap;}
      @keyframes mz-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    `;
  }

})();
