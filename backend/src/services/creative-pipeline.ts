/**
 * Creative Pipeline Service
 *
 * Automated content generation pipeline that orchestrates:
 * - Brand-aware content ideation (content pillars)
 * - Multi-format content creation (text, image, video, avatar)
 * - HeyGen avatar video generation
 * - Freepik AI image generation
 * - Kling AI video generation
 * - Approval queue management
 * - Auto-scheduling via content scheduler
 *
 * This is the "money printer" — the automated loop that generates
 * brand-consistent content across all platforms.
 */

import { aiProviderService, type AIProvider, type GenerationResult } from './ai-providers.js';
import { contentScheduler, type ScheduledContent, type PublishPlatform } from './content-scheduler.js';

// Content pillar definition
export interface ContentPillar {
  id: string;
  locationId: string;
  name: string;
  description: string;
  category: 'authority' | 'education' | 'proof' | 'behind_scenes' | 'founder_story' | 'objections' | 'offers' | 'market_news' | 'community' | 'entertainment';
  topics: string[];
  hooks: string[];
  ctas: string[];
  frequency: number; // posts per week for this pillar
  platforms: PublishPlatform[];
  isActive: boolean;
  createdAt: string;
}

// Content idea from the pipeline
export interface ContentIdea {
  id: string;
  locationId: string;
  pillarId: string;
  pillarName: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  platform: PublishPlatform;
  contentType: 'text_post' | 'image_post' | 'carousel' | 'video_script' | 'avatar_video' | 'reel_script' | 'newsletter' | 'thread';
  status: 'generated' | 'queued' | 'approved' | 'scheduled' | 'posted' | 'rejected';
  mediaPrompt?: string;       // prompt for image/video generation
  mediaUrl?: string;           // generated media URL
  videoId?: string;            // HeyGen/Kling task ID for async generation
  avatarId?: string;           // HeyGen avatar used
  aiProvider: string;
  score?: number;              // quality score 1-10
  scheduledDate?: string;
  createdAt: string;
}

// Pipeline configuration per brand/location
export interface PipelineConfig {
  locationId: string;
  brandName: string;
  brandVoice: {
    tone: string[];
    doSay: string[];
    dontSay: string[];
    targetAudience: string;
    industry: string;
  };
  defaultAvatarId?: string;
  defaultVoiceId?: string;
  postsPerDay: number;
  platforms: PublishPlatform[];
  requireApproval: boolean;
  autoGenerateMedia: boolean;
  preferredImageProvider: 'freepik' | 'openai'; // DALL-E or Freepik
  preferredVideoProvider: 'heygen' | 'kling';
  contentRatio: {
    textPosts: number;      // percentage
    imagePosts: number;
    videoPosts: number;
    avatarVideos: number;
  };
}

// Market trend for content ideation
export interface MarketTrend {
  id: string;
  locationId: string;
  topic: string;
  summary: string;
  relevanceScore: number; // 1-10
  source: string;
  suggestedAngles: string[];
  suggestedPlatforms: PublishPlatform[];
  fetchedAt: string;
  isUsed: boolean;
}

class CreativePipeline {
  private pillars: Map<string, ContentPillar> = new Map();
  private ideas: Map<string, ContentIdea> = new Map();
  private configs: Map<string, PipelineConfig> = new Map();
  private trends: Map<string, MarketTrend> = new Map();

  // ============ CONTENT PILLARS ============

  /**
   * Auto-generate content pillars from brand context
   */
  async generatePillars(
    locationId: string,
    brandContext: {
      name: string;
      industry: string;
      targetAudience: string;
      services: string[];
      uniqueValue: string;
      competitors?: string[];
    },
    aiProvider: AIProvider = 'gemini',
    tier: any = 'growth'
  ): Promise<ContentPillar[]> {
    const prompt = `You are a content strategist. Analyze this brand and generate 8 content pillars.

Brand: ${brandContext.name}
Industry: ${brandContext.industry}
Target Audience: ${brandContext.targetAudience}
Services: ${brandContext.services.join(', ')}
Unique Value: ${brandContext.uniqueValue}
${brandContext.competitors ? `Competitors: ${brandContext.competitors.join(', ')}` : ''}

For each pillar, provide:
- name: short pillar name
- category: one of [authority, education, proof, behind_scenes, founder_story, objections, offers, market_news, community, entertainment]
- description: what this pillar covers
- topics: 5 specific topic ideas
- hooks: 3 scroll-stopping hooks for this pillar
- ctas: 2 call-to-action phrases
- frequency: suggested posts per week (1-5)
- platforms: best platforms for this pillar

Return ONLY valid JSON array. No markdown, no explanation.
Example format:
[{"name":"...", "category":"authority", "description":"...", "topics":["..."], "hooks":["..."], "ctas":["..."], "frequency":2, "platforms":["instagram","twitter"]}]`;

    const result = await aiProviderService.generate(locationId, {
      provider: aiProvider,
      type: 'text',
      prompt,
      options: { temperature: 0.8 }
    }, tier);

    if (!result.success || !result.content) {
      throw new Error(`Failed to generate pillars: ${result.error}`);
    }

    // Parse AI response
    let pillarsData: any[];
    try {
      const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      pillarsData = JSON.parse(cleaned);
    } catch (e) {
      throw new Error('Failed to parse AI response for content pillars');
    }

    const pillars: ContentPillar[] = pillarsData.map((p: any, index: number) => ({
      id: `pillar_${locationId}_${Date.now()}_${index}`,
      locationId,
      name: p.name,
      description: p.description,
      category: p.category,
      topics: p.topics || [],
      hooks: p.hooks || [],
      ctas: p.ctas || [],
      frequency: p.frequency || 2,
      platforms: p.platforms || ['instagram', 'facebook'],
      isActive: true,
      createdAt: new Date().toISOString()
    }));

    // Store pillars
    pillars.forEach(p => this.pillars.set(p.id, p));

    return pillars;
  }

  /**
   * Get pillars for a location
   */
  getPillars(locationId: string): ContentPillar[] {
    const result: ContentPillar[] = [];
    this.pillars.forEach(p => {
      if (p.locationId === locationId) result.push(p);
    });
    return result;
  }

  /**
   * Update a pillar
   */
  updatePillar(pillarId: string, updates: Partial<ContentPillar>): ContentPillar | null {
    const pillar = this.pillars.get(pillarId);
    if (!pillar) return null;
    const updated = { ...pillar, ...updates, id: pillar.id, locationId: pillar.locationId };
    this.pillars.set(pillarId, updated);
    return updated;
  }

  /**
   * Delete a pillar
   */
  deletePillar(pillarId: string): boolean {
    return this.pillars.delete(pillarId);
  }

  // ============ PIPELINE CONFIG ============

  /**
   * Set pipeline configuration for a location
   */
  setConfig(config: PipelineConfig): void {
    this.configs.set(config.locationId, config);
  }

  /**
   * Get pipeline configuration
   */
  getConfig(locationId: string): PipelineConfig | null {
    return this.configs.get(locationId) || null;
  }

  // ============ CONTENT GENERATION ============

  /**
   * Generate a batch of content ideas for a location
   * This is the core "money printer" function
   */
  async generateContentBatch(
    locationId: string,
    options: {
      days?: number;           // how many days of content (default 7)
      pillarIds?: string[];    // specific pillars, or all active
      includeTrends?: boolean; // incorporate market trends
      aiProvider?: AIProvider;
    } = {}
  ): Promise<ContentIdea[]> {
    const config = this.configs.get(locationId);
    if (!config) throw new Error('Pipeline not configured. Set up brand config first.');

    const days = options.days || 7;
    const aiProvider = options.aiProvider || 'gemini';
    const totalPosts = config.postsPerDay * days;

    // Get active pillars
    let pillars = this.getPillars(locationId).filter(p => p.isActive);
    if (options.pillarIds) {
      pillars = pillars.filter(p => options.pillarIds!.includes(p.id));
    }
    if (pillars.length === 0) throw new Error('No active content pillars found.');

    // Get trends if requested
    let trendContext = '';
    if (options.includeTrends) {
      const trends = this.getTrends(locationId).filter(t => !t.isUsed).slice(0, 5);
      if (trends.length > 0) {
        trendContext = `\n\nCurrent trending topics to weave in when relevant:\n${trends.map(t => `- ${t.topic}: ${t.summary} (angles: ${t.suggestedAngles.join(', ')})`).join('\n')}`;
      }
    }

    // Build pillar distribution
    const pillarDistribution: ContentPillar[] = [];
    const totalFreq = pillars.reduce((sum, p) => sum + p.frequency, 0);
    pillars.forEach(p => {
      const count = Math.max(1, Math.round((p.frequency / totalFreq) * totalPosts));
      for (let i = 0; i < count && pillarDistribution.length < totalPosts; i++) {
        pillarDistribution.push(p);
      }
    });

    // Determine content types based on ratio
    const contentTypes: ContentIdea['contentType'][] = [];
    const addTypes = (type: ContentIdea['contentType'], pct: number) => {
      const count = Math.round((pct / 100) * totalPosts);
      for (let i = 0; i < count; i++) contentTypes.push(type);
    };
    addTypes('text_post', config.contentRatio.textPosts);
    addTypes('image_post', config.contentRatio.imagePosts);
    addTypes('video_script', config.contentRatio.videoPosts);
    addTypes('avatar_video', config.contentRatio.avatarVideos);

    // Generate content with AI
    const prompt = `You are a social media content creator for ${config.brandName}.

Brand Voice: ${config.brandVoice.tone.join(', ')}
Target Audience: ${config.brandVoice.targetAudience}
Industry: ${config.brandVoice.industry}
${config.brandVoice.doSay.length > 0 ? `DO say: ${config.brandVoice.doSay.join(', ')}` : ''}
${config.brandVoice.dontSay.length > 0 ? `DON'T say: ${config.brandVoice.dontSay.join(', ')}` : ''}
${trendContext}

Generate ${totalPosts} unique social media content pieces across these pillars and platforms.

Pillars to cover:
${pillarDistribution.map((p, i) => `${i + 1}. Pillar: "${p.name}" (${p.category}) - Platform: ${p.platforms[i % p.platforms.length] || p.platforms[0]} - Type: ${contentTypes[i % contentTypes.length] || 'text_post'}`).join('\n')}

For each piece, provide:
- pillarIndex: which pillar number (1-based)
- title: descriptive title for internal use
- hook: scroll-stopping opening line
- body: full post body (platform-appropriate length)
- cta: call to action
- hashtags: 3-7 relevant hashtags
- platform: target platform
- contentType: the content type
- mediaPrompt: if image_post or video, provide a detailed prompt for AI image/video generation
- score: your confidence score 1-10

Return ONLY valid JSON array. No markdown.`;

    const result = await aiProviderService.generate(locationId, {
      provider: aiProvider,
      type: 'text',
      prompt,
      options: { maxTokens: 4000, temperature: 0.85 }
    });

    if (!result.success || !result.content) {
      throw new Error(`Content generation failed: ${result.error}`);
    }

    let postsData: any[];
    try {
      const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      postsData = JSON.parse(cleaned);
    } catch (e) {
      throw new Error('Failed to parse AI-generated content');
    }

    // Create content ideas
    const now = new Date();
    const ideas: ContentIdea[] = postsData.map((post: any, index: number) => {
      const pillar = pillarDistribution[post.pillarIndex ? post.pillarIndex - 1 : index] || pillars[0];
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(index / config.postsPerDay));
      scheduledDate.setHours(9 + (index % config.postsPerDay) * 3); // stagger posts

      const idea: ContentIdea = {
        id: `idea_${locationId}_${Date.now()}_${index}`,
        locationId,
        pillarId: pillar.id,
        pillarName: pillar.name,
        title: post.title || `${pillar.name} Post ${index + 1}`,
        hook: post.hook || '',
        body: post.body || '',
        cta: post.cta || '',
        hashtags: post.hashtags || [],
        platform: post.platform || pillar.platforms[0] || 'instagram',
        contentType: post.contentType || 'text_post',
        status: config.requireApproval ? 'generated' : 'queued',
        mediaPrompt: post.mediaPrompt,
        aiProvider,
        score: post.score || 7,
        scheduledDate: scheduledDate.toISOString(),
        createdAt: new Date().toISOString()
      };

      return idea;
    });

    // Store ideas
    ideas.forEach(idea => this.ideas.set(idea.id, idea));

    return ideas;
  }

  /**
   * Generate media (image/video) for a content idea
   */
  async generateMedia(
    locationId: string,
    ideaId: string,
    options?: {
      imageProvider?: 'freepik' | 'openai';
      videoProvider?: 'heygen' | 'kling';
      avatarId?: string;
      voiceId?: string;
    }
  ): Promise<ContentIdea | null> {
    const idea = this.ideas.get(ideaId);
    if (!idea || !idea.mediaPrompt) return null;

    const config = this.configs.get(locationId);
    const imageProvider = options?.imageProvider || config?.preferredImageProvider || 'freepik';
    const videoProvider = options?.videoProvider || config?.preferredVideoProvider || 'heygen';

    let result: GenerationResult;

    if (idea.contentType === 'image_post' || idea.contentType === 'carousel') {
      result = await aiProviderService.generate(locationId, {
        provider: imageProvider,
        type: 'image',
        prompt: idea.mediaPrompt,
        options: {
          imageSize: idea.platform === 'instagram' ? 'square_1_1' : '1024x1024',
          style: 'photo'
        }
      });

      if (result.success) {
        idea.mediaUrl = result.mediaUrl;
      }
    } else if (idea.contentType === 'avatar_video') {
      const avatarId = options?.avatarId || config?.defaultAvatarId;
      const voiceId = options?.voiceId || config?.defaultVoiceId;

      // Use the body as the script for the avatar
      const script = `${idea.hook}\n\n${idea.body}\n\n${idea.cta}`;

      result = await aiProviderService.generate(locationId, {
        provider: 'heygen',
        type: 'avatar_video',
        prompt: script,
        options: {
          avatarId,
          voiceId,
          aspectRatio: ['tiktok', 'instagram'].includes(idea.platform) ? '9:16' : '16:9'
        }
      });

      if (result.success && result.metadata?.videoId) {
        idea.videoId = result.metadata.videoId;
        idea.avatarId = avatarId;
      }
    } else if (idea.contentType === 'video_script' || idea.contentType === 'reel_script') {
      result = await aiProviderService.generate(locationId, {
        provider: videoProvider === 'kling' ? 'kling' : 'kling',
        type: 'video',
        prompt: idea.mediaPrompt,
        options: {
          videoDuration: 5,
          style: 'realistic'
        }
      });

      if (result.success) {
        idea.videoId = result.metadata?.taskId;
        idea.mediaUrl = result.mediaUrl;
      }
    }

    this.ideas.set(ideaId, idea);
    return idea;
  }

  /**
   * Batch generate media for all ideas that need it
   */
  async generateMediaBatch(locationId: string, ideaIds?: string[]): Promise<{ success: number; failed: number; pending: number }> {
    const ideas = ideaIds
      ? ideaIds.map(id => this.ideas.get(id)).filter(Boolean) as ContentIdea[]
      : Array.from(this.ideas.values()).filter(i =>
          i.locationId === locationId &&
          i.mediaPrompt &&
          !i.mediaUrl &&
          !i.videoId &&
          ['image_post', 'carousel', 'avatar_video', 'video_script', 'reel_script'].includes(i.contentType)
        );

    let success = 0, failed = 0, pending = 0;

    for (const idea of ideas) {
      try {
        const result = await this.generateMedia(locationId, idea.id);
        if (result?.mediaUrl) success++;
        else if (result?.videoId) pending++;
        else failed++;
      } catch (e) {
        failed++;
      }
    }

    return { success, failed, pending };
  }

  // ============ IDEA MANAGEMENT ============

  /**
   * Get all ideas for a location
   */
  getIdeas(locationId: string, filters?: {
    status?: ContentIdea['status'][];
    pillarId?: string;
    platform?: PublishPlatform;
    contentType?: ContentIdea['contentType'];
  }): ContentIdea[] {
    const result: ContentIdea[] = [];
    this.ideas.forEach(idea => {
      if (idea.locationId !== locationId) return;
      if (filters?.status && !filters.status.includes(idea.status)) return;
      if (filters?.pillarId && idea.pillarId !== filters.pillarId) return;
      if (filters?.platform && idea.platform !== filters.platform) return;
      if (filters?.contentType && idea.contentType !== filters.contentType) return;
      result.push(idea);
    });
    return result.sort((a, b) => new Date(a.scheduledDate || a.createdAt).getTime() - new Date(b.scheduledDate || b.createdAt).getTime());
  }

  /**
   * Get single idea
   */
  getIdea(ideaId: string): ContentIdea | null {
    return this.ideas.get(ideaId) || null;
  }

  /**
   * Approve an idea and queue it for scheduling
   */
  approveIdea(ideaId: string): ContentIdea | null {
    const idea = this.ideas.get(ideaId);
    if (!idea || idea.status !== 'generated') return null;

    idea.status = 'approved';
    this.ideas.set(ideaId, idea);

    return idea;
  }

  /**
   * Reject an idea
   */
  rejectIdea(ideaId: string): ContentIdea | null {
    const idea = this.ideas.get(ideaId);
    if (!idea) return null;

    idea.status = 'rejected';
    this.ideas.set(ideaId, idea);
    return idea;
  }

  /**
   * Update an idea (edit content before approving)
   */
  updateIdea(ideaId: string, updates: Partial<ContentIdea>): ContentIdea | null {
    const idea = this.ideas.get(ideaId);
    if (!idea) return null;

    const updated = { ...idea, ...updates, id: idea.id, locationId: idea.locationId };
    this.ideas.set(ideaId, updated);
    return updated;
  }

  /**
   * Schedule approved ideas through the content scheduler
   */
  scheduleApprovedIdeas(locationId: string): ScheduledContent[] {
    const approved = this.getIdeas(locationId, { status: ['approved'] });
    const config = this.configs.get(locationId);
    const scheduled: ScheduledContent[] = [];

    for (const idea of approved) {
      const scheduledDate = idea.scheduledDate ? new Date(idea.scheduledDate) : new Date();

      const content = contentScheduler.createScheduledContent({
        locationId,
        content: {
          text: `${idea.hook}\n\n${idea.body}\n\n${idea.cta}`,
          mediaUrls: idea.mediaUrl ? [idea.mediaUrl] : undefined,
          hashtags: idea.hashtags,
          callToAction: idea.cta
        },
        platforms: [idea.platform],
        schedule: {
          type: 'once',
          startDate: scheduledDate.toISOString(),
          time: `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`,
          timezone: 'America/New_York'
        },
        workflow: {
          requiresApproval: false, // already approved in pipeline
          approvers: [],
          notifyViaTelegram: config?.requireApproval || false
        },
        aiGenerated: true,
        aiProvider: idea.aiProvider,
        createdBy: 'creative-pipeline'
      });

      idea.status = 'scheduled';
      this.ideas.set(idea.id, idea);
      scheduled.push(content);
    }

    return scheduled;
  }

  /**
   * Approve all ideas in one shot and schedule them
   */
  approveAndScheduleAll(locationId: string): { approved: number; scheduled: number } {
    const generated = this.getIdeas(locationId, { status: ['generated'] });

    generated.forEach(idea => {
      idea.status = 'approved';
      this.ideas.set(idea.id, idea);
    });

    const scheduled = this.scheduleApprovedIdeas(locationId);
    return { approved: generated.length, scheduled: scheduled.length };
  }

  // ============ MARKET TRENDS ============

  /**
   * Fetch market trends for content ideation
   */
  async fetchTrends(
    locationId: string,
    brandContext: { industry: string; targetAudience: string; keywords: string[] },
    aiProvider: AIProvider = 'gemini'
  ): Promise<MarketTrend[]> {
    const prompt = `You are a trend researcher. Find 5-7 current trending topics relevant to this brand.

Industry: ${brandContext.industry}
Target Audience: ${brandContext.targetAudience}
Keywords: ${brandContext.keywords.join(', ')}

For each trend, provide:
- topic: the trending topic
- summary: 1-2 sentence summary
- relevanceScore: 1-10 how relevant to this brand
- source: where this trend is happening (Twitter, TikTok, news, etc.)
- suggestedAngles: 2-3 content angles for this brand
- suggestedPlatforms: best platforms to post about this

Return ONLY valid JSON array.`;

    const result = await aiProviderService.generate(locationId, {
      provider: aiProvider,
      type: 'text',
      prompt,
      options: { temperature: 0.7 }
    });

    if (!result.success || !result.content) return [];

    let trendsData: any[];
    try {
      const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      trendsData = JSON.parse(cleaned);
    } catch (e) {
      return [];
    }

    const trends: MarketTrend[] = trendsData.map((t: any, index: number) => ({
      id: `trend_${locationId}_${Date.now()}_${index}`,
      locationId,
      topic: t.topic,
      summary: t.summary,
      relevanceScore: t.relevanceScore || 5,
      source: t.source || 'web',
      suggestedAngles: t.suggestedAngles || [],
      suggestedPlatforms: t.suggestedPlatforms || ['instagram'],
      fetchedAt: new Date().toISOString(),
      isUsed: false
    }));

    trends.forEach(t => this.trends.set(t.id, t));
    return trends;
  }

  /**
   * Get trends for a location
   */
  getTrends(locationId: string): MarketTrend[] {
    const result: MarketTrend[] = [];
    this.trends.forEach(t => {
      if (t.locationId === locationId) result.push(t);
    });
    return result.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ============ FULL PIPELINE RUN ============

  /**
   * Run the full automated pipeline:
   * 1. Fetch trends
   * 2. Generate content batch
   * 3. Generate media for posts that need it
   * 4. Queue for approval (or auto-approve)
   * 5. Schedule approved content
   */
  async runFullPipeline(
    locationId: string,
    options: {
      days?: number;
      aiProvider?: AIProvider;
      autoApprove?: boolean;
      generateMedia?: boolean;
    } = {}
  ): Promise<{
    trends: MarketTrend[];
    ideas: ContentIdea[];
    mediaResults: { success: number; failed: number; pending: number };
    scheduled: number;
  }> {
    const config = this.configs.get(locationId);
    if (!config) throw new Error('Pipeline not configured');

    const aiProvider = options.aiProvider || 'gemini';

    // 1. Fetch trends
    const trends = await this.fetchTrends(locationId, {
      industry: config.brandVoice.industry,
      targetAudience: config.brandVoice.targetAudience,
      keywords: config.brandVoice.doSay
    }, aiProvider);

    // 2. Generate content batch
    const ideas = await this.generateContentBatch(locationId, {
      days: options.days || 7,
      includeTrends: true,
      aiProvider
    });

    // 3. Generate media
    let mediaResults = { success: 0, failed: 0, pending: 0 };
    if (options.generateMedia !== false && config.autoGenerateMedia) {
      mediaResults = await this.generateMediaBatch(locationId);
    }

    // 4 & 5. Auto-approve and schedule if configured
    let scheduled = 0;
    if (options.autoApprove || !config.requireApproval) {
      const result = this.approveAndScheduleAll(locationId);
      scheduled = result.scheduled;
    }

    return { trends, ideas, mediaResults, scheduled };
  }

  /**
   * Get pipeline stats for dashboard
   */
  getStats(locationId: string): {
    totalIdeas: number;
    byStatus: Record<ContentIdea['status'], number>;
    byPlatform: Record<string, number>;
    byType: Record<string, number>;
    pillarsActive: number;
    trendsAvailable: number;
  } {
    const ideas = this.getIdeas(locationId);
    const pillars = this.getPillars(locationId).filter(p => p.isActive);
    const trends = this.getTrends(locationId).filter(t => !t.isUsed);

    const byStatus: any = {};
    const byPlatform: any = {};
    const byType: any = {};

    ideas.forEach(idea => {
      byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
      byPlatform[idea.platform] = (byPlatform[idea.platform] || 0) + 1;
      byType[idea.contentType] = (byType[idea.contentType] || 0) + 1;
    });

    return {
      totalIdeas: ideas.length,
      byStatus,
      byPlatform,
      byType,
      pillarsActive: pillars.length,
      trendsAvailable: trends.length
    };
  }
}

export const creativePipeline = new CreativePipeline();
export default creativePipeline;
