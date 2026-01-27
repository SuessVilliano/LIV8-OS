import { GoogleGenerativeAI } from '@google/generative-ai';
import { GHLApiClient, createGHLClient, GHLSocialPost } from './ghl-api-client.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Social Media Platform Types
 */
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'google';

/**
 * Brand Voice Configuration
 */
export interface BrandVoice {
    name: string;
    industry: string;
    tone: string[];
    values: string[];
    targetAudience: string;
    keyMessages: string[];
    hashtags?: string[];
    emojis?: boolean;
}

/**
 * Content Request
 */
export interface ContentRequest {
    type: 'promotional' | 'educational' | 'engagement' | 'announcement' | 'testimonial' | 'behind-the-scenes';
    topic: string;
    platforms: SocialPlatform[];
    brandVoice: BrandVoice;
    includeHashtags?: boolean;
    includeEmojis?: boolean;
    includeCallToAction?: boolean;
    callToActionUrl?: string;
    mediaDescription?: string;
    scheduledAt?: string;
    customInstructions?: string;
}

/**
 * Generated Content Result
 */
export interface GeneratedContent {
    platform: SocialPlatform;
    content: string;
    hashtags: string[];
    suggestedMediaType: string;
    characterCount: number;
    estimatedEngagement: 'low' | 'medium' | 'high';
}

/**
 * Content Calendar Item
 */
export interface ContentCalendarItem {
    id: string;
    scheduledAt: string;
    platforms: SocialPlatform[];
    content: GeneratedContent[];
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    ghlPostIds?: string[];
}

/**
 * Platform character limits and best practices
 */
const PLATFORM_CONFIG: Record<SocialPlatform, {
    maxLength: number;
    hashtagLimit: number;
    bestPractices: string[];
}> = {
    facebook: {
        maxLength: 63206,
        hashtagLimit: 3,
        bestPractices: ['Questions drive engagement', 'Keep under 80 chars for best reach', 'Use 1-2 emojis']
    },
    instagram: {
        maxLength: 2200,
        hashtagLimit: 30,
        bestPractices: ['First line is crucial', 'Use line breaks', 'Hashtags at end or in comments']
    },
    linkedin: {
        maxLength: 3000,
        hashtagLimit: 5,
        bestPractices: ['Professional tone', 'Thought leadership', 'Industry insights', 'No emojis or minimal']
    },
    twitter: {
        maxLength: 280,
        hashtagLimit: 2,
        bestPractices: ['Concise and punchy', 'Use threads for longer content', 'Engage with trending topics']
    },
    tiktok: {
        maxLength: 2200,
        hashtagLimit: 5,
        bestPractices: ['Casual and authentic', 'Trending sounds reference', 'Hook in first 3 seconds mention']
    },
    google: {
        maxLength: 1500,
        hashtagLimit: 0,
        bestPractices: ['Local SEO focus', 'Include location', 'Business updates']
    }
};

/**
 * Social Content Engine
 * AI-powered content generation and scheduling for GHL
 */
export class SocialContentEngine {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        if (GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        }
    }

    /**
     * Generate content for multiple platforms
     */
    async generateContent(request: ContentRequest): Promise<GeneratedContent[]> {
        const results: GeneratedContent[] = [];

        for (const platform of request.platforms) {
            const content = await this.generatePlatformContent(platform, request);
            results.push(content);
        }

        return results;
    }

    /**
     * Generate content for a specific platform
     */
    private async generatePlatformContent(
        platform: SocialPlatform,
        request: ContentRequest
    ): Promise<GeneratedContent> {
        const config = PLATFORM_CONFIG[platform];

        if (!this.genAI) {
            // Fallback to template-based generation
            return this.generateTemplateContent(platform, request);
        }

        const model = this.genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: 'application/json'
            }
        });

        const prompt = this.buildContentPrompt(platform, request, config);

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const parsed = JSON.parse(responseText);

            return {
                platform,
                content: parsed.content || parsed.text,
                hashtags: parsed.hashtags || [],
                suggestedMediaType: parsed.suggestedMediaType || 'image',
                characterCount: (parsed.content || parsed.text).length,
                estimatedEngagement: this.estimateEngagement(parsed.content || parsed.text, platform)
            };
        } catch (error) {
            console.error(`[SocialEngine] AI generation failed for ${platform}:`, error);
            return this.generateTemplateContent(platform, request);
        }
    }

    /**
     * Build the AI prompt for content generation
     */
    private buildContentPrompt(
        platform: SocialPlatform,
        request: ContentRequest,
        config: typeof PLATFORM_CONFIG[SocialPlatform]
    ): string {
        return `Generate a ${platform} social media post for a business.

**Brand Information:**
- Business Name: ${request.brandVoice.name}
- Industry: ${request.brandVoice.industry}
- Tone: ${request.brandVoice.tone.join(', ')}
- Values: ${request.brandVoice.values.join(', ')}
- Target Audience: ${request.brandVoice.targetAudience}
- Key Messages: ${request.brandVoice.keyMessages.join('; ')}

**Content Request:**
- Type: ${request.type}
- Topic: ${request.topic}
- Platform: ${platform}
${request.mediaDescription ? `- Media: ${request.mediaDescription}` : ''}
${request.customInstructions ? `- Special Instructions: ${request.customInstructions}` : ''}

**Platform Requirements:**
- Maximum Length: ${config.maxLength} characters
- Max Hashtags: ${config.hashtagLimit}
- Best Practices: ${config.bestPractices.join('; ')}

**Output Requirements:**
${request.includeHashtags !== false ? `- Include ${Math.min(config.hashtagLimit, 5)} relevant hashtags` : '- No hashtags'}
${request.includeEmojis !== false && request.brandVoice.emojis !== false ? '- Include appropriate emojis' : '- No emojis'}
${request.includeCallToAction ? `- Include call to action${request.callToActionUrl ? ` with link: ${request.callToActionUrl}` : ''}` : ''}

Return JSON with this structure:
{
  "content": "The full post text",
  "hashtags": ["hashtag1", "hashtag2"],
  "suggestedMediaType": "image" | "video" | "carousel" | "text-only",
  "hookLine": "The attention-grabbing first line"
}`;
    }

    /**
     * Template-based fallback content generation
     */
    private generateTemplateContent(
        platform: SocialPlatform,
        request: ContentRequest
    ): GeneratedContent {
        const templates = this.getContentTemplates(request.type);
        const template = templates[Math.floor(Math.random() * templates.length)];

        let content = template
            .replace('{business}', request.brandVoice.name)
            .replace('{topic}', request.topic)
            .replace('{industry}', request.brandVoice.industry)
            .replace('{value}', request.brandVoice.values[0] || 'excellence')
            .replace('{audience}', request.brandVoice.targetAudience);

        // Add call to action if requested
        if (request.includeCallToAction && request.callToActionUrl) {
            content += `\n\nLearn more: ${request.callToActionUrl}`;
        }

        // Generate hashtags
        const hashtags = this.generateHashtags(request, PLATFORM_CONFIG[platform].hashtagLimit);

        if (request.includeHashtags !== false && hashtags.length > 0) {
            content += '\n\n' + hashtags.map(h => `#${h}`).join(' ');
        }

        // Trim to platform limit
        const maxLength = PLATFORM_CONFIG[platform].maxLength;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength - 3) + '...';
        }

        return {
            platform,
            content,
            hashtags,
            suggestedMediaType: 'image',
            characterCount: content.length,
            estimatedEngagement: 'medium'
        };
    }

    /**
     * Get content templates by type
     */
    private getContentTemplates(type: ContentRequest['type']): string[] {
        const templates: Record<string, string[]> = {
            promotional: [
                "Ready to transform your {topic}? {business} is here to help! Our expert team delivers results that speak for themselves.",
                "Special announcement from {business}! We're excited to share our latest {topic} solutions designed just for you.",
                "Why settle for less? {business} brings you premium {topic} services that exceed expectations."
            ],
            educational: [
                "Did you know? Here's a quick tip about {topic} from the experts at {business}.",
                "Let's talk about {topic}. At {business}, we believe in sharing knowledge that empowers our community.",
                "Understanding {topic} doesn't have to be complicated. Here's what you need to know..."
            ],
            engagement: [
                "We want to hear from you! What's your biggest challenge with {topic}? Drop a comment below!",
                "Quick question for our amazing community: How has {topic} impacted your business?",
                "It's feedback Friday! Tell us what you'd like to see more of from {business}."
            ],
            announcement: [
                "Big news from {business}! We're thrilled to announce {topic}.",
                "Mark your calendars! {business} has something exciting coming your way: {topic}",
                "The wait is over! {business} is proud to present {topic}."
            ],
            testimonial: [
                "Don't just take our word for it! Here's what our clients say about {business} and our {topic} services.",
                "Real results, real people. Thank you to our amazing clients for trusting {business} with their {topic} needs.",
                "Success story spotlight! See how {business} helped transform {topic} for another happy client."
            ],
            'behind-the-scenes': [
                "Ever wonder what goes on behind the scenes at {business}? Here's a sneak peek at our {topic} process!",
                "Meet the team! Today we're sharing a glimpse into how we create amazing {topic} experiences.",
                "From our office to yours - here's how {business} brings {topic} to life every day."
            ]
        };

        return templates[type] || templates.promotional;
    }

    /**
     * Generate relevant hashtags
     */
    private generateHashtags(request: ContentRequest, limit: number): string[] {
        const hashtags: string[] = [];

        // Add brand hashtags
        if (request.brandVoice.hashtags) {
            hashtags.push(...request.brandVoice.hashtags.slice(0, 2));
        }

        // Add industry hashtags
        const industryTags = this.getIndustryHashtags(request.brandVoice.industry);
        hashtags.push(...industryTags.slice(0, 2));

        // Add topic hashtags
        const topicTag = request.topic.replace(/\s+/g, '').toLowerCase();
        if (topicTag.length <= 20) {
            hashtags.push(topicTag);
        }

        // Add content type hashtags
        const typeTags: Record<string, string[]> = {
            promotional: ['offer', 'deal', 'promo'],
            educational: ['tips', 'howto', 'learn'],
            engagement: ['community', 'askmeanything', 'feedback'],
            announcement: ['news', 'announcement', 'exciting'],
            testimonial: ['testimonial', 'review', 'clientlove'],
            'behind-the-scenes': ['bts', 'behindthescenes', 'teamwork']
        };
        if (typeTags[request.type]) {
            hashtags.push(typeTags[request.type][0]);
        }

        // Remove duplicates and limit
        return [...new Set(hashtags)].slice(0, limit);
    }

    /**
     * Get industry-specific hashtags
     */
    private getIndustryHashtags(industry: string): string[] {
        const industryTags: Record<string, string[]> = {
            'real estate': ['realestate', 'realtor', 'property', 'homesale'],
            'healthcare': ['healthcare', 'wellness', 'health', 'medical'],
            'fitness': ['fitness', 'gym', 'workout', 'health'],
            'restaurant': ['foodie', 'restaurant', 'dining', 'foodlover'],
            'legal': ['law', 'legal', 'attorney', 'lawyer'],
            'marketing': ['marketing', 'digital', 'growth', 'business'],
            'technology': ['tech', 'innovation', 'digital', 'software'],
            'ecommerce': ['ecommerce', 'shopping', 'onlinestore', 'retail'],
            'beauty': ['beauty', 'skincare', 'makeup', 'selfcare'],
            'automotive': ['auto', 'cars', 'automotive', 'driving']
        };

        const normalized = industry.toLowerCase();
        for (const [key, tags] of Object.entries(industryTags)) {
            if (normalized.includes(key)) {
                return tags;
            }
        }

        return ['business', 'entrepreneur', 'success'];
    }

    /**
     * Estimate engagement level based on content
     */
    private estimateEngagement(content: string, platform: SocialPlatform): 'low' | 'medium' | 'high' {
        let score = 0;

        // Check for engagement triggers
        if (content.includes('?')) score += 2; // Questions
        if (content.match(/!{1,2}/)) score += 1; // Excitement
        if (content.match(/\b(you|your)\b/gi)) score += 2; // Personal
        if (content.match(/\b(free|exclusive|limited|now)\b/gi)) score += 1; // Urgency
        if (content.match(/[\u{1F300}-\u{1F9FF}]/gu)) score += 1; // Emojis

        // Platform-specific adjustments
        if (platform === 'linkedin' && content.length > 500) score += 1;
        if (platform === 'twitter' && content.length < 100) score += 1;
        if (platform === 'instagram' && content.includes('#')) score += 1;

        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    /**
     * Create and schedule a post in GHL
     */
    async createAndSchedulePost(
        ghlClient: GHLApiClient,
        content: GeneratedContent[],
        accountIds: string[],
        scheduledAt?: string
    ): Promise<{ success: boolean; postIds: string[]; errors: string[] }> {
        const postIds: string[] = [];
        const errors: string[] = [];

        // Group content by similar platforms or create separate posts
        for (const item of content) {
            try {
                const postData: GHLSocialPost = {
                    accountIds: accountIds,
                    content: item.content,
                    scheduledAt: scheduledAt
                };

                const result = await ghlClient.createSocialMediaPost(postData);

                if (result.id) {
                    postIds.push(result.id);
                }
            } catch (error: any) {
                errors.push(`${item.platform}: ${error.message}`);
            }
        }

        return {
            success: errors.length === 0,
            postIds,
            errors
        };
    }

    /**
     * Generate a content calendar for a week/month
     */
    async generateContentCalendar(
        brandVoice: BrandVoice,
        platforms: SocialPlatform[],
        topics: string[],
        postsPerWeek: number = 5,
        weeks: number = 1
    ): Promise<ContentCalendarItem[]> {
        const calendar: ContentCalendarItem[] = [];
        const contentTypes: ContentRequest['type'][] = [
            'promotional', 'educational', 'engagement', 'announcement', 'behind-the-scenes'
        ];

        const now = new Date();
        let topicIndex = 0;

        for (let week = 0; week < weeks; week++) {
            for (let post = 0; post < postsPerWeek; post++) {
                const dayOffset = week * 7 + Math.floor(post * (7 / postsPerWeek));
                const scheduledDate = new Date(now);
                scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
                scheduledDate.setHours(10 + (post % 3) * 4, 0, 0, 0); // 10am, 2pm, or 6pm

                const topic = topics[topicIndex % topics.length];
                const contentType = contentTypes[post % contentTypes.length];
                topicIndex++;

                const content = await this.generateContent({
                    type: contentType,
                    topic,
                    platforms,
                    brandVoice,
                    includeHashtags: true,
                    includeEmojis: true,
                    includeCallToAction: contentType === 'promotional'
                });

                calendar.push({
                    id: `cal_${Date.now()}_${post}`,
                    scheduledAt: scheduledDate.toISOString(),
                    platforms,
                    content,
                    status: 'draft'
                });
            }
        }

        return calendar;
    }

    /**
     * Repurpose existing content for different platforms
     */
    async repurposeContent(
        originalContent: string,
        originalPlatform: SocialPlatform,
        targetPlatforms: SocialPlatform[],
        brandVoice: BrandVoice
    ): Promise<GeneratedContent[]> {
        const results: GeneratedContent[] = [];

        if (!this.genAI) {
            // Simple repurposing without AI
            for (const platform of targetPlatforms) {
                const config = PLATFORM_CONFIG[platform];
                let repurposed = originalContent;

                if (repurposed.length > config.maxLength) {
                    repurposed = repurposed.substring(0, config.maxLength - 3) + '...';
                }

                results.push({
                    platform,
                    content: repurposed,
                    hashtags: [],
                    suggestedMediaType: 'image',
                    characterCount: repurposed.length,
                    estimatedEngagement: 'medium'
                });
            }
            return results;
        }

        const model = this.genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        for (const platform of targetPlatforms) {
            const config = PLATFORM_CONFIG[platform];

            const prompt = `Repurpose this ${originalPlatform} content for ${platform}:

Original content:
"${originalContent}"

Brand: ${brandVoice.name}
Tone: ${brandVoice.tone.join(', ')}

Platform requirements for ${platform}:
- Max length: ${config.maxLength} characters
- Max hashtags: ${config.hashtagLimit}
- Best practices: ${config.bestPractices.join('; ')}

Return JSON:
{
  "content": "Repurposed content optimized for ${platform}",
  "hashtags": ["relevant", "hashtags"],
  "suggestedMediaType": "image|video|carousel|text-only"
}`;

            try {
                const result = await model.generateContent(prompt);
                const parsed = JSON.parse(result.response.text());

                results.push({
                    platform,
                    content: parsed.content,
                    hashtags: parsed.hashtags || [],
                    suggestedMediaType: parsed.suggestedMediaType || 'image',
                    characterCount: parsed.content.length,
                    estimatedEngagement: this.estimateEngagement(parsed.content, platform)
                });
            } catch (error) {
                console.error(`[SocialEngine] Repurpose failed for ${platform}:`, error);
            }
        }

        return results;
    }
}

export const socialContentEngine = new SocialContentEngine();
export default SocialContentEngine;
