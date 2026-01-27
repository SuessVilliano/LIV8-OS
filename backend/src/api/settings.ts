import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { userSettingsVault, AIProvider } from '../services/user-settings-vault.js';
import { db } from '../db/index.js';

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
 * GET /api/settings/:locationId
 * Get user settings (with masked API keys)
 */
router.get('/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        const settings = await userSettingsVault.getSettingsMasked(locationId);

        res.json({
            success: true,
            settings
        });

    } catch (error: any) {
        console.error('[Settings API] Get settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/settings/:locationId
 * Update user settings
 */
router.put('/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const updates = req.body;

        // Don't allow updating masked keys (they come back as ****)
        if (updates.geminiApiKey?.includes('*')) delete updates.geminiApiKey;
        if (updates.openaiApiKey?.includes('*')) delete updates.openaiApiKey;
        if (updates.anthropicApiKey?.includes('*')) delete updates.anthropicApiKey;
        if (updates.webhookSecret?.includes('*')) delete updates.webhookSecret;

        await userSettingsVault.saveSettings(locationId, updates);

        const settings = await userSettingsVault.getSettingsMasked(locationId);

        res.json({
            success: true,
            message: 'Settings updated',
            settings
        });

    } catch (error: any) {
        console.error('[Settings API] Update settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settings/:locationId/api-key
 * Add or update an API key
 */
router.post('/:locationId/api-key', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { provider, apiKey, validate } = req.body;

        if (!provider || !apiKey) {
            return res.status(400).json({ error: 'provider and apiKey required' });
        }

        if (!['gemini', 'openai', 'anthropic'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider. Must be: gemini, openai, or anthropic' });
        }

        // Optionally validate the key before saving
        if (validate) {
            const validation = await userSettingsVault.validateApiKey(provider as AIProvider, apiKey);
            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Invalid API key',
                    details: validation.error
                });
            }
        }

        // Save the key
        const keyField = `${provider}ApiKey`;
        await userSettingsVault.saveSettings(locationId, {
            [keyField]: apiKey,
            aiProvider: provider as AIProvider // Set as active provider
        });

        res.json({
            success: true,
            message: `${provider} API key saved`,
            provider
        });

    } catch (error: any) {
        console.error('[Settings API] Save API key error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/settings/:locationId/api-key/:provider
 * Delete an API key
 */
router.delete('/:locationId/api-key/:provider', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, provider } = req.params;

        if (!['gemini', 'openai', 'anthropic'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        await userSettingsVault.deleteApiKey(locationId, provider as 'gemini' | 'openai' | 'anthropic');

        res.json({
            success: true,
            message: `${provider} API key deleted`
        });

    } catch (error: any) {
        console.error('[Settings API] Delete API key error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settings/:locationId/validate-key
 * Validate an API key without saving
 */
router.post('/:locationId/validate-key', authenticate, async (req: Request, res: Response) => {
    try {
        const { provider, apiKey } = req.body;

        if (!provider || !apiKey) {
            return res.status(400).json({ error: 'provider and apiKey required' });
        }

        const validation = await userSettingsVault.validateApiKey(provider as AIProvider, apiKey);

        res.json({
            valid: validation.valid,
            error: validation.error
        });

    } catch (error: any) {
        console.error('[Settings API] Validate key error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settings/:locationId/webhook-secret
 * Generate a new webhook secret
 */
router.post('/:locationId/webhook-secret', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        const webhookSecret = userSettingsVault.generateWebhookSecret();

        await userSettingsVault.saveSettings(locationId, { webhookSecret });

        res.json({
            success: true,
            message: 'Webhook secret generated',
            // Return the full secret only on generation (user should save it)
            webhookSecret
        });

    } catch (error: any) {
        console.error('[Settings API] Generate webhook secret error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/settings/:locationId/ai-provider
 * Set the active AI provider
 */
router.put('/:locationId/ai-provider', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { provider } = req.body;

        if (!['gemini', 'openai', 'anthropic'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        // Check if the key exists for this provider
        const settings = await userSettingsVault.getSettings(locationId);
        const keyField = `${provider}ApiKey` as keyof typeof settings;

        if (!settings[keyField]) {
            return res.status(400).json({
                error: `No API key configured for ${provider}. Please add a key first.`
            });
        }

        await userSettingsVault.saveSettings(locationId, { aiProvider: provider as AIProvider });

        res.json({
            success: true,
            message: `AI provider set to ${provider}`,
            provider
        });

    } catch (error: any) {
        console.error('[Settings API] Set AI provider error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/settings/:locationId/content-preferences
 * Update content generation preferences
 */
router.put('/:locationId/content-preferences', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { defaultPlatforms, defaultHashtags, contentPreferences } = req.body;

        await userSettingsVault.saveSettings(locationId, {
            defaultPlatforms,
            defaultHashtags,
            contentPreferences
        });

        res.json({
            success: true,
            message: 'Content preferences updated'
        });

    } catch (error: any) {
        console.error('[Settings API] Update preferences error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/settings/:locationId/webhook-info
 * Get webhook configuration info for user to set up in GHL
 */
router.get('/:locationId/webhook-info', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const settings = await userSettingsVault.getSettings(locationId);

        const baseUrl = process.env.BACKEND_URL || 'https://your-backend.vercel.app';

        res.json({
            success: true,
            webhookEndpoints: {
                generateContent: {
                    url: `${baseUrl}/api/social/webhook/generate`,
                    method: 'POST',
                    description: 'Generate and post social content',
                    exampleBody: {
                        locationId,
                        topic: 'Your topic here',
                        type: 'promotional',
                        platforms: ['facebook', 'instagram'],
                        accountIds: ['your-social-account-ids']
                    }
                },
                scheduleWeek: {
                    url: `${baseUrl}/api/social/webhook/schedule-week`,
                    method: 'POST',
                    description: 'Schedule a week of content',
                    exampleBody: {
                        locationId,
                        topics: ['Topic 1', 'Topic 2', 'Topic 3'],
                        platforms: ['facebook', 'instagram'],
                        accountIds: ['your-social-account-ids'],
                        postsPerWeek: 5
                    }
                },
                contactContent: {
                    url: `${baseUrl}/api/social/webhook/contact-content`,
                    method: 'POST',
                    description: 'Generate content for a specific contact',
                    exampleBody: {
                        locationId,
                        contactId: '{{contact.id}}',
                        type: 'testimonial',
                        accountIds: ['your-social-account-ids']
                    }
                }
            },
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': settings.webhookSecret ? '(Your webhook secret)' : '(Generate a webhook secret first)'
            },
            hasWebhookSecret: !!settings.webhookSecret
        });

    } catch (error: any) {
        console.error('[Settings API] Get webhook info error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
