/**
 * Voice Credentials API
 *
 * Secure storage for Twilio and Telnyx credentials
 * Used for VAPI integration and outbound calling
 */

import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import crypto from 'crypto';
import { sql } from '@vercel/postgres';

const router = Router();

// Encryption key - MUST be set in environment for persistence
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

// Warn if encryption key is not configured
if (!ENCRYPTION_KEY) {
    console.error('[VoiceCredentials] CRITICAL: CREDENTIALS_ENCRYPTION_KEY not set! Credentials will not work properly.');
}

// In-memory store with database persistence
const credentialsStore = new Map<string, EncryptedCredentials>();

// Database table name
const CREDENTIALS_TABLE = 'voice_credentials';

interface TwilioCredentials {
    provider: 'twilio';
    accountSid: string;
    authToken: string;
    phoneNumbers: string[];
}

interface TelnyxCredentials {
    provider: 'telnyx';
    apiKey: string;
    profileId?: string;
    phoneNumbers: string[];
}

type VoiceCredentials = TwilioCredentials | TelnyxCredentials;

interface EncryptedCredentials {
    userId: string;
    locationId: string;
    provider: 'twilio' | 'telnyx';
    encryptedData: string;
    iv: string;
    phoneNumbers: string[]; // Stored unencrypted for quick access
    createdAt: Date;
    updatedAt: Date;
    lastTested?: Date;
    isValid?: boolean;
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
    return {
        encrypted,
        iv: iv.toString('hex')
    };
}

function decrypt(encrypted: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * GET /api/voice-credentials
 * Get stored credentials (masked) for a location
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const stored = credentialsStore.get(storeKey);

        if (!stored) {
            return res.json({
                success: true,
                hasCredentials: false,
                credentials: null
            });
        }

        // Return masked credentials
        res.json({
            success: true,
            hasCredentials: true,
            credentials: {
                provider: stored.provider,
                phoneNumbers: stored.phoneNumbers,
                isValid: stored.isValid,
                lastTested: stored.lastTested,
                createdAt: stored.createdAt,
                // Masked sensitive data
                accountSid: stored.provider === 'twilio' ? '••••••' + stored.encryptedData.slice(-4) : undefined,
                apiKey: stored.provider === 'telnyx' ? '••••••' + stored.encryptedData.slice(-4) : undefined
            }
        });

    } catch (error: any) {
        console.error('[Voice Credentials] Get error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/voice-credentials
 * Store new credentials (encrypted)
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { provider, accountSid, authToken, apiKey, profileId, phoneNumbers } = req.body;

        if (!provider || !['twilio', 'telnyx'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider. Must be "twilio" or "telnyx"' });
        }

        if (provider === 'twilio' && (!accountSid || !authToken)) {
            return res.status(400).json({ error: 'Twilio requires accountSid and authToken' });
        }

        if (provider === 'telnyx' && !apiKey) {
            return res.status(400).json({ error: 'Telnyx requires apiKey' });
        }

        const storeKey = `${user.userId}_${locationId}`;

        // Encrypt sensitive data
        let dataToEncrypt: string;
        if (provider === 'twilio') {
            dataToEncrypt = JSON.stringify({ accountSid, authToken });
        } else {
            dataToEncrypt = JSON.stringify({ apiKey, profileId });
        }

        const { encrypted, iv } = encrypt(dataToEncrypt);

        // Store encrypted credentials
        const credentials: EncryptedCredentials = {
            userId: user.userId,
            locationId,
            provider,
            encryptedData: encrypted,
            iv,
            phoneNumbers: phoneNumbers || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isValid: undefined // Will be set after testing
        };

        credentialsStore.set(storeKey, credentials);
        await saveCredentialsToDb(credentials); // Persist to database

        console.log(`[Voice Credentials] Stored ${provider} credentials for user ${user.userId}`);

        res.json({
            success: true,
            message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} credentials saved successfully`,
            provider,
            phoneNumbers: phoneNumbers || []
        });

    } catch (error: any) {
        console.error('[Voice Credentials] Store error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/voice-credentials/test
 * Test stored credentials
 */
router.post('/test', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const stored = credentialsStore.get(storeKey);

        if (!stored) {
            return res.status(404).json({ error: 'No credentials found' });
        }

        // Decrypt credentials for testing
        const decrypted = decrypt(stored.encryptedData, stored.iv);
        const creds = JSON.parse(decrypted);

        let isValid = false;
        let message = '';

        if (stored.provider === 'twilio') {
            // Test Twilio credentials
            try {
                const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}.json`, {
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64')
                    }
                });

                if (response.ok) {
                    isValid = true;
                    message = 'Twilio credentials are valid';
                } else if (response.status === 401) {
                    message = 'Invalid Twilio credentials';
                } else {
                    message = `Twilio API returned status ${response.status}`;
                }
            } catch (e: any) {
                message = `Twilio test failed: ${e.message}`;
            }
        } else if (stored.provider === 'telnyx') {
            // Test Telnyx credentials
            try {
                const response = await fetch('https://api.telnyx.com/v2/phone_numbers', {
                    headers: {
                        'Authorization': `Bearer ${creds.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    isValid = true;
                    message = 'Telnyx credentials are valid';

                    // Extract phone numbers if available
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        const phones = data.data.map((p: any) => p.phone_number).filter(Boolean);
                        if (phones.length > 0) {
                            stored.phoneNumbers = phones;
                        }
                    }
                } else if (response.status === 401) {
                    message = 'Invalid Telnyx API key';
                } else {
                    message = `Telnyx API returned status ${response.status}`;
                }
            } catch (e: any) {
                message = `Telnyx test failed: ${e.message}`;
            }
        }

        // Update stored credentials with test result
        stored.isValid = isValid;
        stored.lastTested = new Date();
        stored.updatedAt = new Date();
        credentialsStore.set(storeKey, stored);
        await saveCredentialsToDb(stored); // Persist to database

        res.json({
            success: true,
            isValid,
            message,
            provider: stored.provider,
            phoneNumbers: stored.phoneNumbers
        });

    } catch (error: any) {
        console.error('[Voice Credentials] Test error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/voice-credentials
 * Delete stored credentials
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const existed = credentialsStore.has(storeKey);
        credentialsStore.delete(storeKey);

        console.log(`[Voice Credentials] Deleted credentials for user ${user.userId}`);

        res.json({
            success: true,
            message: existed ? 'Credentials deleted' : 'No credentials to delete'
        });

    } catch (error: any) {
        console.error('[Voice Credentials] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/voice-credentials/phone-numbers
 * Add phone numbers to credentials
 */
router.post('/phone-numbers', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { phoneNumbers } = req.body;
        const storeKey = `${user.userId}_${locationId}`;

        const stored = credentialsStore.get(storeKey);

        if (!stored) {
            return res.status(404).json({ error: 'No credentials found. Please save credentials first.' });
        }

        // Validate phone numbers
        const validNumbers = (phoneNumbers || []).filter((num: string) => {
            // Basic phone validation - should start with + and country code
            return /^\+[1-9]\d{6,14}$/.test(num.replace(/[\s\-()]/g, ''));
        });

        stored.phoneNumbers = validNumbers;
        stored.updatedAt = new Date();
        credentialsStore.set(storeKey, stored);
        await saveCredentialsToDb(stored); // Persist to database

        res.json({
            success: true,
            phoneNumbers: validNumbers,
            message: `${validNumbers.length} phone number(s) saved`
        });

    } catch (error: any) {
        console.error('[Voice Credentials] Phone numbers error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/voice-credentials/vapi-config
 * Get configuration for VAPI integration
 */
router.get('/vapi-config', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const stored = credentialsStore.get(storeKey);

        if (!stored || !stored.isValid) {
            return res.status(400).json({
                error: 'No valid credentials found',
                message: 'Please configure and test your Twilio or Telnyx credentials first'
            });
        }

        // Decrypt credentials for VAPI config
        const decrypted = decrypt(stored.encryptedData, stored.iv);
        const creds = JSON.parse(decrypted);

        // Return VAPI-compatible configuration
        let vapiConfig: any;

        if (stored.provider === 'twilio') {
            vapiConfig = {
                provider: 'twilio',
                twilioAccountSid: creds.accountSid,
                twilioAuthToken: creds.authToken,
                twilioPhoneNumber: stored.phoneNumbers[0] || null
            };
        } else {
            vapiConfig = {
                provider: 'telnyx',
                telnyxApiKey: creds.apiKey,
                telnyxProfileId: creds.profileId || null,
                telnyxPhoneNumber: stored.phoneNumbers[0] || null
            };
        }

        res.json({
            success: true,
            config: vapiConfig,
            availableNumbers: stored.phoneNumbers
        });

    } catch (error: any) {
        console.error('[Voice Credentials] VAPI config error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize database table for credential persistence
async function initCredentialsTable() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS voice_credentials (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                location_id TEXT NOT NULL,
                provider TEXT NOT NULL CHECK (provider IN ('twilio', 'telnyx')),
                encrypted_data TEXT NOT NULL,
                iv TEXT NOT NULL,
                phone_numbers JSONB DEFAULT '[]',
                is_valid BOOLEAN DEFAULT NULL,
                last_tested TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, location_id, provider)
            )
        `;
        console.log('[VoiceCredentials] Table initialized');

        // Load existing credentials into memory cache
        const result = await sql`SELECT * FROM voice_credentials`;
        for (const row of result.rows) {
            const key = `${row.user_id}:${row.location_id}`;
            credentialsStore.set(key, {
                userId: row.user_id,
                locationId: row.location_id,
                provider: row.provider,
                encryptedData: row.encrypted_data,
                iv: row.iv,
                phoneNumbers: row.phone_numbers || [],
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                lastTested: row.last_tested,
                isValid: row.is_valid
            });
        }
        console.log(`[VoiceCredentials] Loaded ${result.rows.length} credentials from database`);
    } catch (error) {
        console.error('[VoiceCredentials] Table init error:', error);
    }
}

// Save credentials to database
async function saveCredentialsToDb(creds: EncryptedCredentials) {
    try {
        await sql`
            INSERT INTO voice_credentials (user_id, location_id, provider, encrypted_data, iv, phone_numbers, is_valid, last_tested)
            VALUES (${creds.userId}, ${creds.locationId}, ${creds.provider}, ${creds.encryptedData}, ${creds.iv}, ${JSON.stringify(creds.phoneNumbers)}, ${creds.isValid ?? null}, ${creds.lastTested ?? null})
            ON CONFLICT (user_id, location_id, provider)
            DO UPDATE SET
                encrypted_data = ${creds.encryptedData},
                iv = ${creds.iv},
                phone_numbers = ${JSON.stringify(creds.phoneNumbers)},
                is_valid = ${creds.isValid ?? null},
                last_tested = ${creds.lastTested ?? null},
                updated_at = NOW()
        `;
    } catch (error) {
        console.error('[VoiceCredentials] Database save error:', error);
    }
}

// Initialize table on module load
initCredentialsTable();

export default router;
