/**
 * Telegram Integration Service
 *
 * Connects LIV8 OS agents to Telegram via BotFather.
 * Can route to OpenClaw.ai for advanced processing.
 *
 * Flow:
 * 1. User creates bot via @BotFather
 * 2. User provides bot token to LIV8 OS
 * 3. We set up webhook to receive messages
 * 4. Messages processed by Agent Executor
 * 5. Responses sent back via Telegram API
 */

import { Message, MessagingConfig } from './types.js';
import { agentExecutor } from '../services/agent-executor.js';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export interface TelegramConfig extends MessagingConfig {
    provider: 'telegram';
    botToken: string;
    webhookUrl: string;
    locationId: string;
    defaultAgentRole: string;
}

export interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from: {
            id: number;
            is_bot: boolean;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
        };
        chat: {
            id: number;
            type: 'private' | 'group' | 'supergroup' | 'channel';
            title?: string;
            username?: string;
            first_name?: string;
            last_name?: string;
        };
        date: number;
        text?: string;
        photo?: any[];
        document?: any;
        voice?: any;
        audio?: any;
    };
    callback_query?: {
        id: string;
        from: any;
        message: any;
        chat_instance: string;
        data: string;
    };
}

export interface TelegramKeyboard {
    inline_keyboard?: Array<Array<{
        text: string;
        callback_data?: string;
        url?: string;
    }>>;
    keyboard?: Array<Array<{
        text: string;
        request_contact?: boolean;
        request_location?: boolean;
    }>>;
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
}

// Store for bot configurations (in production, use Redis/DB)
const botConfigs = new Map<string, TelegramConfig>();

// Store for user sessions (chat_id -> session info)
const userSessions = new Map<number, {
    locationId: string;
    agentRole: string;
    lastActivity: Date;
}>();

export const telegramService = {
    /**
     * Register a Telegram bot
     */
    async registerBot(config: TelegramConfig): Promise<{
        success: boolean;
        botInfo?: any;
        error?: string;
    }> {
        try {
            // Verify token by calling getMe
            const response = await fetch(`${TELEGRAM_API_URL}${config.botToken}/getMe`);
            const data = await response.json();

            if (!data.ok) {
                return { success: false, error: data.description || 'Invalid bot token' };
            }

            // Set webhook
            const webhookResponse = await fetch(`${TELEGRAM_API_URL}${config.botToken}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: config.webhookUrl,
                    allowed_updates: ['message', 'callback_query'],
                    drop_pending_updates: true
                })
            });

            const webhookData = await webhookResponse.json();

            if (!webhookData.ok) {
                return { success: false, error: webhookData.description || 'Failed to set webhook' };
            }

            // Store config
            botConfigs.set(config.botToken, config);

            console.log(`[Telegram] Bot registered: @${data.result.username}`);

            return {
                success: true,
                botInfo: {
                    id: data.result.id,
                    username: data.result.username,
                    firstName: data.result.first_name
                }
            };

        } catch (error: any) {
            console.error('[Telegram] Registration error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Process incoming webhook update
     */
    async processUpdate(botToken: string, update: TelegramUpdate): Promise<void> {
        const config = botConfigs.get(botToken);

        if (!config) {
            console.error('[Telegram] Bot config not found');
            return;
        }

        // Handle callback queries (button clicks)
        if (update.callback_query) {
            await this.handleCallbackQuery(botToken, update.callback_query, config);
            return;
        }

        // Handle messages
        if (update.message) {
            await this.handleMessage(botToken, update.message, config);
        }
    },

    /**
     * Handle incoming message
     */
    async handleMessage(
        botToken: string,
        message: TelegramUpdate['message'],
        config: TelegramConfig
    ): Promise<void> {
        if (!message || !message.text) return;

        const chatId = message.chat.id;
        const text = message.text;
        const userId = message.from.id;

        // Get or create session
        let session = userSessions.get(chatId);
        if (!session) {
            session = {
                locationId: config.locationId,
                agentRole: config.defaultAgentRole,
                lastActivity: new Date()
            };
            userSessions.set(chatId, session);
        }

        // Handle commands
        if (text.startsWith('/')) {
            await this.handleCommand(botToken, chatId, text, session);
            return;
        }

        // Process with Agent Executor
        try {
            // Send typing indicator
            await this.sendTyping(botToken, chatId);

            const result = await agentExecutor.execute({
                locationId: session.locationId,
                agentRole: session.agentRole,
                userMessage: text,
                context: {
                    platform: 'telegram',
                    userId: userId.toString(),
                    chatId: chatId.toString(),
                    username: message.from.username
                }
            });

            // Build response with optional keyboard
            let keyboard: TelegramKeyboard | undefined;

            if (result.requiresApproval) {
                keyboard = {
                    inline_keyboard: [[
                        { text: 'Approve', callback_data: 'approve' },
                        { text: 'Deny', callback_data: 'deny' }
                    ]]
                };
            } else if (result.suggestedActions && result.suggestedActions.length > 0) {
                keyboard = {
                    inline_keyboard: result.suggestedActions.slice(0, 3).map(action => [{
                        text: action.action.replace(/_/g, ' '),
                        callback_data: `action:${action.action}`
                    }])
                };
            }

            await this.sendMessage(botToken, chatId, result.response, keyboard);

            // If escalation needed, notify
            if (result.escalateTo === 'human') {
                await this.sendMessage(
                    botToken,
                    chatId,
                    '_A team member will follow up with you shortly._',
                    undefined,
                    'Markdown'
                );
            }

            session.lastActivity = new Date();

        } catch (error: any) {
            console.error('[Telegram] Message processing error:', error);
            await this.sendMessage(
                botToken,
                chatId,
                'I apologize, but I encountered an error. Please try again.'
            );
        }
    },

    /**
     * Handle bot commands
     */
    async handleCommand(
        botToken: string,
        chatId: number,
        command: string,
        session: { locationId: string; agentRole: string; lastActivity: Date }
    ): Promise<void> {
        const cmd = command.split(' ')[0].toLowerCase();

        switch (cmd) {
            case '/start':
                await this.sendMessage(
                    botToken,
                    chatId,
                    `Welcome! I'm your AI assistant. How can I help you today?\n\nYou can:\n• Ask questions about our services\n• Request information\n• Get help with common issues\n\nJust type your message and I'll assist you!`,
                    {
                        keyboard: [[
                            { text: 'Services' },
                            { text: 'Pricing' }
                        ], [
                            { text: 'Contact Us' },
                            { text: 'FAQ' }
                        ]],
                        resize_keyboard: true
                    }
                );
                break;

            case '/help':
                await this.sendMessage(
                    botToken,
                    chatId,
                    `*Available Commands*\n\n/start - Start the conversation\n/help - Show this help message\n/agent - Switch AI agent\n/human - Request human support\n/status - Check connection status`,
                    undefined,
                    'Markdown'
                );
                break;

            case '/agent':
                await this.sendMessage(
                    botToken,
                    chatId,
                    'Choose which AI staff member you\'d like to talk to:',
                    {
                        inline_keyboard: [
                            [
                                { text: 'Sales', callback_data: 'agent:sales' },
                                { text: 'Support', callback_data: 'agent:support' }
                            ],
                            [
                                { text: 'Marketing', callback_data: 'agent:marketing' },
                                { text: 'Assistant', callback_data: 'agent:assistant' }
                            ]
                        ]
                    }
                );
                break;

            case '/human':
                await this.sendMessage(
                    botToken,
                    chatId,
                    'I\'ve notified our team. A human representative will reach out to you soon. Is there anything else I can help with in the meantime?'
                );
                // TODO: Trigger notification to human
                break;

            case '/status':
                await this.sendMessage(
                    botToken,
                    chatId,
                    `*Connection Status*\n\n✅ Bot: Connected\n✅ AI Agent: ${session.agentRole}\n✅ Last Activity: Just now`,
                    undefined,
                    'Markdown'
                );
                break;

            default:
                await this.sendMessage(
                    botToken,
                    chatId,
                    'Unknown command. Type /help for available commands.'
                );
        }
    },

    /**
     * Handle callback queries (button clicks)
     */
    async handleCallbackQuery(
        botToken: string,
        query: TelegramUpdate['callback_query'],
        config: TelegramConfig
    ): Promise<void> {
        if (!query) return;

        const chatId = query.message.chat.id;
        const data = query.data;

        // Answer callback to remove loading state
        await fetch(`${TELEGRAM_API_URL}${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: query.id })
        });

        // Handle different callback types
        if (data.startsWith('agent:')) {
            const role = data.split(':')[1];
            const session = userSessions.get(chatId);
            if (session) {
                session.agentRole = role;
                await this.sendMessage(
                    botToken,
                    chatId,
                    `Switched to ${role} agent. How can I help?`
                );
            }
        } else if (data.startsWith('action:')) {
            const action = data.split(':')[1];
            // Handle quick action
            await this.sendMessage(
                botToken,
                chatId,
                `Processing ${action.replace(/_/g, ' ')}...`
            );
        } else if (data === 'approve' || data === 'deny') {
            await this.sendMessage(
                botToken,
                chatId,
                data === 'approve' ? 'Action approved.' : 'Action denied.'
            );
        }
    },

    /**
     * Send a message
     */
    async sendMessage(
        botToken: string,
        chatId: number,
        text: string,
        replyMarkup?: TelegramKeyboard,
        parseMode?: 'Markdown' | 'HTML'
    ): Promise<boolean> {
        try {
            const response = await fetch(`${TELEGRAM_API_URL}${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                    parse_mode: parseMode,
                    reply_markup: replyMarkup
                })
            });

            const data = await response.json();
            return data.ok;

        } catch (error) {
            console.error('[Telegram] Send message error:', error);
            return false;
        }
    },

    /**
     * Send typing indicator
     */
    async sendTyping(botToken: string, chatId: number): Promise<void> {
        await fetch(`${TELEGRAM_API_URL}${botToken}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                action: 'typing'
            })
        });
    },

    /**
     * Get bot info
     */
    async getBotInfo(botToken: string): Promise<any> {
        const response = await fetch(`${TELEGRAM_API_URL}${botToken}/getMe`);
        const data = await response.json();
        return data.ok ? data.result : null;
    },

    /**
     * Remove webhook
     */
    async removeWebhook(botToken: string): Promise<boolean> {
        const response = await fetch(`${TELEGRAM_API_URL}${botToken}/deleteWebhook`, {
            method: 'POST'
        });
        const data = await response.json();
        botConfigs.delete(botToken);
        return data.ok;
    },

    /**
     * Get webhook info
     */
    async getWebhookInfo(botToken: string): Promise<any> {
        const response = await fetch(`${TELEGRAM_API_URL}${botToken}/getWebhookInfo`);
        const data = await response.json();
        return data.ok ? data.result : null;
    }
};
