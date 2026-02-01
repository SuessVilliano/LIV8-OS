/**
 * LIV8 OS Chrome Extension - Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Open side panel
  document.getElementById('open-sidepanel').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  // Capture page
  document.getElementById('capture-page').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        title: document.title,
        url: window.location.href,
        content: document.body.innerText.substring(0, 5000),
        meta: {
          description: document.querySelector('meta[name="description"]')?.content || '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || ''
        }
      })
    });

    await chrome.storage.local.set({
      pendingCapture: {
        type: 'page',
        ...result.result,
        timestamp: Date.now()
      }
    });

    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  // Create content
  document.getElementById('create-content').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.storage.local.set({
      pendingCapture: {
        type: 'content-request',
        source: tab.url,
        timestamp: Date.now()
      }
    });

    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  // Voice chat
  document.getElementById('voice-chat').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });

    // Enable voice mode
    await chrome.storage.sync.set({ voiceEnabled: true });

    window.close();
  });

  // Open dashboard
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.liv8.ai/dashboard' });
    window.close();
  });
});
