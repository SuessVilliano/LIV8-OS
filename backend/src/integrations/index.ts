/**
 * Integrations Module
 *
 * Unified integration layer for LIV8 OS.
 * Supports multiple voice, messaging, and CRM providers.
 */

// Types
export * from './types.js';

// Voice
export { vapiService } from './vapi.js';

// Messaging
export { telegramService } from './telegram.js';

// CRM
export { ghlService } from './ghl.js';
export { vboutService } from './vbout.js';

// Re-export for convenience
import { vapiService } from './vapi.js';
import { telegramService } from './telegram.js';
import { ghlService } from './ghl.js';
import { vboutService } from './vbout.js';
import {
    VoiceProvider,
    MessagingProvider,
    CRMProvider,
    IntegrationCapabilities,
    SUBSCRIPTION_TIERS
} from './types.js';

/**
 * Integration Manager
 *
 * Provides a unified interface for managing all integrations
 */
export class IntegrationManager {
    private locationId: string;

    constructor(locationId: string) {
        this.locationId = locationId;
    }

    // ============ VOICE ============

    /**
     * Create a voice agent (VAPI)
     */
    async createVoiceAgent(params: {
        agentRole: string;
        voiceId?: string;
    }) {
        return vapiService.createAssistant({
            locationId: this.locationId,
            agentRole: params.agentRole,
            voiceId: params.voiceId
        });
    }

    /**
     * Make an outbound call
     */
    async makeCall(params: {
        assistantId: string;
        phoneNumber: string;
        metadata?: Record<string, any>;
    }) {
        return vapiService.makeCall(params);
    }

    /**
     * Get call details
     */
    async getCall(callId: string) {
        return vapiService.getCall(callId);
    }

    // ============ MESSAGING ============

    /**
     * Connect Telegram bot
     */
    async connectTelegram(params: {
        botToken: string;
        webhookUrl: string;
        defaultAgentRole?: string;
    }) {
        return telegramService.registerBot({
            provider: 'telegram',
            botToken: params.botToken,
            webhookUrl: params.webhookUrl,
            locationId: this.locationId,
            defaultAgentRole: params.defaultAgentRole || 'assistant'
        });
    }

    /**
     * Disconnect Telegram bot
     */
    async disconnectTelegram(botToken: string) {
        return telegramService.removeWebhook(botToken);
    }

    /**
     * Get Telegram bot info
     */
    async getTelegramBotInfo(botToken: string) {
        return telegramService.getBotInfo(botToken);
    }

    // ============ CRM ============

    /**
     * Connect to GHL CRM
     */
    async connectGHL(params: {
        apiKey: string;
        refreshToken?: string;
    }) {
        return ghlService.connect({
            provider: 'ghl',
            apiKey: params.apiKey,
            locationId: this.locationId,
            refreshToken: params.refreshToken
        });
    }

    /**
     * Connect to Vbout CRM (whitelabel option)
     */
    async connectVbout(params: {
        apiKey: string;
        accountId: string;
        domain?: string;
    }) {
        return vboutService.connect({
            provider: 'vbout',
            apiKey: params.apiKey,
            accountId: params.accountId,
            domain: params.domain
        });
    }

    /**
     * Get CRM contacts (auto-selects connected CRM)
     */
    async getContacts(filters?: any) {
        const ghlConnected = await ghlService.isConnected();
        if (ghlConnected) {
            return ghlService.getContacts(filters);
        }

        const vboutConnected = await vboutService.isConnected();
        if (vboutConnected) {
            return vboutService.getContacts(filters);
        }

        return [];
    }

    /**
     * Create CRM contact (auto-selects connected CRM)
     */
    async createContact(contact: any) {
        const ghlConnected = await ghlService.isConnected();
        if (ghlConnected) {
            return ghlService.createContact(contact);
        }

        const vboutConnected = await vboutService.isConnected();
        if (vboutConnected) {
            return vboutService.createContact(contact);
        }

        throw new Error('No CRM connected');
    }

    /**
     * Get pipelines (auto-selects connected CRM)
     */
    async getPipelines() {
        const ghlConnected = await ghlService.isConnected();
        if (ghlConnected) {
            return ghlService.getPipelines();
        }

        const vboutConnected = await vboutService.isConnected();
        if (vboutConnected) {
            return vboutService.getPipelines();
        }

        return [];
    }

    /**
     * Get deals (auto-selects connected CRM)
     */
    async getDeals(pipelineId?: string) {
        const ghlConnected = await ghlService.isConnected();
        if (ghlConnected) {
            return ghlService.getDeals(pipelineId);
        }

        const vboutConnected = await vboutService.isConnected();
        if (vboutConnected) {
            return vboutService.getDeals(pipelineId);
        }

        return [];
    }

    // ============ STATUS ============

    /**
     * Get integration status
     */
    async getStatus(): Promise<{
        voice: { provider: string; status: string };
        messaging: { telegram: string; discord: string; whatsapp: string; slack: string };
        crm: { provider: string; status: string; connected: boolean };
    }> {
        const ghlConnected = await ghlService.isConnected();
        const vboutConnected = await vboutService.isConnected();

        return {
            voice: {
                provider: 'vapi',
                status: process.env.VAPI_API_KEY ? 'configured' : 'not_configured'
            },
            messaging: {
                telegram: 'ready',
                discord: 'not_configured',
                whatsapp: 'not_configured',
                slack: 'not_configured'
            },
            crm: {
                provider: ghlConnected ? 'ghl' : (vboutConnected ? 'vbout' : 'none'),
                status: ghlConnected || vboutConnected ? 'connected' : 'not_configured',
                connected: ghlConnected || vboutConnected
            }
        };
    }

    /**
     * Get capabilities based on subscription tier
     */
    getCapabilities(tier: keyof typeof SUBSCRIPTION_TIERS): IntegrationCapabilities {
        const features = SUBSCRIPTION_TIERS[tier].features;

        return {
            voice: {
                enabled: features.voiceEnabled,
                provider: features.voiceProvider,
                canMakeOutbound: features.voiceEnabled,
                canReceiveInbound: features.voiceEnabled,
                hasTranscription: features.voiceEnabled
            },
            messaging: {
                sms: features.monthlySMS > 0,
                email: true,
                telegram: features.messagingChannels.includes('telegram'),
                discord: features.messagingChannels.includes('discord'),
                whatsapp: features.messagingChannels.includes('whatsapp'),
                slack: features.messagingChannels.includes('slack')
            },
            crm: {
                enabled: true,
                provider: features.crmType,
                canSyncContacts: true,
                canManagePipelines: true,
                canTriggerWorkflows: features.crmType === 'ghl'
            }
        };
    }
}

/**
 * Create integration manager for a location
 */
export function createIntegrationManager(locationId: string): IntegrationManager {
    return new IntegrationManager(locationId);
}
