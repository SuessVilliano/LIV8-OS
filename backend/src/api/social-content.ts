import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { db } from '../db/index.js';
import { socialContentEngine, ContentRequest, SocialPlatform, BrandVoice } from '../services/social-content-engine.js';
import { createGHLClient } from '../services/ghl-api-client.js';

const router = express.Router();

/**
 * Middleware: Verify JWT
 */
const authenticate = (req: Request, res: Response, next: any) => {
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

/**
 * Webhook authentication (for GHL workflow triggers)
 * Uses a simple API key or the location's token
 */
const webhookAuth = async (req: Request, res: Response, next: any) => {
    try {
        const apiKey = req.headers['x-api-key'] as string;
        const locationId = req.body.locationId || req.query.locationId;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId required' });
        }

        // Verify the API key matches what we have stored, or check webhook secret
        const webhookSecret = process.env.WEBHOOK_SECRET;
        if (webhookSecret && apiKey === webhookSecret) {
            (req as any).locationId = locationId;
            return next();
        }

        // Try to get the location token to verify this is a valid location
        const ghlToken = await db.getLocationToken(locationId);
        if (!ghlToken) {
            return res.status(401).json({ error: 'Invalid location or not connected' });
        }

        (req as any).locationId = locationId;
        (req as any).ghlToken = ghlToken;
        next();
    } catch (error: any) {
        res.status(401).json({ error: 'Webhook authentication failed' });
    }
};

// ==================== AUTHENTICATED ENDPOINTS ====================

/**
 * POST /api/social/generate
 * Generate social media content (authenticated users)
 */
router.post('/generate', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            type,
            topic,
            platforms,
            brandVoice,
            includeHashtags,
            includeEmojis,
            includeCallToAction,
            callToActionUrl,
            customInstructions
        } = req.body;

        if (!topic || !platforms || !brandVoice) {
            return res.status(400).json({ error: 'Missing required fields: topic, platforms, brandVoice' });
        }

        const request: ContentRequest = {
            type: type || 'promotional',
            topic,
            platforms,
            brandVoice,
            includeHashtags: includeHashtags !== false,
            includeEmojis: includeEmojis !== false,
            includeCallToAction,
            callToActionUrl,
            customInstructions
        };

        const content = await socialContentEngine.generateContent(request);

        res.json({
            success: true,
            content,
            generatedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Social API] Generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/social/generate-and-post
 * Generate content and immediately post to GHL
 */
router.post('/generate-and-post', authenticate, async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        const {
            locationId,
            type,
            topic,
            platforms,
            brandVoice,
            accountIds,
            scheduledAt,
            includeHashtags,
            includeEmojis,
            includeCallToAction,
            callToActionUrl
        } = req.body;

        if (!locationId || !topic || !platforms || !brandVoice || !accountIds) {
            return res.status(400).json({
                error: 'Missing required fields: locationId, topic, platforms, brandVoice, accountIds'
            });
        }

        // Get GHL token
        const ghlToken = await db.getLocationToken(locationId);
        if (!ghlToken) {
            return res.status(404).json({ error: 'Location not connected' });
        }

        // Generate content
        const request: ContentRequest = {
            type: type || 'promotional',
            topic,
            platforms,
            brandVoice,
            includeHashtags: includeHashtags !== false,
            includeEmojis: includeEmojis !== false,
            includeCallToAction,
            callToActionUrl,
            scheduledAt
        };

        const content = await socialContentEngine.generateContent(request);

        // Post to GHL
        const ghlClient = createGHLClient(ghlToken, locationId);
        const postResult = await socialContentEngine.createAndSchedulePost(
            ghlClient,
            content,
            accountIds,
            scheduledAt
        );

        // Log the action
        await db.logAction(
            user.userId,
            user.agencyId,
            locationId,
            'social_content_post',
            'social.generate-and-post',
            { topic, platforms, type },
            postResult,
            postResult.success ? 'success' : 'failure',
            postResult.errors.length > 0 ? postResult.errors.join('; ') : undefined
        );

        res.json({
            success: postResult.success,
            content,
            postIds: postResult.postIds,
            errors: postResult.errors,
            scheduledAt: scheduledAt || 'immediate'
        });

    } catch (error: any) {
        console.error('[Social API] Generate and post error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/social/calendar
 * Generate a content calendar
 */
router.post('/calendar', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            brandVoice,
            platforms,
            topics,
            postsPerWeek,
            weeks
        } = req.body;

        if (!brandVoice || !platforms || !topics) {
            return res.status(400).json({
                error: 'Missing required fields: brandVoice, platforms, topics'
            });
        }

        const calendar = await socialContentEngine.generateContentCalendar(
            brandVoice,
            platforms,
            topics,
            postsPerWeek || 5,
            weeks || 1
        );

        res.json({
            success: true,
            calendar,
            totalPosts: calendar.length,
            dateRange: {
                start: calendar[0]?.scheduledAt,
                end: calendar[calendar.length - 1]?.scheduledAt
            }
        });

    } catch (error: any) {
        console.error('[Social API] Calendar error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/social/repurpose
 * Repurpose content for different platforms
 */
router.post('/repurpose', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            originalContent,
            originalPlatform,
            targetPlatforms,
            brandVoice
        } = req.body;

        if (!originalContent || !originalPlatform || !targetPlatforms || !brandVoice) {
            return res.status(400).json({
                error: 'Missing required fields: originalContent, originalPlatform, targetPlatforms, brandVoice'
            });
        }

        const repurposed = await socialContentEngine.repurposeContent(
            originalContent,
            originalPlatform,
            targetPlatforms,
            brandVoice
        );

        res.json({
            success: true,
            original: { content: originalContent, platform: originalPlatform },
            repurposed
        });

    } catch (error: any) {
        console.error('[Social API] Repurpose error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/social/accounts/:locationId
 * Get connected social media accounts for a location
 */
router.get('/accounts/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        const ghlToken = await db.getLocationToken(locationId);
        if (!ghlToken) {
            return res.status(404).json({ error: 'Location not connected' });
        }

        const ghlClient = createGHLClient(ghlToken, locationId);
        const accounts = await ghlClient.getSocialMediaAccounts();

        res.json({
            success: true,
            accounts,
            locationId
        });

    } catch (error: any) {
        console.error('[Social API] Get accounts error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/social/posts/:locationId
 * Get scheduled/published posts for a location
 */
router.get('/posts/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { status, limit } = req.query;

        const ghlToken = await db.getLocationToken(locationId);
        if (!ghlToken) {
            return res.status(404).json({ error: 'Location not connected' });
        }

        const ghlClient = createGHLClient(ghlToken, locationId);
        const posts = await ghlClient.getSocialMediaPosts({
            status: status as string,
            limit: limit ? parseInt(limit as string) : 50
        });

        res.json({
            success: true,
            posts,
            locationId
        });

    } catch (error: any) {
        console.error('[Social API] Get posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== WEBHOOK ENDPOINTS (GHL Workflow Integration) ====================

/**
 * POST /api/social/webhook/generate
 * Webhook endpoint for GHL workflows to trigger content generation
 *
 * This allows GHL workflows to trigger content creation headlessly:
 * 1. User sets up a workflow in GHL
 * 2. Workflow sends webhook to this endpoint with topic/type
 * 3. Content is generated and posted automatically
 */
router.post('/webhook/generate', webhookAuth, async (req: Request, res: Response) => {
    const locationId = (req as any).locationId;

    try {
        const {
            type,
            topic,
            platforms,
            accountIds,
            scheduledAt,
            contactId,
            customFields
        } = req.body;

        console.log(`[Social Webhook] Received from location ${locationId}:`, { type, topic });

        if (!topic) {
            return res.status(400).json({ error: 'topic is required' });
        }

        // Get GHL token
        let ghlToken = (req as any).ghlToken;
        if (!ghlToken) {
            ghlToken = await db.getLocationToken(locationId);
        }

        if (!ghlToken) {
            return res.status(404).json({ error: 'Location not connected' });
        }

        // Get brand brain for this location (for brand voice)
        const brandBrain = await db.getBrandBrain(locationId);

        // Build brand voice from brand brain or use defaults
        const brandVoice: BrandVoice = brandBrain ? {
            name: brandBrain.brand_name || 'Business',
            industry: brandBrain.industry_niche || 'General',
            tone: brandBrain.tones || ['professional', 'friendly'],
            values: brandBrain.values || ['quality', 'service'],
            targetAudience: brandBrain.target_audience || 'general audience',
            keyMessages: brandBrain.key_messages || [],
            hashtags: brandBrain.hashtags,
            emojis: true
        } : {
            name: 'Business',
            industry: 'General',
            tone: ['professional', 'friendly'],
            values: ['quality', 'service'],
            targetAudience: 'general audience',
            keyMessages: [],
            emojis: true
        };

        // Default platforms if not specified
        const targetPlatforms: SocialPlatform[] = platforms || ['facebook', 'instagram'];

        // Generate content
        const request: ContentRequest = {
            type: type || 'promotional',
            topic,
            platforms: targetPlatforms,
            brandVoice,
            includeHashtags: true,
            includeEmojis: true,
            includeCallToAction: type === 'promotional'
        };

        const content = await socialContentEngine.generateContent(request);

        // If accountIds provided, post immediately
        if (accountIds && accountIds.length > 0) {
            const ghlClient = createGHLClient(ghlToken, locationId);
            const postResult = await socialContentEngine.createAndSchedulePost(
                ghlClient,
                content,
                accountIds,
                scheduledAt
            );

            // Log to audit
            try {
                await db.logAction(
                    'webhook',
                    'webhook',
                    locationId,
                    'social_webhook_post',
                    'webhook.generate',
                    { topic, type, platforms: targetPlatforms },
                    postResult,
                    postResult.success ? 'success' : 'failure'
                );
            } catch (logError) {
                console.warn('[Social Webhook] Audit log failed:', logError);
            }

            return res.json({
                success: postResult.success,
                message: 'Content generated and posted',
                content,
                postIds: postResult.postIds,
                errors: postResult.errors
            });
        }

        // Return generated content without posting
        res.json({
            success: true,
            message: 'Content generated (not posted - no accountIds provided)',
            content
        });

    } catch (error: any) {
        console.error('[Social Webhook] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/social/webhook/schedule-week
 * Webhook to schedule a week's worth of content
 */
router.post('/webhook/schedule-week', webhookAuth, async (req: Request, res: Response) => {
    const locationId = (req as any).locationId;

    try {
        const {
            topics,
            platforms,
            accountIds,
            postsPerWeek
        } = req.body;

        if (!topics || !Array.isArray(topics) || topics.length === 0) {
            return res.status(400).json({ error: 'topics array is required' });
        }

        // Get GHL token
        let ghlToken = (req as any).ghlToken;
        if (!ghlToken) {
            ghlToken = await db.getLocationToken(locationId);
        }

        if (!ghlToken) {
            return res.status(404).json({ error: 'Location not connected' });
        }

        // Get brand brain
        const brandBrain = await db.getBrandBrain(locationId);

        const brandVoice: BrandVoice = brandBrain ? {
            name: brandBrain.brand_name || 'Business',
            industry: brandBrain.industry_niche || 'General',
            tone: brandBrain.tones || ['professional', 'friendly'],
            values: brandBrain.values || ['quality', 'service'],
            targetAudience: brandBrain.target_audience || 'general audience',
            keyMessages: brandBrain.key_messages || [],
            emojis: true
        } : {
            name: 'Business',
            industry: 'General',
            tone: ['professional', 'friendly'],
            values: ['quality', 'service'],
            targetAudience: 'general audience',
            keyMessages: [],
            emojis: true
        };

        const targetPlatforms: SocialPlatform[] = platforms || ['facebook', 'instagram'];

        // Generate calendar
        const calendar = await socialContentEngine.generateContentCalendar(
            brandVoice,
            targetPlatforms,
            topics,
            postsPerWeek || 5,
            1
        );

        // If accountIds provided, schedule all posts
        if (accountIds && accountIds.length > 0) {
            const ghlClient = createGHLClient(ghlToken, locationId);
            const results = [];

            for (const item of calendar) {
                const postResult = await socialContentEngine.createAndSchedulePost(
                    ghlClient,
                    item.content,
                    accountIds,
                    item.scheduledAt
                );
                results.push({
                    scheduledAt: item.scheduledAt,
                    ...postResult
                });
            }

            return res.json({
                success: true,
                message: `Scheduled ${calendar.length} posts for the week`,
                scheduled: results
            });
        }

        // Return calendar without scheduling
        res.json({
            success: true,
            message: 'Calendar generated (not scheduled - no accountIds provided)',
            calendar
        });

    } catch (error: any) {
        console.error('[Social Webhook] Schedule week error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/social/webhook/contact-content
 * Generate content based on a contact's data (for personalized posts)
 */
router.post('/webhook/contact-content', webhookAuth, async (req: Request, res: Response) => {
    const locationId = (req as any).locationId;

    try {
        const {
            contactId,
            type,
            accountIds,
            customTopic
        } = req.body;

        if (!contactId) {
            return res.status(400).json({ error: 'contactId is required' });
        }

        // Get GHL token
        let ghlToken = (req as any).ghlToken;
        if (!ghlToken) {
            ghlToken = await db.getLocationToken(locationId);
        }

        if (!ghlToken) {
            return res.status(404).json({ error: 'Location not connected' });
        }

        const ghlClient = createGHLClient(ghlToken, locationId);

        // Get contact details
        const contact = await ghlClient.getContact(contactId);

        // Build topic from contact or use custom
        const topic = customTopic || `Welcome ${contact.firstName || 'our new client'} to our family!`;

        // Get brand brain
        const brandBrain = await db.getBrandBrain(locationId);

        const brandVoice: BrandVoice = brandBrain ? {
            name: brandBrain.brand_name || 'Business',
            industry: brandBrain.industry_niche || 'General',
            tone: brandBrain.tones || ['professional', 'friendly'],
            values: brandBrain.values || ['quality', 'service'],
            targetAudience: brandBrain.target_audience || 'general audience',
            keyMessages: brandBrain.key_messages || [],
            emojis: true
        } : {
            name: 'Business',
            industry: 'General',
            tone: ['professional', 'friendly'],
            values: ['quality', 'service'],
            targetAudience: 'general audience',
            keyMessages: [],
            emojis: true
        };

        const request: ContentRequest = {
            type: type || 'testimonial',
            topic,
            platforms: ['facebook', 'instagram'],
            brandVoice,
            includeHashtags: true,
            includeEmojis: true
        };

        const content = await socialContentEngine.generateContent(request);

        // Post if accountIds provided
        if (accountIds && accountIds.length > 0) {
            const postResult = await socialContentEngine.createAndSchedulePost(
                ghlClient,
                content,
                accountIds
            );

            return res.json({
                success: postResult.success,
                content,
                postIds: postResult.postIds,
                contact: { id: contactId, name: contact.firstName }
            });
        }

        res.json({
            success: true,
            content,
            contact: { id: contactId, name: contact.firstName }
        });

    } catch (error: any) {
        console.error('[Social Webhook] Contact content error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
