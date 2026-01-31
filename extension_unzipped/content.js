// Content script - Detects context from GHL pages
// This is the "magic" that makes the operator context-aware

/**
 * Extract context from current GHL page
 */
function detectContext() {
  const url = window.location.href;
  const pathname = window.location.pathname;

  // Extract location ID from URL
  const locationMatch = url.match(/location\/([a-zA-Z0-9_-]+)/);
  const locationId = locationMatch ? locationMatch[1] : null;

  // Detect contact page
  if (pathname.includes('/contacts/detail/')) {
    const contactMatch = pathname.match(/detail\/([a-zA-Z0-9_-]+)/);
    const contactName = document.querySelector('[data-testid="contact-name"], .contact-name, h1')?.textContent?.trim();

    // Ultimate Intelligence: Extract more fields
    const email = document.querySelector('a[href^="mailto:"]')?.textContent?.trim();
    const phone = document.querySelector('a[href^="tel:"]')?.textContent?.trim();
    const tags = Array.from(document.querySelectorAll('.contact-tag, [data-testid="tag"]')).map(el => el.textContent?.trim());

    return {
      type: 'contact',
      locationId,
      contactId: contactMatch ? contactMatch[1] : null,
      contactName,
      email,
      phone,
      tags,
      url: window.location.href
    };
  }

  // Detect conversation page
  if (pathname.includes('/conversations')) {
    const conversationId = document.querySelector('[data-conversation-id]')?.getAttribute('data-conversation-id');
    const contactLink = document.querySelector('a[href*="/contacts/detail/"]');
    const contactId = contactLink?.href?.match(/detail\/([a-zA-Z0-9_-]+)/)?.[1];

    return {
      type: 'conversation',
      locationId,
      conversationId,
      contactId,
      url: window.location.href
    };
  }

  // Detect opportunity/pipeline page
  if (pathname.includes('/opportunities')) {
    const oppMatch = pathname.match(/opportunities\/([a-zA-Z0-9_-]+)/);
    const stageName = document.querySelector('.stage-name, [data-stage-name]')?.textContent?.trim();

    return {
      type: 'opportunity',
      locationId,
      opportunityId: oppMatch ? oppMatch[1] : null,
      pipelineStage: stageName,
      url: window.location.href
    };
  }

  // Detect workflows page
  if (pathname.includes('/workflows')) {
    return {
      type: 'workflow',
      locationId,
      url: window.location.href
    };
  }

  // Global context (agency/location dashboard)
  return {
    type: 'global',
    locationId,
    url: window.location.href
  };
}

/**
 * Send context to extension
 */
function sendContext() {
  const context = detectContext();
  chrome.runtime.sendMessage({
    type: 'PAGE_CONTEXT',
    context
  }).catch(() => {
    // Extension might not be ready
  });
}

// Send context immediately on load
sendContext();

// Update context when URL changes (SPA navigation)
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    sendContext();
  }
}, 2000);

console.log('[LIV8 OS] Context detector active');
