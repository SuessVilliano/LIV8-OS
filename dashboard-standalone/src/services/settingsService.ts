import { apiCall } from './api';

/**
 * AI Provider types
 */
export type AIProvider = 'gemini' | 'openai' | 'anthropic';

/**
 * User Settings Interface
 */
export interface UserSettings {
    aiProvider: AIProvider;
    geminiApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    webhookSecret?: string;
    hasGeminiKey: boolean;
    hasOpenaiKey: boolean;
    hasAnthropicKey: boolean;
    hasWebhookSecret: boolean;
    defaultPlatforms?: string[];
    defaultHashtags?: string[];
    contentPreferences?: {
        includeEmojis: boolean;
        includeHashtags: boolean;
        defaultContentType: string;
    };
}

/**
 * Webhook Info Response
 */
export interface WebhookInfo {
    webhookEndpoints: {
        generateContent: {
            url: string;
            method: string;
            description: string;
            exampleBody: any;
        };
        scheduleWeek: {
            url: string;
            method: string;
            description: string;
            exampleBody: any;
        };
        contactContent: {
            url: string;
            method: string;
            description: string;
            exampleBody: any;
        };
    };
    headers: {
        'Content-Type': string;
        'x-api-key': string;
    };
    hasWebhookSecret: boolean;
}

/**
 * Settings Service - Manages user API keys and configuration
 */
export const settingsService = {
    /**
     * Get current location ID from storage
     */
    getLocationId(): string | null {
        return localStorage.getItem('os_loc_id');
    },

    /**
     * Get user settings (with masked API keys)
     */
    async getSettings(locationId?: string): Promise<UserSettings> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        const result = await apiCall(`/api/settings/${locId}`);
        return result.settings;
    },

    /**
     * Update user settings
     */
    async updateSettings(updates: Partial<UserSettings>, locationId?: string): Promise<UserSettings> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        const result = await apiCall(`/api/settings/${locId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return result.settings;
    },

    /**
     * Add or update an API key
     */
    async saveApiKey(provider: AIProvider, apiKey: string, validate: boolean = true, locationId?: string): Promise<{ success: boolean; provider: string }> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        return apiCall(`/api/settings/${locId}/api-key`, {
            method: 'POST',
            body: JSON.stringify({ provider, apiKey, validate })
        });
    },

    /**
     * Delete an API key
     */
    async deleteApiKey(provider: AIProvider, locationId?: string): Promise<{ success: boolean }> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        return apiCall(`/api/settings/${locId}/api-key/${provider}`, {
            method: 'DELETE'
        });
    },

    /**
     * Validate an API key without saving
     */
    async validateApiKey(provider: AIProvider, apiKey: string, locationId?: string): Promise<{ valid: boolean; error?: string }> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        return apiCall(`/api/settings/${locId}/validate-key`, {
            method: 'POST',
            body: JSON.stringify({ provider, apiKey })
        });
    },

    /**
     * Set the active AI provider
     */
    async setAIProvider(provider: AIProvider, locationId?: string): Promise<{ success: boolean }> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        return apiCall(`/api/settings/${locId}/ai-provider`, {
            method: 'PUT',
            body: JSON.stringify({ provider })
        });
    },

    /**
     * Generate a new webhook secret
     */
    async generateWebhookSecret(locationId?: string): Promise<{ success: boolean; webhookSecret: string }> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        return apiCall(`/api/settings/${locId}/webhook-secret`, {
            method: 'POST'
        });
    },

    /**
     * Get webhook configuration info
     */
    async getWebhookInfo(locationId?: string): Promise<WebhookInfo> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        const result = await apiCall(`/api/settings/${locId}/webhook-info`);
        return result;
    },

    /**
     * Update content preferences
     */
    async updateContentPreferences(preferences: {
        defaultPlatforms?: string[];
        defaultHashtags?: string[];
        contentPreferences?: {
            includeEmojis: boolean;
            includeHashtags: boolean;
            defaultContentType: string;
        };
    }, locationId?: string): Promise<{ success: boolean }> {
        const locId = locationId || this.getLocationId();
        if (!locId) throw new Error('No location ID configured');

        return apiCall(`/api/settings/${locId}/content-preferences`, {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
    }
};

export default settingsService;
