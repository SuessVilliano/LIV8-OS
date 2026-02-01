/**
 * Content Creation API
 * Endpoints for generating SEO/AEO/GEO optimized content
 */

import { Router, Request, Response } from 'express';
import { contentEngine, ContentRequest, Platform, ContentType } from '../services/content-engine.js';

const router = Router();

/**
 * POST /api/content/generate
 * Generate optimized content
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      contentType,
      platform,
      topic,
      optimization,
      tone,
      length,
      includeCallToAction,
      customInstructions
    } = req.body;

    if (!locationId || !contentType || !platform || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, contentType, platform, topic'
      });
    }

    const request: ContentRequest = {
      locationId,
      contentType,
      platform,
      topic,
      optimization: optimization || {},
      tone,
      length,
      includeCallToAction,
      customInstructions
    };

    const result = await contentEngine.generateContent(request);

    res.json({
      success: true,
      content: result
    });
  } catch (error: any) {
    console.error('Content generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate content'
    });
  }
});

/**
 * POST /api/content/generate-variants
 * Generate content with A/B test variants
 */
router.post('/generate-variants', async (req: Request, res: Response) => {
  try {
    const {
      locationId,
      contentType,
      platform,
      topic,
      optimization,
      tone,
      length,
      includeCallToAction,
      customInstructions,
      variantCount
    } = req.body;

    if (!locationId || !contentType || !platform || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const request: ContentRequest = {
      locationId,
      contentType,
      platform,
      topic,
      optimization: optimization || {},
      tone,
      length,
      includeCallToAction,
      customInstructions
    };

    const result = await contentEngine.generateVariants(request, variantCount || 3);

    res.json({
      success: true,
      content: result
    });
  } catch (error: any) {
    console.error('Variant generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate variants'
    });
  }
});

/**
 * POST /api/content/calendar
 * Generate a content calendar
 */
router.post('/calendar', async (req: Request, res: Response) => {
  try {
    const { locationId, platforms, durationWeeks, postsPerWeek } = req.body;

    if (!locationId || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, platforms (array)'
      });
    }

    const calendar = await contentEngine.generateContentCalendar(
      locationId,
      platforms as Platform[],
      durationWeeks || 4,
      postsPerWeek || 5
    );

    res.json({
      success: true,
      calendar,
      totalPosts: calendar.length,
      startDate: calendar[0]?.scheduledDate,
      endDate: calendar[calendar.length - 1]?.scheduledDate
    });
  } catch (error: any) {
    console.error('Calendar generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate calendar'
    });
  }
});

/**
 * POST /api/content/topics
 * Generate topic ideas
 */
router.post('/topics', async (req: Request, res: Response) => {
  try {
    const { locationId, count } = req.body;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing locationId'
      });
    }

    const topics = await contentEngine.generateTopicIdeas(locationId, count || 20);

    res.json({
      success: true,
      topics,
      count: topics.length
    });
  } catch (error: any) {
    console.error('Topic generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate topics'
    });
  }
});

/**
 * POST /api/content/optimize
 * Optimize existing content
 */
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const { locationId, content, targetOptimization } = req.body;

    if (!locationId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, content'
      });
    }

    const result = await contentEngine.optimizeContent(
      locationId,
      content,
      targetOptimization || 'all'
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Content optimization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to optimize content'
    });
  }
});

/**
 * POST /api/content/analyze
 * Analyze content for optimization opportunities
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Missing content to analyze'
      });
    }

    const analysis = await contentEngine.analyzeContent(content);

    res.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error('Content analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze content'
    });
  }
});

/**
 * GET /api/content/types
 * Get available content types and platforms
 */
router.get('/types', (req: Request, res: Response) => {
  const contentTypes: ContentType[] = [
    'social_post',
    'blog_article',
    'email_campaign',
    'ad_copy',
    'video_script',
    'landing_page',
    'product_description',
    'press_release',
    'case_study',
    'faq'
  ];

  const platforms: Platform[] = [
    'instagram',
    'facebook',
    'linkedin',
    'twitter',
    'tiktok',
    'youtube',
    'google_ads',
    'meta_ads',
    'email',
    'website'
  ];

  res.json({
    success: true,
    contentTypes: contentTypes.map(type => ({
      value: type,
      label: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    })),
    platforms: platforms.map(platform => ({
      value: platform,
      label: platform.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }))
  });
});

/**
 * POST /api/content/bulk-generate
 * Generate multiple pieces of content at once
 */
router.post('/bulk-generate', async (req: Request, res: Response) => {
  try {
    const { locationId, requests } = req.body;

    if (!locationId || !requests || !Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, requests (array)'
      });
    }

    const results = await Promise.all(
      requests.map(async (r: any) => {
        try {
          const result = await contentEngine.generateContent({
            locationId,
            contentType: r.contentType,
            platform: r.platform,
            topic: r.topic,
            optimization: r.optimization || {},
            tone: r.tone,
            length: r.length,
            includeCallToAction: r.includeCallToAction,
            customInstructions: r.customInstructions
          });
          return { success: true, content: result };
        } catch (error: any) {
          return { success: false, error: error.message, topic: r.topic };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: requests.length,
        successful,
        failed
      }
    });
  } catch (error: any) {
    console.error('Bulk generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed bulk content generation'
    });
  }
});

export default router;
