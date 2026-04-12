/**
 * Multi-AI Provider Service
 *
 * Supports multiple AI providers for content generation:
 * - Google Gemini (text, vision)
 * - OpenAI GPT (text, images via DALL-E)
 * - Anthropic Claude (text)
 * - DeepSeek (text, code)
 * - Kling AI (video generation)
 * - HeyGen (avatar video)
 * - Freepik (AI images)
 * - VoxCPM (open-source TTS, voice cloning, voice design)
 *
 * Hybrid approach:
 * - Default: LIV8 provides AI with tier-based limits
 * - BYOK: Users can add their own keys for unlimited usage
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Provider types
export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'kling' | 'heygen' | 'freepik' | 'voxcpm';
export type ContentGenerationType = 'text' | 'image' | 'video' | 'code' | 'edit' | 'avatar_video' | 'tts' | 'voice_clone';

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
  kling: ['video', 'image'],
  heygen: ['avatar_video', 'video'],
  freepik: ['image'],
  voxcpm: ['tts', 'voice_clone']
};

// Default models per provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o',
  claude: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  kling: 'kling-v1',
  heygen: 'v2',
  freepik: 'flux-1.1-ultra',
  voxcpm: 'VoxCPM2'
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
    // HeyGen options
    avatarId?: string;
    voiceId?: string;
    aspectRatio?: string;
    // Freepik options
    numImages?: number;
    guidanceScale?: number;
    // VoxCPM options
    referenceAudioUrl?: string;   // URL to reference audio for voice cloning
    referenceText?: string;       // Transcript of reference audio (for ultimate cloning)
    voiceDescription?: string;    // Natural language voice description (for voice design)
    emotion?: string;             // Control emotion: "cheerful", "calm", "excited", etc.
    speed?: number;               // Speech speed multiplier (0.5-2.0)
    sampleRate?: number;          // Output sample rate (default 48000)
    outputFormat?: string;        // "wav" | "mp3"
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
    kling: process.env.KLING_API_KEY,
    heygen: process.env.HEYGEN_API_KEY,
    freepik: process.env.FREEPIK_API_KEY,
    voxcpm: process.env.VOXCPM_API_URL || process.env.VOXCPM_BASE_URL  // Self-hosted URL acts as "key"
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
        case 'heygen':
          result = await this.generateWithHeyGen(apiKey, request);
          break;
        case 'freepik':
          result = await this.generateWithFreepik(apiKey, request);
          break;
        case 'voxcpm':
          result = await this.generateWithVoxCPM(apiKey, request);
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
   * Generate with HeyGen (avatar video)
   */
  private async generateWithHeyGen(apiKey: string, request: GenerationRequest): Promise<GenerationResult> {
    // Create video from script using HeyGen avatar
    const body: any = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: request.options?.avatarId || 'default',
          avatar_style: request.options?.style || 'normal'
        },
        voice: {
          type: 'text',
          input_text: request.prompt,
          voice_id: request.options?.voiceId || undefined
        }
      }],
      dimension: {
        width: request.options?.aspectRatio === '9:16' ? 720 : 1280,
        height: request.options?.aspectRatio === '9:16' ? 1280 : 720
      }
    };

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.error || data.code !== 100) {
      return { success: false, provider: 'heygen', type: 'avatar_video', error: data.error?.message || data.message || 'HeyGen generation failed' };
    }

    return {
      success: true,
      provider: 'heygen',
      type: 'avatar_video',
      content: `Video generation started. Video ID: ${data.data?.video_id}`,
      metadata: {
        model: 'heygen-v2',
        videoId: data.data?.video_id
      }
    };
  }

  /**
   * Check HeyGen video status
   */
  async checkHeyGenStatus(apiKey: string, videoId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    error?: string;
  }> {
    const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: { 'X-Api-Key': apiKey }
    });

    const data = await response.json();
    const statusMap: Record<string, any> = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed'
    };

    return {
      status: statusMap[data.data?.status] || 'pending',
      mediaUrl: data.data?.video_url,
      thumbnailUrl: data.data?.thumbnail_url,
      duration: data.data?.duration,
      error: data.data?.error?.message
    };
  }

  /**
   * List HeyGen avatars
   */
  async listHeyGenAvatars(apiKey: string): Promise<any[]> {
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': apiKey }
    });

    const data = await response.json();
    return data.data?.avatars || [];
  }

  /**
   * List HeyGen voices
   */
  async listHeyGenVoices(apiKey: string): Promise<any[]> {
    const response = await fetch('https://api.heygen.com/v2/voices', {
      headers: { 'X-Api-Key': apiKey }
    });

    const data = await response.json();
    return data.data?.voices || [];
  }

  /**
   * Generate with Freepik (AI image generation)
   */
  private async generateWithFreepik(apiKey: string, request: GenerationRequest): Promise<GenerationResult> {
    const body: any = {
      prompt: request.prompt,
      negative_prompt: request.options?.negativePrompt || '',
      num_images: request.options?.numImages || 1,
      image: {
        size: request.options?.imageSize || 'square_1_1'
      },
      styling: {
        style: request.options?.style || 'photo'
      }
    };

    const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, provider: 'freepik', type: 'image', error: data.message || data.detail || 'Freepik generation failed' };
    }

    // Freepik returns task-based async generation
    if (data.data?.task_id) {
      return {
        success: true,
        provider: 'freepik',
        type: 'image',
        content: `Image generation started. Task ID: ${data.data.task_id}`,
        metadata: {
          model: 'flux-1.1-ultra',
          taskId: data.data.task_id
        }
      };
    }

    // Direct response with images
    const images = data.data || [];
    return {
      success: true,
      provider: 'freepik',
      type: 'image',
      mediaUrl: images[0]?.base64 ? `data:image/png;base64,${images[0].base64}` : images[0]?.url,
      content: `Generated ${images.length} image(s)`,
      metadata: {
        model: 'flux-1.1-ultra',
        imageCount: images.length,
        allImages: images.map((img: any) => img.url || `data:image/png;base64,${img.base64}`)
      }
    };
  }

  /**
   * Check Freepik task status
   */
  async checkFreepikStatus(apiKey: string, taskId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    images?: string[];
    error?: string;
  }> {
    const response = await fetch(`https://api.freepik.com/v1/ai/text-to-image/${taskId}`, {
      headers: { 'x-freepik-api-key': apiKey }
    });

    const data = await response.json();

    if (data.data?.status === 'COMPLETED') {
      return {
        status: 'completed',
        images: data.data.images?.map((img: any) => img.url || `data:image/png;base64,${img.base64}`)
      };
    }

    return {
      status: data.data?.status === 'FAILED' ? 'failed' : 'processing',
      error: data.data?.error
    };
  }

  /**
   * Generate with VoxCPM (TTS / Voice Cloning / Voice Design)
   *
   * VoxCPM is self-hosted — the "apiKey" is actually the base URL of the user's
   * VoxCPM instance (e.g. http://gpu-server:8808 or https://voxcpm.myserver.com)
   *
   * Supports 3 modes:
   * 1. TTS with voice design — describe a voice in natural language
   * 2. Voice cloning — provide reference audio
   * 3. Ultimate cloning — reference audio + transcript
   */
  private async generateWithVoxCPM(baseUrl: string, request: GenerationRequest): Promise<GenerationResult> {
    // Determine which VoxCPM mode to use
    const hasReference = !!request.options?.referenceAudioUrl;
    const hasTranscript = !!request.options?.referenceText;
    const hasVoiceDescription = !!request.options?.voiceDescription;

    let endpoint: string;
    let body: any;

    if (hasReference && hasTranscript) {
      // Ultimate cloning: reference audio + transcript
      endpoint = `${baseUrl}/api/clone`;
      body = {
        text: request.prompt,
        prompt_audio: request.options!.referenceAudioUrl,
        prompt_text: request.options!.referenceText,
        sample_rate: request.options?.sampleRate || 48000
      };
    } else if (hasReference) {
      // Voice cloning with optional style control
      endpoint = `${baseUrl}/api/clone`;
      body = {
        text: request.prompt,
        reference_audio: request.options!.referenceAudioUrl,
        control: request.options?.emotion || request.options?.voiceDescription || undefined,
        sample_rate: request.options?.sampleRate || 48000
      };
    } else {
      // Voice design or basic TTS
      endpoint = `${baseUrl}/api/tts`;
      const textWithDesign = hasVoiceDescription
        ? `(${request.options!.voiceDescription})${request.prompt}`
        : request.prompt;

      body = {
        text: textWithDesign,
        cfg_value: 2.0,
        inference_timesteps: 10,
        sample_rate: request.options?.sampleRate || 48000
      };
    }

    // Add speed control if specified
    if (request.options?.speed) {
      body.speed = request.options.speed;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          provider: 'voxcpm',
          type: request.type,
          error: `VoxCPM error (${response.status}): ${errorText}`
        };
      }

      // VoxCPM returns audio data — check content type
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('audio') || contentType.includes('octet-stream')) {
        // Binary audio response — convert to base64 data URL
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = contentType.includes('wav') ? 'audio/wav' : 'audio/mpeg';

        return {
          success: true,
          provider: 'voxcpm',
          type: request.type,
          mediaUrl: `data:${mimeType};base64,${base64}`,
          content: `Audio generated (${(arrayBuffer.byteLength / 1024).toFixed(1)}KB)`,
          metadata: {
            model: 'VoxCPM2',
            format: mimeType,
            sizeBytes: arrayBuffer.byteLength,
            sampleRate: request.options?.sampleRate || 48000,
            mode: hasReference ? (hasTranscript ? 'ultimate_clone' : 'voice_clone') : (hasVoiceDescription ? 'voice_design' : 'tts')
          }
        };
      }

      // JSON response (task-based or URL-based)
      const data = await response.json();

      if (data.audio_url || data.url) {
        return {
          success: true,
          provider: 'voxcpm',
          type: request.type,
          mediaUrl: data.audio_url || data.url,
          content: 'Audio generated',
          metadata: {
            model: 'VoxCPM2',
            mode: hasReference ? 'voice_clone' : 'tts'
          }
        };
      }

      if (data.task_id) {
        return {
          success: true,
          provider: 'voxcpm',
          type: request.type,
          content: `Audio generation started. Task ID: ${data.task_id}`,
          metadata: {
            model: 'VoxCPM2',
            taskId: data.task_id
          }
        };
      }

      return {
        success: true,
        provider: 'voxcpm',
        type: request.type,
        content: JSON.stringify(data),
        metadata: { model: 'VoxCPM2' }
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'voxcpm',
        type: request.type,
        error: `VoxCPM connection failed: ${error.message}. Is your VoxCPM server running at ${baseUrl}?`
      };
    }
  }

  /**
   * Check VoxCPM server health
   */
  async checkVoxCPMHealth(baseUrl: string): Promise<{
    online: boolean;
    model?: string;
    version?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        return { online: true, model: data.model || 'VoxCPM2', version: data.version };
      }
      // Try root endpoint as fallback
      const rootResponse = await fetch(baseUrl, { signal: AbortSignal.timeout(5000) });
      return { online: rootResponse.ok, model: 'VoxCPM2' };
    } catch (error: any) {
      return { online: false, error: error.message };
    }
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
