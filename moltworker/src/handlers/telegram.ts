/**
 * Telegram Bot Handler for LIV8 Moltworker
 *
 * Handles incoming Telegram updates and routes them to the AI Manager.
 * Each client has their own bot instance connected to their AI Manager.
 */

import { Env } from '../index';

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: any[];
  document?: any;
  voice?: any;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export class TelegramHandler {
  private env: Env;
  private clientId: string;
  private botToken: string;
  private apiBase = 'https://api.telegram.org/bot';

  constructor(env: Env, clientId: string) {
    this.env = env;
    this.clientId = clientId;
    this.botToken = env.TELEGRAM_BOT_TOKEN;
  }

  async handleUpdate(update: TelegramUpdate): Promise<{ ok: boolean }> {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallback(update.callback_query);
      }
      return { ok: true };
    } catch (error) {
      console.error('Telegram handler error:', error);
      return { ok: false };
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text || '';
    const userId = message.from.id;

    // Check if this is a command
    if (text.startsWith('/')) {
      await this.handleCommand(chatId, text, message.from);
      return;
    }

    // Store session context
    const sessionKey = `session:${this.clientId}:${userId}`;
    let session = await this.getSession(sessionKey);

    if (!session) {
      session = {
        userId,
        chatId,
        startedAt: new Date().toISOString(),
        messageCount: 0
      };
    }

    session.messageCount++;
    session.lastMessage = text;
    session.lastMessageAt = new Date().toISOString();

    // Send typing indicator
    await this.sendChatAction(chatId, 'typing');

    // Get AI Manager response
    const managerId = this.env.AI_MANAGER.idFromName(this.clientId);
    const manager = this.env.AI_MANAGER.get(managerId);

    const response = await manager.fetch(new Request('https://internal/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        context: {
          platform: 'telegram',
          userId,
          chatId,
          userName: `${message.from.first_name} ${message.from.last_name || ''}`.trim()
        }
      })
    }));

    const result = await response.json() as any;

    // Send response with optional action buttons
    if (result.actions && result.actions.length > 0) {
      await this.sendMessageWithButtons(chatId, result.message, result.actions);
    } else {
      await this.sendMessage(chatId, result.message);
    }

    // Update session
    await this.saveSession(sessionKey, session);
  }

  private async handleCommand(chatId: number, text: string, user: TelegramUser): Promise<void> {
    const command = text.split(' ')[0].toLowerCase();
    const args = text.substring(command.length).trim();

    switch (command) {
      case '/start':
        await this.handleStart(chatId, user);
        break;
      case '/help':
        await this.handleHelp(chatId);
        break;
      case '/status':
        await this.handleStatus(chatId);
        break;
      case '/staff':
        await this.handleStaff(chatId);
        break;
      case '/sync':
        await this.handleSync(chatId);
        break;
      case '/post':
        await this.handleQuickAction(chatId, 'social-media', 'create_post', { topic: args });
        break;
      case '/email':
        await this.handleQuickAction(chatId, 'email-specialist', 'draft_email', { purpose: args });
        break;
      case '/followup':
        await this.handleQuickAction(chatId, 'sales-agent', 'suggest_followups', {});
        break;
      default:
        await this.sendMessage(chatId, `Unknown command: ${command}\n\nUse /help to see available commands.`);
    }
  }

  private async handleStart(chatId: number, user: TelegramUser): Promise<void> {
    const clientConfig = await this.env.CLIENT_CONFIG.get(`client:${this.clientId}`);
    const config = clientConfig ? JSON.parse(clientConfig) : null;

    const welcomeMessage = `Welcome to LIV8 OS, ${user.first_name}!

I'm your AI Manager${config ? ` for ${config.name}` : ''}. I coordinate your AI Staff team to help run your business autonomously.

**Your AI Staff:**
Social Media Agent - Creates engaging content
Email Specialist - Drafts campaigns and sequences
Sales Agent - Qualifies leads and follows up
Support Agent - Handles customer inquiries

**Quick Commands:**
/status - Get agency status report
/staff - View AI Staff status
/sync - Sync with your CRM
/post [topic] - Quick social post
/email [purpose] - Quick email draft
/followup - See priority follow-ups
/help - Full command list

Or just chat naturally - I understand plain language!

What would you like to work on?`;

    await this.sendMessageWithButtons(chatId, welcomeMessage, [
      { text: 'View Status', callback_data: 'status' },
      { text: 'AI Staff', callback_data: 'staff' },
      { text: 'Sync CRM', callback_data: 'sync' }
    ]);
  }

  private async handleHelp(chatId: number): Promise<void> {
    const helpMessage = `**LIV8 OS Commands**

**Status & Info:**
/status - Agency status report
/staff - AI Staff status
/help - This help message

**Quick Actions:**
/post [topic] - Create a social media post
/email [purpose] - Draft an email
/followup - Get priority follow-ups

**CRM:**
/sync - Sync with your CRM

**Natural Language:**
Just type naturally! Examples:
- "Create a LinkedIn post about our new feature"
- "Draft a follow-up email for Sarah"
- "What leads should I prioritize today?"
- "Show me this week's performance"

I understand context and can delegate to the right AI Staff member automatically.`;

    await this.sendMessage(chatId, helpMessage);
  }

  private async handleStatus(chatId: number): Promise<void> {
    await this.sendChatAction(chatId, 'typing');

    const managerId = this.env.AI_MANAGER.idFromName(this.clientId);
    const manager = this.env.AI_MANAGER.get(managerId);

    const response = await manager.fetch(new Request('https://internal/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'status report', context: { platform: 'telegram' } })
    }));

    const result = await response.json() as any;
    await this.sendMessage(chatId, result.message);
  }

  private async handleStaff(chatId: number): Promise<void> {
    const agentsRaw = await this.env.CLIENT_CONFIG.get(`agents:${this.clientId}`);
    if (!agentsRaw) {
      await this.sendMessage(chatId, 'No AI Staff configured yet.');
      return;
    }

    const agents = JSON.parse(agentsRaw);
    const statusEmoji = { active: '', idle: '', error: '' };

    let message = '**Your AI Staff Team**\n\n';
    agents.forEach((agent: any) => {
      const emoji = statusEmoji[agent.status as keyof typeof statusEmoji] || '';
      message += `${emoji} **${agent.name}**\n`;
      message += `   Role: ${agent.role}\n`;
      message += `   Last: ${agent.lastAction}\n\n`;
    });

    await this.sendMessage(chatId, message);
  }

  private async handleSync(chatId: number): Promise<void> {
    await this.sendChatAction(chatId, 'typing');

    const configRaw = await this.env.CLIENT_CONFIG.get(`client:${this.clientId}`);
    if (!configRaw) {
      await this.sendMessage(chatId, 'Client not configured. Please complete onboarding first.');
      return;
    }

    const config = JSON.parse(configRaw);
    await this.sendMessage(chatId, `Syncing with ${config.crmType.toUpperCase()}... I'll update you when complete.`);

    // Queue sync task
    await this.env.TASK_QUEUE.send({
      clientId: this.clientId,
      taskType: 'sync_crm',
      params: { crmType: config.crmType }
    });
  }

  private async handleQuickAction(chatId: number, agentType: string, action: string, params: any): Promise<void> {
    await this.sendChatAction(chatId, 'typing');

    const managerId = this.env.AI_MANAGER.idFromName(this.clientId);
    const manager = this.env.AI_MANAGER.get(managerId);

    const response = await manager.fetch(new Request('https://internal/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: `${action}: ${JSON.stringify(params)}`,
        context: { agentType, action, params }
      })
    }));

    const result = await response.json() as any;
    await this.sendMessage(chatId, result.message);
  }

  private async handleCallback(query: CallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    // Acknowledge callback
    await this.answerCallback(query.id);

    switch (query.data) {
      case 'status':
        await this.handleStatus(chatId);
        break;
      case 'staff':
        await this.handleStaff(chatId);
        break;
      case 'sync':
        await this.handleSync(chatId);
        break;
      default:
        await this.sendMessage(chatId, `Action: ${query.data}`);
    }
  }

  // ============================================
  // TELEGRAM API METHODS
  // ============================================

  private async sendMessage(chatId: number, text: string): Promise<void> {
    await fetch(`${this.apiBase}${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
  }

  private async sendMessageWithButtons(chatId: number, text: string, buttons: Array<{ text: string; callback_data: string }>): Promise<void> {
    await fetch(`${this.apiBase}${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [buttons.map(b => ({ text: b.text, callback_data: b.callback_data }))]
        }
      })
    });
  }

  private async sendChatAction(chatId: number, action: string): Promise<void> {
    await fetch(`${this.apiBase}${this.botToken}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action })
    });
  }

  private async answerCallback(callbackQueryId: string): Promise<void> {
    await fetch(`${this.apiBase}${this.botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId })
    });
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  private async getSession(key: string): Promise<any> {
    const data = await this.env.SESSIONS.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async saveSession(key: string, session: any): Promise<void> {
    await this.env.SESSIONS.put(key, JSON.stringify(session), {
      expirationTtl: 60 * 60 * 24 * 7 // 7 days
    });
  }
}
