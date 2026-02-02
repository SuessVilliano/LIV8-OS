import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// In-memory storage (replace with DB in production)
const knowledgeBase: Map<string, any[]> = new Map();
const brandAssets: Map<string, any[]> = new Map();
const voiceSettings: Map<string, any> = new Map();

/**
 * GET /api/brand/knowledge
 * Get knowledge base entries for a client
 */
router.get('/knowledge', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        const entries = knowledgeBase.get(clientId) || [];

        res.json({ entries, total: entries.length });
    } catch (error: any) {
        console.error('Get knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/knowledge
 * Add a knowledge entry
 */
router.post('/knowledge', authenticate, async (req: Request, res: Response) => {
    try {
        const { clientId, entry } = req.body;

        if (!entry || !entry.title || !entry.content) {
            return res.status(400).json({ error: 'Entry with title and content required' });
        }

        const entries = knowledgeBase.get(clientId) || [];
        entries.push({
            ...entry,
            id: entry.id || `k_${Date.now()}`,
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        knowledgeBase.set(clientId, entries);

        res.json({ entry, success: true });
    } catch (error: any) {
        console.error('Add knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/brand/knowledge/:id
 * Update a knowledge entry
 */
router.put('/knowledge/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clientId, entry } = req.body;

        const entries = knowledgeBase.get(clientId) || [];
        const index = entries.findIndex(e => e.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Knowledge entry not found' });
        }

        entries[index] = {
            ...entries[index],
            ...entry,
            updatedAt: new Date().toISOString()
        };
        knowledgeBase.set(clientId, entries);

        res.json({ entry: entries[index], success: true });
    } catch (error: any) {
        console.error('Update knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/brand/knowledge/:id
 * Delete a knowledge entry
 */
router.delete('/knowledge/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = req.query.clientId as string || 'default';

        const entries = knowledgeBase.get(clientId) || [];
        const filtered = entries.filter(e => e.id !== id);
        knowledgeBase.set(clientId, filtered);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brand/assets
 * Get brand assets for a client
 */
router.get('/assets', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        const assets = brandAssets.get(clientId) || [];

        res.json({ assets, total: assets.length });
    } catch (error: any) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/assets/upload
 * Upload a brand asset (placeholder - actual file upload requires storage integration)
 */
router.post('/assets/upload', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.body.clientId || req.query.clientId as string || 'default';

        // In production, this would handle actual file uploads to S3/R2/etc.
        // For now, just create a placeholder asset record
        const asset = {
            id: `asset_${Date.now()}`,
            name: req.body.name || 'Uploaded Asset',
            type: req.body.type || 'file',
            url: req.body.url || null,
            size: req.body.size || '0 KB',
            category: req.body.category || 'document',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            createdAt: new Date().toISOString()
        };

        const assets = brandAssets.get(clientId) || [];
        assets.push(asset);
        brandAssets.set(clientId, assets);

        res.json({ asset, success: true });
    } catch (error: any) {
        console.error('Upload asset error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/brand/assets/:id
 * Delete a brand asset
 */
router.delete('/assets/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = req.query.clientId as string || 'default';

        const assets = brandAssets.get(clientId) || [];
        const filtered = assets.filter(a => a.id !== id);
        brandAssets.set(clientId, filtered);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete asset error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brand/voice
 * Get voice/tone settings for a client
 */
router.get('/voice', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        const settings = voiceSettings.get(clientId) || {
            professional: 85,
            empathetic: 40,
            direct: 92,
            friendly: 15
        };

        res.json({ settings });
    } catch (error: any) {
        console.error('Get voice settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brand/voice
 * Save voice/tone settings
 */
router.post('/voice', authenticate, async (req: Request, res: Response) => {
    try {
        const { clientId, tone } = req.body;

        voiceSettings.set(clientId, {
            ...tone,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, settings: tone });
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

export default router;
