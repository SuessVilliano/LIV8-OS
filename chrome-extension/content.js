/**
 * LIV8 OS Chrome Extension - Content Script
 *
 * Injected into web pages to enable:
 * - Text selection capture
 * - Voice command overlay
 * - Dashboard theme sync
 */

// State
let isVoiceActive = false;
let voiceOverlay = null;

// Initialize
(function init() {
  // Check if on LIV8 dashboard
  if (window.location.hostname.includes('liv8.ai')) {
    syncThemeWithDashboard();
    setupDashboardBridge();
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'VOICE_TOGGLE':
        toggleVoiceOverlay(message.enabled);
        sendResponse({ success: true });
        break;

      case 'THEME_CHANGED':
        applyTheme(message.theme, message.accentColor);
        sendResponse({ success: true });
        break;

      case 'GET_SELECTION':
        sendResponse({ selection: window.getSelection().toString() });
        break;

      case 'GET_PAGE_INFO':
        sendResponse({
          title: document.title,
          url: window.location.href,
          content: document.body.innerText.substring(0, 5000)
        });
        break;
    }
    return true;
  });

  // Add selection listener for quick capture
  document.addEventListener('mouseup', handleTextSelection);

  // Check for existing voice state
  chrome.storage.sync.get(['voiceEnabled']).then(({ voiceEnabled }) => {
    if (voiceEnabled) {
      toggleVoiceOverlay(true);
    }
  });
})();

// Handle text selection
function handleTextSelection(event) {
  const selection = window.getSelection().toString().trim();
  if (!selection || selection.length < 10) return;

  // Don't show on input fields
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

  // Show quick action tooltip
  showSelectionTooltip(selection, event.clientX, event.clientY);
}

// Selection tooltip
let selectionTooltip = null;

function showSelectionTooltip(text, x, y) {
  removeSelectionTooltip();

  selectionTooltip = document.createElement('div');
  selectionTooltip.id = 'liv8-selection-tooltip';
  selectionTooltip.innerHTML = `
    <button data-action="send-to-ai" title="Send to LIV8 AI">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
    <button data-action="create-content" title="Create content from this">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
    <button data-action="add-lead" title="Add as lead">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </button>
  `;

  // Position tooltip
  selectionTooltip.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y - 50}px;
    background: #1a1a2e;
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    padding: 4px;
    display: flex;
    gap: 4px;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: liv8-fade-in 0.2s ease;
  `;

  // Style buttons
  const style = document.createElement('style');
  style.textContent = `
    @keyframes liv8-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #liv8-selection-tooltip button {
      background: transparent;
      border: none;
      color: #9ca3af;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    #liv8-selection-tooltip button:hover {
      background: rgba(139, 92, 246, 0.2);
      color: #8b5cf6;
    }
  `;
  selectionTooltip.appendChild(style);

  document.body.appendChild(selectionTooltip);

  // Handle clicks
  selectionTooltip.addEventListener('click', async (e) => {
    const action = e.target.closest('button')?.dataset.action;
    if (!action) return;

    await chrome.storage.local.set({
      pendingCapture: {
        type: action === 'add-lead' ? 'lead' : action === 'create-content' ? 'content-request' : 'text',
        content: text,
        source: window.location.href,
        title: document.title,
        timestamp: Date.now()
      }
    });

    // Get current tab and open side panel
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });

    removeSelectionTooltip();
  });

  // Remove on click outside
  setTimeout(() => {
    document.addEventListener('click', removeSelectionTooltip, { once: true });
  }, 100);
}

function removeSelectionTooltip() {
  if (selectionTooltip) {
    selectionTooltip.remove();
    selectionTooltip = null;
  }
}

// Voice overlay
function toggleVoiceOverlay(enabled) {
  if (enabled && !voiceOverlay) {
    createVoiceOverlay();
  } else if (!enabled && voiceOverlay) {
    voiceOverlay.remove();
    voiceOverlay = null;
  }
  isVoiceActive = enabled;
}

function createVoiceOverlay() {
  voiceOverlay = document.createElement('div');
  voiceOverlay.id = 'liv8-voice-overlay';
  voiceOverlay.innerHTML = `
    <div class="liv8-voice-indicator">
      <div class="liv8-voice-ring"></div>
      <div class="liv8-voice-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
      <span class="liv8-voice-text">Say "Hey LIV"</span>
    </div>
    <style>
      #liv8-voice-overlay {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
      }
      .liv8-voice-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #1a1a2e, #16162a);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 50px;
        padding: 8px 16px 8px 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      .liv8-voice-ring {
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid rgba(139, 92, 246, 0.5);
        animation: liv8-pulse 2s ease-in-out infinite;
      }
      .liv8-voice-icon {
        width: 36px;
        height: 36px;
        background: #8b5cf6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .liv8-voice-text {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: #9ca3af;
      }
      @keyframes liv8-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.5; }
      }
    </style>
  `;

  document.body.appendChild(voiceOverlay);
}

// Theme sync with dashboard
function syncThemeWithDashboard() {
  // Listen for theme changes from dashboard
  window.addEventListener('message', (event) => {
    if (event.data.type === 'LIV8_THEME_CHANGE') {
      chrome.runtime.sendMessage({
        type: 'SET_THEME',
        theme: event.data.theme,
        accentColor: event.data.accentColor
      });
    }
  });
}

// Apply theme
function applyTheme(theme, accentColor) {
  // Send to dashboard if on LIV8 site
  if (window.location.hostname.includes('liv8.ai')) {
    window.postMessage({
      type: 'LIV8_EXTENSION_THEME',
      theme,
      accentColor
    }, '*');
  }
}

// Dashboard bridge for direct communication
function setupDashboardBridge() {
  // Expose extension status to dashboard
  window.postMessage({ type: 'LIV8_EXTENSION_READY' }, '*');

  // Listen for dashboard requests
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'LIV8_GET_EXTENSION_STATUS') {
      const user = await chrome.storage.sync.get(['user', 'locationId']);
      window.postMessage({
        type: 'LIV8_EXTENSION_STATUS',
        installed: true,
        user: user.user,
        locationId: user.locationId
      }, '*');
    }

    if (event.data.type === 'LIV8_SYNC_USER') {
      await chrome.storage.sync.set({
        user: event.data.user,
        locationId: event.data.locationId,
        apiKey: event.data.apiKey
      });
    }
  });
}
