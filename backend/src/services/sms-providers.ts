/**
 * Unified SMS Providers Service
 * Supports Twilio, Telnyx, and TextLink for SMS sending
 */

import axios from 'axios';

// ============ TWILIO SMS ============

interface TwilioConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}

interface SMSSendResult {
    success: boolean;
    messageId?: string;
    provider: 'twilio' | 'telnyx' | 'textlink' | 'ghl';
    error?: string;
    status?: string;
}

class TwilioSMSService {
    private accountSid: string;
    private authToken: string;
    private fromNumber: string;
    private baseUrl: string;

    constructor(config: TwilioConfig) {
        this.accountSid = config.accountSid;
        this.authToken = config.authToken;
        this.fromNumber = config.fromNumber;
        this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
    }

    async sendSMS(to: string, message: string): Promise<SMSSendResult> {
        try {
            const formData = new URLSearchParams();
            formData.append('To', to);
            formData.append('From', this.fromNumber);
            formData.append('Body', message);

            const response = await axios.post(
                `${this.baseUrl}/Messages.json`,
                formData.toString(),
                {
                    auth: {
                        username: this.accountSid,
                        password: this.authToken
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.sid,
                provider: 'twilio',
                status: response.data.status
            };
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            console.error('[Twilio SMS] Error:', errorMessage);
            return {
                success: false,
                provider: 'twilio',
                error: errorMessage
            };
        }
    }

    async sendMMS(to: string, message: string, mediaUrls: string[]): Promise<SMSSendResult> {
        try {
            const formData = new URLSearchParams();
            formData.append('To', to);
            formData.append('From', this.fromNumber);
            formData.append('Body', message);
            mediaUrls.forEach(url => formData.append('MediaUrl', url));

            const response = await axios.post(
                `${this.baseUrl}/Messages.json`,
                formData.toString(),
                {
                    auth: {
                        username: this.accountSid,
                        password: this.authToken
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.sid,
                provider: 'twilio',
                status: response.data.status
            };
        } catch (error: any) {
            return {
                success: false,
                provider: 'twilio',
                error: error.response?.data?.message || error.message
            };
        }
    }

    async getMessageStatus(messageId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/Messages/${messageId}.json`,
                {
                    auth: {
                        username: this.accountSid,
                        password: this.authToken
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            return { error: error.message };
        }
    }

    async validateCredentials(): Promise<boolean> {
        try {
            const response = await axios.get(
                `${this.baseUrl}.json`,
                {
                    auth: {
                        username: this.accountSid,
                        password: this.authToken
                    }
                }
            );
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async getPhoneNumbers(): Promise<string[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/IncomingPhoneNumbers.json`,
                {
                    auth: {
                        username: this.accountSid,
                        password: this.authToken
                    }
                }
            );
            return response.data.incoming_phone_numbers.map((n: any) => n.phone_number);
        } catch {
            return [];
        }
    }
}

// ============ TELNYX SMS ============

interface TelnyxConfig {
    apiKey: string;
    fromNumber: string;
    messagingProfileId?: string;
}

class TelnyxSMSService {
    private apiKey: string;
    private fromNumber: string;
    private messagingProfileId?: string;
    private baseUrl = 'https://api.telnyx.com/v2';

    constructor(config: TelnyxConfig) {
        this.apiKey = config.apiKey;
        this.fromNumber = config.fromNumber;
        this.messagingProfileId = config.messagingProfileId;
    }

    async sendSMS(to: string, message: string): Promise<SMSSendResult> {
        try {
            const payload: any = {
                from: this.fromNumber,
                to,
                text: message
            };

            if (this.messagingProfileId) {
                payload.messaging_profile_id = this.messagingProfileId;
            }

            const response = await axios.post(
                `${this.baseUrl}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.data.id,
                provider: 'telnyx',
                status: response.data.data.to?.[0]?.status
            };
        } catch (error: any) {
            const errorMessage = error.response?.data?.errors?.[0]?.detail || error.message;
            console.error('[Telnyx SMS] Error:', errorMessage);
            return {
                success: false,
                provider: 'telnyx',
                error: errorMessage
            };
        }
    }

    async sendMMS(to: string, message: string, mediaUrls: string[]): Promise<SMSSendResult> {
        try {
            const payload: any = {
                from: this.fromNumber,
                to,
                text: message,
                media_urls: mediaUrls
            };

            if (this.messagingProfileId) {
                payload.messaging_profile_id = this.messagingProfileId;
            }

            const response = await axios.post(
                `${this.baseUrl}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.data.id,
                provider: 'telnyx',
                status: response.data.data.to?.[0]?.status
            };
        } catch (error: any) {
            return {
                success: false,
                provider: 'telnyx',
                error: error.response?.data?.errors?.[0]?.detail || error.message
            };
        }
    }

    async getMessageStatus(messageId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/messages/${messageId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );
            return response.data.data;
        } catch (error: any) {
            return { error: error.message };
        }
    }

    async validateCredentials(): Promise<boolean> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/phone_numbers`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    params: { page: { size: 1 } }
                }
            );
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async getPhoneNumbers(): Promise<string[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/phone_numbers`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );
            return response.data.data.map((n: any) => n.phone_number);
        } catch {
            return [];
        }
    }

    async getMessagingProfiles(): Promise<Array<{ id: string; name: string }>> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/messaging_profiles`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );
            return response.data.data.map((p: any) => ({
                id: p.id,
                name: p.name
            }));
        } catch {
            return [];
        }
    }
}

// ============ UNIFIED SMS SERVICE ============

type SMSProvider = 'twilio' | 'telnyx' | 'textlink' | 'ghl' | 'auto';

interface UnifiedSMSConfig {
    defaultProvider: SMSProvider;
    twilio?: TwilioConfig;
    telnyx?: TelnyxConfig;
    textlinkApiKey?: string;
    ghlLocationId?: string;
}

class UnifiedSMSService {
    private config: UnifiedSMSConfig;
    private twilioService?: TwilioSMSService;
    private telnyxService?: TelnyxSMSService;

    constructor(config: UnifiedSMSConfig) {
        this.config = config;

        if (config.twilio) {
            this.twilioService = new TwilioSMSService(config.twilio);
        }

        if (config.telnyx) {
            this.telnyxService = new TelnyxSMSService(config.telnyx);
        }
    }

    async sendSMS(to: string, message: string, options?: {
        provider?: SMSProvider;
        mediaUrls?: string[];
    }): Promise<SMSSendResult> {
        const provider = options?.provider || this.config.defaultProvider;

        // Auto-select best available provider
        if (provider === 'auto') {
            // Priority: Telnyx (cheapest) > TextLink (your SIM) > Twilio
            if (this.telnyxService) {
                return options?.mediaUrls
                    ? this.telnyxService.sendMMS(to, message, options.mediaUrls)
                    : this.telnyxService.sendSMS(to, message);
            }
            if (this.twilioService) {
                return options?.mediaUrls
                    ? this.twilioService.sendMMS(to, message, options.mediaUrls)
                    : this.twilioService.sendSMS(to, message);
            }
            return {
                success: false,
                provider: 'auto' as any,
                error: 'No SMS provider configured'
            };
        }

        switch (provider) {
            case 'twilio':
                if (!this.twilioService) {
                    return { success: false, provider: 'twilio', error: 'Twilio not configured' };
                }
                return options?.mediaUrls
                    ? this.twilioService.sendMMS(to, message, options.mediaUrls)
                    : this.twilioService.sendSMS(to, message);

            case 'telnyx':
                if (!this.telnyxService) {
                    return { success: false, provider: 'telnyx', error: 'Telnyx not configured' };
                }
                return options?.mediaUrls
                    ? this.telnyxService.sendMMS(to, message, options.mediaUrls)
                    : this.telnyxService.sendSMS(to, message);

            default:
                return {
                    success: false,
                    provider: provider as any,
                    error: `Provider ${provider} not implemented in unified service`
                };
        }
    }

    async getAvailableProviders(): Promise<Array<{
        provider: SMSProvider;
        configured: boolean;
        valid?: boolean;
    }>> {
        const providers: Array<{ provider: SMSProvider; configured: boolean; valid?: boolean }> = [];

        if (this.twilioService) {
            const valid = await this.twilioService.validateCredentials();
            providers.push({ provider: 'twilio', configured: true, valid });
        } else {
            providers.push({ provider: 'twilio', configured: false });
        }

        if (this.telnyxService) {
            const valid = await this.telnyxService.validateCredentials();
            providers.push({ provider: 'telnyx', configured: true, valid });
        } else {
            providers.push({ provider: 'telnyx', configured: false });
        }

        return providers;
    }

    getTwilioService(): TwilioSMSService | undefined {
        return this.twilioService;
    }

    getTelnyxService(): TelnyxSMSService | undefined {
        return this.telnyxService;
    }
}

// Factory functions
export function createTwilioSMS(accountSid: string, authToken: string, fromNumber: string): TwilioSMSService {
    return new TwilioSMSService({ accountSid, authToken, fromNumber });
}

export function createTelnyxSMS(apiKey: string, fromNumber: string, messagingProfileId?: string): TelnyxSMSService {
    return new TelnyxSMSService({ apiKey, fromNumber, messagingProfileId });
}

export function createUnifiedSMS(config: UnifiedSMSConfig): UnifiedSMSService {
    return new UnifiedSMSService(config);
}

export { TwilioSMSService, TelnyxSMSService, UnifiedSMSService };
export type { TwilioConfig, TelnyxConfig, UnifiedSMSConfig, SMSSendResult, SMSProvider };
