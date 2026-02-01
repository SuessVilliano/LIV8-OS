/**
 * LIV8 OS Chrome Extension - Background Service Worker
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * Handles:
 * - Side panel management
 * - Context menus
 * - Theme sync with dashboard
 * - Cross-origin messaging
 * - Notification handling
 */

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('LIV8 OS Extension installed');

  // Set up side panel
  await chrome.sidePanel.setOptions({
    enabled: true
  });

  // Create context menus
  chrome.contextMenus.create({
    id: 'liv8-capture-text',
    title: 'Send to LIV8 AI Staff',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'liv8-capture-page',
    title: 'Capture page for LIV8 OS',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'liv8-create-content',
    title: 'Create content from this',
    contexts: ['selection', 'image', 'link']
  });

  chrome.contextMenus.create({
    id: 'liv8-add-lead',
    title: 'Add as lead to CRM',
    contexts: ['selection', 'link', 'page']
  });

  // Set default theme
  await chrome.storage.sync.set({
    theme: 'dark',
    accentColor: '#8b5cf6',
    voiceEnabled: false
  });
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'liv8-capture-text':
      await handleCaptureText(info.selectionText, tab);
      break;
    case 'liv8-capture-page':
      await handleCapturePage(tab);
      break;
    case 'liv8-create-content':
      await handleCreateContent(info, tab);
      break;
    case 'liv8-add-lead':
      await handleAddLead(info, tab);
      break;
  }
});

// Capture text and send to AI staff
async function handleCaptureText(text, tab) {
  // Store in local storage for side panel to pick up
  await chrome.storage.local.set({
    pendingCapture: {
      type: 'text',
      content: text,
      source: tab.url,
      title: tab.title,
      timestamp: Date.now()
    }
  });

  // Open side panel
  await chrome.sidePanel.open({ tabId: tab.id });

  // Notify user
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'LIV8 OS',
    message: 'Text captured! Opening assistant...'
  });
}

// Capture entire page
async function handleCapturePage(tab) {
  // Inject content script to extract page content
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return {
        title: document.title,
        url: window.location.href,
        content: document.body.innerText.substring(0, 5000),
        meta: {
          description: document.querySelector('meta[name="description"]')?.content || '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || ''
        }
      };
    }
  });

  await chrome.storage.local.set({
    pendingCapture: {
      type: 'page',
      ...result.result,
      timestamp: Date.now()
    }
  });

  await chrome.sidePanel.open({ tabId: tab.id });
}

// Create content from selection
async function handleCreateContent(info, tab) {
  const content = {
    type: 'content-request',
    timestamp: Date.now(),
    source: tab.url
  };

  if (info.selectionText) {
    content.text = info.selectionText;
  }
  if (info.srcUrl) {
    content.imageUrl = info.srcUrl;
  }
  if (info.linkUrl) {
    content.linkUrl = info.linkUrl;
  }

  await chrome.storage.local.set({ pendingCapture: content });
  await chrome.sidePanel.open({ tabId: tab.id });
}

// Add lead from page
async function handleAddLead(info, tab) {
  const lead = {
    type: 'lead',
    timestamp: Date.now(),
    source: tab.url,
    title: tab.title
  };

  if (info.selectionText) {
    lead.text = info.selectionText;
  }
  if (info.linkUrl) {
    lead.linkUrl = info.linkUrl;
  }

  await chrome.storage.local.set({ pendingCapture: lead });
  await chrome.sidePanel.open({ tabId: tab.id });
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command, tab) => {
  switch (command) {
    case 'toggle-voice':
      const settings = await chrome.storage.sync.get(['voiceEnabled']);
      await chrome.storage.sync.set({ voiceEnabled: !settings.voiceEnabled });

      // Notify content script
      chrome.tabs.sendMessage(tab.id, {
        type: 'VOICE_TOGGLE',
        enabled: !settings.voiceEnabled
      });
      break;

    case 'quick-capture':
      await handleCapturePage(tab);
      break;
  }
});

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_THEME':
      chrome.storage.sync.get(['theme', 'accentColor']).then(sendResponse);
      return true;

    case 'SET_THEME':
      chrome.storage.sync.set({
        theme: message.theme,
        accentColor: message.accentColor
      }).then(() => {
        // Broadcast to all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'THEME_CHANGED',
              theme: message.theme,
              accentColor: message.accentColor
            }).catch(() => {});
          });
        });
        sendResponse({ success: true });
      });
      return true;

    case 'GET_USER':
      chrome.storage.sync.get(['user', 'locationId', 'apiKey']).then(sendResponse);
      return true;

    case 'LOGIN':
      chrome.storage.sync.set({
        user: message.user,
        locationId: message.locationId,
        apiKey: message.apiKey
      }).then(() => sendResponse({ success: true }));
      return true;

    case 'LOGOUT':
      chrome.storage.sync.remove(['user', 'locationId', 'apiKey']).then(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'SEND_TO_DASHBOARD':
      // Open dashboard in new tab with data
      chrome.tabs.create({
        url: `https://app.liv8.ai/dashboard?action=${encodeURIComponent(JSON.stringify(message.data))}`
      });
      sendResponse({ success: true });
      return true;
  }
});

// Sync theme when storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && (changes.theme || changes.accentColor)) {
    // Broadcast theme change to all extension pages
    chrome.runtime.sendMessage({
      type: 'THEME_UPDATED',
      theme: changes.theme?.newValue,
      accentColor: changes.accentColor?.newValue
    }).catch(() => {});
  }
});
