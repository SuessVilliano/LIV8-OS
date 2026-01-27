import crypto from 'crypto';
import { sql } from '@vercel/postgres';

/**
 * User Settings Vault
 * Securely stores and retrieves user API keys and configuration
 * All sensitive data is encrypted with AES-256-GCM
 */

const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.scryptSync(process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'fallback-key-change-in-prod', 'salt', 32);

/**
 * Supported AI Providers
 */
export type AIProvider = 'gemini' | 'openai' | 'anthropic';

/**
 * User Settings Structure
 */
export interface UserSettings {
    // AI Provider Configuration
    aiProvider: AIProvider;
    geminiApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;

    // Webhook Configuration
    webhookSecret?: string;
    webhookUrls?: {
        socialContent?: string;
        notifications?: string;
        custom?: string[];
    };

    // Social Media Defaults
    defaultPlatforms?: string[];
    defaultHashtags?: string[];
    contentPreferences?: {
        includeEmojis: boolean;
        includeHashtags: boolean;
        defaultContentType: string;
    };

    // Notification Preferences
    notifications?: {
        email: boolean;
        slack?: string;
        webhookOnPost: boolean;
    };
}

/**
 * Encrypt sensitive data
 */
function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Encrypt sensitive fields in settings
 */
function encryptSettings(settings: UserSettings): any {
    const encrypted: any = { ...settings };

    // Encrypt API keys
    if (settings.geminiApiKey) {
        encrypted.geminiApiKey = encrypt(settings.geminiApiKey);
    }
    if (settings.openaiApiKey) {
        encrypted.openaiApiKey = encrypt(settings.openaiApiKey);
    }
    if (settings.anthropicApiKey) {
        encrypted.anthropicApiKey = encrypt(settings.anthropicApiKey);
    }
    if (settings.webhookSecret) {
        encrypted.webhookSecret = encrypt(settings.webhookSecret);
    }

    return encrypted;
}

/**
 * Decrypt sensitive fields in settings
 */
function decryptSettings(encrypted: any): UserSettings {
    const settings: UserSettings = { ...encrypted };

    try {
        if (encrypted.geminiApiKey) {
            settings.geminiApiKey = decrypt(encrypted.geminiApiKey);
        }
        if (encrypted.openaiApiKey) {
            settings.openaiApiKey = decrypt(encrypted.openaiApiKey);
        }
        if (encrypted.anthropicApiKey) {
            settings.anthropicApiKey = decrypt(encrypted.anthropicApiKey);
        }
        if (encrypted.webhookSecret) {
            settings.webhookSecret = decrypt(encrypted.webhookSecret);
        }
    } catch (error) {
        console.error('[Vault] Decryption failed:', error);
    }

    return settings;
}

/**
 * Mask API key for display (show last 4 chars only)
 */
export function maskApiKey(key: string | undefined): string | undefined {
    if (!key) return undefined;
    if (key.length <= 8) return '****';
    return `${'*'.repeat(key.length - 4)}${key.slice(-4)}`;
}

/**
 * User Settings Vault Service
 */
export const userSettingsVault = {
    /**
     * Save user settings (creates or updates)
     */
    async saveSettings(locationId: string, settings: Partial<UserSettings>): Promise<void> {
        // Get existing settings first
        const existing = await this.getSettings(locationId);
        const merged = { ...existing, ...settings };
        const encrypted = encryptSettings(merged as UserSettings);

        await sql`
            INSERT INTO user_settings (location_id, settings_data, updated_at)
            VALUES (${locationId}, ${JSON.stringify(encrypted)}, NOW())
            ON CONFLICT (location_id)
            DO UPDATE SET
                settings_data = ${JSON.stringify(encrypted)},
                updated_at = NOW()
        `;

        console.log(`[Vault] Settings saved for location ${locationId}`);
    },

    /**
     * Get user settings (decrypted)
     */
    async getSettings(locationId: string): Promise<UserSettings> {
        const result = await sql`
            SELECT settings_data FROM user_settings
            WHERE location_id = ${locationId}
        `;

        if (result.rows.length === 0) {
            // Return defaults
            return {
                aiProvider: 'gemini',
                contentPreferences: {
                    includeEmojis: true,
                    includeHashtags: true,
                    defaultContentType: 'promotional'
                }
            };
        }

        const encrypted = result.rows[0].settings_data;
        return decryptSettings(encrypted);
    },

    /**
     * Get settings with masked API keys (safe for frontend)
     */
    async getSettingsMasked(locationId: string): Promise<any> {
        const settings = await this.getSettings(locationId);

        return {
            ...settings,
            geminiApiKey: maskApiKey(settings.geminiApiKey),
            openaiApiKey: maskApiKey(settings.openaiApiKey),
            anthropicApiKey: maskApiKey(settings.anthropicApiKey),
            webhookSecret: maskApiKey(settings.webhookSecret),
            // Include flags for which keys are set
            hasGeminiKey: !!settings.geminiApiKey,
            hasOpenaiKey: !!settings.openaiApiKey,
            hasAnthropicKey: !!settings.anthropicApiKey,
            hasWebhookSecret: !!settings.webhookSecret
        };
    },

    /**
     * Get the active AI API key based on provider setting
     */
    async getActiveAIKey(locationId: string): Promise<{ provider: AIProvider; apiKey: string } | null> {
        const settings = await this.getSettings(locationId);

        switch (settings.aiProvider) {
            case 'gemini':
                if (settings.geminiApiKey) {
                    return { provider: 'gemini', apiKey: settings.geminiApiKey };
                }
                break;
            case 'openai':
                if (settings.openaiApiKey) {
                    return { provider: 'openai', apiKey: settings.openaiApiKey };
                }
                break;
            case 'anthropic':
                if (settings.anthropicApiKey) {
                    return { provider: 'anthropic', apiKey: settings.anthropicApiKey };
                }
                break;
        }

        // Fallback: try any available key
        if (settings.geminiApiKey) return { provider: 'gemini', apiKey: settings.geminiApiKey };
        if (settings.openaiApiKey) return { provider: 'openai', apiKey: settings.openaiApiKey };
        if (settings.anthropicApiKey) return { provider: 'anthropic', apiKey: settings.anthropicApiKey };

        return null;
    },

    /**
     * Delete a specific API key
     */
    async deleteApiKey(locationId: string, keyType: 'gemini' | 'openai' | 'anthropic'): Promise<void> {
        const settings = await this.getSettings(locationId);

        switch (keyType) {
            case 'gemini':
                delete settings.geminiApiKey;
                break;
            case 'openai':
                delete settings.openaiApiKey;
                break;
            case 'anthropic':
                delete settings.anthropicApiKey;
                break;
        }

        await this.saveSettings(locationId, settings);
    },

    /**
     * Validate an API key by making a test request
     */
    async validateApiKey(provider: AIProvider, apiKey: string): Promise<{ valid: boolean; error?: string }> {
        try {
            switch (provider) {
                case 'gemini': {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    await model.generateContent('Hello');
                    return { valid: true };
                }
                case 'openai': {
                    const response = await fetch('https://api.openai.com/v1/models', {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    if (response.ok) return { valid: true };
                    return { valid: false, error: 'Invalid OpenAI API key' };
                }
                case 'anthropic': {
                    const response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01',
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'claude-3-haiku-20240307',
                            max_tokens: 10,
                            messages: [{ role: 'user', content: 'Hi' }]
                        })
                    });
                    if (response.ok || response.status === 400) return { valid: true }; // 400 means key is valid but request was bad
                    return { valid: false, error: 'Invalid Anthropic API key' };
                }
            }
        } catch (error: any) {
            return { valid: false, error: error.message };
        }

        return { valid: false, error: 'Unknown provider' };
    },

    /**
     * Generate a new webhook secret
     */
    generateWebhookSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }
};

export default userSettingsVault;
