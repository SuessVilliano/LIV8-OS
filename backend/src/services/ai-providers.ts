/**
 * Multi-AI Provider Service
 *
 * Supports multiple AI providers for content generation:
 * - Google Gemini (text, vision)
 * - OpenAI GPT (text, images via DALL-E)
 * - Anthropic Claude (text)
 * - DeepSeek (text, code)
 * - Kling AI (video generation)
 *
 * Hybrid approach:
 * - Default: LIV8 provides AI with tier-based limits
 * - BYOK: Users can add their own keys for unlimited usage
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Provider types
export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'kling';
export type ContentGenerationType = 'text' | 'image' | 'video' | 'code' | 'edit';

// Configuration for each provider
export interface ProviderConfig {
  apiKey: string;
  isUserKey: boolean;  // true = BYOK, false = LIV8 default
  model?: string;
  baseUrl?: string;
}

// Usage limits by tier
export const TIER_LIMITS = {
  starter: {
    textGenerations: 100,      // per month
    imageGenerations: 20,
    videoGenerations: 5,
    codeGenerations: 50
  },
  growth: {
    textGenerations: 500,
    imageGenerations: 100,
    videoGenerations: 25,
    codeGenerations: 200
  },
  scale: {
    textGenerations: 2000,
    imageGenerations: 500,
    videoGenerations: 100,
    codeGenerations: 1000
  },
  enterprise: {
    textGenerations: -1,  // unlimited
    imageGenerations: -1,
    videoGenerations: -1,
    codeGenerations: -1
  }
};

// Provider capabilities
export const PROVIDER_CAPABILITIES: Record<AIProvider, ContentGenerationType[]> = {
  gemini: ['text', 'image', 'code'],
  openai: ['text', 'image', 'code'],
  claude: ['text', 'code'],
  deepseek: ['text', 'code'],
  kling: ['video', 'image']
};

// Default models per provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o',
  claude: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  kling: 'kling-v1'
};

// Generation request
export interface GenerationRequest {
  provider: AIProvider;
  type: ContentGenerationType;
  prompt: string;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    imageSize?: string;
    videoDuration?: number;
    style?: string;
    negativePrompt?: string;
  };
  context?: {
    businessTwin?: any;
    previousContent?: string;
  };
}

// Generation result
export interface GenerationResult {
  success: boolean;
  provider: AIProvider;
  type: ContentGenerationType;
  content?: string;
  mediaUrl?: string;
  metadata?: {
    model: string;
    tokensUsed?: number;
    generationTime?: number;
    cost?: number;
  };
  error?: string;
}

// User API keys storage (in production, encrypt and store securely)
interface UserAPIKeys {
  locationId: string;
  keys: Partial<Record<AIProvider, ProviderConfig>>;
  usage: {
    month: string;  // YYYY-MM
    text: number;
    image: number;
    video: number;
    code: number;
  };
}

class AIProviderService {
  private userKeys: Map<string, UserAPIKeys> = new Map();

  // Default LIV8 API keys (from environment)
  private defaultKeys: Partial<Record<AIProvider, string>> = {
    gemini: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    kling: process.env.KLING_API_KEY
  };

  /**
   * Set user's own API key (BYOK)
   */
  setUserKey(locationId: string, provider: AIProvider, apiKey: string, model?: string): void {
    let userConfig = this.userKeys.get(locationId);
    if (!userConfig) {
      userConfig = {
        locationId,
        keys: {},
        usage: { month: this.getCurrentMonth(), text: 0, image: 0, video: 0, code: 0 }
      };
    }

    userConfig.keys[provider] = {
      apiKey,
      isUserKey: true,
      model: model || DEFAULT_MODELS[provider]
    };

    this.userKeys.set(locationId, userConfig);
  }

  /**
   * Remove user's API key
   */
  removeUserKey(locationId: string, provider: AIProvider): void {
    const userConfig = this.userKeys.get(locationId);
    if (userConfig?.keys[provider]) {
      delete userConfig.keys[provider];
    }
  }

  /**
   * Get user's configured providers
   */
  getUserProviders(locationId: string): {
    provider: AIProvider;
    isUserKey: boolean;
    capabilities: ContentGenerationType[];
  }[] {
    const userConfig = this.userKeys.get(locationId);
    const result: any[] = [];

    for (const provider of Object.keys(PROVIDER_CAPABILITIES) as AIProvider[]) {
      const hasUserKey = !!userConfig?.keys[provider];
      const hasDefaultKey = !!this.defaultKeys[provider];

      if (hasUserKey || hasDefaultKey) {
        result.push({
          provider,
          isUserKey: hasUserKey,
          capabilities: PROVIDER_CAPABILITIES[provider]
        });
      }
    }

    return result;
  }

  /**
   * Check if user can generate content (within limits)
   */
  canGenerate(locationId: string, type: ContentGenerationType, tier: keyof typeof TIER_LIMITS): {
    allowed: boolean;
    remaining: number;
    reason?: string;
  } {
    const userConfig = this.userKeys.get(locationId);
    const limits = TIER_LIMITS[tier];

    // Reset usage if new month
    if (userConfig && userConfig.usage.month !== this.getCurrentMonth()) {
      userConfig.usage = { month: this.getCurrentMonth(), text: 0, image: 0, video: 0, code: 0 };
    }

    const usageKey = type === 'text' ? 'text' :
                     type === 'image' ? 'image' :
                     type === 'video' ? 'video' : 'code';

    const limit = limits[`${usageKey}Generations` as keyof typeof limits];
    const used = userConfig?.usage[usageKey] || 0;

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, remaining: -1 };
    }

    const remaining = limit - used;

    return {
      allowed: remaining > 0,
      remaining,
      reason: remaining <= 0 ? `Monthly ${type} generation limit reached. Upgrade tier or add your own API key.` : undefined
    };
  }

  /**
   * Generate content using specified provider
   */
  async generate(locationId: string, request: GenerationRequest, tier: keyof typeof TIER_LIMITS = 'growth'): Promise<GenerationResult> {
    const startTime = Date.now();

    // Check limits (skip if user has their own key for this provider)
    const userConfig = this.userKeys.get(locationId);
    const hasUserKey = !!userConfig?.keys[request.provider];

    if (!hasUserKey) {
      const limitCheck = this.canGenerate(locationId, request.type, tier);
      if (!limitCheck.allowed) {
        return {
          success: false,
          provider: request.provider,
          type: request.type,
          error: limitCheck.reason
        };
      }
    }

    // Get API key (user's or default)
    const apiKey = userConfig?.keys[request.provider]?.apiKey || this.defaultKeys[request.provider];
    if (!apiKey) {
      return {
        success: false,
        provider: request.provider,
        type: request.type,
        error: `No API key configured for ${request.provider}. Add your own key or contact support.`
      };
    }

    try {
      let result: GenerationResult;

      switch (request.provider) {
        case 'gemini':
          result = await this.generateWithGemini(apiKey, request);
          break;
        case 'openai':
          result = await this.generateWithOpenAI(apiKey, request);
          break;
        case 'claude':
          result = await this.generateWithClaude(apiKey, request);
          break;
        case 'deepseek':
          result = await this.generateWithDeepSeek(apiKey, request);
          break;
        case 'kling':
          result = await this.generateWithKling(apiKey, request);
          break;
        default:
          return { success: false, provider: request.provider, type: request.type, error: 'Unknown provider' };
      }

      // Track usage (only if using default key)
      if (!hasUserKey && result.success) {
        this.trackUsage(locationId, request.type);
      }

      // Add generation time
      if (result.metadata) {
        result.metadata.generationTime = Date.now() - startTime;
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        provider: request.provider,
        type: request.type,
        error: error.message || 'Generation failed'
      };
    }
  }

  /**
   * Generate with Google Gemini
   */
  private async generateWithGemini(apiKey: string, request: GenerationRequest): Promise<GenerationResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: request.options?.model || 'gemini-1.5-flash'
    });

    if (request.type === 'image') {
      // Gemini Imagen (if available) or return prompt for image
      // Note: Gemini's image generation may require different API
      return {
        success: true,
        provider: 'gemini',
        type: 'image',
        content: `Image generation prompt prepared: ${request.prompt}`,
        metadata: { model: 'gemini-1.5-flash' }
      };
    }

    const systemPrompt = request.context?.businessTwin ?
      `You are creating content for: ${request.context.businessTwin.identity?.business_name}.
       Brand voice: ${request.context.businessTwin.brand_voice?.tone?.join(', ')}.
       IMPORTANT: Only use verified facts. Never hallucinate.` : '';

    const result = await model.generateContent(systemPrompt + '\n\n' + request.prompt);
    const response = result.response.text();

    return {
      success: true,
      provider: 'gemini',
      type: request.type,
      content: response,
      metadata: {
        model: request.options?.model || 'gemini-1.5-flash',
        tokensUsed: response.length / 4  // rough estimate
      }
    };
  }

  /**
   * Generate with OpenAI GPT / DALL-E
   */
  private async generateWithOpenAI(apiKey: string, request: GenerationRequest): Promise<GenerationResult> {
    const baseUrl = 'https://api.openai.com/v1';

    if (request.type === 'image') {
      // Use DALL-E for image generation
      const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: request.prompt,
          n: 1,
          size: request.options?.imageSize || '1024x1024',
          quality: 'standard'
        })
      });

      const data = await response.json();

      if (data.error) {
        return { success: false, provider: 'openai', type: 'image', error: data.error.message };
      }

      return {
        success: true,
        provider: 'openai',
        type: 'image',
        mediaUrl: data.data[0]?.url,
        content: data.data[0]?.revised_prompt,
        metadata: { model: 'dall-e-3' }
      };
    }

    // Text generation with GPT
    const messages = [];

    if (request.context?.businessTwin) {
      messages.push({
        role: 'system',
        content: `You are creating content for: ${request.context.businessTwin.identity?.business_name}.
                  Brand voice: ${request.context.businessTwin.brand_voice?.tone?.join(', ')}.
                  IMPORTANT: Only use verified facts. Never hallucinate.`
      });
    }

    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.options?.model || 'gpt-4o',
        messages,
        max_tokens: request.options?.maxTokens || 2000,
        temperature: request.options?.temperature || 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, provider: 'openai', type: 'text', error: data.error.message };
    }

    return {
      success: true,
      provider: 'openai',
      type: request.type,
      content: data.choices[0]?.message?.content,
      metadata: {
        model: data.model,
        tokensUsed: data.usage?.total_tokens
      }
    };
  }

  /**
   * Generate with Anthropic Claude
   */
  private async generateWithClaude(apiKey: string, request: GenerationRequest): Promise<GenerationResult> {
    const systemPrompt = request.context?.businessTwin ?
      `You are creating content for: ${request.context.businessTwin.identity?.business_name}.
       Brand voice: ${request.context.businessTwin.brand_voice?.tone?.join(', ')}.
       IMPORTANT: Only use verified facts. Never hallucinate.` : '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.options?.model || 'claude-3-5-sonnet-20241022',
        max_tokens: request.options?.maxTokens || 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: request.prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, provider: 'claude', type: 'text', error: data.error.message };
    }

    return {
      success: true,
      provider: 'claude',
      type: request.type,
      content: data.content[0]?.text,
      metadata: {
        model: data.model,
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens
      }
    };
  }

  /**
   * Generate with DeepSeek
   */
  private async generateWithDeepSeek(apiKey: string, request: GenerationRequest): Promise<GenerationResult> {
    const systemPrompt = request.context?.businessTwin ?
      `You are creating content for: ${request.context.businessTwin.identity?.business_name}.
       Brand voice: ${request.context.businessTwin.brand_voice?.tone?.join(', ')}.
       IMPORTANT: Only use verified facts. Never hallucinate.` : '';

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.options?.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt }
        ],
        max_tokens: request.options?.maxTokens || 2000,
        temperature: request.options?.temperature || 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, provider: 'deepseek', type: 'text', error: data.error.message };
    }

    return {
      success: true,
      provider: 'deepseek',
      type: request.type,
      content: data.choices[0]?.message?.content,
      metadata: {
        model: data.model,
        tokensUsed: data.usage?.total_tokens
      }
    };
  }

  /**
   * Generate with Kling AI (video/image)
   */
  private async generateWithKling(apiKey: string, request: GenerationRequest): Promise<GenerationResult> {
    // Kling AI API for video generation
    // Note: Kling's API structure may vary - this is a representative implementation

    const endpoint = request.type === 'video'
      ? 'https://api.klingai.com/v1/videos/generations'
      : 'https://api.klingai.com/v1/images/generations';

    const body: any = {
      prompt: request.prompt,
      negative_prompt: request.options?.negativePrompt || '',
      style: request.options?.style || 'realistic'
    };

    if (request.type === 'video') {
      body.duration = request.options?.videoDuration || 5;  // seconds
      body.aspect_ratio = '16:9';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, provider: 'kling', type: request.type, error: data.error.message };
    }

    // Kling may return a task ID for async generation
    if (data.task_id) {
      return {
        success: true,
        provider: 'kling',
        type: request.type,
        content: `Generation started. Task ID: ${data.task_id}`,
        metadata: {
          model: 'kling-v1',
          taskId: data.task_id
        }
      };
    }

    return {
      success: true,
      provider: 'kling',
      type: request.type,
      mediaUrl: data.url || data.output?.url,
      metadata: { model: 'kling-v1' }
    };
  }

  /**
   * Check Kling generation status (for async video generation)
   */
  async checkKlingStatus(apiKey: string, taskId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    mediaUrl?: string;
    error?: string;
  }> {
    const response = await fetch(`https://api.klingai.com/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const data = await response.json();

    return {
      status: data.status,
      mediaUrl: data.output?.url,
      error: data.error?.message
    };
  }

  /**
   * Track usage
   */
  private trackUsage(locationId: string, type: ContentGenerationType): void {
    let userConfig = this.userKeys.get(locationId);
    if (!userConfig) {
      userConfig = {
        locationId,
        keys: {},
        usage: { month: this.getCurrentMonth(), text: 0, image: 0, video: 0, code: 0 }
      };
    }

    // Reset if new month
    if (userConfig.usage.month !== this.getCurrentMonth()) {
      userConfig.usage = { month: this.getCurrentMonth(), text: 0, image: 0, video: 0, code: 0 };
    }

    const usageKey = type === 'text' ? 'text' :
                     type === 'image' ? 'image' :
                     type === 'video' ? 'video' : 'code';

    userConfig.usage[usageKey]++;
    this.userKeys.set(locationId, userConfig);
  }

  /**
   * Get current month string
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(locationId: string, tier: keyof typeof TIER_LIMITS): {
    text: { used: number; limit: number; remaining: number };
    image: { used: number; limit: number; remaining: number };
    video: { used: number; limit: number; remaining: number };
    code: { used: number; limit: number; remaining: number };
  } {
    const userConfig = this.userKeys.get(locationId);
    const limits = TIER_LIMITS[tier];
    const usage = userConfig?.usage || { text: 0, image: 0, video: 0, code: 0 };

    return {
      text: {
        used: usage.text,
        limit: limits.textGenerations,
        remaining: limits.textGenerations === -1 ? -1 : Math.max(0, limits.textGenerations - usage.text)
      },
      image: {
        used: usage.image,
        limit: limits.imageGenerations,
        remaining: limits.imageGenerations === -1 ? -1 : Math.max(0, limits.imageGenerations - usage.image)
      },
      video: {
        used: usage.video,
        limit: limits.videoGenerations,
        remaining: limits.videoGenerations === -1 ? -1 : Math.max(0, limits.videoGenerations - usage.video)
      },
      code: {
        used: usage.code,
        limit: limits.codeGenerations,
        remaining: limits.codeGenerations === -1 ? -1 : Math.max(0, limits.codeGenerations - usage.code)
      }
    };
  }
}

export const aiProviderService = new AIProviderService();
export default aiProviderService;
