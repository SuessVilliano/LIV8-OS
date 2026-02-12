/**
 * Late Social Media API Service
 * Unified social media posting across 13 platforms
 * https://getlate.dev/
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

const LATE_API_BASE = 'https://getlate.dev/api/v1';

interface LateConfig {
    apiKey: string;
    profileId?: string;
}

interface LatePost {
    content: string;
    platforms: Array<{ platform: string; accountId: string }>;
    mediaItems?: Array<{ type: string; url: string }>;
    scheduledFor?: string;
    isDraft?: boolean;
}

interface LateAccount {
    id: string;
    platform: string;
    username: string;
    profileId: string;
    connected: boolean;
}

interface LateWebhookPayload {
    event: 'post.scheduled' | 'post.published' | 'post.failed' | 'post.partial' | 'account.disconnected'
        | 'inbox.message.received' | 'inbox.button.clicked' | 'inbox.quickreply.clicked' | 'inbox.postback';
    postId?: string;
    accountId?: string;
    conversationId?: string;
    messageId?: string;
    timestamp: string;
    data: any;
}

// Interactive message types for the Inbox API
interface QuickReply {
    title: string;        // Display text (max ~20 chars recommended)
    payload?: string;     // Developer-defined payload sent on tap
    imageUrl?: string;    // Optional icon (IG/FB only)
}

interface MessageButton {
    title: string;        // Display text
    type: 'url' | 'postback';
    url?: string;         // Required for type 'url'
    payload?: string;     // Required for type 'postback'
}

interface GenericTemplateElement {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    buttons?: MessageButton[];
    defaultAction?: { type: 'url'; url: string };
}

interface TelegramReplyMarkup {
    inlineKeyboard?: Array<Array<{ text: string; url?: string; callbackData?: string }>>;
    keyboard?: Array<Array<{ text: string; requestContact?: boolean; requestLocation?: boolean }>>;
    removeKeyboard?: boolean;
    oneTimeKeyboard?: boolean;
    resizeKeyboard?: boolean;
}

interface TelegramBotCommand {
    command: string;      // e.g. "start", "help"
    description: string;  // e.g. "Show welcome message"
}

interface InteractiveMessageOptions {
    text?: string;
    quickReplies?: QuickReply[];
    buttons?: MessageButton[];
    genericTemplates?: GenericTemplateElement[];
    replyMarkup?: TelegramReplyMarkup;
    fileUrl?: string;
    fileType?: 'image' | 'video' | 'audio' | 'file';
    fileName?: string;
}

interface LateProfile {
    id: string;
    name: string;
    description?: string;
    color?: string;
    isDefault?: boolean;
}

class LateService {
    private client: AxiosInstance;
    private apiKey: string;
    private webhookSecret?: string;

    constructor(config: LateConfig) {
        this.apiKey = config.apiKey;
        this.client = axios.create({
            baseURL: LATE_API_BASE,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            error => {
                const message = error.response?.data?.message || error.message;
                console.error('[Late API Error]', message);
                throw new Error(`Late API: ${message}`);
            }
        );
    }

    // ============ ACCOUNTS ============

    async listAccounts(): Promise<LateAccount[]> {
        const response = await this.client.get('/accounts');
        return response.data.accounts || [];
    }

    async getAccountsByPlatform(platform: string): Promise<LateAccount[]> {
        const response = await this.client.get(`/accounts/${platform}`);
        return response.data.accounts || [];
    }

    getConnectUrl(platform: string, profileId: string, headless = false): string {
        const params = new URLSearchParams({ profileId });
        if (headless) params.append('headless', 'true');
        return `${LATE_API_BASE}/connect/${platform}?${params.toString()}`;
    }

    // ============ PROFILES ============

    async listProfiles(): Promise<LateProfile[]> {
        const response = await this.client.get('/profiles');
        return response.data.profiles || [];
    }

    async createProfile(name: string, description?: string, color?: string): Promise<LateProfile> {
        const response = await this.client.post('/profiles', { name, description, color });
        return response.data;
    }

    async updateProfile(profileId: string, updates: { name?: string; description?: string; color?: string; isDefault?: boolean }): Promise<LateProfile> {
        const response = await this.client.put(`/profiles/${profileId}`, updates);
        return response.data;
    }

    async deleteProfile(profileId: string): Promise<void> {
        await this.client.delete(`/profiles/${profileId}`);
    }

    // ============ POSTS ============

    async createPost(post: LatePost): Promise<any> {
        const response = await this.client.post('/posts', post);
        return response.data;
    }

    async publishNow(content: string, platforms: string[], mediaUrls?: string[]): Promise<any> {
        const accounts = await this.listAccounts();
        const platformAccounts = platforms.map(platform => {
            const account = accounts.find(a => a.platform === platform);
            if (!account) throw new Error(`No account connected for ${platform}`);
            return { platform, accountId: account.id };
        });

        return this.createPost({
            content,
            platforms: platformAccounts,
            mediaItems: mediaUrls?.map(url => ({ type: this.getMediaType(url), url }))
        });
    }

    async crossPost(content: string, platforms: string[], options: {
        mediaUrls?: string[];
        scheduledFor?: string;
        isDraft?: boolean;
    } = {}): Promise<any> {
        const accounts = await this.listAccounts();
        const platformAccounts = platforms.map(platform => {
            const account = accounts.find(a => a.platform === platform);
            if (!account) throw new Error(`No account connected for ${platform}`);
            return { platform, accountId: account.id };
        });

        return this.createPost({
            content,
            platforms: platformAccounts,
            mediaItems: options.mediaUrls?.map(url => ({ type: this.getMediaType(url), url })),
            scheduledFor: options.scheduledFor,
            isDraft: options.isDraft
        });
    }

    async schedulePost(content: string, platforms: string[], scheduledFor: string, mediaUrls?: string[]): Promise<any> {
        return this.crossPost(content, platforms, { scheduledFor, mediaUrls });
    }

    async listPosts(status?: string, limit = 20): Promise<any[]> {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('limit', limit.toString());

        const response = await this.client.get(`/posts?${params.toString()}`);
        return response.data.posts || [];
    }

    async getPost(postId: string): Promise<any> {
        const response = await this.client.get(`/posts/${postId}`);
        return response.data;
    }

    async updatePost(postId: string, updates: { content?: string; scheduledFor?: string; title?: string }): Promise<any> {
        const response = await this.client.put(`/posts/${postId}`, updates);
        return response.data;
    }

    async deletePost(postId: string): Promise<void> {
        await this.client.delete(`/posts/${postId}`);
    }

    async retryPost(postId: string): Promise<any> {
        const response = await this.client.post(`/posts/${postId}/retry`);
        return response.data;
    }

    async listFailedPosts(limit = 10): Promise<any[]> {
        return this.listPosts('failed', limit);
    }

    async retryAllFailed(): Promise<{ total: number; succeeded: number; failed: number }> {
        const failed = await this.listFailedPosts(100);
        const results = await Promise.allSettled(
            failed.map(post => this.retryPost(post.id))
        );
        return {
            total: failed.length,
            succeeded: results.filter(r => r.status === 'fulfilled').length,
            failed: results.filter(r => r.status === 'rejected').length
        };
    }

    // ============ MEDIA ============

    async generateUploadLink(): Promise<{ uploadUrl: string; token: string }> {
        const response = await this.client.post('/media/upload');
        return response.data;
    }

    async checkUploadStatus(token: string): Promise<{ status: string; urls?: string[] }> {
        const response = await this.client.get(`/media/${token}/status`);
        return response.data;
    }

    private getMediaType(url: string): string {
        const ext = url.split('.').pop()?.toLowerCase() || '';
        if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return 'video';
        if (['pdf'].includes(ext)) return 'document';
        return 'image';
    }

    // ============ WEBHOOKS ============

    async createWebhook(url: string, events: string[], secret?: string): Promise<any> {
        const response = await this.client.post('/webhooks', { url, events, secret });
        this.webhookSecret = secret;
        return response.data;
    }

    async listWebhooks(): Promise<any[]> {
        const response = await this.client.get('/webhooks');
        return response.data.webhooks || [];
    }

    async deleteWebhook(webhookId: string): Promise<void> {
        await this.client.delete(`/webhooks/${webhookId}`);
    }

    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        try {
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch {
            return false;
        }
    }

    // ============ INBOX / INTERACTIVE MESSAGES ============

    /**
     * Send an interactive message in a conversation
     * Supports quick replies, buttons, generic templates, reply markup, and file attachments
     */
    async sendInteractiveMessage(conversationId: string, options: InteractiveMessageOptions): Promise<any> {
        const body: any = {};

        if (options.text) body.text = options.text;

        // Quick Replies — up to 13 on IG/FB, inline keyboard on Telegram
        if (options.quickReplies && options.quickReplies.length > 0) {
            body.quickReplies = options.quickReplies.map(qr => ({
                title: qr.title,
                payload: qr.payload || qr.title,
                ...(qr.imageUrl ? { imageUrl: qr.imageUrl } : {})
            }));
        }

        // Buttons — up to 3 on IG/FB, inline keyboard on Telegram
        if (options.buttons && options.buttons.length > 0) {
            body.buttons = options.buttons.map(btn => ({
                title: btn.title,
                type: btn.type,
                ...(btn.url ? { url: btn.url } : {}),
                ...(btn.payload ? { payload: btn.payload } : {})
            }));
        }

        // Generic Templates (carousel on IG/FB, photo + keyboard on Telegram)
        if (options.genericTemplates && options.genericTemplates.length > 0) {
            body.genericTemplates = options.genericTemplates.map(el => ({
                title: el.title,
                ...(el.subtitle ? { subtitle: el.subtitle } : {}),
                ...(el.imageUrl ? { imageUrl: el.imageUrl } : {}),
                ...(el.buttons ? { buttons: el.buttons } : {}),
                ...(el.defaultAction ? { defaultAction: el.defaultAction } : {})
            }));
        }

        // Telegram Reply Markup
        if (options.replyMarkup) {
            body.replyMarkup = options.replyMarkup;
        }

        // File Attachment (Instagram file attachments)
        if (options.fileUrl) {
            body.attachment = {
                type: options.fileType || 'file',
                url: options.fileUrl,
                ...(options.fileName ? { fileName: options.fileName } : {})
            };
        }

        const response = await this.client.post(`/inbox/conversations/${conversationId}/messages`, body);
        return response.data;
    }

    /**
     * Send a plain text message in a conversation
     */
    async sendInboxMessage(conversationId: string, text: string): Promise<any> {
        return this.sendInteractiveMessage(conversationId, { text });
    }

    /**
     * Send quick replies in a conversation
     */
    async sendQuickReplies(conversationId: string, text: string, quickReplies: QuickReply[]): Promise<any> {
        return this.sendInteractiveMessage(conversationId, { text, quickReplies });
    }

    /**
     * Send buttons in a conversation
     */
    async sendButtons(conversationId: string, text: string, buttons: MessageButton[]): Promise<any> {
        return this.sendInteractiveMessage(conversationId, { text, buttons });
    }

    /**
     * Send a carousel / generic template in a conversation
     */
    async sendCarousel(conversationId: string, elements: GenericTemplateElement[]): Promise<any> {
        return this.sendInteractiveMessage(conversationId, { genericTemplates: elements });
    }

    /**
     * Send a file attachment (Instagram)
     */
    async sendFileAttachment(conversationId: string, fileUrl: string, fileType: 'image' | 'video' | 'audio' | 'file' = 'file', fileName?: string): Promise<any> {
        return this.sendInteractiveMessage(conversationId, { fileUrl, fileType, fileName });
    }

    /**
     * Edit a Telegram message
     */
    async editTelegramMessage(conversationId: string, messageId: string, text: string, replyMarkup?: TelegramReplyMarkup): Promise<any> {
        const body: any = { text };
        if (replyMarkup) body.replyMarkup = replyMarkup;
        const response = await this.client.patch(`/inbox/conversations/${conversationId}/messages/${messageId}`, body);
        return response.data;
    }

    // ============ TELEGRAM BOT COMMANDS ============

    /**
     * Get Telegram bot commands for an account
     */
    async getTelegramCommands(accountId: string): Promise<TelegramBotCommand[]> {
        const response = await this.client.get(`/accounts/${accountId}/telegram-commands`);
        return response.data.commands || [];
    }

    /**
     * Set Telegram bot commands for an account
     */
    async setTelegramCommands(accountId: string, commands: TelegramBotCommand[]): Promise<any> {
        const response = await this.client.put(`/accounts/${accountId}/telegram-commands`, { commands });
        return response.data;
    }

    /**
     * Delete all Telegram bot commands for an account
     */
    async deleteTelegramCommands(accountId: string): Promise<void> {
        await this.client.delete(`/accounts/${accountId}/telegram-commands`);
    }

    // ============ INBOX CONVERSATIONS ============

    /**
     * List inbox conversations
     */
    async listInboxConversations(params?: { accountId?: string; status?: string; limit?: number }): Promise<any[]> {
        const searchParams = new URLSearchParams();
        if (params?.accountId) searchParams.append('accountId', params.accountId);
        if (params?.status) searchParams.append('status', params.status);
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        const response = await this.client.get(`/inbox/conversations?${searchParams.toString()}`);
        return response.data.conversations || [];
    }

    /**
     * Get messages in a conversation
     */
    async getInboxMessages(conversationId: string, limit = 50): Promise<any[]> {
        const response = await this.client.get(`/inbox/conversations/${conversationId}/messages?limit=${limit}`);
        return response.data.messages || [];
    }

    // ============ ANALYTICS ============

    async getPostAnalytics(postId: string): Promise<any> {
        const response = await this.client.get(`/posts/${postId}/analytics`);
        return response.data;
    }

    // ============ VALIDATION ============

    async validateApiKey(): Promise<boolean> {
        try {
            await this.listProfiles();
            return true;
        } catch {
            return false;
        }
    }

    // ============ SUPPORTED PLATFORMS ============

    static PLATFORMS = [
        'twitter', 'instagram', 'facebook', 'linkedin', 'tiktok',
        'youtube', 'pinterest', 'reddit', 'bluesky', 'threads',
        'googlebusiness', 'telegram', 'snapchat'
    ] as const;

    static PLATFORM_INFO = {
        twitter: { name: 'Twitter/X', charLimit: 25000, icon: 'twitter' },
        instagram: { name: 'Instagram', charLimit: 2200, icon: 'instagram' },
        facebook: { name: 'Facebook', charLimit: 63206, icon: 'facebook' },
        linkedin: { name: 'LinkedIn', charLimit: 3000, icon: 'linkedin' },
        tiktok: { name: 'TikTok', charLimit: 2200, icon: 'tiktok' },
        youtube: { name: 'YouTube', charLimit: 5000, icon: 'youtube' },
        pinterest: { name: 'Pinterest', charLimit: 500, icon: 'pinterest' },
        reddit: { name: 'Reddit', charLimit: 40000, icon: 'reddit' },
        bluesky: { name: 'Bluesky', charLimit: 300, icon: 'bluesky' },
        threads: { name: 'Threads', charLimit: 500, icon: 'threads' },
        googlebusiness: { name: 'Google Business', charLimit: 1500, icon: 'google' },
        telegram: { name: 'Telegram', charLimit: 4096, icon: 'telegram' },
        snapchat: { name: 'Snapchat', charLimit: 250, icon: 'snapchat' }
    };
}

// Factory function
export function createLateService(apiKey: string): LateService {
    return new LateService({ apiKey });
}

// Singleton for server-side use
let defaultInstance: LateService | null = null;

export function getLateService(apiKey?: string): LateService {
    if (apiKey) {
        return createLateService(apiKey);
    }
    if (!defaultInstance) {
        const key = process.env.LATE_API_KEY;
        if (!key) throw new Error('LATE_API_KEY not configured');
        defaultInstance = createLateService(key);
    }
    return defaultInstance;
}

export { LateService };
export type {
    LateConfig, LatePost, LateAccount, LateWebhookPayload, LateProfile,
    QuickReply, MessageButton, GenericTemplateElement, TelegramReplyMarkup,
    TelegramBotCommand, InteractiveMessageOptions
};
