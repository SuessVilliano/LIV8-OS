/**
 * LIV8 OS Chrome Extension - Side Panel Script
 *
 * "Create it in the Mind, Watch it Come Alive"
 */

// State
let currentTab = 'chat';
let selectedStaff = null;
let isListening = false;
let messages = [];
let capturedContent = null;
let selectedPlatforms = ['twitter', 'linkedin']; // Default platforms for social posting

// Late Social Media API Integration
const LATE_PLATFORMS = {
  twitter: { name: 'Twitter/X', icon: '𝕏', limit: 25000 },
  instagram: { name: 'Instagram', icon: '📷', limit: 2200 },
  facebook: { name: 'Facebook', icon: 'f', limit: 63206 },
  linkedin: { name: 'LinkedIn', icon: 'in', limit: 3000 },
  tiktok: { name: 'TikTok', icon: '♪', limit: 2200 },
  youtube: { name: 'YouTube', icon: '▶', limit: 5000 },
  pinterest: { name: 'Pinterest', icon: '📌', limit: 500 },
  reddit: { name: 'Reddit', icon: '🔶', limit: 40000 },
  bluesky: { name: 'Bluesky', icon: '🦋', limit: 300 },
  threads: { name: 'Threads', icon: '@', limit: 500 },
  google_business: { name: 'Google Business', icon: 'G', limit: 1500 },
  telegram: { name: 'Telegram', icon: '✈', limit: 4096 },
  snapchat: { name: 'Snapchat', icon: '👻', limit: 250 }
};

// Publish to Late Social Media API
async function publishToLate(content, platforms = selectedPlatforms, mediaUrls = []) {
  const API_BASE = 'https://api.liv8ai.com';

  try {
    const data = await chrome.storage.sync.get(['apiKey', 'locationId']);

    if (!data.apiKey) {
      return { success: false, error: 'No API key configured. Please set up in dashboard settings.' };
    }

    const response = await fetch(`${API_BASE}/api/late/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.apiKey}`,
        'x-location-id': data.locationId || 'default'
      },
      body: JSON.stringify({
        content,
        platforms,
        mediaUrls,
        isDraft: false
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else {
      const error = await response.json().catch(() => ({ message: 'Failed to publish' }));
      return { success: false, error: error.message || 'Failed to publish to social media' };
    }
  } catch (error) {
    console.error('Late API error:', error);
    return { success: false, error: 'Network error - please check your connection' };
  }
}

// Get connected Late accounts
async function getLateAccounts() {
  const API_BASE = 'https://api.liv8ai.com';

  try {
    const data = await chrome.storage.sync.get(['apiKey', 'locationId']);

    if (!data.apiKey) return [];

    const response = await fetch(`${API_BASE}/api/late/accounts`, {
      headers: {
        'Authorization': `Bearer ${data.apiKey}`,
        'x-location-id': data.locationId || 'default'
      }
    });

    if (response.ok) {
      const result = await response.json();
      return result.accounts || [];
    }
  } catch (error) {
    console.error('Failed to fetch Late accounts:', error);
  }
  return [];
}

// Show platform selector for social posting
function showPlatformSelector(postContent) {
  const modal = document.createElement('div');
  modal.className = 'platform-modal';
  modal.innerHTML = `
    <div class="platform-modal-content">
      <h3>Select Platforms to Post</h3>
      <p class="post-preview">${postContent.substring(0, 100)}${postContent.length > 100 ? '...' : ''}</p>
      <div class="platform-grid">
        ${Object.entries(LATE_PLATFORMS).map(([key, platform]) => `
          <label class="platform-option ${selectedPlatforms.includes(key) ? 'selected' : ''}">
            <input type="checkbox" value="${key}" ${selectedPlatforms.includes(key) ? 'checked' : ''}>
            <span class="platform-icon">${platform.icon}</span>
            <span class="platform-name">${platform.name}</span>
          </label>
        `).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-publish">Publish Now</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle checkbox changes
  modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const label = e.target.closest('.platform-option');
      label.classList.toggle('selected', e.target.checked);
      if (e.target.checked) {
        selectedPlatforms.push(e.target.value);
      } else {
        selectedPlatforms = selectedPlatforms.filter(p => p !== e.target.value);
      }
    });
  });

  // Handle cancel
  modal.querySelector('.btn-cancel').addEventListener('click', () => {
    modal.remove();
  });

  // Handle publish
  modal.querySelector('.btn-publish').addEventListener('click', async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    modal.querySelector('.btn-publish').textContent = 'Publishing...';
    modal.querySelector('.btn-publish').disabled = true;

    const result = await publishToLate(postContent, selectedPlatforms);

    modal.remove();

    if (result.success) {
      addMessage('assistant', `✅ Successfully published to ${selectedPlatforms.length} platform(s): ${selectedPlatforms.map(p => LATE_PLATFORMS[p]?.name || p).join(', ')}`);
    } else {
      addMessage('assistant', `❌ Failed to publish: ${result.error}`);
    }
  });

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Elements
const elements = {
  navTabs: document.querySelectorAll('.nav-tab'),
  tabContents: {
    chat: document.getElementById('chat-tab'),
    staff: document.getElementById('staff-tab'),
    tools: document.getElementById('tools-tab'),
    settings: document.getElementById('settings-tab')
  },
  chatMessages: document.getElementById('chat-messages'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  voiceInput: document.getElementById('voice-input'),
  quickActions: document.querySelectorAll('.quick-action'),
  staffCards: document.querySelectorAll('.staff-card'),
  toolCards: document.querySelectorAll('.tool-card'),
  capturePreview: document.getElementById('capture-preview'),
  captureContent: document.getElementById('capture-content'),
  clearCapture: document.getElementById('clear-capture'),
  toggles: {
    voice: document.getElementById('voice-toggle-setting'),
    wakeWord: document.getElementById('wake-word-toggle'),
    darkMode: document.getElementById('dark-mode-toggle'),
    notifications: document.getElementById('notifications-toggle'),
    sounds: document.getElementById('sounds-toggle')
  },
  openDashboard: document.getElementById('open-dashboard')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkForCapture();
  setupEventListeners();
  setupVoiceRecognition();
});

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'theme',
    'accentColor',
    'voiceEnabled',
    'wakeWordEnabled',
    'notificationsEnabled',
    'soundsEnabled'
  ]);

  // Apply theme
  if (settings.theme === 'light') {
    elements.toggles.darkMode?.classList.remove('active');
    document.documentElement.style.setProperty('--bg-primary', '#ffffff');
    document.documentElement.style.setProperty('--bg-secondary', '#f3f4f6');
    document.documentElement.style.setProperty('--text-primary', '#111827');
    document.documentElement.style.setProperty('--text-secondary', '#4b5563');
  }

  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }

  // Apply toggle states
  if (settings.voiceEnabled) elements.toggles.voice?.classList.add('active');
  if (settings.wakeWordEnabled !== false) elements.toggles.wakeWord?.classList.add('active');
  if (settings.notificationsEnabled !== false) elements.toggles.notifications?.classList.add('active');
  if (settings.soundsEnabled) elements.toggles.sounds?.classList.add('active');
}

// Check for captured content
async function checkForCapture() {
  const data = await chrome.storage.local.get(['pendingCapture']);

  if (data.pendingCapture) {
    capturedContent = data.pendingCapture;
    showCapturePreview(capturedContent);

    // Clear pending capture
    await chrome.storage.local.remove(['pendingCapture']);
  }
}

// Show capture preview
function showCapturePreview(capture) {
  elements.capturePreview.style.display = 'block';

  let content = '';
  if (capture.type === 'text') {
    content = capture.content;
  } else if (capture.type === 'page') {
    content = `<strong>${capture.title}</strong><br>${capture.content?.substring(0, 200)}...`;
  } else if (capture.type === 'content-request') {
    content = capture.text || capture.linkUrl || 'Content from page';
  } else if (capture.type === 'lead') {
    content = `Lead from: ${capture.title}<br>${capture.text || capture.linkUrl || ''}`;
  }

  elements.captureContent.innerHTML = content;

  // Add context to message input
  if (capture.type === 'text') {
    elements.messageInput.placeholder = 'What would you like to do with this text?';
  } else if (capture.type === 'content-request') {
    elements.messageInput.placeholder = 'Describe the content you want to create...';
  } else if (capture.type === 'lead') {
    elements.messageInput.placeholder = 'Add notes about this lead...';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Tab navigation
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Message input
  elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  elements.messageInput.addEventListener('input', () => {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 120) + 'px';
  });

  elements.sendBtn.addEventListener('click', sendMessage);

  // Voice input
  elements.voiceInput.addEventListener('click', toggleVoiceInput);

  // Quick actions
  elements.quickActions.forEach(action => {
    action.addEventListener('click', () => handleQuickAction(action.dataset.action));
  });

  // Staff selection
  elements.staffCards.forEach(card => {
    card.addEventListener('click', () => selectStaff(card.dataset.staff));
  });

  // Tool cards
  elements.toolCards.forEach(card => {
    card.addEventListener('click', () => openTool(card.dataset.tool));
  });

  // Clear capture
  elements.clearCapture?.addEventListener('click', clearCapture);

  // Toggle settings
  Object.entries(elements.toggles).forEach(([key, toggle]) => {
    toggle?.addEventListener('click', () => toggleSetting(key, toggle));
  });

  // Open dashboard
  elements.openDashboard?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'SEND_TO_DASHBOARD', data: { action: 'open' } });
  });

  // Listen for theme changes
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'THEME_UPDATED') {
      if (message.theme === 'light') {
        document.documentElement.style.setProperty('--bg-primary', '#ffffff');
        document.documentElement.style.setProperty('--bg-secondary', '#f3f4f6');
        document.documentElement.style.setProperty('--text-primary', '#111827');
      } else {
        document.documentElement.style.setProperty('--bg-primary', '#0a0a0f');
        document.documentElement.style.setProperty('--bg-secondary', '#111118');
        document.documentElement.style.setProperty('--text-primary', '#ffffff');
      }
      if (message.accentColor) {
        document.documentElement.style.setProperty('--accent', message.accentColor);
      }
    }
  });
}

// Switch tab
function switchTab(tabName) {
  currentTab = tabName;

  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  Object.entries(elements.tabContents).forEach(([name, content]) => {
    if (content) {
      content.style.display = name === tabName ? 'block' : 'none';
    }
  });
}

// Send message
async function sendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text) return;

  // Add user message
  addMessage('user', text);
  elements.messageInput.value = '';
  elements.messageInput.style.height = 'auto';

  // Show loading
  const loadingEl = showLoading();

  // Build context
  const context = {
    message: text,
    staff: selectedStaff,
    capture: capturedContent
  };

  try {
    // Call API
    const response = await callAI(context);
    loadingEl.remove();
    addMessage('assistant', response);
  } catch (error) {
    loadingEl.remove();
    addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    console.error('AI Error:', error);
  }

  // Clear capture after use
  if (capturedContent) {
    clearCapture();
  }
}

// Add message to chat
function addMessage(role, content) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;

  if (role === 'assistant') {
    messageEl.innerHTML = `<div class="role">${selectedStaff ? staffNames[selectedStaff] : 'LIV8 Assistant'}</div>${content}`;
  } else {
    messageEl.textContent = content;
  }

  elements.chatMessages.appendChild(messageEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

  messages.push({ role, content });
}

// Show loading indicator
function showLoading() {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading';
  loadingEl.innerHTML = `
    <div class="loading-dots">
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
    </div>
    <span style="font-size: 12px; color: var(--text-muted);">Thinking...</span>
  `;
  elements.chatMessages.appendChild(loadingEl);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return loadingEl;
}

// Call AI API
async function callAI(context) {
  // Use actual backend API
  const API_BASE = 'https://api.liv8ai.com';

  try {
    // Get auth token from storage
    const data = await chrome.storage.sync.get(['apiKey', 'locationId']);

    if (data.apiKey) {
      const response = await fetch(`${API_BASE}/api/staff/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.apiKey}`,
          'x-location-id': data.locationId || 'default'
        },
        body: JSON.stringify({
          message: context.message,
          role: context.staff || 'assistant',
          context: context.capture ? {
            type: context.capture.type,
            content: context.capture.content || context.capture.text,
            source: context.capture.source || context.capture.url
          } : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.response || result.message || 'I processed your request.';
      }
    }
  } catch (error) {
    console.log('API call failed, using fallback responses:', error);
  }

  // Fallback to simulated responses for demo/offline mode
  await new Promise(resolve => setTimeout(resolve, 500));

  const responses = {
    'create-post': 'I\'d be happy to help you create a social media post! I can publish directly to 13 platforms via Late: Twitter/X, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, and Snapchat. What would you like to post?',
    'write-email': 'I can help you draft a professional email. Please tell me the purpose of the email, who it\'s for, and the key points you want to include.',
    'analyze-page': 'I\'ve captured this page. I can help you extract key insights, summarize the content, identify potential leads, or create content based on it. What would you like to do?',
    'add-lead': 'I can add this as a lead to your CRM. Would you like me to extract contact information and add any notes? I can also set up a follow-up task.'
  };

  // Check for quick action context
  if (context.capture?.type === 'content-request') {
    return responses['create-post'];
  }
  if (context.capture?.type === 'lead') {
    return responses['add-lead'];
  }

  // Staff-specific responses
  if (context.staff) {
    const staffResponses = {
      marketing: `As your Marketing Manager, I can help with content creation, campaign planning, and brand strategy. ${context.message.includes('post') ? 'Let me create an engaging post for you!' : 'What marketing task can I assist with?'}`,
      sales: `As your Sales Rep, I\'m here to help with leads and pipeline management. ${context.message.includes('lead') ? 'I\'ll help you qualify and track this lead.' : 'Would you like me to help with prospecting or follow-ups?'}`,
      support: `As your Support Agent, I can help with customer inquiries and success. ${context.message.includes('customer') ? 'I\'ll draft a helpful response.' : 'How can I help improve customer satisfaction?'}`,
      assistant: `As your Executive Assistant, I can manage schedules, tasks, and coordination. ${context.message.includes('schedule') ? 'Let me check your calendar.' : 'What would you like me to organize?'}`,
      caller: `As your Voice Agent, I handle calls and appointments. ${context.message.includes('call') ? 'I can set up a call for you.' : 'Would you like me to schedule an appointment?'}`
    };
    return staffResponses[context.staff] || 'How can I assist you today?';
  }

  // Default response
  return `I understand you want to: "${context.message}". I can help with that! Would you like me to create content, analyze data, manage leads, or assist with another task?`;
}

// Handle quick action
function handleQuickAction(action) {
  // Special handling for direct social publishing
  if (action === 'publish-social') {
    const currentInput = elements.messageInput.value.trim();
    if (currentInput) {
      showPlatformSelector(currentInput);
    } else {
      elements.messageInput.value = '';
      elements.messageInput.placeholder = 'Enter your post content, then click Publish Now again...';
      elements.messageInput.focus();
      addMessage('assistant', '📱 Ready to publish! Enter your post content in the text box below, then click "Publish Now" again to select platforms and post to up to 13 social media platforms via Late.');
    }
    return;
  }

  const prompts = {
    'create-post': 'Create a social media post about ',
    'write-email': 'Write a professional email ',
    'analyze-page': 'Analyze the current page and ',
    'add-lead': 'Add this as a lead: '
  };

  elements.messageInput.value = prompts[action] || '';
  elements.messageInput.focus();

  // If analyze page, capture current page
  if (action === 'analyze-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => ({
            title: document.title,
            url: window.location.href,
            content: document.body.innerText.substring(0, 2000)
          })
        });
        capturedContent = { type: 'page', ...result.result };
        showCapturePreview(capturedContent);
      }
    });
  }
}

// Select staff
const staffNames = {
  marketing: 'Marketing Manager',
  sales: 'Sales Rep',
  support: 'Support Agent',
  assistant: 'Executive Assistant',
  caller: 'Voice Agent'
};

function selectStaff(staffId) {
  selectedStaff = staffId;

  elements.staffCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.staff === staffId);
  });

  // Add system message
  addMessage('assistant', `You're now chatting with ${staffNames[staffId]}. How can I help you today?`);

  // Switch to chat tab
  switchTab('chat');
}

// Open tool
function openTool(toolId) {
  // Send to dashboard with tool action
  chrome.runtime.sendMessage({
    type: 'SEND_TO_DASHBOARD',
    data: { action: 'open-tool', tool: toolId }
  });
}

// Clear capture
function clearCapture() {
  capturedContent = null;
  elements.capturePreview.style.display = 'none';
  elements.messageInput.placeholder = 'Ask me anything...';
}

// Toggle setting
async function toggleSetting(key, toggle) {
  const isActive = toggle.classList.toggle('active');

  const settingMap = {
    voice: 'voiceEnabled',
    wakeWord: 'wakeWordEnabled',
    darkMode: 'theme',
    notifications: 'notificationsEnabled',
    sounds: 'soundsEnabled'
  };

  if (key === 'darkMode') {
    await chrome.storage.sync.set({ theme: isActive ? 'dark' : 'light' });
    chrome.runtime.sendMessage({
      type: 'SET_THEME',
      theme: isActive ? 'dark' : 'light'
    });

    // Apply locally
    if (isActive) {
      document.documentElement.style.setProperty('--bg-primary', '#0a0a0f');
      document.documentElement.style.setProperty('--bg-secondary', '#111118');
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f3f4f6');
      document.documentElement.style.setProperty('--text-primary', '#111827');
    }
  } else {
    await chrome.storage.sync.set({ [settingMap[key]]: isActive });
  }
}

// Voice recognition
let recognition = null;

function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log('Speech recognition not supported');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');

    elements.messageInput.value = transcript;

    if (event.results[0].isFinal) {
      stopVoiceInput();
      // Auto-send after voice input
      setTimeout(sendMessage, 500);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    stopVoiceInput();
  };

  recognition.onend = () => {
    if (isListening) {
      stopVoiceInput();
    }
  };
}

function toggleVoiceInput() {
  if (isListening) {
    stopVoiceInput();
  } else {
    startVoiceInput();
  }
}

function startVoiceInput() {
  if (!recognition) {
    alert('Voice recognition is not supported in your browser');
    return;
  }

  isListening = true;
  elements.voiceInput.classList.add('listening');
  elements.messageInput.placeholder = 'Listening...';

  try {
    recognition.start();
  } catch (e) {
    console.error('Failed to start recognition:', e);
    stopVoiceInput();
  }
}

function stopVoiceInput() {
  isListening = false;
  elements.voiceInput.classList.remove('listening');
  elements.messageInput.placeholder = 'Ask me anything...';

  try {
    recognition?.stop();
  } catch (e) {
    // Already stopped
  }
}
