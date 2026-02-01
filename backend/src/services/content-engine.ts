/**
 * Content Creation Engine
 * Creates scroll-stopping, SEO/AEO/GEO optimized content with zero hallucination
 * All content is generated from verified Business Twin knowledge only
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { businessTwin } from '../db/business-twin.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Content types supported
export type ContentType =
  | 'social_post'
  | 'blog_article'
  | 'email_campaign'
  | 'ad_copy'
  | 'video_script'
  | 'landing_page'
  | 'product_description'
  | 'press_release'
  | 'case_study'
  | 'faq';

// Platform-specific formats
export type Platform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'google_ads'
  | 'meta_ads'
  | 'email'
  | 'website';

// SEO/AEO/GEO optimization settings
export interface OptimizationSettings {
  // SEO - Traditional search engine optimization
  seo: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    targetWordCount?: number;
    metaDescription?: boolean;
    headingStructure?: boolean;
  };
  // AEO - Answer Engine Optimization (for AI assistants like ChatGPT, Claude, Gemini)
  aeo: {
    targetQuestions: string[];  // Questions this content should answer
    structuredData: boolean;     // Include schema.org markup suggestions
    conciseAnswers: boolean;     // Include direct, quotable answers
    citationFriendly: boolean;   // Format for easy AI citation
  };
  // GEO - Generative Engine Optimization (for AI-generated search results)
  geo: {
    localRelevance?: {
      city?: string;
      region?: string;
      country?: string;
    };
    industryContext: string;
    authoritySignals: boolean;  // Include expertise indicators
    factualDensity: 'high' | 'medium' | 'low';  // How fact-dense the content should be
  };
}

// Content generation request
export interface ContentRequest {
  locationId: string;
  contentType: ContentType;
  platform: Platform;
  topic: string;
  optimization: Partial<OptimizationSettings>;
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'authoritative' | 'friendly';
  length?: 'short' | 'medium' | 'long';
  includeCallToAction?: boolean;
  customInstructions?: string;
}

// Generated content result
export interface ContentResult {
  id: string;
  content: string;
  metadata: {
    type: ContentType;
    platform: Platform;
    wordCount: number;
    readingTime: string;
    generatedAt: string;
  };
  seoData?: {
    title: string;
    metaDescription: string;
    keywords: string[];
    headings: string[];
    slug: string;
  };
  aeoData?: {
    questionsAnswered: string[];
    quotableSnippets: string[];
    structuredDataSuggestion?: object;
  };
  geoData?: {
    localSignals: string[];
    authorityIndicators: string[];
    factCount: number;
  };
  verificationReport: {
    totalClaims: number;
    verifiedClaims: number;
    sourcedFacts: Array<{ fact: string; source: string }>;
    confidence: number;
  };
  variants?: ContentVariant[];
}

export interface ContentVariant {
  id: string;
  variation: string;
  content: string;
  focus: string;
}

// Platform-specific constraints
const PLATFORM_CONSTRAINTS: Record<Platform, { maxLength: number; features: string[] }> = {
  instagram: { maxLength: 2200, features: ['hashtags', 'emojis', 'line_breaks', 'call_to_action'] },
  facebook: { maxLength: 63206, features: ['links', 'hashtags', 'emojis', 'long_form'] },
  linkedin: { maxLength: 3000, features: ['professional_tone', 'hashtags', 'mentions', 'articles'] },
  twitter: { maxLength: 280, features: ['concise', 'hashtags', 'threads', 'engagement'] },
  tiktok: { maxLength: 2200, features: ['trending', 'hashtags', 'hooks', 'youth_appeal'] },
  youtube: { maxLength: 5000, features: ['descriptions', 'timestamps', 'links', 'keywords'] },
  google_ads: { maxLength: 90, features: ['headlines', 'descriptions', 'keywords', 'cta'] },
  meta_ads: { maxLength: 125, features: ['primary_text', 'headline', 'description', 'cta'] },
  email: { maxLength: 50000, features: ['subject_line', 'preview_text', 'personalization', 'cta'] },
  website: { maxLength: 100000, features: ['seo', 'headings', 'internal_links', 'schema'] }
};

// Scroll-stopping hooks by content type
const HOOK_TEMPLATES: Record<ContentType, string[]> = {
  social_post: [
    'pattern_interrupt',      // Break the scroll pattern
    'curiosity_gap',          // Create intrigue
    'bold_statement',         // Make a strong claim (verified only)
    'question_hook',          // Ask engaging question
    'story_open',             // Start a micro-story
    'number_hook',            // Lead with compelling stat
    'contrast_hook'           // Before/after or unexpected comparison
  ],
  blog_article: [
    'problem_agitation',      // Highlight the pain point
    'promise_hook',           // What they'll learn
    'story_hook',             // Narrative opening
    'statistic_hook',         // Data-driven opening
    'question_hook'           // Thought-provoking question
  ],
  email_campaign: [
    'personalization',        // Use their name/context
    'urgency',                // Time-sensitive (only if true)
    'curiosity',              // Incomplete information
    'benefit_led',            // Lead with value
    'story_hook'              // Narrative approach
  ],
  ad_copy: [
    'benefit_statement',      // Clear value prop
    'problem_solution',       // Address pain point
    'social_proof',           // Verified testimonials only
    'urgency',                // Scarcity/time (only if true)
    'question_hook'           // Engage with question
  ],
  video_script: [
    'hook_first_3_seconds',   // Grab attention immediately
    'pattern_interrupt',      // Unexpected opening
    'question_hook',          // Ask compelling question
    'story_hook',             // Start with story
    'number_hook'             // Lead with stat
  ],
  landing_page: [
    'headline_benefit',       // Clear value proposition
    'problem_agitation',      // Empathize with pain
    'social_proof',           // Verified results only
    'fear_of_missing_out',    // What they'll miss (truthful)
    'authority'               // Expertise signals
  ],
  product_description: [
    'benefit_led',            // Lead with outcome
    'sensory_language',       // Paint a picture
    'problem_solution',       // Address needs
    'social_proof',           // Verified reviews only
    'feature_benefit'         // Features → benefits
  ],
  press_release: [
    'newsworthy_hook',        // Why this matters now
    'quote_hook',             // Lead with quote
    'statistic_hook',         // Data-driven opening
    'announcement_hook',      // Clear what's new
    'impact_hook'             // Why readers should care
  ],
  case_study: [
    'result_hook',            // Lead with outcome (verified)
    'challenge_hook',         // The problem faced
    'transformation_hook',    // Before/after
    'quote_hook',             // Client testimonial (verified)
    'number_hook'             // Specific metrics (verified)
  ],
  faq: [
    'question_first',         // Start with the question
    'common_concern',         // Address frequent worry
    'myth_buster',            // Correct misconception
    'how_to',                 // Process explanation
    'comparison'              // vs alternatives
  ]
};

class ContentEngine {
  /**
   * Generate content with full SEO/AEO/GEO optimization
   */
  async generateContent(request: ContentRequest): Promise<ContentResult> {
    // Get business twin for verified knowledge
    const twin = await businessTwin.getByLocationId(request.locationId);
    if (!twin) {
      throw new Error('Business Twin not found. Complete onboarding first.');
    }

    // Build the verified knowledge context
    const verifiedFacts = twin.knowledge
      .filter(k => k.confidence >= 0.7)
      .map(k => `- ${k.fact} [Source: ${k.source}]`);

    const brandContext = `
BRAND VOICE:
- Tone: ${twin.brand_voice.tone.join(', ')}
- Style: ${twin.brand_voice.style.join(', ')}
- Personality: ${twin.brand_voice.personality.join(', ')}
- Key phrases to use: ${twin.brand_voice.vocabulary.preferred.join(', ')}
- Phrases to NEVER use: ${twin.brand_voice.vocabulary.forbidden.join(', ')}

BUSINESS IDENTITY:
- Name: ${twin.identity.business_name}
- Industry: ${twin.identity.industry}
- Description: ${twin.identity.description}
- Value Props: ${twin.identity.value_propositions.join('; ')}
- Differentiators: ${twin.identity.differentiators.join('; ')}
- Target Audience: ${twin.identity.target_audience.join(', ')}
`;

    const platform = PLATFORM_CONSTRAINTS[request.platform];
    const hooks = HOOK_TEMPLATES[request.contentType];

    // Build optimization instructions
    const optimizationInstructions = this.buildOptimizationInstructions(request.optimization);

    const prompt = `You are an expert content creator specializing in scroll-stopping, highly optimized content.

CRITICAL RULES - ZERO HALLUCINATION:
1. ONLY use facts from the VERIFIED FACTS section below
2. NEVER invent statistics, testimonials, or claims
3. If you need a fact that's not available, use placeholder [INSERT VERIFIED DATA]
4. Every claim must be traceable to verified facts
5. When in doubt, be vague rather than specific

${brandContext}

VERIFIED FACTS (use ONLY these):
${verifiedFacts.join('\n')}

PLATFORM: ${request.platform}
- Max length: ${platform.maxLength} characters
- Features to use: ${platform.features.join(', ')}

CONTENT TYPE: ${request.contentType}
- Recommended hooks: ${hooks.join(', ')}

${optimizationInstructions}

TOPIC: ${request.topic}
TONE: ${request.tone || 'professional'}
LENGTH: ${request.length || 'medium'}
${request.includeCallToAction ? 'INCLUDE: Strong call-to-action' : ''}
${request.customInstructions ? `CUSTOM INSTRUCTIONS: ${request.customInstructions}` : ''}

Generate the content now. Make it SCROLL-STOPPING - the first line must grab attention immediately.

After the content, provide:
1. SEO_DATA: title, meta description, keywords, suggested headings, URL slug
2. AEO_DATA: questions this answers, quotable snippets for AI citations
3. GEO_DATA: local signals used, authority indicators, fact count
4. VERIFICATION: list each factual claim and its source from verified facts

Format your response as JSON:
{
  "content": "the main content here",
  "seoData": { "title": "", "metaDescription": "", "keywords": [], "headings": [], "slug": "" },
  "aeoData": { "questionsAnswered": [], "quotableSnippets": [] },
  "geoData": { "localSignals": [], "authorityIndicators": [], "factCount": 0 },
  "verification": { "claims": [{ "claim": "", "source": "" }] }
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                        response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // If JSON parsing fails, return raw content
      parsed = {
        content: response,
        seoData: null,
        aeoData: null,
        geoData: null,
        verification: { claims: [] }
      };
    }

    const contentId = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wordCount = parsed.content.split(/\s+/).length;

    return {
      id: contentId,
      content: parsed.content,
      metadata: {
        type: request.contentType,
        platform: request.platform,
        wordCount,
        readingTime: `${Math.ceil(wordCount / 200)} min`,
        generatedAt: new Date().toISOString()
      },
      seoData: parsed.seoData,
      aeoData: parsed.aeoData,
      geoData: parsed.geoData,
      verificationReport: {
        totalClaims: parsed.verification?.claims?.length || 0,
        verifiedClaims: parsed.verification?.claims?.filter((c: any) => c.source)?.length || 0,
        sourcedFacts: parsed.verification?.claims || [],
        confidence: this.calculateConfidence(parsed.verification?.claims || [], verifiedFacts)
      }
    };
  }

  /**
   * Generate multiple content variants for A/B testing
   */
  async generateVariants(request: ContentRequest, count: number = 3): Promise<ContentResult> {
    const baseContent = await this.generateContent(request);

    const twin = await businessTwin.getByLocationId(request.locationId);
    if (!twin) throw new Error('Business Twin not found');

    const variantPrompt = `Based on this content:
"${baseContent.content}"

Create ${count} variations with different angles:
1. Emotion-focused: Lead with feeling/empathy
2. Logic-focused: Lead with facts/data
3. Story-focused: Lead with narrative

Keep the same verified facts. Return as JSON array:
[{ "variation": "emotion", "content": "...", "focus": "..." }]`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(variantPrompt);
    const response = result.response.text();

    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                        response.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      const variants = JSON.parse(jsonStr);

      baseContent.variants = variants.map((v: any, i: number) => ({
        id: `${baseContent.id}_variant_${i}`,
        variation: v.variation,
        content: v.content,
        focus: v.focus
      }));
    } catch (e) {
      // Keep base content without variants
    }

    return baseContent;
  }

  /**
   * Generate a content calendar
   */
  async generateContentCalendar(
    locationId: string,
    platforms: Platform[],
    durationWeeks: number = 4,
    postsPerWeek: number = 5
  ): Promise<ContentCalendarItem[]> {
    const twin = await businessTwin.getByLocationId(locationId);
    if (!twin) throw new Error('Business Twin not found');

    const calendar: ContentCalendarItem[] = [];
    const topics = await this.generateTopicIdeas(locationId, durationWeeks * postsPerWeek);

    const startDate = new Date();
    let currentDate = new Date(startDate);

    for (let week = 0; week < durationWeeks; week++) {
      for (let post = 0; post < postsPerWeek; post++) {
        const platform = platforms[post % platforms.length];
        const topic = topics[week * postsPerWeek + post] || `Content piece ${week * postsPerWeek + post + 1}`;

        calendar.push({
          id: `cal_${Date.now()}_${week}_${post}`,
          scheduledDate: new Date(currentDate).toISOString(),
          platform,
          topic,
          contentType: this.suggestContentType(platform),
          status: 'planned',
          assignedTo: 'marketing_agent'
        });

        // Move to next day (skip weekends for B2B)
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate.getDay() === 0) currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate.getDay() === 6) currentDate.setDate(currentDate.getDate() + 2);
      }
    }

    return calendar;
  }

  /**
   * Generate topic ideas based on business twin
   */
  async generateTopicIdeas(locationId: string, count: number = 20): Promise<string[]> {
    const twin = await businessTwin.getByLocationId(locationId);
    if (!twin) throw new Error('Business Twin not found');

    const prompt = `Based on this business:
- Industry: ${twin.identity.industry}
- Value Props: ${twin.identity.value_propositions.join(', ')}
- Target Audience: ${twin.identity.target_audience.join(', ')}
- Differentiators: ${twin.identity.differentiators.join(', ')}

Generate ${count} content topic ideas that would:
1. Attract their target audience
2. Showcase their expertise
3. Address common pain points
4. Be shareable and engaging

Return as JSON array of strings: ["topic 1", "topic 2", ...]`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                        response.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      return JSON.parse(jsonStr);
    } catch (e) {
      return [`Industry insights for ${twin.identity.industry}`];
    }
  }

  /**
   * Optimize existing content for better SEO/AEO/GEO
   */
  async optimizeContent(
    locationId: string,
    existingContent: string,
    targetOptimization: 'seo' | 'aeo' | 'geo' | 'all'
  ): Promise<{ optimizedContent: string; improvements: string[] }> {
    const twin = await businessTwin.getByLocationId(locationId);
    if (!twin) throw new Error('Business Twin not found');

    const verifiedFacts = twin.knowledge
      .filter(k => k.confidence >= 0.7)
      .map(k => `- ${k.fact}`);

    const prompt = `Optimize this content for ${targetOptimization === 'all' ? 'SEO, AEO (AI answers), and GEO (generative search)' : targetOptimization}:

ORIGINAL CONTENT:
${existingContent}

VERIFIED FACTS TO INCORPORATE:
${verifiedFacts.join('\n')}

OPTIMIZATION GOALS:
${targetOptimization === 'seo' || targetOptimization === 'all' ? `
SEO:
- Add relevant keywords naturally
- Improve heading structure
- Enhance meta-friendliness
- Add internal linking opportunities
` : ''}
${targetOptimization === 'aeo' || targetOptimization === 'all' ? `
AEO (for AI assistants):
- Add clear, quotable answer snippets
- Structure for easy extraction
- Include question-answer patterns
- Make facts citation-friendly
` : ''}
${targetOptimization === 'geo' || targetOptimization === 'all' ? `
GEO (for generative search):
- Add authority signals
- Include verifiable facts
- Improve information density
- Add expert perspective
` : ''}

Return as JSON:
{
  "optimizedContent": "...",
  "improvements": ["improvement 1", "improvement 2"]
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                        response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      return JSON.parse(jsonStr);
    } catch (e) {
      return { optimizedContent: existingContent, improvements: ['Could not parse optimization'] };
    }
  }

  /**
   * Analyze content for optimization opportunities
   */
  async analyzeContent(content: string): Promise<ContentAnalysis> {
    const prompt = `Analyze this content for SEO, AEO, and GEO optimization opportunities:

${content}

Provide scores (0-100) and specific recommendations for each:

Return as JSON:
{
  "seoScore": 0,
  "seoIssues": ["issue 1"],
  "seoRecommendations": ["rec 1"],
  "aeoScore": 0,
  "aeoIssues": ["issue 1"],
  "aeoRecommendations": ["rec 1"],
  "geoScore": 0,
  "geoIssues": ["issue 1"],
  "geoRecommendations": ["rec 1"],
  "overallScore": 0,
  "readabilityScore": 0,
  "engagementPotential": "low|medium|high"
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                        response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      return JSON.parse(jsonStr);
    } catch (e) {
      return {
        seoScore: 0,
        seoIssues: [],
        seoRecommendations: [],
        aeoScore: 0,
        aeoIssues: [],
        aeoRecommendations: [],
        geoScore: 0,
        geoIssues: [],
        geoRecommendations: [],
        overallScore: 0,
        readabilityScore: 0,
        engagementPotential: 'medium'
      };
    }
  }

  // Helper methods
  private buildOptimizationInstructions(optimization: Partial<OptimizationSettings>): string {
    let instructions = 'OPTIMIZATION REQUIREMENTS:\n';

    if (optimization.seo) {
      instructions += `
SEO OPTIMIZATION:
- Primary keyword: "${optimization.seo.primaryKeyword}" (use naturally 2-3 times)
- Secondary keywords: ${optimization.seo.secondaryKeywords?.join(', ') || 'none'}
- Target word count: ${optimization.seo.targetWordCount || 'appropriate for platform'}
${optimization.seo.metaDescription ? '- Include meta description suggestion' : ''}
${optimization.seo.headingStructure ? '- Use proper H1, H2, H3 hierarchy' : ''}
`;
    }

    if (optimization.aeo) {
      instructions += `
AEO OPTIMIZATION (for AI assistants like ChatGPT, Claude):
- Answer these questions directly: ${optimization.aeo.targetQuestions?.join('; ') || 'relevant questions'}
${optimization.aeo.structuredData ? '- Suggest schema.org structured data' : ''}
${optimization.aeo.conciseAnswers ? '- Include 1-2 sentence quotable answers' : ''}
${optimization.aeo.citationFriendly ? '- Format facts for easy AI citation [Business Name] format' : ''}
`;
    }

    if (optimization.geo) {
      instructions += `
GEO OPTIMIZATION (for AI-generated search results):
${optimization.geo.localRelevance ? `- Local relevance: ${optimization.geo.localRelevance.city || ''} ${optimization.geo.localRelevance.region || ''} ${optimization.geo.localRelevance.country || ''}` : ''}
- Industry context: ${optimization.geo.industryContext || 'general'}
${optimization.geo.authoritySignals ? '- Include expertise/authority signals' : ''}
- Factual density: ${optimization.geo.factualDensity || 'medium'}
`;
    }

    return instructions;
  }

  private calculateConfidence(claims: any[], verifiedFacts: string[]): number {
    if (!claims || claims.length === 0) return 1;
    const verified = claims.filter((c: any) => c.source && c.source !== 'unverified').length;
    return Math.round((verified / claims.length) * 100) / 100;
  }

  private suggestContentType(platform: Platform): ContentType {
    const mapping: Record<Platform, ContentType> = {
      instagram: 'social_post',
      facebook: 'social_post',
      linkedin: 'social_post',
      twitter: 'social_post',
      tiktok: 'video_script',
      youtube: 'video_script',
      google_ads: 'ad_copy',
      meta_ads: 'ad_copy',
      email: 'email_campaign',
      website: 'blog_article'
    };
    return mapping[platform] || 'social_post';
  }
}

// Types for calendar and analysis
export interface ContentCalendarItem {
  id: string;
  scheduledDate: string;
  platform: Platform;
  topic: string;
  contentType: ContentType;
  status: 'planned' | 'drafted' | 'approved' | 'published';
  assignedTo: string;
  content?: string;
}

export interface ContentAnalysis {
  seoScore: number;
  seoIssues: string[];
  seoRecommendations: string[];
  aeoScore: number;
  aeoIssues: string[];
  aeoRecommendations: string[];
  geoScore: number;
  geoIssues: string[];
  geoRecommendations: string[];
  overallScore: number;
  readabilityScore: number;
  engagementPotential: 'low' | 'medium' | 'high';
}

export const contentEngine = new ContentEngine();
export default contentEngine;
