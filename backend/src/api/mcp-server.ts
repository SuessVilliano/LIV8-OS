/**
 * LIV8 OS MCP Server
 *
 * Exposes LIV8 OS as a proper MCP server so external platforms
 * (Claude, GHL Agent Studio, Make.com, Zapier, custom agents)
 * can connect headlessly and use all LIV8 capabilities.
 *
 * Protocol: HTTP with JSON-RPC style (compatible with MCP HTTP transport)
 * Auth: Bearer token (JWT from /api/auth/login)
 *
 * Tools exposed:
 * - Content Pipeline (generate, approve, schedule, publish)
 * - Brand Management (scan, get brain, update voice)
 * - Creative Studio (generate images, videos, avatar videos)
 * - Social Media (post, schedule, get accounts)
 * - Market Intelligence (fetch trends, get insights)
 * - AI Providers (list, generate text/image/video)
 * - Settings (get/set API keys via BYOK)
 */

import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { creativePipeline } from '../services/creative-pipeline.js';
import { aiProviderService, PROVIDER_CAPABILITIES } from '../services/ai-providers.js';
import { contentScheduler } from '../services/content-scheduler.js';
import { PIPELINE_AGENT_TEMPLATES } from '../agents/smart-agents/builders/pipeline-agents.js';

const router = express.Router();

// Auth middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Bearer token required. Get one from POST /api/auth/login' });
    }
    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Tool definitions for MCP schema discovery
const LIV8_TOOLS = {
  // === Content Pipeline ===
  'pipeline.configure': {
    description: 'Configure the content pipeline for a brand. Sets brand voice, posting frequency, platforms, content ratios, and preferred AI providers.',
    inputSchema: {
      type: 'object',
      required: ['locationId', 'brandName', 'brandVoice', 'contentRatio'],
      properties: {
        locationId: { type: 'string', description: 'GHL location ID or workspace ID' },
        brandName: { type: 'string', description: 'Brand name (e.g. "Hybrid Funding")' },
        brandVoice: {
          type: 'object',
          properties: {
            tone: { type: 'array', items: { type: 'string' }, description: 'Voice tones (e.g. ["authoritative","motivational"])' },
            doSay: { type: 'array', items: { type: 'string' } },
            dontSay: { type: 'array', items: { type: 'string' } },
            targetAudience: { type: 'string' },
            industry: { type: 'string' }
          }
        },
        postsPerDay: { type: 'number', default: 3 },
        platforms: { type: 'array', items: { type: 'string' }, default: ['instagram', 'facebook', 'twitter'] },
        requireApproval: { type: 'boolean', default: true },
        autoGenerateMedia: { type: 'boolean', default: true },
        preferredImageProvider: { type: 'string', enum: ['freepik', 'openai'], default: 'freepik' },
        preferredVideoProvider: { type: 'string', enum: ['heygen', 'kling'], default: 'heygen' },
        contentRatio: {
          type: 'object',
          properties: {
            textPosts: { type: 'number' }, imagePosts: { type: 'number' },
            videoPosts: { type: 'number' }, avatarVideos: { type: 'number' }
          }
        }
      }
    }
  },
  'pipeline.run': {
    description: 'Run the full automated content pipeline: fetch trends, generate content batch, create media, and optionally auto-approve and schedule. This is the "money printer" endpoint.',
    inputSchema: {
      type: 'object',
      required: ['locationId'],
      properties: {
        locationId: { type: 'string' },
        days: { type: 'number', default: 7, description: 'How many days of content to generate' },
        autoApprove: { type: 'boolean', default: false },
        generateMedia: { type: 'boolean', default: true },
        aiProvider: { type: 'string', enum: ['gemini', 'openai', 'claude'], default: 'gemini' }
      }
    }
  },
  'pipeline.generate_pillars': {
    description: 'Auto-generate content pillars from brand context. Creates topic buckets, hooks, CTAs, and frequency recommendations.',
    inputSchema: {
      type: 'object',
      required: ['locationId', 'brandContext'],
      properties: {
        locationId: { type: 'string' },
        brandContext: {
          type: 'object',
          properties: {
            name: { type: 'string' }, industry: { type: 'string' },
            targetAudience: { type: 'string' }, services: { type: 'array', items: { type: 'string' } },
            uniqueValue: { type: 'string' }
          }
        },
        aiProvider: { type: 'string', default: 'gemini' }
      }
    }
  },
  'pipeline.generate_content': {
    description: 'Generate a batch of content ideas based on active pillars and brand context.',
    inputSchema: {
      type: 'object',
      required: ['locationId'],
      properties: {
        locationId: { type: 'string' },
        days: { type: 'number', default: 7 },
        pillarIds: { type: 'array', items: { type: 'string' } },
        includeTrends: { type: 'boolean', default: true },
        aiProvider: { type: 'string', default: 'gemini' }
      }
    }
  },
  'pipeline.get_ideas': {
    description: 'Get content ideas from the queue, with optional filters by status, platform, or content type.',
    inputSchema: {
      type: 'object',
      required: ['locationId'],
      properties: {
        locationId: { type: 'string' },
        status: { type: 'string', enum: ['generated', 'queued', 'approved', 'scheduled', 'posted', 'rejected'] },
        platform: { type: 'string' },
        contentType: { type: 'string' }
      }
    }
  },
  'pipeline.approve_idea': {
    description: 'Approve a content idea for scheduling.',
    inputSchema: {
      type: 'object', required: ['ideaId'],
      properties: { ideaId: { type: 'string' } }
    }
  },
  'pipeline.reject_idea': {
    description: 'Reject a content idea.',
    inputSchema: {
      type: 'object', required: ['ideaId'],
      properties: { ideaId: { type: 'string' } }
    }
  },
  'pipeline.approve_all': {
    description: 'Approve all generated ideas and schedule them for publishing.',
    inputSchema: {
      type: 'object', required: ['locationId'],
      properties: { locationId: { type: 'string' } }
    }
  },
  'pipeline.schedule': {
    description: 'Schedule all approved content ideas for publishing.',
    inputSchema: {
      type: 'object', required: ['locationId'],
      properties: { locationId: { type: 'string' } }
    }
  },
  'pipeline.get_stats': {
    description: 'Get pipeline statistics: total ideas, status breakdown, platform breakdown, active pillars, and trend count.',
    inputSchema: {
      type: 'object', required: ['locationId'],
      properties: { locationId: { type: 'string' } }
    }
  },

  // === Creative Generation ===
  'creative.generate_image': {
    description: 'Generate an AI image using Freepik (Flux) or OpenAI (DALL-E). Requires BYOK API key.',
    inputSchema: {
      type: 'object', required: ['locationId', 'prompt'],
      properties: {
        locationId: { type: 'string' },
        prompt: { type: 'string', description: 'Detailed image description' },
        provider: { type: 'string', enum: ['freepik', 'openai'], default: 'freepik' },
        style: { type: 'string', default: 'photo' },
        size: { type: 'string', default: 'square_1_1' }
      }
    }
  },
  'creative.generate_avatar_video': {
    description: 'Generate a talking-head video using HeyGen avatar. Requires BYOK HeyGen API key.',
    inputSchema: {
      type: 'object', required: ['locationId', 'script'],
      properties: {
        locationId: { type: 'string' },
        script: { type: 'string', description: 'The text the avatar will speak' },
        avatarId: { type: 'string' },
        voiceId: { type: 'string' },
        aspectRatio: { type: 'string', enum: ['16:9', '9:16'], default: '16:9' }
      }
    }
  },
  'creative.generate_video': {
    description: 'Generate an AI video using Kling AI. Requires BYOK API key.',
    inputSchema: {
      type: 'object', required: ['locationId', 'prompt'],
      properties: {
        locationId: { type: 'string' },
        prompt: { type: 'string' },
        duration: { type: 'number', default: 5 },
        style: { type: 'string', default: 'realistic' }
      }
    }
  },
  'creative.text_to_speech': {
    description: 'Generate speech audio from text using VoxCPM (self-hosted, open-source ElevenLabs alternative). Supports voice design from natural language descriptions, voice cloning from reference audio, and style control.',
    inputSchema: {
      type: 'object', required: ['locationId', 'text'],
      properties: {
        locationId: { type: 'string' },
        text: { type: 'string', description: 'The text to convert to speech' },
        voiceDescription: { type: 'string', description: 'Natural language voice description (e.g. "young confident male, deep authoritative tone"). Used for voice design mode.' },
        referenceAudioUrl: { type: 'string', description: 'URL to reference audio file for voice cloning' },
        referenceText: { type: 'string', description: 'Transcript of reference audio for ultimate cloning mode' },
        emotion: { type: 'string', description: 'Control emotion: cheerful, calm, excited, serious, warm' },
        speed: { type: 'number', description: 'Speech speed multiplier (0.5-2.0)', default: 1.0 }
      }
    }
  },
  'creative.voice_clone': {
    description: 'Clone a voice from reference audio. Provide a short audio sample and VoxCPM will generate new speech in that voice. Requires self-hosted VoxCPM server.',
    inputSchema: {
      type: 'object', required: ['locationId', 'text', 'referenceAudioUrl'],
      properties: {
        locationId: { type: 'string' },
        text: { type: 'string', description: 'Text to speak in the cloned voice' },
        referenceAudioUrl: { type: 'string', description: 'URL to voice sample audio (5+ seconds)' },
        referenceText: { type: 'string', description: 'Transcript of the reference audio for ultimate cloning accuracy' },
        emotion: { type: 'string', description: 'Override emotion while keeping cloned voice' }
      }
    }
  },
  'creative.check_voxcpm': {
    description: 'Check if the VoxCPM voice server is online and responding.',
    inputSchema: {
      type: 'object', required: ['locationId'],
      properties: { locationId: { type: 'string' } }
    }
  },
  'creative.generate_text': {
    description: 'Generate text content using any AI provider (Gemini, OpenAI, Claude, DeepSeek).',
    inputSchema: {
      type: 'object', required: ['locationId', 'prompt'],
      properties: {
        locationId: { type: 'string' },
        prompt: { type: 'string' },
        provider: { type: 'string', enum: ['gemini', 'openai', 'claude', 'deepseek'], default: 'gemini' },
        maxTokens: { type: 'number', default: 2000 },
        temperature: { type: 'number', default: 0.7 }
      }
    }
  },

  // === Market Intelligence ===
  'trends.fetch': {
    description: 'Fetch current market trends relevant to your brand and industry.',
    inputSchema: {
      type: 'object', required: ['locationId', 'industry'],
      properties: {
        locationId: { type: 'string' },
        industry: { type: 'string' },
        targetAudience: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        aiProvider: { type: 'string', default: 'gemini' }
      }
    }
  },
  'trends.get': {
    description: 'Get cached market trends for a location.',
    inputSchema: {
      type: 'object', required: ['locationId'],
      properties: { locationId: { type: 'string' } }
    }
  },

  // === AI Providers ===
  'providers.list': {
    description: 'List all available AI providers and their capabilities.',
    inputSchema: { type: 'object', properties: { locationId: { type: 'string' } } }
  },

  // === Agent Templates ===
  'agents.list_templates': {
    description: 'List all available pipeline agent templates (Brand Analyst, Copywriter, Video Producer, etc.).',
    inputSchema: { type: 'object', properties: {} }
  }
};

// === TOOL EXECUTION ===

async function executeTool(toolName: string, args: any, user: any): Promise<any> {
  const locationId = args.locationId || user.locationId || 'default';

  switch (toolName) {
    // Pipeline
    case 'pipeline.configure':
      creativePipeline.setConfig({ ...args, locationId });
      return { success: true, config: creativePipeline.getConfig(locationId) };

    case 'pipeline.run':
      return await creativePipeline.runFullPipeline(locationId, {
        days: args.days, aiProvider: args.aiProvider,
        autoApprove: args.autoApprove, generateMedia: args.generateMedia
      });

    case 'pipeline.generate_pillars':
      return { pillars: await creativePipeline.generatePillars(locationId, args.brandContext, args.aiProvider) };

    case 'pipeline.generate_content':
      return { ideas: await creativePipeline.generateContentBatch(locationId, args) };

    case 'pipeline.get_ideas': {
      const filters: any = {};
      if (args.status) filters.status = [args.status];
      if (args.platform) filters.platform = args.platform;
      if (args.contentType) filters.contentType = args.contentType;
      const ideas = creativePipeline.getIdeas(locationId, filters);
      return { ideas, count: ideas.length };
    }

    case 'pipeline.approve_idea':
      return { idea: creativePipeline.approveIdea(args.ideaId) };

    case 'pipeline.reject_idea':
      return { idea: creativePipeline.rejectIdea(args.ideaId) };

    case 'pipeline.approve_all':
      return creativePipeline.approveAndScheduleAll(locationId);

    case 'pipeline.schedule':
      return { scheduled: creativePipeline.scheduleApprovedIdeas(locationId) };

    case 'pipeline.get_stats':
      return creativePipeline.getStats(locationId);

    // Creative
    case 'creative.generate_image':
      return await aiProviderService.generate(locationId, {
        provider: args.provider || 'freepik', type: 'image', prompt: args.prompt,
        options: { imageSize: args.size, style: args.style }
      });

    case 'creative.generate_avatar_video':
      return await aiProviderService.generate(locationId, {
        provider: 'heygen', type: 'avatar_video', prompt: args.script,
        options: { avatarId: args.avatarId, voiceId: args.voiceId, aspectRatio: args.aspectRatio }
      });

    case 'creative.generate_video':
      return await aiProviderService.generate(locationId, {
        provider: 'kling', type: 'video', prompt: args.prompt,
        options: { videoDuration: args.duration, style: args.style }
      });

    case 'creative.generate_text':
      return await aiProviderService.generate(locationId, {
        provider: args.provider || 'gemini', type: 'text', prompt: args.prompt,
        options: { maxTokens: args.maxTokens, temperature: args.temperature }
      });

    // VoxCPM Voice
    case 'creative.text_to_speech':
      return await aiProviderService.generate(locationId, {
        provider: 'voxcpm', type: 'tts', prompt: args.text,
        options: {
          voiceDescription: args.voiceDescription,
          referenceAudioUrl: args.referenceAudioUrl,
          referenceText: args.referenceText,
          emotion: args.emotion,
          speed: args.speed
        }
      });

    case 'creative.voice_clone':
      return await aiProviderService.generate(locationId, {
        provider: 'voxcpm', type: 'voice_clone', prompt: args.text,
        options: {
          referenceAudioUrl: args.referenceAudioUrl,
          referenceText: args.referenceText,
          emotion: args.emotion
        }
      });

    case 'creative.check_voxcpm':
      return await aiProviderService.checkVoxCPMHealth(
        args.baseUrl || process.env.VOXCPM_BASE_URL || ''
      );

    // Trends
    case 'trends.fetch':
      return { trends: await creativePipeline.fetchTrends(locationId, {
        industry: args.industry, targetAudience: args.targetAudience || '',
        keywords: args.keywords || []
      }, args.aiProvider) };

    case 'trends.get':
      return { trends: creativePipeline.getTrends(locationId) };

    // Providers
    case 'providers.list':
      return { providers: PROVIDER_CAPABILITIES };

    // Agents
    case 'agents.list_templates':
      return { templates: PIPELINE_AGENT_TEMPLATES.map(t => ({
        id: t.id, name: t.name, role: t.role, description: t.description,
        capabilities: t.capabilities, triggerKeywords: t.triggerKeywords
      })) };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// === ROUTES ===

/**
 * GET /api/mcp/tools
 * Schema discovery — list all available tools and their input schemas.
 * This is what external platforms call first to learn what LIV8 can do.
 */
router.get('/tools', (req: Request, res: Response) => {
  const tools = Object.entries(LIV8_TOOLS).map(([name, def]) => ({
    name,
    description: def.description,
    inputSchema: def.inputSchema
  }));

  res.json({
    name: 'liv8-os',
    version: '1.0.0',
    description: 'LIV8 OS - AI-powered business operating system. Content pipeline, creative studio, brand management, and social media automation.',
    tools,
    toolCount: tools.length,
    auth: 'Bearer token from POST /api/auth/login',
    docs: 'https://os.liv8ai.com/docs'
  });
});

/**
 * POST /api/mcp/execute
 * Execute a tool by name. This is the main endpoint external platforms call.
 *
 * Body: { tool: "pipeline.run", arguments: { locationId: "...", days: 7 } }
 */
router.post('/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const { tool, arguments: args } = req.body;

    if (!tool) {
      return res.status(400).json({ error: 'Missing "tool" field. Use GET /api/mcp/tools to list available tools.' });
    }

    if (!LIV8_TOOLS[tool as keyof typeof LIV8_TOOLS]) {
      return res.status(404).json({
        error: `Unknown tool "${tool}"`,
        availableTools: Object.keys(LIV8_TOOLS)
      });
    }

    const result = await executeTool(tool, args || {}, (req as any).user);

    res.json({
      success: true,
      tool,
      result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      tool: req.body?.tool,
      error: error.message
    });
  }
});

/**
 * POST /api/mcp/batch
 * Execute multiple tools in sequence. Useful for workflows.
 *
 * Body: { steps: [{ tool: "pipeline.configure", arguments: {...} }, { tool: "pipeline.run", arguments: {...} }] }
 */
router.post('/batch', authenticate, async (req: Request, res: Response) => {
  try {
    const { steps } = req.body;

    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Missing "steps" array' });
    }

    const results = [];
    for (const step of steps) {
      try {
        const result = await executeTool(step.tool, step.arguments || {}, (req as any).user);
        results.push({ tool: step.tool, success: true, result });
      } catch (error: any) {
        results.push({ tool: step.tool, success: false, error: error.message });
        if (step.stopOnError) break;
      }
    }

    res.json({
      success: results.every(r => r.success),
      results,
      completed: results.length,
      total: steps.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mcp/health
 * Health check for the MCP server
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    server: 'liv8-os-mcp',
    version: '1.0.0',
    tools: Object.keys(LIV8_TOOLS).length,
    uptime: process.uptime()
  });
});

export default router;
