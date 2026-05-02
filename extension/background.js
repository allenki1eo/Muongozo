/**
 * Background service worker.
 * Handles config reads (both managed/IT-pushed and user-set),
 * relays messages between popup and content scripts.
 */

/** Returns merged config: managed policy takes precedence over user storage. */
async function getConfig() {
  const [managed, local] = await Promise.all([
    chrome.storage.managed.get(['orgId', 'apiKey', 'serverUrl', 'position', 'disabledDomains']).catch(() => ({})),
    chrome.storage.local.get(['orgId', 'apiKey', 'serverUrl', 'position', 'disabledDomains']),
  ]);

  return {
    orgId:          managed.orgId          || local.orgId          || '',
    apiKey:         managed.apiKey         || local.apiKey         || '',
    serverUrl:      managed.serverUrl      || local.serverUrl      || 'http://localhost:3000',
    position:       managed.position       || local.position       || 'bottom-right',
    disabledDomains: managed.disabledDomains || local.disabledDomains || '',
    managedByIT: !!(managed.orgId || managed.apiKey),
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_CONFIG') {
    getConfig().then(sendResponse);
    return true; // keep channel open for async
  }

  if (msg.type === 'SAVE_CONFIG') {
    chrome.storage.local
      .set({
        orgId:          msg.config.orgId,
        apiKey:         msg.config.apiKey,
        serverUrl:      msg.config.serverUrl,
        position:       msg.config.position,
        disabledDomains: msg.config.disabledDomains,
      })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'INJECT_WIDGET') {
    // Triggered from popup "Activate on this tab"
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return sendResponse({ ok: false });
      chrome.scripting
        .executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
    });
    return true;
  }
});

// When a tab navigates, content.js auto-runs via content_scripts config.
// This listener just handles re-injection on SPA navigations.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.get(tabId, (tab) => {
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
      chrome.scripting
        .executeScript({ target: { tabId }, files: ['content.js'] })
        .catch(() => {}); // silently skip if already injected
    });
  }
});
