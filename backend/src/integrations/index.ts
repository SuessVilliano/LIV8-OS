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

// Re-export for convenience
import { vapiService } from './vapi.js';
import { telegramService } from './telegram.js';
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

    // ============ STATUS ============

    /**
     * Get integration status
     */
    async getStatus(): Promise<{
        voice: { provider: string; status: string };
        messaging: { telegram: string; discord: string; whatsapp: string; slack: string };
        crm: { provider: string; status: string };
    }> {
        // In production, check actual connection status
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
                provider: 'ghl',
                status: process.env.GHL_TEST_TOKEN ? 'configured' : 'not_configured'
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
