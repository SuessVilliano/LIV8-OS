/**
 * Escalation Detection Service
 * Analyzes messages to determine if human intervention is needed
 */

export interface EscalationResult {
  shouldEscalate: boolean;
  confidence: number;
  reasons: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedAction: string;
  metadata: {
    keywordsFound: string[];
    sentimentScore: number;
    topicsDetected: string[];
    frustrationLevel: number;
  };
}

export interface EscalationConfig {
  keywords: string[];
  sentimentThreshold: number;
  aiConfidenceThreshold: number;
  topics: string[];
  frustrationCountThreshold: number;
}

// Default escalation configuration
const DEFAULT_CONFIG: EscalationConfig = {
  keywords: [
    // Direct escalation requests
    'manager', 'supervisor', 'human', 'real person', 'live agent',
    'speak to someone', 'talk to someone', 'escalate', 'representative',

    // Complaint indicators
    'complaint', 'complain', 'unacceptable', 'ridiculous', 'terrible',
    'awful', 'horrible', 'worst', 'disgusting', 'outrageous',

    // Legal/financial triggers
    'lawyer', 'lawsuit', 'sue', 'legal action', 'attorney',
    'refund', 'money back', 'cancel subscription', 'chargeback',
    'fraud', 'scam', 'stolen', 'unauthorized',

    // Urgency indicators
    'urgent', 'emergency', 'immediately', 'right now', 'asap',

    // Frustration indicators
    'frustrated', 'angry', 'furious', 'fed up', 'had enough',
    'done with', 'leaving', 'switching', 'competitor'
  ],

  sentimentThreshold: -0.4, // Escalate if sentiment below this
  aiConfidenceThreshold: 0.6, // Escalate if AI confidence below this

  topics: [
    'billing_dispute',
    'refund_request',
    'service_cancellation',
    'legal_threat',
    'data_privacy',
    'security_concern',
    'account_compromise',
    'payment_failure',
    'contract_dispute'
  ],

  frustrationCountThreshold: 3
};

// Simple sentiment analysis (can be replaced with AI service)
function analyzeSentiment(text: string): number {
  const positiveWords = [
    'thanks', 'thank', 'great', 'good', 'excellent', 'amazing', 'wonderful',
    'helpful', 'appreciate', 'love', 'perfect', 'awesome', 'fantastic',
    'happy', 'pleased', 'satisfied', 'impressed'
  ];

  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'angry',
    'frustrated', 'disappointed', 'upset', 'annoyed', 'furious', 'disgusted',
    'unacceptable', 'ridiculous', 'pathetic', 'useless', 'waste', 'stupid',
    'incompetent', 'fail', 'failed', 'broken', 'wrong', 'never', 'nothing'
  ];

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  let score = 0;
  let matches = 0;

  for (const word of words) {
    if (positiveWords.some(pw => word.includes(pw))) {
      score += 1;
      matches++;
    }
    if (negativeWords.some(nw => word.includes(nw))) {
      score -= 1;
      matches++;
    }
  }

  // Check for intensifiers
  if (lowerText.includes('very') || lowerText.includes('extremely') || lowerText.includes('so ')) {
    score *= 1.5;
  }

  // Check for negation (rough)
  if (lowerText.includes("don't") || lowerText.includes("doesn't") || lowerText.includes("didn't")) {
    score *= -0.5;
  }

  // Normalize to -1 to 1
  if (matches === 0) return 0;
  return Math.max(-1, Math.min(1, score / Math.max(matches, 1)));
}

// Detect topics in message
function detectTopics(text: string): string[] {
  const topicPatterns: Record<string, RegExp[]> = {
    billing_dispute: [/bill/i, /charge/i, /invoice/i, /payment/i, /overcharge/i],
    refund_request: [/refund/i, /money back/i, /return/i, /reimburse/i],
    service_cancellation: [/cancel/i, /unsubscribe/i, /stop/i, /terminate/i, /end.*service/i],
    legal_threat: [/lawyer/i, /attorney/i, /sue/i, /lawsuit/i, /legal/i, /court/i],
    data_privacy: [/privacy/i, /data/i, /gdpr/i, /delete.*account/i, /personal.*info/i],
    security_concern: [/hack/i, /breach/i, /stolen/i, /unauthorized/i, /compromise/i],
    account_compromise: [/someone.*account/i, /not.*me/i, /didn't.*order/i, /fraud/i],
    payment_failure: [/payment.*fail/i, /card.*decline/i, /transaction.*fail/i],
    contract_dispute: [/contract/i, /agreement/i, /terms/i, /promise/i, /guarantee/i]
  };

  const detected: string[] = [];

  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        detected.push(topic);
        break;
      }
    }
  }

  return detected;
}

// Find keywords in message
function findKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

// Determine priority based on triggers
function determinePriority(
  keywordsFound: string[],
  sentimentScore: number,
  topicsDetected: string[]
): 'low' | 'medium' | 'high' | 'urgent' {
  const urgentKeywords = ['lawyer', 'lawsuit', 'sue', 'legal', 'emergency', 'fraud', 'stolen'];
  const highKeywords = ['manager', 'supervisor', 'refund', 'cancel', 'complaint'];

  // Check for urgent triggers
  if (keywordsFound.some(k => urgentKeywords.includes(k.toLowerCase()))) {
    return 'urgent';
  }

  if (topicsDetected.includes('legal_threat') || topicsDetected.includes('account_compromise')) {
    return 'urgent';
  }

  // Check for high priority triggers
  if (keywordsFound.some(k => highKeywords.includes(k.toLowerCase()))) {
    return 'high';
  }

  if (sentimentScore < -0.7) {
    return 'high';
  }

  if (topicsDetected.includes('billing_dispute') || topicsDetected.includes('refund_request')) {
    return 'high';
  }

  // Medium priority
  if (sentimentScore < -0.4 || topicsDetected.length > 0) {
    return 'medium';
  }

  return 'low';
}

// Generate suggested action
function generateSuggestedAction(
  priority: string,
  keywordsFound: string[],
  topicsDetected: string[]
): string {
  if (priority === 'urgent') {
    if (topicsDetected.includes('legal_threat')) {
      return 'Immediately escalate to management and legal team';
    }
    if (topicsDetected.includes('account_compromise')) {
      return 'Escalate to security team immediately';
    }
    return 'Immediate manager intervention required';
  }

  if (priority === 'high') {
    if (keywordsFound.some(k => ['manager', 'supervisor'].includes(k.toLowerCase()))) {
      return 'Customer explicitly requested manager - connect them directly';
    }
    if (topicsDetected.includes('refund_request')) {
      return 'Review refund request and escalate to billing team';
    }
    return 'Senior support agent should handle this conversation';
  }

  if (priority === 'medium') {
    return 'Monitor conversation closely, be ready to escalate';
  }

  return 'AI can continue handling, human backup available';
}

/**
 * Analyze a message for escalation triggers
 */
export function analyzeForEscalation(
  message: string,
  config: Partial<EscalationConfig> = {},
  context?: {
    previousMessageCount?: number;
    previousNegativeCount?: number;
    aiConfidence?: number;
  }
): EscalationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const reasons: string[] = [];

  // Find keywords
  const keywordsFound = findKeywords(message, finalConfig.keywords);
  if (keywordsFound.length > 0) {
    reasons.push(`Keywords detected: ${keywordsFound.join(', ')}`);
  }

  // Analyze sentiment
  const sentimentScore = analyzeSentiment(message);
  if (sentimentScore < finalConfig.sentimentThreshold) {
    reasons.push(`Negative sentiment detected (score: ${sentimentScore.toFixed(2)})`);
  }

  // Detect topics
  const topicsDetected = detectTopics(message);
  if (topicsDetected.length > 0) {
    reasons.push(`Sensitive topics: ${topicsDetected.join(', ')}`);
  }

  // Check frustration count from context
  let frustrationLevel = 0;
  if (context?.previousNegativeCount) {
    frustrationLevel = context.previousNegativeCount;
    if (frustrationLevel >= finalConfig.frustrationCountThreshold) {
      reasons.push(`Repeated frustration (${frustrationLevel} negative messages)`);
    }
  }

  // Check AI confidence from context
  if (context?.aiConfidence !== undefined && context.aiConfidence < finalConfig.aiConfidenceThreshold) {
    reasons.push(`AI confidence low (${(context.aiConfidence * 100).toFixed(0)}%)`);
  }

  // Determine if escalation is needed
  const shouldEscalate = reasons.length > 0;

  // Calculate overall confidence in escalation decision
  let confidence = 0;
  if (keywordsFound.length > 0) confidence += 0.3;
  if (sentimentScore < finalConfig.sentimentThreshold) confidence += 0.25;
  if (topicsDetected.length > 0) confidence += 0.25;
  if (frustrationLevel >= finalConfig.frustrationCountThreshold) confidence += 0.2;
  confidence = Math.min(1, confidence);

  // Determine priority
  const priority = determinePriority(keywordsFound, sentimentScore, topicsDetected);

  // Generate suggested action
  const suggestedAction = generateSuggestedAction(priority, keywordsFound, topicsDetected);

  return {
    shouldEscalate,
    confidence,
    reasons,
    priority,
    suggestedAction,
    metadata: {
      keywordsFound,
      sentimentScore,
      topicsDetected,
      frustrationLevel
    }
  };
}

/**
 * Format escalation alert for team channel (Slack/Telegram)
 */
export function formatEscalationAlert(
  escalation: EscalationResult,
  customerMessage: string,
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    previousInteractions?: number;
  }
): string {
  const priorityEmoji = {
    urgent: '🚨',
    high: '⚠️',
    medium: '📢',
    low: 'ℹ️'
  };

  const emoji = priorityEmoji[escalation.priority];

  let alert = `${emoji} **ESCALATION - ${escalation.priority.toUpperCase()}**\n\n`;

  if (customerInfo?.name) {
    alert += `**Customer:** ${customerInfo.name}\n`;
  }
  if (customerInfo?.email) {
    alert += `**Email:** ${customerInfo.email}\n`;
  }
  if (customerInfo?.phone) {
    alert += `**Phone:** ${customerInfo.phone}\n`;
  }
  if (customerInfo?.previousInteractions) {
    alert += `**Previous Interactions:** ${customerInfo.previousInteractions}\n`;
  }

  alert += `\n**Reasons for Escalation:**\n`;
  for (const reason of escalation.reasons) {
    alert += `• ${reason}\n`;
  }

  alert += `\n**Suggested Action:** ${escalation.suggestedAction}\n`;

  alert += `\n**Customer Message:**\n> ${customerMessage}\n`;

  if (escalation.metadata.topicsDetected.length > 0) {
    alert += `\n**Topics:** ${escalation.metadata.topicsDetected.join(', ')}`;
  }

  return alert;
}

export default {
  analyzeForEscalation,
  formatEscalationAlert
};
