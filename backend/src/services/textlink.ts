/**
 * TextLink SMS Service
 * Transform your Android phone into an SMS gateway
 * https://textlinksms.com/
 */

import axios, { AxiosInstance } from 'axios';

const TEXTLINK_API_BASE = 'https://textlinksms.com/api';

interface TextLinkConfig {
    apiKey: string;
    simId?: string;
    webhookSecret?: string;
}

interface TextLinkSendResult {
    success: boolean;
    messageId?: string;
    textlinkId?: string;
    error?: string;
}

interface TextLinkDevice {
    id: string;
    name: string;
    phone_number: string;
    status: 'online' | 'offline';
    sim_cards?: Array<{
        id: string;
        phone_number: string;
        carrier?: string;
    }>;
}

interface TextLinkWebhookPayload {
    secret: string;
    phone_number: string;
    text: string;
    timestamp: string;
    sim_card_id: string;
    textlink_id: string;
    custom_id?: string;
    tag?: string;
    name?: string;
    portal?: boolean;
}

interface TextLinkOTPResult {
    success: boolean;
    verificationId?: string;
    error?: string;
}

class TextLinkService {
    private client: AxiosInstance;
    private apiKey: string;
    private simId?: string;
    private webhookSecret?: string;

    constructor(config: TextLinkConfig) {
        this.apiKey = config.apiKey;
        this.simId = config.simId;
        this.webhookSecret = config.webhookSecret;

        this.client = axios.create({
            baseURL: TEXTLINK_API_BASE,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Error interceptor
        this.client.interceptors.response.use(
            response => response,
            error => {
                const message = error.response?.data?.message || error.response?.data?.error || error.message;
                console.error('[TextLink API Error]', message);
                throw new Error(`TextLink: ${message}`);
            }
        );
    }

    // ============ SEND SMS ============

    async sendSMS(to: string, message: string, options: {
        customId?: string;
        simId?: string;
    } = {}): Promise<TextLinkSendResult> {
        try {
            const payload: any = {
                phone_number: to,
                text: message
            };

            // Use specific SIM if provided, otherwise use default
            const simToUse = options.simId || this.simId;
            if (simToUse) {
                payload.sim_id = simToUse;
            }

            if (options.customId) {
                payload.custom_id = options.customId;
            }

            const response = await this.client.post('/send-sms', payload);

            return {
                success: true,
                messageId: response.data.message_id,
                textlinkId: response.data.textlink_id || response.data.id
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Bulk send SMS
    async sendBulkSMS(messages: Array<{ to: string; message: string; customId?: string }>): Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: TextLinkSendResult[];
    }> {
        const results = await Promise.allSettled(
            messages.map(msg => this.sendSMS(msg.to, msg.message, { customId: msg.customId }))
        );

        const processed = results.map((r, i) => {
            if (r.status === 'fulfilled') {
                return r.value;
            }
            return {
                success: false,
                error: r.reason?.message || 'Unknown error'
            };
        });

        return {
            total: messages.length,
            succeeded: processed.filter(r => r.success).length,
            failed: processed.filter(r => !r.success).length,
            results: processed
        };
    }

    // ============ OTP VERIFICATION ============

    async sendOTP(to: string): Promise<TextLinkOTPResult> {
        try {
            const response = await this.client.post('/send-otp', {
                phone_number: to
            });

            return {
                success: true,
                verificationId: response.data.verification_id
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyOTP(to: string, code: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await this.client.post('/verify-code', {
                phone_number: to,
                code
            });

            return {
                valid: response.data.valid === true
            };
        } catch (error: any) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // ============ DEVICES & SIMS ============

    async getDevices(): Promise<TextLinkDevice[]> {
        try {
            const response = await this.client.get('/devices');
            return response.data.devices || response.data || [];
        } catch (error) {
            console.error('[TextLink] Failed to get devices:', error);
            return [];
        }
    }

    async getSIMCards(): Promise<Array<{ id: string; phone_number: string; device_id: string }>> {
        try {
            const devices = await this.getDevices();
            const sims: Array<{ id: string; phone_number: string; device_id: string }> = [];

            for (const device of devices) {
                if (device.sim_cards) {
                    for (const sim of device.sim_cards) {
                        sims.push({
                            id: sim.id,
                            phone_number: sim.phone_number,
                            device_id: device.id
                        });
                    }
                }
            }

            return sims;
        } catch {
            return [];
        }
    }

    // ============ CONTACTS ============

    async createContact(phoneNumber: string, name: string, tag?: string): Promise<any> {
        try {
            const response = await this.client.post('/contacts', {
                phone_number: phoneNumber,
                name,
                tag
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to create contact: ${error.message}`);
        }
    }

    async getContacts(tag?: string): Promise<any[]> {
        try {
            const params = tag ? { tag } : {};
            const response = await this.client.get('/contacts', { params });
            return response.data.contacts || [];
        } catch {
            return [];
        }
    }

    // ============ MESSAGE HISTORY ============

    async getMessageHistory(limit = 50, offset = 0): Promise<any[]> {
        try {
            const response = await this.client.get('/messages', {
                params: { limit, offset }
            });
            return response.data.messages || [];
        } catch {
            return [];
        }
    }

    async getMessageStatus(messageId: string): Promise<any> {
        try {
            const response = await this.client.get(`/messages/${messageId}`);
            return response.data;
        } catch (error: any) {
            return { error: error.message };
        }
    }

    // ============ WEBHOOKS ============

    verifyWebhook(payload: TextLinkWebhookPayload, expectedSecret?: string): boolean {
        const secret = expectedSecret || this.webhookSecret;
        if (!secret) return true; // No secret configured, accept all
        return payload.secret === secret;
    }

    parseWebhook(payload: TextLinkWebhookPayload): {
        from: string;
        text: string;
        timestamp: Date;
        messageId: string;
        simId: string;
        isFromPortal: boolean;
        contactName?: string;
        tag?: string;
    } {
        return {
            from: payload.phone_number,
            text: payload.text,
            timestamp: new Date(payload.timestamp),
            messageId: payload.textlink_id,
            simId: payload.sim_card_id,
            isFromPortal: payload.portal === true,
            contactName: payload.name,
            tag: payload.tag
        };
    }

    // ============ VALIDATION ============

    async validateApiKey(): Promise<boolean> {
        try {
            const devices = await this.getDevices();
            return Array.isArray(devices);
        } catch {
            return false;
        }
    }

    async checkDeviceStatus(): Promise<{
        online: boolean;
        devices: number;
        sims: number;
    }> {
        try {
            const devices = await this.getDevices();
            const onlineDevices = devices.filter(d => d.status === 'online');
            const totalSims = devices.reduce((acc, d) => acc + (d.sim_cards?.length || 0), 0);

            return {
                online: onlineDevices.length > 0,
                devices: devices.length,
                sims: totalSims
            };
        } catch {
            return { online: false, devices: 0, sims: 0 };
        }
    }

    // ============ STATIC HELPERS ============

    static formatPhoneNumber(phone: string): string {
        // Remove all non-numeric characters except +
        let cleaned = phone.replace(/[^\d+]/g, '');

        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            // Assume US if no country code
            if (cleaned.length === 10) {
                cleaned = '+1' + cleaned;
            } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
                cleaned = '+' + cleaned;
            }
        }

        return cleaned;
    }
}

// Factory functions
export function createTextLinkService(apiKey: string, options?: {
    simId?: string;
    webhookSecret?: string;
}): TextLinkService {
    return new TextLinkService({
        apiKey,
        simId: options?.simId,
        webhookSecret: options?.webhookSecret
    });
}

// Singleton for server-side use with env vars
let defaultInstance: TextLinkService | null = null;

export function getTextLinkService(apiKey?: string): TextLinkService {
    if (apiKey) {
        return createTextLinkService(apiKey);
    }
    if (!defaultInstance) {
        const key = process.env.TEXTLINK_API_KEY;
        if (!key) throw new Error('TEXTLINK_API_KEY not configured');
        defaultInstance = createTextLinkService(key, {
            simId: process.env.TEXTLINK_SIM_ID,
            webhookSecret: process.env.TEXTLINK_WEBHOOK_SECRET
        });
    }
    return defaultInstance;
}

export { TextLinkService };
export type { TextLinkConfig, TextLinkSendResult, TextLinkDevice, TextLinkWebhookPayload, TextLinkOTPResult };
