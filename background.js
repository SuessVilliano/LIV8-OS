
// This file is required for the Chrome Extension manifest.
// In a real extension, this would handle background tasks.

chrome.runtime.onInstalled.addListener(() => {
  console.log("LIV8 OS Extension Installed");
});

chrome.action.onClicked.addListener((tab) => {
  // If you want to open the panel on click
  // chrome.sidePanel.open({ tabId: tab.id });
});
