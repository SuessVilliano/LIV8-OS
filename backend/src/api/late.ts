/**
 * Late Social Media API Routes
 * Handles accounts, posts, webhooks, and analytics for 13 social platforms
 * https://getlate.dev/
 */

import { Router, Request, Response } from 'express';
import { createLateService, LateService } from '../services/late.js';
import { authService } from '../services/auth.js';
import crypto from 'crypto';

const router = Router();

// Encryption key - use proper key management in production
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ALGORITHM = 'aes-256-cbc';

// In-memory cache backed by database persistence
const lateCredentialsStore = new Map<string, LateCredentials>();

// DB persistence helpers for Late credentials
async function loadCredentialsFromDb(userId: string, locationId: string): Promise<LateCredentials | null> {
    try {
        const { sql } = await import('@vercel/postgres');
        const result = await sql`
            SELECT * FROM late_credentials WHERE user_id = ${userId} AND location_id = ${locationId}
        `;
        if (result.rows[0]) {
            const row = result.rows[0];
            return {
                userId: row.user_id,
                locationId: row.location_id,
                encryptedApiKey: row.encrypted_api_key,
                iv: row.iv,
                profileId: row.profile_id,
                isValid: row.is_valid,
                lastTested: row.last_tested ? new Date(row.last_tested) : undefined,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            };
        }
        return null;
    } catch {
        return null; // DB not available, rely on in-memory only
    }
}

async function saveCredentialsToDb(creds: LateCredentials): Promise<void> {
    try {
        const { sql } = await import('@vercel/postgres');
        await sql`
            INSERT INTO late_credentials (user_id, location_id, encrypted_api_key, iv, profile_id, is_valid, last_tested)
            VALUES (${creds.userId}, ${creds.locationId}, ${creds.encryptedApiKey}, ${creds.iv}, ${creds.profileId || null}, ${creds.isValid ?? true}, ${creds.lastTested?.toISOString() || null})
            ON CONFLICT (user_id, location_id)
            DO UPDATE SET
                encrypted_api_key = ${creds.encryptedApiKey},
                iv = ${creds.iv},
                profile_id = ${creds.profileId || null},
                is_valid = ${creds.isValid ?? true},
                last_tested = ${creds.lastTested?.toISOString() || null},
                updated_at = NOW()
        `;
    } catch (err) {
        console.warn('[Late API] DB save failed, using in-memory only:', (err as Error).message);
    }
}

interface LateCredentials {
    userId: string;
    locationId: string;
    encryptedApiKey: string;
    iv: string;
    profileId?: string;
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
    return { encrypted, iv: iv.toString('hex') };
}

function decrypt(encrypted: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Helper to get Late service for a location
async function getLateServiceForLocation(userId: string, locationId: string): Promise<LateService> {
    const storeKey = `${userId}_${locationId}`;
    let stored = lateCredentialsStore.get(storeKey);

    // Fallback to DB if not in cache
    if (!stored) {
        stored = await loadCredentialsFromDb(userId, locationId) || undefined;
        if (stored) lateCredentialsStore.set(storeKey, stored);
    }

    if (!stored) {
        throw new Error('Late API key not configured. Please add your API key in Settings.');
    }

    const apiKey = decrypt(stored.encryptedApiKey, stored.iv);
    return createLateService(apiKey);
}

// ============ CREDENTIALS ============

/**
 * GET /api/late/credentials
 * Get stored credentials (masked)
 */
router.get('/credentials', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        let stored = lateCredentialsStore.get(storeKey);

        // Fallback to DB if not in cache
        if (!stored) {
            stored = await loadCredentialsFromDb(user.userId, locationId) || undefined;
            if (stored) lateCredentialsStore.set(storeKey, stored);
        }

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
                profileId: stored.profileId,
                isValid: stored.isValid,
                lastTested: stored.lastTested,
                createdAt: stored.createdAt
            }
        });
    } catch (error: any) {
        console.error('[Late API] Get credentials error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/late/credentials
 * Store Late API key (encrypted)
 */
router.post('/credentials', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { apiKey, profileId } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        const storeKey = `${user.userId}_${locationId}`;
        const { encrypted, iv } = encrypt(apiKey);

        const credentials: LateCredentials = {
            userId: user.userId,
            locationId,
            encryptedApiKey: encrypted,
            iv,
            profileId,
            createdAt: new Date(),
            updatedAt: new Date(),
            isValid: undefined
        };

        lateCredentialsStore.set(storeKey, credentials);
        await saveCredentialsToDb(credentials);

        console.log(`[Late API] Stored credentials for user ${user.userId}`);

        res.json({
            success: true,
            message: 'Late API key saved successfully'
        });
    } catch (error: any) {
        console.error('[Late API] Store credentials error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/late/test
 * Test stored API key
 */
router.post('/test', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const stored = lateCredentialsStore.get(storeKey);

        if (!stored) {
            return res.status(404).json({ error: 'No credentials found' });
        }

        const apiKey = decrypt(stored.encryptedApiKey, stored.iv);
        const late = createLateService(apiKey);
        const isValid = await late.validateApiKey();

        // Update stored credentials with test result
        stored.isValid = isValid;
        stored.lastTested = new Date();
        stored.updatedAt = new Date();
        lateCredentialsStore.set(storeKey, stored);

        res.json({
            success: true,
            isValid,
            message: isValid ? 'Late API key is valid' : 'Late API key is invalid'
        });
    } catch (error: any) {
        console.error('[Late API] Test error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/late/credentials
 * Delete stored credentials
 */
router.delete('/credentials', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const storeKey = `${user.userId}_${locationId}`;

        const existed = lateCredentialsStore.has(storeKey);
        lateCredentialsStore.delete(storeKey);

        console.log(`[Late API] Deleted credentials for user ${user.userId}`);

        res.json({
            success: true,
            message: existed ? 'Credentials deleted' : 'No credentials to delete'
        });
    } catch (error: any) {
        console.error('[Late API] Delete credentials error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ACCOUNTS ============

/**
 * GET /api/late/accounts
 * List connected social accounts
 */
router.get('/accounts', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';

        const late = await getLateServiceForLocation(user.userId, locationId);
        const accounts = await late.listAccounts();

        res.json({ success: true, accounts });
    } catch (error: any) {
        console.error('[Late API] List accounts error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/late/connect/:platform
 * Get OAuth connect URL for a platform
 */
router.get('/connect/:platform', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { platform } = req.params;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const headless = req.query.headless === 'true';

        if (!LateService.PLATFORMS.includes(platform as any)) {
            return res.status(400).json({
                error: `Invalid platform. Supported: ${LateService.PLATFORMS.join(', ')}`
            });
        }

        const late = await getLateServiceForLocation(user.userId, locationId);
        const profiles = await late.listProfiles();

        let profileId = profiles[0]?.id;

        if (!profileId) {
            // Create default profile
            const newProfile = await late.createProfile(`LIV8 OS - ${locationId}`);
            profileId = newProfile.id;

            // Store profile ID
            const storeKey = `${user.userId}_${locationId}`;
            const stored = lateCredentialsStore.get(storeKey);
            if (stored) {
                stored.profileId = profileId;
                lateCredentialsStore.set(storeKey, stored);
            }
        }

        const url = late.getConnectUrl(platform, profileId, headless);

        res.json({ success: true, url, profileId });
    } catch (error: any) {
        console.error('[Late API] Connect error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PROFILES ============

/**
 * GET /api/late/profiles
 * List Late profiles
 */
router.get('/profiles', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';

        const late = await getLateServiceForLocation(user.userId, locationId);
        const profiles = await late.listProfiles();

        res.json({ success: true, profiles });
    } catch (error: any) {
        console.error('[Late API] List profiles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ POSTS ============

/**
 * POST /api/late/post
 * Create/publish a post
 */
router.post('/post', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { content, platforms, mediaUrls, scheduledFor, isDraft } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({ error: 'At least one platform is required' });
        }

        const late = await getLateServiceForLocation(user.userId, locationId);

        const result = await late.crossPost(content, platforms, {
            mediaUrls,
            scheduledFor,
            isDraft
        });

        res.json({ success: true, post: result });
    } catch (error: any) {
        console.error('[Late API] Create post error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/late/publish-now
 * Publish content immediately
 */
router.post('/publish-now', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { content, platforms, mediaUrls } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({ error: 'At least one platform is required' });
        }

        const late = await getLateServiceForLocation(user.userId, locationId);
        const result = await late.publishNow(content, platforms, mediaUrls);

        res.json({ success: true, post: result });
    } catch (error: any) {
        console.error('[Late API] Publish now error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/late/schedule
 * Schedule a post
 */
router.post('/schedule', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { content, platforms, scheduledFor, mediaUrls } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({ error: 'At least one platform is required' });
        }

        if (!scheduledFor) {
            return res.status(400).json({ error: 'scheduledFor (ISO 8601 date) is required' });
        }

        const late = await getLateServiceForLocation(user.userId, locationId);
        const result = await late.schedulePost(content, platforms, scheduledFor, mediaUrls);

        res.json({ success: true, post: result });
    } catch (error: any) {
        console.error('[Late API] Schedule post error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/late/posts
 * List posts
 */
router.get('/posts', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const status = req.query.status as string | undefined;
        const limit = parseInt(req.query.limit as string) || 20;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const posts = await late.listPosts(status, limit);

        res.json({ success: true, posts });
    } catch (error: any) {
        console.error('[Late API] List posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/late/posts/:postId
 * Get single post
 */
router.get('/posts/:postId', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { postId } = req.params;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const post = await late.getPost(postId);

        res.json({ success: true, post });
    } catch (error: any) {
        console.error('[Late API] Get post error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/late/posts/:postId
 * Delete a post
 */
router.delete('/posts/:postId', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { postId } = req.params;

        const late = await getLateServiceForLocation(user.userId, locationId);
        await late.deletePost(postId);

        res.json({ success: true, message: 'Post deleted' });
    } catch (error: any) {
        console.error('[Late API] Delete post error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/late/posts/:postId/retry
 * Retry failed post
 */
router.post('/posts/:postId/retry', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { postId } = req.params;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const result = await late.retryPost(postId);

        res.json({ success: true, post: result });
    } catch (error: any) {
        console.error('[Late API] Retry post error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/late/retry-all-failed
 * Retry all failed posts
 */
router.post('/retry-all-failed', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';

        const late = await getLateServiceForLocation(user.userId, locationId);
        const result = await late.retryAllFailed();

        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('[Late API] Retry all failed error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ MEDIA ============

/**
 * POST /api/late/media/upload-link
 * Get upload link for media
 */
router.post('/media/upload-link', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';

        const late = await getLateServiceForLocation(user.userId, locationId);
        const { uploadUrl, token } = await late.generateUploadLink();

        res.json({ success: true, uploadUrl, token });
    } catch (error: any) {
        console.error('[Late API] Upload link error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/late/media/:token/status
 * Check upload status
 */
router.get('/media/:token/status', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { token } = req.params;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const status = await late.checkUploadStatus(token);

        res.json({ success: true, ...status });
    } catch (error: any) {
        console.error('[Late API] Upload status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ INTERACTIVE MESSAGING (Inbox API) ============

/**
 * POST /api/late/inbox/conversations/:conversationId/messages
 * Send interactive message (quick replies, buttons, carousel, file attachments)
 */
router.post('/inbox/conversations/:conversationId/messages', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { conversationId } = req.params;
        const { text, quickReplies, buttons, genericTemplates, replyMarkup, fileUrl, fileType, fileName } = req.body;

        if (!text && !quickReplies && !buttons && !genericTemplates && !fileUrl) {
            return res.status(400).json({ error: 'At least one of text, quickReplies, buttons, genericTemplates, or fileUrl is required' });
        }

        const late = await getLateServiceForLocation(user.userId, locationId);
        const result = await late.sendInteractiveMessage(conversationId, {
            text, quickReplies, buttons, genericTemplates, replyMarkup, fileUrl, fileType, fileName
        });

        res.json({ success: true, message: result });
    } catch (error: any) {
        console.error('[Late API] Send interactive message error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/late/inbox/conversations/:conversationId/messages/:messageId
 * Edit a Telegram message
 */
router.patch('/inbox/conversations/:conversationId/messages/:messageId', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { conversationId, messageId } = req.params;
        const { text, replyMarkup } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        const late = await getLateServiceForLocation(user.userId, locationId);
        const result = await late.editTelegramMessage(conversationId, messageId, text, replyMarkup);

        res.json({ success: true, message: result });
    } catch (error: any) {
        console.error('[Late API] Edit message error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/late/inbox/conversations
 * List inbox conversations
 */
router.get('/inbox/conversations', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { accountId, status, limit } = req.query;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const conversations = await late.listInboxConversations({
            accountId: accountId as string,
            status: status as string,
            limit: limit ? parseInt(limit as string) : undefined
        });

        res.json({ success: true, conversations });
    } catch (error: any) {
        console.error('[Late API] List inbox conversations error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/late/inbox/conversations/:conversationId/messages
 * Get messages in a conversation
 */
router.get('/inbox/conversations/:conversationId/messages', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { conversationId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const messages = await late.getInboxMessages(conversationId, limit);

        res.json({ success: true, messages });
    } catch (error: any) {
        console.error('[Late API] Get inbox messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ TELEGRAM BOT COMMANDS ============

/**
 * GET /api/late/accounts/:accountId/telegram-commands
 * Get Telegram bot commands
 */
router.get('/accounts/:accountId/telegram-commands', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { accountId } = req.params;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const commands = await late.getTelegramCommands(accountId);

        res.json({ success: true, commands });
    } catch (error: any) {
        console.error('[Late API] Get Telegram commands error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/late/accounts/:accountId/telegram-commands
 * Set Telegram bot commands
 */
router.put('/accounts/:accountId/telegram-commands', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { accountId } = req.params;
        const { commands } = req.body;

        if (!commands || !Array.isArray(commands)) {
            return res.status(400).json({ error: 'commands array is required' });
        }

        const late = await getLateServiceForLocation(user.userId, locationId);
        const result = await late.setTelegramCommands(accountId, commands);

        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('[Late API] Set Telegram commands error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/late/accounts/:accountId/telegram-commands
 * Delete all Telegram bot commands
 */
router.delete('/accounts/:accountId/telegram-commands', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { accountId } = req.params;

        const late = await getLateServiceForLocation(user.userId, locationId);
        await late.deleteTelegramCommands(accountId);

        res.json({ success: true, message: 'Telegram bot commands deleted' });
    } catch (error: any) {
        console.error('[Late API] Delete Telegram commands error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ WEBHOOKS ============

/**
 * POST /api/late/webhook
 * Receive webhook events from Late (posts + inbox interactive events)
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-late-signature'] as string;
        const rawBody = JSON.stringify(req.body);

        // Verify signature if secret configured
        const webhookSecret = process.env.LATE_WEBHOOK_SECRET;
        if (webhookSecret && signature) {
            const expectedSig = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            try {
                if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
                    return res.status(401).json({ error: 'Invalid signature' });
                }
            } catch {
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        const { event, postId, accountId, conversationId, messageId, data } = req.body;

        // Process webhook event
        switch (event) {
            case 'post.published':
                console.log(`[Late Webhook] Post published: ${postId}`);
                break;
            case 'post.failed':
                console.log(`[Late Webhook] Post failed: ${postId}`, data);
                break;
            case 'post.partial':
                console.log(`[Late Webhook] Post partially published: ${postId}`, data);
                break;
            case 'account.disconnected':
                console.log(`[Late Webhook] Account disconnected: ${accountId}`);
                break;

            // ===== INBOX INTERACTIVE EVENTS =====
            case 'inbox.message.received':
                console.log(`[Late Webhook] Inbox message received in conversation ${conversationId}:`, data);
                // Store inbound message in our DB
                try {
                    const { messages: msgDb } = await import('../db/conversations.js');
                    await msgDb.create({
                        conversationId: conversationId || 'unknown',
                        locationId: data?.locationId || 'default',
                        direction: 'inbound',
                        channel: data?.platform || 'unknown',
                        senderId: data?.senderId || 'unknown',
                        senderName: data?.senderName || 'Unknown',
                        senderType: 'contact',
                        content: data?.text || data?.message || '',
                        contentType: data?.attachment ? 'file' : 'text',
                        mediaUrls: data?.attachment ? [data.attachment.url] : [],
                        status: 'delivered',
                        externalId: messageId,
                        metadata: data
                    });
                } catch (dbErr) {
                    console.error('[Late Webhook] Failed to store inbound message:', dbErr);
                }
                break;

            case 'inbox.button.clicked':
                console.log(`[Late Webhook] Button clicked in conversation ${conversationId}:`, {
                    buttonTitle: data?.title,
                    buttonPayload: data?.payload,
                    buttonType: data?.type
                });
                // Store button click as an inbound event
                try {
                    const { messages: msgDb2 } = await import('../db/conversations.js');
                    await msgDb2.create({
                        conversationId: conversationId || 'unknown',
                        locationId: data?.locationId || 'default',
                        direction: 'inbound',
                        channel: data?.platform || 'unknown',
                        senderId: data?.senderId || 'unknown',
                        senderName: data?.senderName || 'Unknown',
                        senderType: 'contact',
                        content: `[Button: ${data?.title}] ${data?.payload || ''}`,
                        contentType: 'interactive',
                        status: 'delivered',
                        externalId: messageId,
                        metadata: { type: 'button_click', ...data }
                    });
                } catch (dbErr) {
                    console.error('[Late Webhook] Failed to store button click:', dbErr);
                }
                break;

            case 'inbox.quickreply.clicked':
                console.log(`[Late Webhook] Quick reply clicked in conversation ${conversationId}:`, {
                    replyTitle: data?.title,
                    replyPayload: data?.payload
                });
                // Store quick reply as an inbound event
                try {
                    const { messages: msgDb3 } = await import('../db/conversations.js');
                    await msgDb3.create({
                        conversationId: conversationId || 'unknown',
                        locationId: data?.locationId || 'default',
                        direction: 'inbound',
                        channel: data?.platform || 'unknown',
                        senderId: data?.senderId || 'unknown',
                        senderName: data?.senderName || 'Unknown',
                        senderType: 'contact',
                        content: `[Quick Reply: ${data?.title}] ${data?.payload || ''}`,
                        contentType: 'interactive',
                        status: 'delivered',
                        externalId: messageId,
                        metadata: { type: 'quick_reply', ...data }
                    });
                } catch (dbErr) {
                    console.error('[Late Webhook] Failed to store quick reply:', dbErr);
                }
                break;

            case 'inbox.postback':
                console.log(`[Late Webhook] Postback in conversation ${conversationId}:`, {
                    payload: data?.payload,
                    referral: data?.referral
                });
                try {
                    const { messages: msgDb4 } = await import('../db/conversations.js');
                    await msgDb4.create({
                        conversationId: conversationId || 'unknown',
                        locationId: data?.locationId || 'default',
                        direction: 'inbound',
                        channel: data?.platform || 'unknown',
                        senderId: data?.senderId || 'unknown',
                        senderName: data?.senderName || 'Unknown',
                        senderType: 'contact',
                        content: `[Postback] ${data?.payload || ''}`,
                        contentType: 'interactive',
                        status: 'delivered',
                        externalId: messageId,
                        metadata: { type: 'postback', ...data }
                    });
                } catch (dbErr) {
                    console.error('[Late Webhook] Failed to store postback:', dbErr);
                }
                break;

            default:
                console.log(`[Late Webhook] Unknown event: ${event}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('[Late Webhook] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ANALYTICS ============

/**
 * GET /api/late/posts/:postId/analytics
 * Get post analytics
 */
router.get('/posts/:postId/analytics', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.headers['x-location-id'] as string || 'default';
        const { postId } = req.params;

        const late = await getLateServiceForLocation(user.userId, locationId);
        const analytics = await late.getPostAnalytics(postId);

        res.json({ success: true, analytics });
    } catch (error: any) {
        console.error('[Late API] Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PLATFORMS INFO ============

/**
 * GET /api/late/platforms
 * Get supported platforms with character limits
 */
router.get('/platforms', (_req: Request, res: Response) => {
    res.json({
        success: true,
        platforms: Object.entries(LateService.PLATFORM_INFO).map(([id, info]) => ({
            id,
            ...info
        }))
    });
});

export default router;
