/**
 * Creative Pipeline API
 *
 * Endpoints for the automated content generation pipeline.
 * Handles content pillars, batch generation, media creation,
 * approval workflows, and scheduling.
 */

import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { creativePipeline } from '../services/creative-pipeline.js';
import { aiProviderService } from '../services/ai-providers.js';
import { userSettingsVault } from '../services/user-settings-vault.js';

const router = express.Router();

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
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.use(authenticate);

// ============ PIPELINE CONFIG ============

/**
 * GET /api/pipeline/config
 * Get pipeline configuration for a location
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const config = creativePipeline.getConfig(locationId);
    res.json({ config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/config
 * Set pipeline configuration
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config.locationId) {
      config.locationId = (req as any).user.locationId;
    }

    // Validate required fields
    if (!config.brandName || typeof config.brandName !== 'string') {
      return res.status(400).json({ error: 'brandName is required' });
    }
    if (!config.brandVoice || !config.brandVoice.industry) {
      return res.status(400).json({ error: 'brandVoice.industry is required' });
    }
    if (!config.contentRatio || typeof config.contentRatio !== 'object') {
      return res.status(400).json({ error: 'contentRatio is required' });
    }

    // Ensure defaults for optional fields
    config.postsPerDay = config.postsPerDay || 3;
    config.platforms = config.platforms || ['instagram', 'facebook'];
    config.requireApproval = config.requireApproval !== false;
    config.autoGenerateMedia = config.autoGenerateMedia !== false;
    config.preferredImageProvider = config.preferredImageProvider || 'freepik';
    config.preferredVideoProvider = config.preferredVideoProvider || 'heygen';

    creativePipeline.setConfig(config);
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONTENT PILLARS ============

/**
 * GET /api/pipeline/pillars
 * Get content pillars for a location
 */
router.get('/pillars', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const pillars = creativePipeline.getPillars(locationId);
    res.json({ pillars });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/pillars/generate
 * Auto-generate content pillars from brand context
 */
router.post('/pillars/generate', async (req: Request, res: Response) => {
  try {
    const { brandContext, aiProvider } = req.body;
    const locationId = req.body.locationId || (req as any).user.locationId;

    const pillars = await creativePipeline.generatePillars(
      locationId,
      brandContext,
      aiProvider || 'gemini'
    );

    res.json({ pillars, count: pillars.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/pipeline/pillars/:id
 * Update a content pillar
 */
router.put('/pillars/:id', async (req: Request, res: Response) => {
  try {
    const pillar = creativePipeline.updatePillar(req.params.id, req.body);
    if (!pillar) return res.status(404).json({ error: 'Pillar not found' });
    res.json({ pillar });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/pipeline/pillars/:id
 * Delete a content pillar
 */
router.delete('/pillars/:id', async (req: Request, res: Response) => {
  try {
    const deleted = creativePipeline.deletePillar(req.params.id);
    res.json({ deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONTENT GENERATION ============

/**
 * POST /api/pipeline/generate
 * Generate a batch of content ideas
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const locationId = req.body.locationId || (req as any).user.locationId;
    const { days, pillarIds, includeTrends, aiProvider } = req.body;

    const ideas = await creativePipeline.generateContentBatch(locationId, {
      days,
      pillarIds,
      includeTrends,
      aiProvider
    });

    res.json({
      ideas,
      count: ideas.length,
      message: `Generated ${ideas.length} content ideas for ${days || 7} days`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/run
 * Run the full automated pipeline
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const locationId = req.body.locationId || (req as any).user.locationId;
    const { days, aiProvider, autoApprove, generateMedia } = req.body;

    const result = await creativePipeline.runFullPipeline(locationId, {
      days,
      aiProvider,
      autoApprove,
      generateMedia
    });

    res.json({
      ...result,
      message: `Pipeline complete: ${result.ideas.length} ideas, ${result.trends.length} trends, ${result.scheduled} scheduled`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONTENT IDEAS ============

/**
 * GET /api/pipeline/ideas
 * Get content ideas with filters
 */
router.get('/ideas', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const filters: any = {};
    if (req.query.status) filters.status = (req.query.status as string).split(',');
    if (req.query.pillarId) filters.pillarId = req.query.pillarId;
    if (req.query.platform) filters.platform = req.query.platform;
    if (req.query.contentType) filters.contentType = req.query.contentType;

    const ideas = creativePipeline.getIdeas(locationId, filters);
    res.json({ ideas, count: ideas.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pipeline/ideas/:id
 * Get a single content idea
 */
router.get('/ideas/:id', async (req: Request, res: Response) => {
  try {
    const idea = creativePipeline.getIdea(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    res.json({ idea });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/pipeline/ideas/:id
 * Update a content idea
 */
router.put('/ideas/:id', async (req: Request, res: Response) => {
  try {
    const idea = creativePipeline.updateIdea(req.params.id, req.body);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    res.json({ idea });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/ideas/:id/approve
 * Approve a content idea
 */
router.post('/ideas/:id/approve', async (req: Request, res: Response) => {
  try {
    const idea = creativePipeline.approveIdea(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Idea not found or not in generated status' });
    res.json({ idea, message: 'Idea approved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/ideas/:id/reject
 * Reject a content idea
 */
router.post('/ideas/:id/reject', async (req: Request, res: Response) => {
  try {
    const idea = creativePipeline.rejectIdea(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    res.json({ idea, message: 'Idea rejected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/ideas/approve-all
 * Approve all generated ideas and schedule them
 */
router.post('/ideas/approve-all', async (req: Request, res: Response) => {
  try {
    const locationId = req.body.locationId || (req as any).user.locationId;
    const result = creativePipeline.approveAndScheduleAll(locationId);
    res.json({
      ...result,
      message: `Approved ${result.approved} ideas, scheduled ${result.scheduled}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/ideas/schedule
 * Schedule all approved ideas
 */
router.post('/ideas/schedule', async (req: Request, res: Response) => {
  try {
    const locationId = req.body.locationId || (req as any).user.locationId;
    const scheduled = creativePipeline.scheduleApprovedIdeas(locationId);
    res.json({
      scheduled: scheduled.length,
      items: scheduled,
      message: `Scheduled ${scheduled.length} content items`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MEDIA GENERATION ============

/**
 * POST /api/pipeline/media/generate/:ideaId
 * Generate media for a specific content idea
 */
router.post('/media/generate/:ideaId', async (req: Request, res: Response) => {
  try {
    const locationId = req.body.locationId || (req as any).user.locationId;
    const { imageProvider, videoProvider, avatarId, voiceId } = req.body;

    const idea = await creativePipeline.generateMedia(locationId, req.params.ideaId, {
      imageProvider,
      videoProvider,
      avatarId,
      voiceId
    });

    if (!idea) return res.status(404).json({ error: 'Idea not found or no media prompt' });
    res.json({ idea, message: idea.videoId ? 'Video generation started (async)' : 'Media generated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipeline/media/generate-batch
 * Generate media for all ideas that need it
 */
router.post('/media/generate-batch', async (req: Request, res: Response) => {
  try {
    const locationId = req.body.locationId || (req as any).user.locationId;
    const { ideaIds } = req.body;

    const result = await creativePipeline.generateMediaBatch(locationId, ideaIds);
    res.json({
      ...result,
      message: `Media generation: ${result.success} complete, ${result.pending} pending, ${result.failed} failed`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HEYGEN SPECIFIC ============

/**
 * GET /api/pipeline/heygen/avatars
 * List available HeyGen avatars
 */
router.get('/heygen/avatars', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const settings = await userSettingsVault.getSettings(locationId);
    const apiKey = settings.heygenApiKey || process.env.HEYGEN_API_KEY;

    if (!apiKey) return res.status(400).json({ error: 'HeyGen API key not configured' });

    const avatars = await aiProviderService.listHeyGenAvatars(apiKey);
    res.json({ avatars });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pipeline/heygen/voices
 * List available HeyGen voices
 */
router.get('/heygen/voices', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const settings = await userSettingsVault.getSettings(locationId);
    const apiKey = settings.heygenApiKey || process.env.HEYGEN_API_KEY;

    if (!apiKey) return res.status(400).json({ error: 'HeyGen API key not configured' });

    const voices = await aiProviderService.listHeyGenVoices(apiKey);
    res.json({ voices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pipeline/heygen/status/:videoId
 * Check HeyGen video generation status
 */
router.get('/heygen/status/:videoId', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const settings = await userSettingsVault.getSettings(locationId);
    const apiKey = settings.heygenApiKey || process.env.HEYGEN_API_KEY;

    if (!apiKey) return res.status(400).json({ error: 'HeyGen API key not configured' });

    const status = await aiProviderService.checkHeyGenStatus(apiKey, req.params.videoId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ KLING AI STATUS ============

/**
 * GET /api/pipeline/kling/status/:taskId
 * Check Kling AI video generation status
 */
router.get('/kling/status/:taskId', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const settings = await userSettingsVault.getSettings(locationId);
    const apiKey = settings.klingApiKey || process.env.KLING_API_KEY;

    if (!apiKey) return res.status(400).json({ error: 'Kling AI API key not configured' });

    const status = await aiProviderService.checkKlingStatus(apiKey, req.params.taskId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pipeline/freepik/status/:taskId
 * Check Freepik image generation status
 */
router.get('/freepik/status/:taskId', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const settings = await userSettingsVault.getSettings(locationId);
    const apiKey = settings.freepikApiKey || process.env.FREEPIK_API_KEY;

    if (!apiKey) return res.status(400).json({ error: 'Freepik API key not configured' });

    const status = await aiProviderService.checkFreepikStatus(apiKey, req.params.taskId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MARKET TRENDS ============

/**
 * POST /api/pipeline/trends/fetch
 * Fetch current market trends
 */
router.post('/trends/fetch', async (req: Request, res: Response) => {
  try {
    const locationId = req.body.locationId || (req as any).user.locationId;
    const { industry, targetAudience, keywords, aiProvider } = req.body;

    const trends = await creativePipeline.fetchTrends(locationId, {
      industry,
      targetAudience,
      keywords: keywords || []
    }, aiProvider || 'gemini');

    res.json({ trends, count: trends.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pipeline/trends
 * Get cached trends
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const trends = creativePipeline.getTrends(locationId);
    res.json({ trends, count: trends.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============

/**
 * GET /api/pipeline/stats
 * Get pipeline statistics for dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string || (req as any).user.locationId;
    const stats = creativePipeline.getStats(locationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GHL WEBHOOK ENDPOINTS ============

/**
 * POST /api/pipeline/webhook/generate
 * Headless content generation triggered by GHL workflow
 */
router.post('/webhook/generate', async (req: Request, res: Response) => {
  try {
    const { locationId, days, autoApprove, aiProvider } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId required' });
    }

    const result = await creativePipeline.runFullPipeline(locationId, {
      days: days || 7,
      aiProvider: aiProvider || 'gemini',
      autoApprove: autoApprove !== false,
      generateMedia: true
    });

    res.json({
      success: true,
      ...result,
      message: `Pipeline generated ${result.ideas.length} pieces, scheduled ${result.scheduled}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
