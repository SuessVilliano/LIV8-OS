// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Forward context updates from content script to side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PAGE_CONTEXT') {
    // Persist for extension pages
    chrome.storage.local.set({ currentContext: request.context });

    // Forward to all extension pages (side panel)
    chrome.runtime.sendMessage({
      type: 'CONTEXT_UPDATE',
      context: request.context
    }).catch(() => {
      // Side panel might not be open yet, that's OK
    });
  }

  sendResponse({ received: true });
  return true;
});

console.log('[LIV8 OS] Background service worker active');
