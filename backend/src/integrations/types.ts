/**
 * Integration Types
 *
 * Abstraction layer for different voice, messaging, and CRM providers.
 * This allows LIV8 OS to work with:
 * - GHL (native integration)
 * - LIV8 CRM (Vbout whitelabel)
 * - VAPI (voice for both)
 * - Telegram, Discord, WhatsApp, Slack
 */

// ============ VOICE PROVIDERS ============

export type VoiceProvider = 'vapi' | 'ghl_native' | 'twilio';

export interface VoiceConfig {
    provider: VoiceProvider;
    apiKey?: string;
    assistantId?: string; // VAPI assistant ID
    phoneNumber?: string;
    webhookUrl?: string;
}

export interface VoiceCall {
    id: string;
    provider: VoiceProvider;
    direction: 'inbound' | 'outbound';
    from: string;
    to: string;
    status: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer';
    duration?: number;
    recordingUrl?: string;
    transcript?: string;
    agentRole?: string; // Which AI staff handled
    metadata?: Record<string, any>;
    startedAt: Date;
    endedAt?: Date;
}

export interface VoiceWebhookPayload {
    type: 'call_started' | 'call_ended' | 'transcript_update' | 'user_spoke' | 'assistant_spoke';
    callId: string;
    data: Record<string, any>;
}

// ============ MESSAGING PROVIDERS ============

export type MessagingProvider = 'ghl' | 'vbout' | 'twilio' | 'telegram' | 'discord' | 'whatsapp' | 'slack';

export interface MessagingConfig {
    provider: MessagingProvider;
    apiKey?: string;
    botToken?: string; // For Telegram/Discord
    phoneNumber?: string; // For SMS providers
    webhookUrl?: string;
    channelId?: string; // For Slack
}

export interface Message {
    id: string;
    provider: MessagingProvider;
    direction: 'inbound' | 'outbound';
    from: string;
    to: string;
    content: string;
    contentType: 'text' | 'image' | 'audio' | 'video' | 'file';
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    agentRole?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}

// ============ CRM PROVIDERS ============

export type CRMProvider = 'ghl' | 'vbout';

export interface CRMConfig {
    provider: CRMProvider;
    apiKey?: string;
    accessToken?: string;
    locationId?: string;
    refreshToken?: string;
}

export interface Contact {
    id: string;
    provider: CRMProvider;
    externalId?: string; // ID in the CRM
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    source?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Pipeline {
    id: string;
    provider: CRMProvider;
    name: string;
    stages: PipelineStage[];
}

export interface PipelineStage {
    id: string;
    name: string;
    order: number;
}

export interface Opportunity {
    id: string;
    provider: CRMProvider;
    contactId: string;
    pipelineId: string;
    stageId: string;
    name: string;
    value?: number;
    status: 'open' | 'won' | 'lost' | 'abandoned';
    createdAt: Date;
    updatedAt: Date;
}

// ============ INTEGRATION CAPABILITIES ============

export interface IntegrationCapabilities {
    voice: {
        enabled: boolean;
        provider?: VoiceProvider;
        canMakeOutbound: boolean;
        canReceiveInbound: boolean;
        hasTranscription: boolean;
    };
    messaging: {
        sms: boolean;
        email: boolean;
        telegram: boolean;
        discord: boolean;
        whatsapp: boolean;
        slack: boolean;
    };
    crm: {
        enabled: boolean;
        provider?: CRMProvider;
        canSyncContacts: boolean;
        canManagePipelines: boolean;
        canTriggerWorkflows: boolean;
    };
}

// ============ USER SUBSCRIPTION TIERS ============

export type SubscriptionTier = 'starter' | 'growth' | 'scale' | 'enterprise';

export interface SubscriptionFeatures {
    tier: SubscriptionTier;
    features: {
        // AI Staff
        maxAgents: number;
        agentTypes: string[];

        // Voice
        voiceEnabled: boolean;
        monthlyVoiceMinutes: number;
        voiceProvider: VoiceProvider;

        // Messaging
        messagingChannels: MessagingProvider[];
        monthlySMS: number;

        // CRM
        crmType: CRMProvider;
        maxContacts: number;

        // Content
        monthlyContentPieces: number;
        contentTypes: string[];

        // Knowledge
        maxKnowledgeEntries: number;
        websiteScansPerMonth: number;
    };
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionFeatures> = {
    starter: {
        tier: 'starter',
        features: {
            maxAgents: 2,
            agentTypes: ['support', 'assistant'],
            voiceEnabled: false,
            monthlyVoiceMinutes: 0,
            voiceProvider: 'vapi',
            messagingChannels: ['telegram'],
            monthlySMS: 0,
            crmType: 'vbout',
            maxContacts: 500,
            monthlyContentPieces: 10,
            contentTypes: ['social_post'],
            maxKnowledgeEntries: 100,
            websiteScansPerMonth: 1
        }
    },
    growth: {
        tier: 'growth',
        features: {
            maxAgents: 4,
            agentTypes: ['marketing', 'sales', 'support', 'assistant'],
            voiceEnabled: true,
            monthlyVoiceMinutes: 100,
            voiceProvider: 'vapi',
            messagingChannels: ['telegram', 'whatsapp'],
            monthlySMS: 500,
            crmType: 'vbout',
            maxContacts: 2500,
            monthlyContentPieces: 50,
            contentTypes: ['social_post', 'email', 'sms'],
            maxKnowledgeEntries: 500,
            websiteScansPerMonth: 5
        }
    },
    scale: {
        tier: 'scale',
        features: {
            maxAgents: 6,
            agentTypes: ['marketing', 'sales', 'support', 'operations', 'manager', 'assistant'],
            voiceEnabled: true,
            monthlyVoiceMinutes: 500,
            voiceProvider: 'vapi',
            messagingChannels: ['telegram', 'whatsapp', 'discord', 'slack'],
            monthlySMS: 2000,
            crmType: 'ghl',
            maxContacts: 10000,
            monthlyContentPieces: 200,
            contentTypes: ['social_post', 'email', 'sms', 'blog', 'video_script'],
            maxKnowledgeEntries: 2000,
            websiteScansPerMonth: 20
        }
    },
    enterprise: {
        tier: 'enterprise',
        features: {
            maxAgents: -1, // Unlimited
            agentTypes: ['marketing', 'sales', 'support', 'operations', 'manager', 'assistant'],
            voiceEnabled: true,
            monthlyVoiceMinutes: -1, // Unlimited
            voiceProvider: 'vapi',
            messagingChannels: ['telegram', 'whatsapp', 'discord', 'slack', 'ghl', 'vbout'],
            monthlySMS: -1,
            crmType: 'ghl',
            maxContacts: -1,
            monthlyContentPieces: -1,
            contentTypes: ['social_post', 'email', 'sms', 'blog', 'video_script', 'ad_copy'],
            maxKnowledgeEntries: -1,
            websiteScansPerMonth: -1
        }
    }
};
