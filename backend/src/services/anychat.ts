/**
 * AnyChat.one Integration Service
 * Handles webhook processing and message routing
 */

import * as crypto from 'crypto';

// AnyChat webhook event types
export type AnyChatEventType =
  | 'chat.created'
  | 'chat.message.created'
  | 'chat.message.updated'
  | 'chat.message.deleted'
  | 'chat.muted'
  | 'chat.unmuted'
  | 'chat.archived'
  | 'chat.unarchived'
  | 'chat.resolved'
  | 'chat.reopened'
  | 'chat.deleted'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted';

// Data types from AnyChat API
export interface AnyChatContact {
  guid: string;
  name: string;
  email: string | null;
  phone: string | null;
  clean_phone: string | null;
  zip_code: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  company: string | null;
  lang: string;
  timezone: string;
  source: string;
  source_id: string | null;
  assigned_to: string | null;
  created_at: number;
  updated_at: number;
  image: string | null;
}

export interface AnyChatChat {
  guid: string;
  channel: string;
  started_by: string;
  assigned_to: string | null;
  is_closed: number;
  is_archive: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
  last_message_at: number;
  is_group: number;
  title: string | null;
  image: string | null;
  mute: number;
  source: string;
  source_id: string | null;
  contact: AnyChatContact | null;
}

export interface AnyChatMessage {
  id: number;
  thread_guid: string;
  from_guid: string;
  is_bot: boolean | null;
  is_service: number;
  message: string;
  created_at: number;
  updated_at: number;
  last_edit: number;
  source: string;
  source_id: string | null;
  attachments: AnyChatAttachment[];
}

export interface AnyChatAttachment {
  id: number;
  thread: string;
  message_id: number;
  filename: string;
  url: string;
  filesize: number;
  mime: string;
  created_at: number;
}

export interface AnyChatWebhookPayload {
  event: AnyChatEventType;
  id: string;
  ts: number;
  data: {
    workspace: string;
    guid: string;
    chat?: AnyChatChat;
    message?: AnyChatMessage;
    contact?: AnyChatContact;
  };
}

// Configuration for AnyChat integration
export interface AnyChatConfig {
  apiKey: string;
  workspaceId: string;
  webhookSecret?: string;
  channels: {
    slack?: {
      webhookUrl: string;
      channelId?: string;
    };
    telegram?: {
      botToken: string;
      chatId: string;
    };
    discord?: {
      webhookUrl: string;
    };
  };
  escalationMentions?: {
    slack?: string[]; // User IDs to mention
    telegram?: string[]; // Usernames to mention
    discord?: string[]; // User IDs to mention
  };
}

// Encrypted storage for AnyChat configs
const anychatConfigs = new Map<string, string>(); // locationId -> encrypted config

const ENCRYPTION_KEY = process.env.ANYCHAT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Save AnyChat configuration for a location
 */
export function saveAnyChatConfig(locationId: string, config: AnyChatConfig): void {
  const encrypted = encrypt(JSON.stringify(config));
  anychatConfigs.set(locationId, encrypted);
}

/**
 * Get AnyChat configuration for a location
 */
export function getAnyChatConfig(locationId: string): AnyChatConfig | null {
  const encrypted = anychatConfigs.get(locationId);
  if (!encrypted) return null;

  try {
    return JSON.parse(decrypt(encrypted));
  } catch {
    return null;
  }
}

/**
 * Delete AnyChat configuration
 */
export function deleteAnyChatConfig(locationId: string): boolean {
  return anychatConfigs.delete(locationId);
}

/**
 * Verify webhook signature (if secret is configured)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse webhook payload
 */
export function parseWebhookPayload(body: any): AnyChatWebhookPayload {
  return {
    event: body.event,
    id: body.id,
    ts: body.ts,
    data: body.data
  };
}

/**
 * Determine message direction from AnyChat message
 */
export function getMessageDirection(
  message: AnyChatMessage,
  chat: AnyChatChat
): 'inbound' | 'outbound' {
  // If message is from the contact who started the chat, it's inbound
  if (message.from_guid === chat.started_by) {
    return 'inbound';
  }
  // Otherwise it's from an agent/bot, so outbound
  return 'outbound';
}

/**
 * Format message for Slack
 */
export function formatSlackMessage(
  event: AnyChatEventType,
  data: AnyChatWebhookPayload['data'],
  escalationAlert?: string
): any {
  const blocks: any[] = [];

  if (escalationAlert) {
    // Escalation alert format
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: escalationAlert
      }
    });
  } else if (event === 'chat.message.created' && data.message) {
    // Normal message format
    const contact = data.chat?.contact;
    const customerName = contact?.name || 'Unknown Customer';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*New message from ${customerName}*`
      }
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `> ${data.message.message}`
      }
    });

    if (contact?.email || contact?.phone) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📧 ${contact.email || 'N/A'} | 📱 ${contact.phone || 'N/A'}`
          }
        ]
      });
    }
  } else if (event === 'chat.created') {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🆕 *New conversation started*\nSource: ${data.chat?.source || 'livechat'}`
      }
    });
  }

  return { blocks };
}

/**
 * Format message for Telegram
 */
export function formatTelegramMessage(
  event: AnyChatEventType,
  data: AnyChatWebhookPayload['data'],
  escalationAlert?: string
): string {
  if (escalationAlert) {
    return escalationAlert;
  }

  if (event === 'chat.message.created' && data.message) {
    const contact = data.chat?.contact;
    const customerName = contact?.name || 'Unknown Customer';

    let text = `💬 *New message from ${customerName}*\n\n`;
    text += `"${data.message.message}"\n\n`;

    if (contact?.email) text += `📧 ${contact.email}\n`;
    if (contact?.phone) text += `📱 ${contact.phone}\n`;

    return text;
  }

  if (event === 'chat.created') {
    return `🆕 *New conversation started*\nSource: ${data.chat?.source || 'livechat'}`;
  }

  return `Event: ${event}`;
}

/**
 * Format message for Discord
 */
export function formatDiscordMessage(
  event: AnyChatEventType,
  data: AnyChatWebhookPayload['data'],
  escalationAlert?: string
): any {
  if (escalationAlert) {
    return {
      content: escalationAlert,
      embeds: []
    };
  }

  if (event === 'chat.message.created' && data.message) {
    const contact = data.chat?.contact;
    const customerName = contact?.name || 'Unknown Customer';

    return {
      embeds: [{
        title: `💬 New message from ${customerName}`,
        description: data.message.message,
        color: 0x00bcd4,
        fields: [
          { name: 'Email', value: contact?.email || 'N/A', inline: true },
          { name: 'Phone', value: contact?.phone || 'N/A', inline: true },
          { name: 'Source', value: data.chat?.source || 'livechat', inline: true }
        ],
        timestamp: new Date(data.message.created_at * 1000).toISOString()
      }]
    };
  }

  return {
    content: `Event: ${event}`,
    embeds: []
  };
}

/**
 * Send message to Slack webhook
 */
export async function sendToSlack(
  webhookUrl: string,
  message: any,
  mentions?: string[]
): Promise<boolean> {
  try {
    // Add mentions if provided
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(id => `<@${id}>`).join(' ');
      if (message.blocks && message.blocks.length > 0) {
        message.blocks.unshift({
          type: 'section',
          text: { type: 'mrkdwn', text: mentionText }
        });
      } else {
        message.text = `${mentionText}\n${message.text || ''}`;
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    return response.ok;
  } catch (error) {
    console.error('[AnyChat] Failed to send to Slack:', error);
    return false;
  }
}

/**
 * Send message to Telegram
 */
export async function sendToTelegram(
  botToken: string,
  chatId: string,
  message: string,
  mentions?: string[]
): Promise<boolean> {
  try {
    // Add mentions if provided
    let text = message;
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(u => `@${u}`).join(' ');
      text = `${mentionText}\n\n${text}`;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown'
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[AnyChat] Failed to send to Telegram:', error);
    return false;
  }
}

/**
 * Send message to Discord webhook
 */
export async function sendToDiscord(
  webhookUrl: string,
  message: any,
  mentions?: string[]
): Promise<boolean> {
  try {
    // Add mentions if provided
    if (mentions && mentions.length > 0) {
      const mentionText = mentions.map(id => `<@${id}>`).join(' ');
      message.content = `${mentionText}\n${message.content || ''}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    return response.ok;
  } catch (error) {
    console.error('[AnyChat] Failed to send to Discord:', error);
    return false;
  }
}

export default {
  saveAnyChatConfig,
  getAnyChatConfig,
  deleteAnyChatConfig,
  verifyWebhookSignature,
  parseWebhookPayload,
  getMessageDirection,
  formatSlackMessage,
  formatTelegramMessage,
  formatDiscordMessage,
  sendToSlack,
  sendToTelegram,
  sendToDiscord
};
