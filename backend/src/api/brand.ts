import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { businessTwin } from '../db/business-twin.js';
import { knowledgeDb } from '../db/knowledge.js';

const router = Router();

/**
 * GET /api/brand/knowledge
 * Get knowledge base entries for a client (PERSISTENT - PostgreSQL)
 */
router.get('/knowledge', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        const category = req.query.category as string;
        const search = req.query.search as string;

        let entries;
        if (search) {
            entries = await knowledgeDb.searchKnowledge(clientId, search);
        } else if (category) {
            entries = await knowledgeDb.getKnowledgeByCategory(clientId, category);
        } else {
            entries = await knowledgeDb.getKnowledge(clientId);
        }

        res.json({ entries, total: entries.length });
    } catch (error: any) {
        console.error('Get knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/knowledge
 * Add a knowledge entry (PERSISTENT - PostgreSQL)
 */
router.post('/knowledge', authenticate, async (req: Request, res: Response) => {
    try {
        const { clientId, entry } = req.body;

        if (!entry || !entry.title || !entry.content) {
            return res.status(400).json({ error: 'Entry with title and content required' });
        }

        const newEntry = await knowledgeDb.addKnowledge({
            clientId: clientId || 'default',
            title: entry.title,
            content: entry.content,
            category: entry.category || 'general',
            tags: entry.tags || [],
            source: entry.source,
            sourceType: entry.sourceType || 'manual',
            confidence: entry.confidence || 100
        });

        res.json({ entry: newEntry, success: true });
    } catch (error: any) {
        console.error('Add knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/knowledge/bulk
 * Bulk import knowledge entries
 */
router.post('/knowledge/bulk', authenticate, async (req: Request, res: Response) => {
    try {
        const { clientId, entries } = req.body;

        if (!entries || !Array.isArray(entries)) {
            return res.status(400).json({ error: 'entries array is required' });
        }

        const imported = await knowledgeDb.bulkImportKnowledge(
            clientId || 'default',
            entries
        );

        res.json({ imported, success: true });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/brand/knowledge/:id
 * Update a knowledge entry (PERSISTENT - PostgreSQL)
 */
router.put('/knowledge/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clientId, entry } = req.body;

        const updated = await knowledgeDb.updateKnowledge(
            id,
            clientId || 'default',
            entry
        );

        if (!updated) {
            return res.status(404).json({ error: 'Knowledge entry not found' });
        }

        res.json({ entry: updated, success: true });
    } catch (error: any) {
        console.error('Update knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/brand/knowledge/:id
 * Delete a knowledge entry (PERSISTENT - PostgreSQL)
 */
router.delete('/knowledge/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = req.query.clientId as string || 'default';

        const deleted = await knowledgeDb.deleteKnowledge(id, clientId);

        if (!deleted) {
            return res.status(404).json({ error: 'Knowledge entry not found' });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brand/assets
 * Get brand assets for a client (PERSISTENT - PostgreSQL)
 */
router.get('/assets', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        const assets = await knowledgeDb.getAssets(clientId);

        res.json({ assets, total: assets.length });
    } catch (error: any) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/assets/upload
 * Upload a brand asset (PERSISTENT - PostgreSQL)
 */
router.post('/assets/upload', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.body.clientId || req.query.clientId as string || 'default';

        const asset = await knowledgeDb.addAsset({
            clientId,
            name: req.body.name || 'Uploaded Asset',
            type: req.body.type || 'file',
            url: req.body.url || '',
            size: req.body.size || '0 KB',
            category: req.body.category || 'document',
            metadata: req.body.metadata || {}
        });

        res.json({ asset, success: true });
    } catch (error: any) {
        console.error('Upload asset error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/brand/assets/:id
 * Delete a brand asset (PERSISTENT - PostgreSQL)
 */
router.delete('/assets/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = req.query.clientId as string || 'default';

        const deleted = await knowledgeDb.deleteAsset(id, clientId);

        if (!deleted) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete asset error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brand/voice
 * Get voice/tone settings for a client (PERSISTENT - PostgreSQL)
 */
router.get('/voice', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        const settings = await knowledgeDb.getVoiceSettings(clientId);

        res.json({ settings });
    } catch (error: any) {
        console.error('Get voice settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/voice
 * Save voice/tone settings (PERSISTENT - PostgreSQL)
 */
router.post('/voice', authenticate, async (req: Request, res: Response) => {
    try {
        const { clientId, tone } = req.body;

        const settings = await knowledgeDb.saveVoiceSettings({
            clientId: clientId || 'default',
            professional: tone.professional ?? 85,
            empathetic: tone.empathetic ?? 40,
            direct: tone.direct ?? 92,
            friendly: tone.friendly ?? 15,
            customTraits: tone.customTraits,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, settings });
    } catch (error: any) {
        console.error('Save voice settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brand/colors
 * Get brand colors for a client
 */
router.get('/colors', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        // This would typically come from the business twin or settings
        const colors = {
            primary: '#6366F1',
            secondary: '#10B981',
            accent: '#F59E0B',
            background: '#FAFAFA'
        };

        res.json({ colors });
    } catch (error: any) {
        console.error('Get colors error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/colors
 * Save brand colors
 */
router.post('/colors', authenticate, async (req: Request, res: Response) => {
    try {
        const { clientId, colors } = req.body;
        // In production, save to business twin or settings table
        res.json({ success: true, colors });
    } catch (error: any) {
        console.error('Save colors error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brand/sync
 * Sync brand data from Business Twin - returns complete brand profile for localStorage
 * This ensures onboarding data is universally accessible across the platform
 */
router.get('/sync', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.query.locationId as string || req.headers['x-location-id'] as string;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        // Fetch Business Twin data
        const twin = await businessTwin.getByLocationId(locationId);

        if (!twin) {
            return res.json({
                success: true,
                exists: false,
                brandData: null,
                message: 'No business twin found - onboarding may be required'
            });
        }

        // Fetch knowledge base
        const knowledge = await businessTwin.getKnowledge(locationId);

        // Build comprehensive brand data for frontend storage
        const brandData = {
            // Core Identity
            businessName: twin.identity.businessName || '',
            domain: twin.identity.domain || '',
            industry: twin.identity.industry || '',
            tagline: twin.identity.tagline || '',

            // Brand Voice
            brandVoice: twin.brandVoice.tone || '',
            personality: twin.brandVoice.personality || [],
            writingStyle: twin.brandVoice.writingStyle || '',

            // Visual Identity
            colors: {
                primary: (twin.identity as any).colors?.primary || '#8b5cf6',
                secondary: (twin.identity as any).colors?.secondary || '#06b6d4',
                accent: (twin.identity as any).colors?.accent || '#f59e0b'
            },
            logoUrl: (twin.identity as any).logoUrl || '',
            faviconUrl: (twin.identity as any).faviconUrl || '',

            // Social Links
            socialLinks: (twin.identity as any).socialLinks || {},

            // SEO/AEO Settings
            seoSettings: twin.contentGuidelines?.seo ? {
                metaTitle: '',
                metaDescription: '',
                keywords: twin.contentGuidelines.seo.primaryKeywords?.join(', ') || '',
                targetAudience: twin.contentGuidelines.aeo?.targetQuestions?.[0] || '',
                uniqueValue: ''
            } : {},

            // Goals & Context (from knowledge base)
            goals: knowledge.find(k => k.category === 'company' && k.fact.startsWith('Business goals:'))?.fact.replace('Business goals: ', '') || '',
            painPoints: knowledge.find(k => k.category === 'company' && k.fact.startsWith('Key challenges:'))?.fact.replace('Key challenges: ', '') || '',

            // AI Staff Configuration
            selectedStaff: Object.keys(twin.agentConfigs || {}),

            // Metadata
            onboardingComplete: twin.onboardingComplete,
            lastUpdated: twin.lastUpdatedAt,
            version: twin.version
        };

        res.json({
            success: true,
            exists: true,
            brandData,
            twinId: twin.id
        });

    } catch (error: any) {
        console.error('[Brand Sync] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/sync
 * Save brand data to Business Twin - updates the canonical source of truth
 */
router.post('/sync', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.body.locationId || req.headers['x-location-id'] as string;
        const brandData = req.body.brandData;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        if (!brandData) {
            return res.status(400).json({ error: 'brandData is required' });
        }

        // Check if twin exists
        let twin = await businessTwin.getByLocationId(locationId);

        if (!twin) {
            // Create new twin
            twin = await businessTwin.create({
                locationId,
                crmType: req.body.crmType || 'liv8',
                identity: {
                    businessName: brandData.businessName || '',
                    domain: brandData.domain || '',
                    industry: brandData.industry || '',
                    tagline: brandData.tagline || '',
                    colors: brandData.colors,
                    socialLinks: brandData.socialLinks,
                    logoUrl: brandData.logoUrl,
                    faviconUrl: brandData.faviconUrl
                } as any
            });
        } else {
            // Update existing twin
            await businessTwin.updateIdentity(locationId, {
                businessName: brandData.businessName,
                domain: brandData.domain,
                industry: brandData.industry,
                tagline: brandData.tagline
            });
        }

        // Update brand voice if provided
        if (brandData.brandVoice) {
            await businessTwin.updateBrandVoice(locationId, {
                tone: brandData.brandVoice,
                personality: brandData.personality || [],
                writingStyle: brandData.writingStyle || ''
            } as any);
        }

        // Update goals/painPoints as knowledge
        if (brandData.goals) {
            await businessTwin.addKnowledge({
                locationId,
                category: 'company',
                fact: `Business goals: ${brandData.goals}`,
                source: 'brand_sync',
                sourceType: 'manual',
                confidence: 100
            });
        }

        if (brandData.painPoints) {
            await businessTwin.addKnowledge({
                locationId,
                category: 'company',
                fact: `Key challenges: ${brandData.painPoints}`,
                source: 'brand_sync',
                sourceType: 'manual',
                confidence: 100
            });
        }

        res.json({
            success: true,
            message: 'Brand data synced to Business Twin',
            twinId: twin.id
        });

    } catch (error: any) {
        console.error('[Brand Sync] Save error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
