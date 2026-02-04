/**
 * AnyChat.one API Routes
 * Webhook receiver and configuration management
 */

import { Router, Request, Response } from 'express';
import {
  saveAnyChatConfig,
  getAnyChatConfig,
  deleteAnyChatConfig,
  parseWebhookPayload,
  getMessageDirection,
  formatSlackMessage,
  formatTelegramMessage,
  formatDiscordMessage,
  sendToSlack,
  sendToTelegram,
  sendToDiscord,
  AnyChatConfig,
  AnyChatWebhookPayload
} from '../services/anychat.js';
import {
  analyzeForEscalation,
  formatEscalationAlert
} from '../services/escalation-detector.js';
import { contacts, conversations, messages } from '../db/conversations.js';

const router = Router();

// Track conversation context for escalation (frustration counts, etc.)
const conversationContext = new Map<string, {
  negativeCount: number;
  messageCount: number;
  lastAnalysis?: any;
}>();

/**
 * Save AnyChat configuration
 * POST /api/anychat/config
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { locationId, config } = req.body as {
      locationId: string;
      config: AnyChatConfig;
    };

    if (!locationId || !config || !config.apiKey) {
      return res.status(400).json({
        error: 'locationId and config with apiKey required'
      });
    }

    // Validate at least one channel is configured
    if (!config.channels?.slack && !config.channels?.telegram && !config.channels?.discord) {
      return res.status(400).json({
        error: 'At least one channel (Slack, Telegram, or Discord) must be configured'
      });
    }

    saveAnyChatConfig(locationId, config);

    console.log(`[AnyChat] Configuration saved for location: ${locationId}`);

    res.json({
      success: true,
      message: 'AnyChat configuration saved',
      webhookUrl: `${process.env.API_BASE_URL || 'https://your-api.com'}/api/anychat/webhook/${locationId}`
    });
  } catch (error: any) {
    console.error('[AnyChat] Config save error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get AnyChat configuration (without sensitive data)
 * GET /api/anychat/config/:locationId
 */
router.get('/config/:locationId', async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const config = getAnyChatConfig(locationId);

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Return sanitized config (hide secrets)
    res.json({
      success: true,
      config: {
        workspaceId: config.workspaceId,
        hasApiKey: !!config.apiKey,
        channels: {
          slack: config.channels?.slack ? { configured: true } : undefined,
          telegram: config.channels?.telegram ? { configured: true } : undefined,
          discord: config.channels?.discord ? { configured: true } : undefined
        },
        escalationMentions: config.escalationMentions
      }
    });
  } catch (error: any) {
    console.error('[AnyChat] Config get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete AnyChat configuration
 * DELETE /api/anychat/config/:locationId
 */
router.delete('/config/:locationId', async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const deleted = deleteAnyChatConfig(locationId);

    res.json({
      success: deleted,
      message: deleted ? 'Configuration deleted' : 'Configuration not found'
    });
  } catch (error: any) {
    console.error('[AnyChat] Config delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook receiver for AnyChat events
 * POST /api/anychat/webhook/:locationId
 */
router.post('/webhook/:locationId', async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const config = getAnyChatConfig(locationId);

    if (!config) {
      console.warn(`[AnyChat] Webhook received for unconfigured location: ${locationId}`);
      return res.status(200).json({ received: true, warning: 'Location not configured' });
    }

    // Parse the webhook payload
    const payload = parseWebhookPayload(req.body);

    console.log(`[AnyChat] Webhook received:`, {
      event: payload.event,
      workspace: payload.data.workspace,
      locationId
    });

    // Process based on event type
    await processWebhookEvent(locationId, config, payload);

    res.json({ received: true });
  } catch (error: any) {
    console.error('[AnyChat] Webhook processing error:', error);
    // Always return 200 to prevent webhook retries
    res.status(200).json({ received: true, error: error.message });
  }
});

/**
 * Process webhook event
 */
async function processWebhookEvent(
  locationId: string,
  config: AnyChatConfig,
  payload: AnyChatWebhookPayload
): Promise<void> {
  const { event, data } = payload;

  switch (event) {
    case 'chat.created':
      await handleChatCreated(locationId, config, payload);
      break;

    case 'chat.message.created':
      await handleMessageCreated(locationId, config, payload);
      break;

    case 'chat.resolved':
    case 'chat.archived':
      await handleChatClosed(locationId, config, payload);
      break;

    case 'contact.created':
    case 'contact.updated':
      await handleContactUpdate(locationId, config, payload);
      break;

    default:
      console.log(`[AnyChat] Unhandled event type: ${event}`);
  }
}

/**
 * Handle new chat created
 */
async function handleChatCreated(
  locationId: string,
  config: AnyChatConfig,
  payload: AnyChatWebhookPayload
): Promise<void> {
  const chat = payload.data.chat;
  if (!chat) return;

  console.log(`[AnyChat] New chat created: ${chat.guid}`);

  // Create or update contact in LIV8 OS
  if (chat.contact) {
    try {
      await contacts.findOrCreate(locationId, {
        external_id: chat.contact.guid,
        email: chat.contact.email || undefined,
        phone: chat.contact.phone || undefined,
        first_name: chat.contact.name?.split(' ')[0],
        last_name: chat.contact.name?.split(' ').slice(1).join(' '),
        metadata: {
          anychat_source: chat.source,
          anychat_contact_id: chat.contact.guid
        }
      });
    } catch (error) {
      console.error('[AnyChat] Failed to create contact:', error);
    }
  }

  // Notify team channels
  const slackMessage = formatSlackMessage(payload.event, payload.data);
  const telegramMessage = formatTelegramMessage(payload.event, payload.data);
  const discordMessage = formatDiscordMessage(payload.event, payload.data);

  await sendToChannels(config, slackMessage, telegramMessage, discordMessage);
}

/**
 * Handle new message
 */
async function handleMessageCreated(
  locationId: string,
  config: AnyChatConfig,
  payload: AnyChatWebhookPayload
): Promise<void> {
  const { chat, message } = payload.data;
  if (!chat || !message) return;

  const direction = getMessageDirection(message, chat);

  console.log(`[AnyChat] New ${direction} message in chat ${chat.guid}: "${message.message.substring(0, 50)}..."`);

  // Get or update conversation context
  const contextKey = `${locationId}:${chat.guid}`;
  let context = conversationContext.get(contextKey) || {
    negativeCount: 0,
    messageCount: 0
  };
  context.messageCount++;

  // Store message in LIV8 OS inbox
  try {
    // Find or create contact
    let contact = null;
    if (chat.contact) {
      contact = await contacts.findOrCreate(locationId, {
        external_id: chat.contact.guid,
        email: chat.contact.email || undefined,
        phone: chat.contact.phone || undefined,
        first_name: chat.contact.name?.split(' ')[0],
        last_name: chat.contact.name?.split(' ').slice(1).join(' ')
      });
    }

    if (contact) {
      // Find or create conversation
      const conversation = await conversations.findOrCreate(
        locationId,
        contact.id,
        'live_chat',
        chat.guid
      );

      // Store message
      await messages.create({
        conversationId: conversation.id,
        locationId,
        direction,
        channel: 'live_chat',
        senderId: direction === 'inbound' ? contact.id : message.from_guid,
        senderName: direction === 'inbound' ? (chat.contact?.name || 'Customer') : 'Agent',
        senderType: direction === 'inbound' ? 'contact' : 'user',
        content: message.message,
        externalId: message.id.toString(),
        metadata: {
          anychat_chat_id: chat.guid,
          anychat_message_id: message.id,
          is_bot: message.is_bot,
          attachments: message.attachments
        }
      });
    }
  } catch (error) {
    console.error('[AnyChat] Failed to store message:', error);
  }

  // Only analyze and forward inbound messages to team
  if (direction === 'inbound') {
    // Analyze for escalation
    const escalation = analyzeForEscalation(message.message, {}, {
      previousMessageCount: context.messageCount,
      previousNegativeCount: context.negativeCount
    });

    // Update context
    if (escalation.metadata.sentimentScore < -0.3) {
      context.negativeCount++;
    }
    context.lastAnalysis = escalation;
    conversationContext.set(contextKey, context);

    // Prepare messages for team channels
    let slackMessage: any;
    let telegramMessage: string;
    let discordMessage: any;
    let shouldMention = false;

    if (escalation.shouldEscalate) {
      // Format as escalation alert
      const alert = formatEscalationAlert(escalation, message.message, {
        name: chat.contact?.name || undefined,
        email: chat.contact?.email || undefined,
        phone: chat.contact?.phone || undefined
      });

      slackMessage = formatSlackMessage(payload.event, payload.data, alert);
      telegramMessage = formatTelegramMessage(payload.event, payload.data, alert);
      discordMessage = formatDiscordMessage(payload.event, payload.data, alert);
      shouldMention = true;

      console.log(`[AnyChat] 🚨 ESCALATION triggered for chat ${chat.guid}:`, {
        priority: escalation.priority,
        reasons: escalation.reasons
      });
    } else {
      // Normal message format
      slackMessage = formatSlackMessage(payload.event, payload.data);
      telegramMessage = formatTelegramMessage(payload.event, payload.data);
      discordMessage = formatDiscordMessage(payload.event, payload.data);
    }

    // Send to configured channels
    await sendToChannels(
      config,
      slackMessage,
      telegramMessage,
      discordMessage,
      shouldMention ? config.escalationMentions : undefined
    );
  }
}

/**
 * Handle chat closed/archived
 */
async function handleChatClosed(
  locationId: string,
  config: AnyChatConfig,
  payload: AnyChatWebhookPayload
): Promise<void> {
  const chat = payload.data.chat;
  if (!chat) return;

  console.log(`[AnyChat] Chat closed: ${chat.guid}`);

  // Clean up conversation context
  const contextKey = `${locationId}:${chat.guid}`;
  conversationContext.delete(contextKey);

  // TODO: Update conversation status in LIV8 OS inbox
}

/**
 * Handle contact update
 */
async function handleContactUpdate(
  locationId: string,
  config: AnyChatConfig,
  payload: AnyChatWebhookPayload
): Promise<void> {
  const contact = payload.data.contact;
  if (!contact) return;

  console.log(`[AnyChat] Contact updated: ${contact.guid}`);

  // Update contact in LIV8 OS
  try {
    await contacts.findOrCreate(locationId, {
      external_id: contact.guid,
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      first_name: contact.name?.split(' ')[0],
      last_name: contact.name?.split(' ').slice(1).join(' '),
      company: contact.company || undefined,
      metadata: {
        anychat_contact_id: contact.guid,
        anychat_source: contact.source
      }
    });
  } catch (error) {
    console.error('[AnyChat] Failed to update contact:', error);
  }
}

/**
 * Send message to all configured channels
 */
async function sendToChannels(
  config: AnyChatConfig,
  slackMessage: any,
  telegramMessage: string,
  discordMessage: any,
  mentions?: AnyChatConfig['escalationMentions']
): Promise<void> {
  const promises: Promise<boolean>[] = [];

  if (config.channels?.slack?.webhookUrl) {
    promises.push(
      sendToSlack(
        config.channels.slack.webhookUrl,
        slackMessage,
        mentions?.slack
      )
    );
  }

  if (config.channels?.telegram?.botToken && config.channels?.telegram?.chatId) {
    promises.push(
      sendToTelegram(
        config.channels.telegram.botToken,
        config.channels.telegram.chatId,
        telegramMessage,
        mentions?.telegram
      )
    );
  }

  if (config.channels?.discord?.webhookUrl) {
    promises.push(
      sendToDiscord(
        config.channels.discord.webhookUrl,
        discordMessage,
        mentions?.discord
      )
    );
  }

  const results = await Promise.allSettled(promises);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[AnyChat] Failed to send to channel:', result.reason);
    }
  }
}

/**
 * Test channel connection
 * POST /api/anychat/test-channel
 */
router.post('/test-channel', async (req: Request, res: Response) => {
  try {
    const { channel, config } = req.body as {
      channel: 'slack' | 'telegram' | 'discord';
      config: any;
    };

    let success = false;
    const testMessage = '✅ LIV8 OS AnyChat integration test successful!';

    switch (channel) {
      case 'slack':
        if (config.webhookUrl) {
          success = await sendToSlack(config.webhookUrl, {
            text: testMessage,
            blocks: [{
              type: 'section',
              text: { type: 'mrkdwn', text: testMessage }
            }]
          });
        }
        break;

      case 'telegram':
        if (config.botToken && config.chatId) {
          success = await sendToTelegram(config.botToken, config.chatId, testMessage);
        }
        break;

      case 'discord':
        if (config.webhookUrl) {
          success = await sendToDiscord(config.webhookUrl, { content: testMessage });
        }
        break;
    }

    res.json({ success, channel });
  } catch (error: any) {
    console.error('[AnyChat] Test channel error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get escalation stats
 * GET /api/anychat/stats/:locationId
 */
router.get('/stats/:locationId', async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;

    // Count active conversations with context
    let activeConversations = 0;
    let escalatedCount = 0;

    for (const [key, context] of Array.from(conversationContext.entries())) {
      if (key.startsWith(`${locationId}:`)) {
        activeConversations++;
        if (context.lastAnalysis?.shouldEscalate) {
          escalatedCount++;
        }
      }
    }

    res.json({
      success: true,
      stats: {
        activeConversations,
        escalatedCount,
        escalationRate: activeConversations > 0
          ? (escalatedCount / activeConversations * 100).toFixed(1) + '%'
          : '0%'
      }
    });
  } catch (error: any) {
    console.error('[AnyChat] Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
