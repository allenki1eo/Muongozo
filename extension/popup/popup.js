const $ = (id) => document.getElementById(id);

// ── Load config ────────────────────────────────────────────────────────────────
chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (config) => {
  if (!config) return;

  $('orgId').value = config.orgId || '';
  $('apiKey').value = config.apiKey || '';
  $('serverUrl').value = config.serverUrl || 'http://localhost:3000';
  $('position').value = config.position || 'bottom-right';
  $('disabledDomains').value = config.disabledDomains || '';

  if (config.managedByIT) {
    $('managedBanner').classList.add('show');
    $('subtitle').textContent = 'Managed by IT · Read-only';
    ['orgId', 'apiKey', 'serverUrl', 'position', 'disabledDomains'].forEach(id => {
      $(id).disabled = true;
    });
    $('saveBtn').disabled = true;
  }

  refreshSnippets(config);
});

// ── Save ──────────────────────────────────────────────────────────────────────
$('saveBtn').addEventListener('click', () => {
  const config = {
    orgId: $('orgId').value.trim(),
    apiKey: $('apiKey').value.trim(),
    serverUrl: ($('serverUrl').value.trim() || 'http://localhost:3000').replace(/\/$/, ''),
    position: $('position').value,
    disabledDomains: $('disabledDomains').value.trim(),
  };

  if (!config.orgId || !config.apiKey) {
    setStatus('Please fill in Organisation ID and API Key.', 'err');
    return;
  }

  chrome.runtime.sendMessage({ type: 'SAVE_CONFIG', config }, () => {
    setStatus('Saved! Reload the page to activate the widget.', 'ok');
    refreshSnippets(config);
  });
});

// ── Test on current tab ───────────────────────────────────────────────────────
$('testBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'INJECT_WIDGET' }, (res) => {
    if (res?.ok) setStatus('Widget injected — check the current tab!', 'ok');
    else setStatus('Could not inject on this tab (chrome:// pages are blocked).', 'err');
  });
});

// ── Dashboard link ────────────────────────────────────────────────────────────
$('dashboardLink').addEventListener('click', (e) => {
  e.preventDefault();
  const base = $('serverUrl').value.trim() || 'http://localhost:3000';
  chrome.tabs.create({ url: base.replace(/\/$/, '') + '/dashboard' });
});

// ── Collapsible deploy sections ───────────────────────────────────────────────
function setupToggle(toggleId, codeId, copyId) {
  $(toggleId).addEventListener('click', () => {
    const code = $(codeId);
    const btn = $(copyId);
    const showing = code.classList.contains('show');
    code.classList.toggle('show', !showing);
    btn.classList.toggle('show', !showing);
  });
}
setupToggle('itDeployToggle', 'itPolicyCode', 'copyPolicy');
setupToggle('bookmarkToggle', 'bookmarkCode', 'copyBookmark');
setupToggle('gtmToggle', 'gtmCode', 'copyGtm');

// Copy buttons
$('copyPolicy').addEventListener('click', () => copyText('itPolicyCode', 'copyPolicy'));
$('copyBookmark').addEventListener('click', () => copyText('bookmarkCode', 'copyBookmark'));
$('copyGtm').addEventListener('click', () => copyText('gtmCode', 'copyGtm'));

function copyText(codeId, btnId) {
  navigator.clipboard.writeText($(codeId).textContent).then(() => {
    const btn = $(btnId);
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

// ── Build deployment snippets ──────────────────────────────────────────────────
function refreshSnippets(cfg) {
  const base = (cfg.serverUrl || 'http://localhost:3000').replace(/\/$/, '');
  const orgId = cfg.orgId || 'YOUR_ORG_ID';
  const apiKey = cfg.apiKey || 'YOUR_API_KEY';
  const pos = cfg.position || 'bottom-right';

  // ── 1. Chrome Enterprise policy JSON ──────────────────────────────────────
  // IT pastes this into Google Workspace Admin > Chrome > Extensions > Policy
  const extensionId = chrome.runtime.id;
  const policy = {
    ExtensionSettings: {
      [extensionId]: {
        installation_mode: "force_installed",
        update_url: "https://clients2.google.com/service/update2/crx",
        managed_configuration: {
          orgId,
          apiKey,
          serverUrl: base,
          position: pos,
        },
      },
    },
  };
  $('itPolicyCode').textContent = JSON.stringify(policy, null, 2);

  // ── 2. Bookmarklet ──────────────────────────────────────────────────────────
  const bookmarklet =
    `javascript:(function(){` +
    `var s=document.createElement('script');` +
    `s.src='${base}/muongozo.js';` +
    `s.setAttribute('data-org-id','${orgId}');` +
    `s.setAttribute('data-api-key','${apiKey}');` +
    `s.setAttribute('data-position','${pos}');` +
    `document.head.appendChild(s);` +
    `})();`;
  $('bookmarkCode').textContent = bookmarklet;

  // ── 3. Google Tag Manager custom HTML ──────────────────────────────────────
  const gtm =
    `<script\n` +
    `  src="${base}/muongozo.js"\n` +
    `  data-org-id="${orgId}"\n` +
    `  data-api-key="${apiKey}"\n` +
    `  data-position="${pos}"\n` +
    `  async\n` +
    `><\/script>`;
  $('gtmCode').textContent = gtm;
}

function setStatus(msg, type) {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status ' + (type || '');
}
