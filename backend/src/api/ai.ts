/**
 * AI Providers API
 * Manage API keys and generate content with multiple AI providers
 */

import { Router, Request, Response } from 'express';
import { aiProviderService, AIProvider, TIER_LIMITS, PROVIDER_CAPABILITIES } from '../services/ai-providers.js';
import { businessTwin } from '../db/business-twin.js';

const router = Router();

/**
 * GET /api/ai/providers
 * Get available AI providers and their capabilities
 */
router.get('/providers', (req: Request, res: Response) => {
  const { locationId } = req.query;

  const providers = locationId
    ? aiProviderService.getUserProviders(locationId as string)
    : Object.entries(PROVIDER_CAPABILITIES).map(([provider, capabilities]) => ({
        provider,
        isUserKey: false,
        capabilities
      }));

  res.json({
    success: true,
    providers,
    capabilities: PROVIDER_CAPABILITIES
  });
});

/**
 * POST /api/ai/keys
 * Set user's API key for a provider (BYOK)
 */
router.post('/keys', (req: Request, res: Response) => {
  const { locationId, provider, apiKey, model } = req.body;

  if (!locationId || !provider || !apiKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: locationId, provider, apiKey'
    });
  }

  if (!PROVIDER_CAPABILITIES[provider as AIProvider]) {
    return res.status(400).json({
      success: false,
      error: `Invalid provider: ${provider}. Valid providers: ${Object.keys(PROVIDER_CAPABILITIES).join(', ')}`
    });
  }

  aiProviderService.setUserKey(locationId, provider as AIProvider, apiKey, model);

  res.json({
    success: true,
    message: `API key set for ${provider}`,
    provider,
    capabilities: PROVIDER_CAPABILITIES[provider as AIProvider]
  });
});

/**
 * DELETE /api/ai/keys/:provider
 * Remove user's API key
 */
router.delete('/keys/:provider', (req: Request, res: Response) => {
  const { provider } = req.params;
  const { locationId } = req.body;

  if (!locationId) {
    return res.status(400).json({ success: false, error: 'Missing locationId' });
  }

  aiProviderService.removeUserKey(locationId, provider as AIProvider);

  res.json({
    success: true,
    message: `API key removed for ${provider}`
  });
});

/**
 * GET /api/ai/usage/:locationId
 * Get usage statistics
 */
router.get('/usage/:locationId', (req: Request, res: Response) => {
  const { locationId } = req.params;
  const tier = (req.query.tier as keyof typeof TIER_LIMITS) || 'growth';

  const usage = aiProviderService.getUsageStats(locationId, tier);

  res.json({
    success: true,
    tier,
    usage,
    limits: TIER_LIMITS[tier]
  });
});

/**
 * POST /api/ai/generate
 * Generate content using specified provider
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      provider,
      type,
      prompt,
      options,
      includeBusinessContext
    } = req.body;

    if (!locationId || !provider || !type || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, provider, type, prompt'
      });
    }

    // Get business twin context if requested
    let context: any = {};
    if (includeBusinessContext) {
      const twin = await businessTwin.getByLocationId(locationId);
      if (twin) {
        context.businessTwin = twin;
      }
    }

    const tier = (req.body.tier as keyof typeof TIER_LIMITS) || 'growth';

    const result = await aiProviderService.generate(locationId, {
      provider,
      type,
      prompt,
      options,
      context
    }, tier);

    res.json({
      success: result.success,
      ...result
    });
  } catch (error: any) {
    console.error('AI generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Generation failed'
    });
  }
});

/**
 * POST /api/ai/generate/image
 * Generate image using AI
 */
router.post('/generate/image', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      prompt,
      provider = 'openai',
      style,
      size,
      negativePrompt
    } = req.body;

    if (!locationId || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, prompt'
      });
    }

    const tier = (req.body.tier as keyof typeof TIER_LIMITS) || 'growth';

    const result = await aiProviderService.generate(locationId, {
      provider: provider as AIProvider,
      type: 'image',
      prompt,
      options: { imageSize: size, style, negativePrompt }
    }, tier);

    res.json({
      success: result.success,
      ...result
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Image generation failed'
    });
  }
});

/**
 * POST /api/ai/generate/video
 * Generate video using Kling AI
 */
router.post('/generate/video', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      prompt,
      duration = 5,
      style,
      negativePrompt
    } = req.body;

    if (!locationId || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, prompt'
      });
    }

    const tier = (req.body.tier as keyof typeof TIER_LIMITS) || 'growth';

    const result = await aiProviderService.generate(locationId, {
      provider: 'kling',
      type: 'video',
      prompt,
      options: { videoDuration: duration, style, negativePrompt }
    }, tier);

    res.json({
      success: result.success,
      ...result
    });
  } catch (error: any) {
    console.error('Video generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Video generation failed'
    });
  }
});

/**
 * POST /api/ai/edit/image
 * Edit an existing image
 */
router.post('/edit/image', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      imageUrl,
      editPrompt,
      provider = 'openai'
    } = req.body;

    if (!locationId || !imageUrl || !editPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, imageUrl, editPrompt'
      });
    }

    const tier = (req.body.tier as keyof typeof TIER_LIMITS) || 'growth';

    // Image editing would use provider's edit endpoint
    const result = await aiProviderService.generate(locationId, {
      provider: provider as AIProvider,
      type: 'edit',
      prompt: `Edit this image: ${imageUrl}\n\nEdit instructions: ${editPrompt}`
    }, tier);

    res.json({
      success: result.success,
      ...result
    });
  } catch (error: any) {
    console.error('Image edit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Image editing failed'
    });
  }
});

/**
 * GET /api/ai/models
 * Get available models per provider
 */
router.get('/models', (req: Request, res: Response) => {
  const models = {
    gemini: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast, efficient' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Latest generation' }
    ],
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, multimodal' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, affordable' },
      { id: 'dall-e-3', name: 'DALL-E 3', description: 'Image generation' }
    ],
    claude: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best balance' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast, efficient' }
    ],
    deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General purpose' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Code-optimized' }
    ],
    kling: [
      { id: 'kling-v1', name: 'Kling v1', description: 'Video generation' },
      { id: 'kling-image', name: 'Kling Image', description: 'Image generation' }
    ]
  };

  res.json({
    success: true,
    models
  });
});

export default router;
