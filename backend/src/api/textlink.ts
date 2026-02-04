/**
 * TextLink SMS API Routes
 * Android-based SMS gateway integration
 * https://textlinksms.com/
 */

import { Router, Request, Response } from 'express';
import { createTextLinkService, TextLinkService, TextLinkWebhookPayload } from '../services/textlink.js';
import { authService } from '../services/auth.js';
import crypto from 'crypto';

const router = Router();

// Encryption for credentials
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ALGORITHM = 'aes-256-cbc';

// In-memory credentials store (use database in production)
const textlinkCredentialsStore = new Map<string, TextLinkCredentials>();

interface TextLinkCredentials {
    userId: string;
    locationId: string;
    encryptedApiKey: string;
    iv: string;
    simId?: string;
    webhookSecret?: string;
    createdAt: Date;
    updatedAt: Date;
    lastTested?: Date;
    isValid?: boolean;
    deviceStatus?: {
        online: boolean;
        devices: number;
        sims: number;
    };
}

// Auth middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);
        (req as any).user = payload;
        next();
    } catch (error: any) {
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

// Helper to get TextLink service for a location
async function getTextLinkServiceForLocation(userId: string, locationId: string): Promise<TextLinkService> {
    const storeKey = `${userId}_${locationId}`;
    const stored = textlinkCredentialsStore.get(storeKey);

    if (!stored) {
        throw new Error('TextLink not configured. Please add your API key in Settings.');
    }

    const apiKey = decrypt(stored.encryptedApiKey, stored.iv);
    return createTextLinkService(apiKey, {
        simId: stored.simId,
        webhookSecret: stored.webhookSecret
    });
}

// ============ CREDENTIALS ============

/**
 * GET /api/textlink/credentials
 * Get stored credentials (masked)
 */
router.get('/credentials', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const stored = textlinkCredentialsStore.get(storeKey);

        if (!stored) {
            return res.json({
                success: true,
                hasCredentials: false,
                credentials: null
            });
        }

        res.json({
            success: true,
            hasCredentials: true,
            credentials: {
                apiKey: '••••••' + stored.encryptedApiKey.slice(-4),
                simId: stored.simId,
                isValid: stored.isValid,
                lastTested: stored.lastTested,
                deviceStatus: stored.deviceStatus,
                createdAt: stored.createdAt
            }
        });
    } catch (error: any) {
        console.error('[TextLink API] Get credentials error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/textlink/credentials
 * Store TextLink API key
 */
router.post('/credentials', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { apiKey, simId, webhookSecret } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Validate the API key
        const testService = createTextLinkService(apiKey, { simId });
        const isValid = await testService.validateApiKey();

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid TextLink API key' });
        }

        // Get device status
        const deviceStatus = await testService.checkDeviceStatus();

        const storeKey = `${user.userId}_${locationId}`;
        const { encrypted, iv } = encrypt(apiKey);

        const credentials: TextLinkCredentials = {
            userId: user.userId,
            locationId,
            encryptedApiKey: encrypted,
            iv,
            simId,
            webhookSecret,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastTested: new Date(),
            isValid: true,
            deviceStatus
        };

        textlinkCredentialsStore.set(storeKey, credentials);

        console.log(`[TextLink API] Stored credentials for user ${user.userId}, devices: ${deviceStatus.devices}, sims: ${deviceStatus.sims}`);

        res.json({
            success: true,
            message: 'TextLink API key saved successfully',
            deviceStatus
        });
    } catch (error: any) {
        console.error('[TextLink API] Store credentials error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/textlink/test
 * Test stored API key and device status
 */
router.post('/test', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const stored = textlinkCredentialsStore.get(storeKey);

        if (!stored) {
            return res.status(404).json({ error: 'No credentials found' });
        }

        const apiKey = decrypt(stored.encryptedApiKey, stored.iv);
        const service = createTextLinkService(apiKey, { simId: stored.simId });

        const isValid = await service.validateApiKey();
        const deviceStatus = await service.checkDeviceStatus();

        // Update stored credentials with test result
        stored.isValid = isValid;
        stored.lastTested = new Date();
        stored.updatedAt = new Date();
        stored.deviceStatus = deviceStatus;
        textlinkCredentialsStore.set(storeKey, stored);

        res.json({
            success: true,
            isValid,
            deviceStatus,
            message: isValid
                ? deviceStatus.online
                    ? `TextLink connected! ${deviceStatus.devices} device(s), ${deviceStatus.sims} SIM(s) online`
                    : 'TextLink API valid but no devices online'
                : 'TextLink API key is invalid'
        });
    } catch (error: any) {
        console.error('[TextLink API] Test error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/textlink/credentials
 * Delete stored credentials
 */
router.delete('/credentials', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const existed = textlinkCredentialsStore.has(storeKey);
        textlinkCredentialsStore.delete(storeKey);

        console.log(`[TextLink API] Deleted credentials for user ${user.userId}`);

        res.json({
            success: true,
            message: existed ? 'Credentials deleted' : 'No credentials to delete'
        });
    } catch (error: any) {
        console.error('[TextLink API] Delete credentials error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ SEND SMS ============

/**
 * POST /api/textlink/send
 * Send an SMS message
 */
router.post('/send', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { to, message, customId, simId } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'to and message are required' });
        }

        const service = await getTextLinkServiceForLocation(user.userId, locationId);

        // Format phone number
        const formattedTo = TextLinkService.formatPhoneNumber(to);

        const result = await service.sendSMS(formattedTo, message, { customId, simId });

        if (result.success) {
            console.log(`[TextLink] SMS sent to ${formattedTo}, messageId: ${result.messageId}`);
            res.json({
                success: true,
                messageId: result.messageId,
                textlinkId: result.textlinkId
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error: any) {
        console.error('[TextLink API] Send error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/textlink/send-bulk
 * Send multiple SMS messages
 */
router.post('/send-bulk', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        if (messages.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 messages per batch' });
        }

        const service = await getTextLinkServiceForLocation(user.userId, locationId);

        // Format all phone numbers
        const formattedMessages = messages.map(msg => ({
            to: TextLinkService.formatPhoneNumber(msg.to),
            message: msg.message,
            customId: msg.customId
        }));

        const result = await service.sendBulkSMS(formattedMessages);

        console.log(`[TextLink] Bulk SMS: ${result.succeeded}/${result.total} sent successfully`);

        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('[TextLink API] Bulk send error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ OTP VERIFICATION ============

/**
 * POST /api/textlink/otp/send
 * Send OTP verification code
 */
router.post('/otp/send', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'to is required' });
        }

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const formattedTo = TextLinkService.formatPhoneNumber(to);
        const result = await service.sendOTP(formattedTo);

        if (result.success) {
            res.json({
                success: true,
                verificationId: result.verificationId,
                message: 'OTP sent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error: any) {
        console.error('[TextLink API] OTP send error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/textlink/otp/verify
 * Verify OTP code
 */
router.post('/otp/verify', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { to, code } = req.body;

        if (!to || !code) {
            return res.status(400).json({ error: 'to and code are required' });
        }

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const formattedTo = TextLinkService.formatPhoneNumber(to);
        const result = await service.verifyOTP(formattedTo, code);

        res.json({
            success: true,
            valid: result.valid,
            message: result.valid ? 'Code verified successfully' : 'Invalid code'
        });
    } catch (error: any) {
        console.error('[TextLink API] OTP verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ DEVICES & SIMS ============

/**
 * GET /api/textlink/devices
 * Get connected devices and SIM cards
 */
router.get('/devices', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const devices = await service.getDevices();
        const status = await service.checkDeviceStatus();

        res.json({
            success: true,
            devices,
            status
        });
    } catch (error: any) {
        console.error('[TextLink API] Get devices error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/textlink/sims
 * Get available SIM cards
 */
router.get('/sims', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const sims = await service.getSIMCards();

        res.json({
            success: true,
            sims
        });
    } catch (error: any) {
        console.error('[TextLink API] Get SIMs error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ MESSAGE HISTORY ============

/**
 * GET /api/textlink/messages
 * Get message history
 */
router.get('/messages', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const messages = await service.getMessageHistory(limit, offset);

        res.json({
            success: true,
            messages,
            pagination: { limit, offset }
        });
    } catch (error: any) {
        console.error('[TextLink API] Get messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/textlink/messages/:messageId
 * Get message status
 */
router.get('/messages/:messageId', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { messageId } = req.params;

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const status = await service.getMessageStatus(messageId);

        res.json({
            success: true,
            message: status
        });
    } catch (error: any) {
        console.error('[TextLink API] Get message status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ CONTACTS ============

/**
 * GET /api/textlink/contacts
 * Get contacts
 */
router.get('/contacts', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const tag = req.query.tag as string;

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const contacts = await service.getContacts(tag);

        res.json({
            success: true,
            contacts
        });
    } catch (error: any) {
        console.error('[TextLink API] Get contacts error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/textlink/contacts
 * Create contact
 */
router.post('/contacts', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { phoneNumber, name, tag } = req.body;

        if (!phoneNumber || !name) {
            return res.status(400).json({ error: 'phoneNumber and name are required' });
        }

        const service = await getTextLinkServiceForLocation(user.userId, locationId);
        const formattedPhone = TextLinkService.formatPhoneNumber(phoneNumber);
        const contact = await service.createContact(formattedPhone, name, tag);

        res.json({
            success: true,
            contact
        });
    } catch (error: any) {
        console.error('[TextLink API] Create contact error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ WEBHOOK ============

/**
 * POST /api/textlink/webhook
 * Receive incoming SMS from TextLink
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const payload = req.body as TextLinkWebhookPayload;

        // Verify webhook secret if configured
        const webhookSecret = process.env.TEXTLINK_WEBHOOK_SECRET;
        if (webhookSecret && payload.secret !== webhookSecret) {
            console.warn('[TextLink Webhook] Invalid secret');
            return res.status(401).json({ error: 'Invalid webhook secret' });
        }

        // Parse the webhook
        const parsed = {
            from: payload.phone_number,
            text: payload.text,
            timestamp: payload.timestamp,
            messageId: payload.textlink_id,
            simId: payload.sim_card_id,
            isFromPortal: payload.portal === true,
            contactName: payload.name,
            tag: payload.tag,
            customId: payload.custom_id
        };

        console.log('[TextLink Webhook] Incoming SMS:', {
            from: parsed.from,
            text: parsed.text.substring(0, 50) + (parsed.text.length > 50 ? '...' : ''),
            timestamp: parsed.timestamp
        });

        // TODO: Route to conversation handler
        // TODO: Trigger automations based on incoming SMS
        // TODO: Store in message history

        res.json({ received: true, messageId: parsed.messageId });
    } catch (error: any) {
        console.error('[TextLink Webhook] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ INFO ============

/**
 * GET /api/textlink/info
 * Get TextLink service information
 */
router.get('/info', (_req: Request, res: Response) => {
    res.json({
        success: true,
        provider: 'textlink',
        name: 'TextLink SMS',
        description: 'Use your Android phone as an SMS gateway',
        website: 'https://textlinksms.com',
        features: [
            'Send/receive SMS via Android device',
            'Multiple SIM support',
            'OTP verification',
            'Contacts management',
            'Message history',
            'Bulk messaging',
            'iMessage support (via BluBubl)',
            'GoHighLevel native integration'
        ],
        requirements: [
            'Android device with TextLink app',
            'SIM card with SMS plan',
            'Stable internet connection'
        ],
        pricing: 'Lifetime deal available (~$39-$99)',
        documentation: 'https://docs.textlinksms.com'
    });
});

export default router;
