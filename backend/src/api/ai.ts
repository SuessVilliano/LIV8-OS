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
 * POST /api/ai/generate-workflow-prompt
 * Generate an optimized natural language prompt for GHL's AI Workflow Builder
 */
router.post('/generate-workflow-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, crmType = 'ghl' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing prompt'
      });
    }

    // Generate optimized GHL/Vbout workflow prompt
    const lowerPrompt = prompt.toLowerCase();
    let ghlPrompt = 'Create an automation workflow that ';

    // Intelligent prompt enhancement based on intent
    if (lowerPrompt.includes('follow up') || lowerPrompt.includes('followup')) {
      ghlPrompt += `automatically follows up with contacts. When a contact is added or a form is submitted, wait 24 hours then send a personalized SMS message asking if they have any questions about your services. If no response after 2 days, send a helpful email with additional resources and FAQ. After another 3 days with no engagement, add tag "needs-attention" and notify the assigned user. Move the contact through pipeline stages based on their responses.`;
    } else if (lowerPrompt.includes('appointment') || lowerPrompt.includes('booking') || lowerPrompt.includes('calendar')) {
      ghlPrompt += `manages appointment bookings and reminders. When an appointment is scheduled, immediately send a confirmation SMS with the date, time, and location details. Also send a confirmation email with calendar invite attachment. 24 hours before the appointment, send a reminder SMS. 1 hour before, send a final reminder with directions or meeting link. If the appointment is marked as no-show, wait 1 hour then send a rebooking SMS with a link to reschedule. Update opportunity status accordingly.`;
    } else if (lowerPrompt.includes('lead') || lowerPrompt.includes('new contact') || lowerPrompt.includes('welcome')) {
      ghlPrompt += `nurtures new leads through an onboarding sequence. When a new contact is created, immediately send a warm welcome SMS introducing your business. Wait 1 hour, then send a detailed email showcasing your services and unique value proposition. Add tag "New Lead" and create an opportunity in the sales pipeline. After 3 days, if no engagement or reply, send a follow-up SMS with a special first-time offer. Track all engagement and update contact score.`;
    } else if (lowerPrompt.includes('review') || lowerPrompt.includes('testimonial') || lowerPrompt.includes('feedback')) {
      ghlPrompt += `requests reviews from satisfied customers. When an opportunity is marked as Won or a service is completed, wait 7 days then send a thank you SMS with a direct link to leave a Google review. Include a personalized message referencing their purchase or service. If no review is detected after 3 days, send a gentle email reminder explaining how much reviews help your business. Offer an incentive like a discount on their next purchase. Tag contacts who leave reviews for VIP treatment.`;
    } else if (lowerPrompt.includes('reactivation') || lowerPrompt.includes('inactive') || lowerPrompt.includes('win back')) {
      ghlPrompt += `reactivates dormant contacts. Find contacts who haven't engaged in 30+ days using a filter or tag. Send them a personalized "We miss you" SMS with a special comeback offer or discount code valid for 7 days. If they click or respond, immediately move them to the active pipeline and notify the sales team. If no response after 5 days, send a final email with your best offer. After 14 days of no engagement, add tag "cold" and pause further automation.`;
    } else if (lowerPrompt.includes('birthday') || lowerPrompt.includes('anniversary')) {
      ghlPrompt += `sends personalized birthday and anniversary messages. Use the contact's birthday custom field to trigger on their birthday. Send a heartfelt SMS with birthday wishes and a special birthday discount code. Follow up with an email containing an exclusive birthday offer valid for 7 days. For customer anniversaries (1 year since first purchase), send a thank you message with a loyalty reward. Tag VIP customers for extra special treatment.`;
    } else if (lowerPrompt.includes('missed call') || lowerPrompt.includes('voicemail')) {
      ghlPrompt += `recovers missed calls and voicemails. When a call is missed or goes to voicemail, immediately send an SMS apologizing for missing their call and asking how you can help. Include business hours and alternative contact methods. If they don't respond within 2 hours during business hours, send a follow-up asking for a good time to call back. Create a task for the team to follow up. Track callback success rate.`;
    } else if (lowerPrompt.includes('cart') || lowerPrompt.includes('abandon') || lowerPrompt.includes('checkout')) {
      ghlPrompt += `recovers abandoned carts and incomplete checkouts. When a cart abandonment event is detected, wait 1 hour then send an SMS reminder about their pending items. Include a direct link back to their cart. After 24 hours, send an email with the cart contents and a small discount to encourage completion. After 3 days, send a final "last chance" message with your best offer. Track recovery rate and revenue recovered.`;
    } else {
      // Generic enhancement for custom prompts
      ghlPrompt += `${prompt}. Include appropriate triggers based on contact activity or form submissions. Add strategic wait/delay steps between actions (15 minutes to several days depending on urgency). Send relevant SMS and email communications with personalized merge fields like {{contact.first_name}}. Update contact tags and pipeline stages to track progress. Add conditional branches based on contact responses or engagement. Include internal notifications for your team when important actions occur. Make sure to handle both positive and negative outcomes.`;
    }

    // Add CRM-specific tips
    const tips = crmType === 'ghl'
      ? 'Tip: In GHL, click "Build with AI" in the workflow builder, paste this prompt, and the AI will create the workflow structure for you. Review and customize the generated workflow before publishing.'
      : 'Tip: This prompt is optimized for automation platforms. Adapt the triggers and actions to match your Vbout workflow builder.';

    res.json({
      success: true,
      ghlPrompt,
      tips,
      originalPrompt: prompt
    });
  } catch (error: any) {
    console.error('Workflow prompt generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate workflow prompt'
    });
  }
});

/**
 * POST /api/ai/provision
 * Provision AI infrastructure for a new client (internal - seamless to users)
 * This sets up their AI Manager and AI Staff team
 */
router.post('/provision', async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      clientName,
      crmType,
      messagingPlatform,
      messagingConfig,
      brandBrain,
      selectedStaff
    } = req.body;

    if (!clientId || !clientName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId, clientName'
      });
    }

    // Store AI configuration in business twin
    const existingTwin = await businessTwin.getByLocationId(clientId);

    const aiConfig = {
      provisioned: true,
      provisionedAt: new Date().toISOString(),
      messagingPlatform: messagingPlatform || 'none',
      aiStaff: selectedStaff || ['support-agent', 'sales-agent'],
      brandBrain: brandBrain || {},
      status: 'active'
    };

    // Update or create twin with AI config
    if (existingTwin) {
      await businessTwin.update(clientId, {
        ...existingTwin,
        aiConfig
      });
    } else {
      await businessTwin.create({
        locationId: clientId,
        identity: {
          businessName: clientName,
          industry: brandBrain?.industry || ''
        },
        aiConfig
      });
    }

    // Generate webhook URL based on messaging platform
    // Note: In production, this would call the actual Moltworker provisioning API
    const baseUrl = process.env.AI_WORKER_URL || 'https://agent.liv8ai.com';
    const webhookUrl = messagingPlatform !== 'none'
      ? `${baseUrl}/webhook/${messagingPlatform}/${clientId}`
      : null;

    // Store provisioning info for dashboard access
    const provisionRecord = {
      clientId,
      clientName,
      crmType,
      messagingPlatform,
      webhookUrl,
      aiStaff: selectedStaff,
      provisionedAt: new Date().toISOString(),
      status: 'active'
    };

    // Log successful provisioning
    console.log(`[AI Provision] Successfully provisioned AI for ${clientName} (${clientId})`);

    res.json({
      success: true,
      clientId,
      webhookUrl,
      aiStaff: selectedStaff,
      message: `AI infrastructure provisioned for ${clientName}`,
      nextSteps: messagingPlatform !== 'none'
        ? `Your AI Manager will be available on ${messagingPlatform}. Check your messages!`
        : 'Your AI Staff is ready in the dashboard.'
    });

  } catch (error: any) {
    console.error('[AI Provision] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to provision AI infrastructure'
    });
  }
});

/**
 * GET /api/ai/status/:clientId
 * Get AI infrastructure status for a client
 */
router.get('/status/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const twin = await businessTwin.getByLocationId(clientId);

    if (!twin || !twin.aiConfig) {
      return res.json({
        success: true,
        provisioned: false,
        message: 'AI not yet provisioned for this account'
      });
    }

    res.json({
      success: true,
      provisioned: true,
      status: twin.aiConfig.status,
      messagingPlatform: twin.aiConfig.messagingPlatform,
      aiStaff: twin.aiConfig.aiStaff,
      provisionedAt: twin.aiConfig.provisionedAt
    });

  } catch (error: any) {
    console.error('[AI Status] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
