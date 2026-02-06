/**
 * Unified SMS API Routes
 * Supports multiple providers: Twilio, Telnyx, TextLink, GHL
 */

import { Router, Request, Response } from 'express';
import { createTwilioSMS, createTelnyxSMS, TwilioSMSService, TelnyxSMSService } from '../services/sms-providers.js';
import { createTextLinkService, TextLinkService } from '../services/textlink.js';
import { authService } from '../services/auth.js';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';

const router = Router();

// Encryption - MUST be set in environment for persistence
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

// Warn if encryption key is not configured
if (!ENCRYPTION_KEY) {
    console.error('[SMS] CRITICAL: CREDENTIALS_ENCRYPTION_KEY not set! SMS credentials will not work properly.');
}

// In-memory cache with database persistence
const smsCredentialsStore = new Map<string, SMSProviderCredentials>();

interface SMSProviderCredentials {
    userId: string;
    locationId: string;
    defaultProvider: 'twilio' | 'telnyx' | 'textlink' | 'ghl';
    twilio?: {
        accountSid: string;
        authToken: string; // encrypted
        authTokenIv: string;
        fromNumber: string;
        isValid?: boolean;
    };
    telnyx?: {
        apiKey: string; // encrypted
        apiKeyIv: string;
        fromNumber: string;
        messagingProfileId?: string;
        isValid?: boolean;
    };
    textlink?: {
        apiKey: string; // encrypted
        apiKeyIv: string;
        simId?: string;
        webhookSecret?: string;
        isValid?: boolean;
    };
    updatedAt: Date;
}

// Auth middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);
        (req as any).user = payload;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Encryption helpers
function encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encrypted, iv: iv.toString('hex') };
}

function decrypt(encrypted: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Helper to get SMS service
function getSMSService(creds: SMSProviderCredentials, provider?: string): {
    service: TwilioSMSService | TelnyxSMSService | TextLinkService | null;
    provider: string;
} {
    const targetProvider = provider || creds.defaultProvider;

    switch (targetProvider) {
        case 'twilio':
            if (creds.twilio) {
                const authToken = decrypt(creds.twilio.authToken, creds.twilio.authTokenIv);
                return {
                    service: createTwilioSMS(creds.twilio.accountSid, authToken, creds.twilio.fromNumber),
                    provider: 'twilio'
                };
            }
            break;
        case 'telnyx':
            if (creds.telnyx) {
                const apiKey = decrypt(creds.telnyx.apiKey, creds.telnyx.apiKeyIv);
                return {
                    service: createTelnyxSMS(apiKey, creds.telnyx.fromNumber, creds.telnyx.messagingProfileId),
                    provider: 'telnyx'
                };
            }
            break;
        case 'textlink':
            if (creds.textlink) {
                const apiKey = decrypt(creds.textlink.apiKey, creds.textlink.apiKeyIv);
                return {
                    service: createTextLinkService(apiKey, { simId: creds.textlink.simId }),
                    provider: 'textlink'
                };
            }
            break;
    }

    return { service: null, provider: targetProvider };
}

// ============ CREDENTIALS ============

/**
 * GET /api/sms/config
 * Get SMS provider configuration (masked)
 */
router.get('/config', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const stored = smsCredentialsStore.get(storeKey);

        if (!stored) {
            return res.json({
                success: true,
                hasConfig: false,
                config: null
            });
        }

        res.json({
            success: true,
            hasConfig: true,
            config: {
                defaultProvider: stored.defaultProvider,
                twilio: stored.twilio ? {
                    accountSid: stored.twilio.accountSid,
                    authToken: '••••••' + stored.twilio.authToken.slice(-4),
                    fromNumber: stored.twilio.fromNumber,
                    isValid: stored.twilio.isValid
                } : null,
                telnyx: stored.telnyx ? {
                    apiKey: '••••••' + stored.telnyx.apiKey.slice(-4),
                    fromNumber: stored.telnyx.fromNumber,
                    messagingProfileId: stored.telnyx.messagingProfileId,
                    isValid: stored.telnyx.isValid
                } : null,
                textlink: stored.textlink ? {
                    apiKey: '••••••' + stored.textlink.apiKey.slice(-4),
                    simId: stored.textlink.simId,
                    isValid: stored.textlink.isValid
                } : null,
                updatedAt: stored.updatedAt
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/sms/config/twilio
 * Configure Twilio SMS
 */
router.post('/config/twilio', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { accountSid, authToken, fromNumber } = req.body;

        if (!accountSid || !authToken || !fromNumber) {
            return res.status(400).json({ error: 'accountSid, authToken, and fromNumber are required' });
        }

        // Validate credentials
        const testService = createTwilioSMS(accountSid, authToken, fromNumber);
        const isValid = await testService.validateCredentials();

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Twilio credentials' });
        }

        const storeKey = `${user.userId}_${locationId}`;
        const existing = smsCredentialsStore.get(storeKey) || {
            userId: user.userId,
            locationId,
            defaultProvider: 'twilio' as const,
            updatedAt: new Date()
        };

        const { encrypted, iv } = encrypt(authToken);

        existing.twilio = {
            accountSid,
            authToken: encrypted,
            authTokenIv: iv,
            fromNumber,
            isValid: true
        };
        existing.updatedAt = new Date();

        // Set as default if no default
        if (!existing.defaultProvider) {
            existing.defaultProvider = 'twilio';
        }

        smsCredentialsStore.set(storeKey, existing);
        await saveSmsCredentialsToDb(storeKey, existing); // Persist to database

        // Get available phone numbers
        const phoneNumbers = await testService.getPhoneNumbers();

        res.json({
            success: true,
            message: 'Twilio SMS configured successfully',
            phoneNumbers
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/sms/config/telnyx
 * Configure Telnyx SMS
 */
router.post('/config/telnyx', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { apiKey, fromNumber, messagingProfileId } = req.body;

        if (!apiKey || !fromNumber) {
            return res.status(400).json({ error: 'apiKey and fromNumber are required' });
        }

        // Validate credentials
        const testService = createTelnyxSMS(apiKey, fromNumber, messagingProfileId);
        const isValid = await testService.validateCredentials();

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Telnyx credentials' });
        }

        const storeKey = `${user.userId}_${locationId}`;
        const existing = smsCredentialsStore.get(storeKey) || {
            userId: user.userId,
            locationId,
            defaultProvider: 'telnyx' as const,
            updatedAt: new Date()
        };

        const { encrypted, iv } = encrypt(apiKey);

        existing.telnyx = {
            apiKey: encrypted,
            apiKeyIv: iv,
            fromNumber,
            messagingProfileId,
            isValid: true
        };
        existing.updatedAt = new Date();

        if (!existing.defaultProvider) {
            existing.defaultProvider = 'telnyx';
        }

        smsCredentialsStore.set(storeKey, existing);
        await saveSmsCredentialsToDb(storeKey, existing); // Persist to database

        // Get available phone numbers and profiles
        const phoneNumbers = await testService.getPhoneNumbers();
        const profiles = await testService.getMessagingProfiles();

        res.json({
            success: true,
            message: 'Telnyx SMS configured successfully',
            phoneNumbers,
            messagingProfiles: profiles
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/sms/config/default
 * Set default SMS provider
 */
router.post('/config/default', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { provider } = req.body;

        if (!['twilio', 'telnyx', 'textlink', 'ghl'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        const storeKey = `${user.userId}_${locationId}`;
        const existing = smsCredentialsStore.get(storeKey);

        if (!existing) {
            return res.status(400).json({ error: 'No SMS providers configured' });
        }

        existing.defaultProvider = provider;
        existing.updatedAt = new Date();
        smsCredentialsStore.set(storeKey, existing);
        await saveSmsCredentialsToDb(storeKey, existing); // Persist to database

        res.json({
            success: true,
            message: `Default SMS provider set to ${provider}`
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/sms/config/:provider
 * Remove SMS provider configuration
 */
router.delete('/config/:provider', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { provider } = req.params;

        const storeKey = `${user.userId}_${locationId}`;
        const existing = smsCredentialsStore.get(storeKey);

        if (!existing) {
            return res.json({ success: true, message: 'No config to delete' });
        }

        switch (provider) {
            case 'twilio':
                delete existing.twilio;
                break;
            case 'telnyx':
                delete existing.telnyx;
                break;
            case 'textlink':
                delete existing.textlink;
                break;
            default:
                return res.status(400).json({ error: 'Invalid provider' });
        }

        // Update default if needed
        if (existing.defaultProvider === provider) {
            if (existing.twilio) existing.defaultProvider = 'twilio';
            else if (existing.telnyx) existing.defaultProvider = 'telnyx';
            else if (existing.textlink) existing.defaultProvider = 'textlink';
            else existing.defaultProvider = 'ghl';
        }

        existing.updatedAt = new Date();
        smsCredentialsStore.set(storeKey, existing);
        await saveSmsCredentialsToDb(storeKey, existing); // Persist to database

        res.json({ success: true, message: `${provider} configuration removed` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ SEND SMS ============

/**
 * POST /api/sms/send
 * Send SMS via configured provider
 */
router.post('/send', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { to, message, provider, mediaUrls } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'to and message are required' });
        }

        const storeKey = `${user.userId}_${locationId}`;
        const creds = smsCredentialsStore.get(storeKey);

        if (!creds) {
            return res.status(400).json({ error: 'No SMS provider configured. Please configure in Settings.' });
        }

        const { service, provider: usedProvider } = getSMSService(creds, provider);

        if (!service) {
            return res.status(400).json({ error: `SMS provider ${usedProvider} not configured` });
        }

        let result;

        if (service instanceof TwilioSMSService) {
            result = mediaUrls?.length
                ? await service.sendMMS(to, message, mediaUrls)
                : await service.sendSMS(to, message);
        } else if (service instanceof TelnyxSMSService) {
            result = mediaUrls?.length
                ? await service.sendMMS(to, message, mediaUrls)
                : await service.sendSMS(to, message);
        } else if (service instanceof TextLinkService) {
            result = await service.sendSMS(to, message);
            result = { ...result, provider: 'textlink' as const };
        } else {
            return res.status(400).json({ error: 'Invalid service' });
        }

        if (result.success) {
            console.log(`[SMS] Sent via ${usedProvider} to ${to}, messageId: ${result.messageId}`);
            res.json({
                success: true,
                messageId: result.messageId,
                provider: usedProvider,
                status: result.status
            });
        } else {
            res.status(500).json({
                success: false,
                provider: usedProvider,
                error: result.error
            });
        }
    } catch (error: any) {
        console.error('[SMS API] Send error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/sms/send-bulk
 * Send bulk SMS
 */
router.post('/send-bulk', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { messages, provider } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        if (messages.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 messages per batch' });
        }

        const storeKey = `${user.userId}_${locationId}`;
        const creds = smsCredentialsStore.get(storeKey);

        if (!creds) {
            return res.status(400).json({ error: 'No SMS provider configured' });
        }

        const { service, provider: usedProvider } = getSMSService(creds, provider);

        if (!service) {
            return res.status(400).json({ error: `SMS provider ${usedProvider} not configured` });
        }

        // Send all messages
        const results = await Promise.allSettled(
            messages.map(async (msg: { to: string; message: string }) => {
                if (service instanceof TwilioSMSService) {
                    return service.sendSMS(msg.to, msg.message);
                } else if (service instanceof TelnyxSMSService) {
                    return service.sendSMS(msg.to, msg.message);
                } else if (service instanceof TextLinkService) {
                    return service.sendSMS(msg.to, msg.message);
                }
                throw new Error('Invalid service');
            })
        );

        const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failed = results.length - succeeded;

        console.log(`[SMS] Bulk send via ${usedProvider}: ${succeeded}/${results.length} succeeded`);

        res.json({
            success: true,
            total: results.length,
            succeeded,
            failed,
            provider: usedProvider
        });
    } catch (error: any) {
        console.error('[SMS API] Bulk send error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PROVIDERS INFO ============

/**
 * GET /api/sms/providers
 * Get available SMS providers and their status
 */
router.get('/providers', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const creds = smsCredentialsStore.get(storeKey);

        const providers = [
            {
                id: 'ghl',
                name: 'GoHighLevel',
                description: 'SMS via GHL CRM (included in subscription)',
                configured: true, // Always available if GHL connected
                isDefault: creds?.defaultProvider === 'ghl' || !creds?.defaultProvider,
                pricing: 'Included in GHL subscription',
                features: ['Send SMS', 'Receive SMS', 'Workflows', 'Automations']
            },
            {
                id: 'twilio',
                name: 'Twilio',
                description: 'Enterprise SMS API with global reach',
                configured: !!creds?.twilio,
                isDefault: creds?.defaultProvider === 'twilio',
                isValid: creds?.twilio?.isValid,
                pricing: '~$0.0079/message',
                features: ['Send SMS', 'Send MMS', 'Global coverage', '99.95% SLA']
            },
            {
                id: 'telnyx',
                name: 'Telnyx',
                description: 'Cost-effective enterprise SMS',
                configured: !!creds?.telnyx,
                isDefault: creds?.defaultProvider === 'telnyx',
                isValid: creds?.telnyx?.isValid,
                pricing: '~$0.004/message',
                features: ['Send SMS', 'Send MMS', 'Global coverage', '99.999% SLA', 'Lower cost']
            },
            {
                id: 'textlink',
                name: 'TextLink',
                description: 'Use your Android phone as SMS gateway',
                configured: !!creds?.textlink,
                isDefault: creds?.defaultProvider === 'textlink',
                isValid: creds?.textlink?.isValid,
                pricing: 'Your phone plan (one-time $39-99)',
                features: ['Send SMS', 'Your phone plan rates', 'iMessage support', 'No per-message cost']
            }
        ];

        res.json({
            success: true,
            providers,
            defaultProvider: creds?.defaultProvider || 'ghl'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/sms/info
 * Get SMS service information
 */
router.get('/info', (_req: Request, res: Response) => {
    res.json({
        success: true,
        service: 'LIV8 Unified SMS',
        version: '1.0.0',
        providers: [
            {
                id: 'ghl',
                name: 'GoHighLevel',
                type: 'crm',
                website: 'https://gohighlevel.com'
            },
            {
                id: 'twilio',
                name: 'Twilio',
                type: 'carrier',
                website: 'https://twilio.com'
            },
            {
                id: 'telnyx',
                name: 'Telnyx',
                type: 'carrier',
                website: 'https://telnyx.com'
            },
            {
                id: 'textlink',
                name: 'TextLink',
                type: 'gateway',
                website: 'https://textlinksms.com'
            }
        ],
        features: [
            'Multi-provider support',
            'Automatic failover',
            'Cost optimization',
            'Bulk messaging',
            'MMS support',
            'Delivery tracking'
        ]
    });
});

// Initialize database table for SMS credential persistence
async function initSmsCredentialsTable() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS sms_credentials (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                location_id TEXT NOT NULL,
                default_provider TEXT NOT NULL,
                credentials_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, location_id)
            )
        `;
        console.log('[SMS] Table initialized');

        // Load existing credentials into memory cache
        const result = await sql`SELECT * FROM sms_credentials`;
        for (const row of result.rows) {
            const key = `${row.user_id}:${row.location_id}`;
            const data = row.credentials_data as SMSProviderCredentials;
            data.updatedAt = row.updated_at;
            smsCredentialsStore.set(key, data);
        }
        console.log(`[SMS] Loaded ${result.rows.length} credentials from database`);
    } catch (error) {
        console.error('[SMS] Table init error:', error);
    }
}

// Save SMS credentials to database
async function saveSmsCredentialsToDb(key: string, creds: SMSProviderCredentials) {
    try {
        const [userId, locationId] = key.split(':');
        await sql`
            INSERT INTO sms_credentials (user_id, location_id, default_provider, credentials_data)
            VALUES (${userId}, ${locationId}, ${creds.defaultProvider}, ${JSON.stringify(creds)})
            ON CONFLICT (user_id, location_id)
            DO UPDATE SET
                default_provider = ${creds.defaultProvider},
                credentials_data = ${JSON.stringify(creds)},
                updated_at = NOW()
        `;
    } catch (error) {
        console.error('[SMS] Database save error:', error);
    }
}

// Initialize table on module load
initSmsCredentialsTable();

export default router;
