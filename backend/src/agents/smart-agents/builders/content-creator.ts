/**
 * Content Creator Agent
 *
 * Generates all types of marketing content:
 * - Social media posts (all platforms)
 * - Email sequences
 * - SMS sequences
 * - Blog posts
 * - Ad copy
 * - Landing page copy
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContentRequest, GeneratedContent, ContentPiece } from '../types.js';
import { BrandBrain } from '../../../services/brand-scanner.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Platform-specific constraints
 */
export const PLATFORM_CONSTRAINTS = {
    facebook: { maxLength: 2000, supportsHashtags: true, supportsEmoji: true },
    instagram: { maxLength: 2200, supportsHashtags: true, supportsEmoji: true, maxHashtags: 30 },
    linkedin: { maxLength: 3000, supportsHashtags: true, supportsEmoji: false },
    twitter: { maxLength: 280, supportsHashtags: true, supportsEmoji: true },
    tiktok: { maxLength: 2200, supportsHashtags: true, supportsEmoji: true }
};

/**
 * Content Creator Class
 */
export class ContentCreator {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        if (GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        }
    }

    /**
     * Generate content based on request
     */
    async generateContent(request: ContentRequest, brandBrain: BrandBrain): Promise<GeneratedContent> {
        switch (request.type) {
            case 'social_post':
                return this.generateSocialPosts(request, brandBrain);
            case 'email_sequence':
                return this.generateEmailSequence(request, brandBrain);
            case 'sms_sequence':
                return this.generateSMSSequence(request, brandBrain);
            case 'blog_post':
                return this.generateBlogPost(request, brandBrain);
            case 'ad_copy':
                return this.generateAdCopy(request, brandBrain);
            case 'landing_page':
                return this.generateLandingPageCopy(request, brandBrain);
            default:
                throw new Error(`Unknown content type: ${request.type}`);
        }
    }

    /**
     * Generate social media posts
     */
    async generateSocialPosts(request: ContentRequest, brandBrain: BrandBrain): Promise<GeneratedContent> {
        const platforms = request.platforms || ['facebook', 'instagram'];
        const posts: ContentPiece[] = [];

        if (!this.genAI) {
            return this.getDefaultSocialContent(brandBrain, platforms);
        }

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });

            for (const platform of platforms) {
                const constraints = PLATFORM_CONSTRAINTS[platform as keyof typeof PLATFORM_CONSTRAINTS];

                const prompt = `Create a ${platform} post for ${brandBrain.brand_name}.

Brand Info:
- Industry: ${brandBrain.industry_niche}
- Services: ${brandBrain.key_services.join(', ')}
- Location: ${brandBrain.geographic_location}
- Tone: Professional ${Math.round(brandBrain.tone_profile.professional * 100)}%, Friendly ${Math.round(brandBrain.tone_profile.friendly * 100)}%
- Do Say: ${brandBrain.do_say.slice(0, 3).join(', ')}

Topic: ${request.topic}
Goal: ${request.goal || 'engagement'}
Target Audience: ${request.targetAudience || 'general'}

Constraints:
- Max length: ${constraints.maxLength} characters
- Include hashtags: ${constraints.supportsHashtags}
- Include emojis: ${constraints.supportsEmoji && request.includeEmojis !== false}
- Include CTA: ${request.includeCTA !== false}

Return JSON:
{
  "text": "the post content",
  "hashtags": ["relevant", "hashtags"],
  "cta": "call to action if applicable"
}`;

                const result = await model.generateContent(prompt);
                const response = JSON.parse(result.response.text());

                posts.push({
                    id: `post_${platform}_${Date.now()}`,
                    platform,
                    body: response.text,
                    hashtags: response.hashtags
                });
            }

            return {
                id: `content_${Date.now()}`,
                type: 'social_post',
                content: posts,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    model: 'gemini-1.5-flash',
                    brandBrainId: brandBrain.domain,
                    tokens: 0
                }
            };
        } catch (error) {
            console.error('[ContentCreator] Social post generation failed:', error);
            return this.getDefaultSocialContent(brandBrain, platforms);
        }
    }

    /**
     * Generate email sequence
     */
    async generateEmailSequence(request: ContentRequest, brandBrain: BrandBrain): Promise<GeneratedContent> {
        const sequenceLength = request.sequenceLength || 5;
        const emails: ContentPiece[] = [];

        if (!this.genAI) {
            return this.getDefaultEmailSequence(brandBrain, sequenceLength);
        }

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });

            const prompt = `Create a ${sequenceLength}-email nurture sequence for ${brandBrain.brand_name}.

Brand Info:
- Industry: ${brandBrain.industry_niche}
- Services: ${brandBrain.key_services.join(', ')}
- Primary Offer: ${brandBrain.primary_offer}
- Tone: Professional ${Math.round(brandBrain.tone_profile.professional * 100)}%, Friendly ${Math.round(brandBrain.tone_profile.friendly * 100)}%

Sequence Goal: ${request.goal || 'nurture leads to booking'}
Target Audience: ${request.targetAudience || 'new leads'}

Create a sequence where each email builds on the previous:
1. Welcome/Introduction
2. Value/Education
3. Social Proof/Case Study
4. Overcome Objections
5. Call to Action/Offer

For each email, provide:
- subject: Compelling subject line
- preheader: Preview text
- body: Email body with {{firstName}} personalization
- cta: Call to action button text
- sendDelay: Days after previous email

Return JSON:
{
  "emails": [
    {
      "subject": "...",
      "preheader": "...",
      "body": "...",
      "cta": "...",
      "sendDelay": 0
    }
  ]
}`;

            const result = await model.generateContent(prompt);
            const response = JSON.parse(result.response.text());

            for (let i = 0; i < response.emails.length; i++) {
                const email = response.emails[i];
                emails.push({
                    id: `email_${i + 1}_${Date.now()}`,
                    subject: email.subject,
                    body: email.body,
                    scheduledFor: email.sendDelay ? `+${email.sendDelay}d` : undefined
                });
            }

            return {
                id: `sequence_${Date.now()}`,
                type: 'email_sequence',
                content: emails,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    model: 'gemini-1.5-flash',
                    brandBrainId: brandBrain.domain,
                    tokens: 0
                }
            };
        } catch (error) {
            console.error('[ContentCreator] Email sequence generation failed:', error);
            return this.getDefaultEmailSequence(brandBrain, sequenceLength);
        }
    }

    /**
     * Generate SMS sequence
     */
    async generateSMSSequence(request: ContentRequest, brandBrain: BrandBrain): Promise<GeneratedContent> {
        const sequenceLength = request.sequenceLength || 3;
        const messages: ContentPiece[] = [];

        if (!this.genAI) {
            return this.getDefaultSMSSequence(brandBrain, sequenceLength);
        }

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });

            const prompt = `Create a ${sequenceLength}-message SMS follow-up sequence for ${brandBrain.brand_name}.

Brand Info:
- Industry: ${brandBrain.industry_niche}
- Services: ${brandBrain.key_services.join(', ')}

Sequence Goal: ${request.goal || 'follow up with new leads'}

Rules:
- Keep each message under 160 characters
- Be conversational and personal
- Include {{firstName}} personalization
- Each message should have a clear purpose
- Don't be pushy

Return JSON:
{
  "messages": [
    {
      "text": "...",
      "sendDelay": 0,
      "purpose": "initial contact"
    }
  ]
}`;

            const result = await model.generateContent(prompt);
            const response = JSON.parse(result.response.text());

            for (let i = 0; i < response.messages.length; i++) {
                const msg = response.messages[i];
                messages.push({
                    id: `sms_${i + 1}_${Date.now()}`,
                    body: msg.text,
                    scheduledFor: msg.sendDelay ? `+${msg.sendDelay}h` : undefined
                });
            }

            return {
                id: `sms_sequence_${Date.now()}`,
                type: 'sms_sequence',
                content: messages,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    model: 'gemini-1.5-flash',
                    brandBrainId: brandBrain.domain,
                    tokens: 0
                }
            };
        } catch (error) {
            console.error('[ContentCreator] SMS sequence generation failed:', error);
            return this.getDefaultSMSSequence(brandBrain, sequenceLength);
        }
    }

    /**
     * Generate blog post
     */
    async generateBlogPost(request: ContentRequest, brandBrain: BrandBrain): Promise<GeneratedContent> {
        if (!this.genAI) {
            return this.getDefaultBlogPost(brandBrain, request.topic);
        }

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });

            const prompt = `Write a blog post for ${brandBrain.brand_name}.

Brand Info:
- Industry: ${brandBrain.industry_niche}
- Services: ${brandBrain.key_services.join(', ')}
- Location: ${brandBrain.geographic_location}
- SEO Keywords: ${brandBrain.target_keywords?.join(', ') || 'general'}

Topic: ${request.topic}
Target Audience: ${request.targetAudience || 'potential customers'}
Goal: ${request.goal || 'educate and convert'}

Write a 800-1200 word blog post that:
- Is SEO optimized for local search
- Includes the brand naturally
- Has a compelling headline
- Uses subheadings for readability
- Ends with a call to action

Return JSON:
{
  "title": "...",
  "metaDescription": "...",
  "body": "full blog post in markdown",
  "suggestedTags": ["tag1", "tag2"]
}`;

            const result = await model.generateContent(prompt);
            const response = JSON.parse(result.response.text());

            return {
                id: `blog_${Date.now()}`,
                type: 'blog_post',
                content: response.body,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    model: 'gemini-1.5-flash',
                    brandBrainId: brandBrain.domain,
                    tokens: 0
                }
            };
        } catch (error) {
            console.error('[ContentCreator] Blog post generation failed:', error);
            return this.getDefaultBlogPost(brandBrain, request.topic);
        }
    }

    /**
     * Generate ad copy
     */
    async generateAdCopy(request: ContentRequest, brandBrain: BrandBrain): Promise<GeneratedContent> {
        // Similar implementation for ad copy
        return {
            id: `ad_${Date.now()}`,
            type: 'ad_copy',
            content: `${brandBrain.brand_name} - ${brandBrain.primary_offer}. Contact us today!`,
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'default',
                brandBrainId: brandBrain.domain,
                tokens: 0
            }
        };
    }

    /**
     * Generate landing page copy
     */
    async generateLandingPageCopy(request: ContentRequest, brandBrain: BrandBrain): Promise<GeneratedContent> {
        // Similar implementation for landing pages
        const landingPageContent = `# ${brandBrain.primary_offer}

## Trusted ${brandBrain.industry_niche} in ${brandBrain.geographic_location}

### Benefits:
${brandBrain.key_services.map((s: string) => `- ${s}`).join('\n')}

**Get Started Today**`;

        return {
            id: `lp_${Date.now()}`,
            type: 'landing_page',
            content: landingPageContent,
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'default',
                brandBrainId: brandBrain.domain,
                tokens: 0
            }
        };
    }

    // Default content generators (when AI is unavailable)

    private getDefaultSocialContent(brandBrain: BrandBrain, platforms: string[]): GeneratedContent {
        const posts = platforms.map(platform => ({
            id: `post_${platform}_${Date.now()}`,
            platform,
            body: `Looking for ${brandBrain.industry_niche.toLowerCase()} services in ${brandBrain.geographic_location}? ${brandBrain.brand_name} is here to help! Contact us today.`,
            hashtags: ['local', brandBrain.industry_niche.toLowerCase().replace(/\s+/g, '')]
        }));

        return {
            id: `content_${Date.now()}`,
            type: 'social_post',
            content: posts,
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'default',
                brandBrainId: brandBrain.domain,
                tokens: 0
            }
        };
    }

    private getDefaultEmailSequence(brandBrain: BrandBrain, length: number): GeneratedContent {
        const emails: ContentPiece[] = [
            {
                id: `email_1`,
                subject: `Welcome to ${brandBrain.brand_name}!`,
                body: `Hi {{firstName}},\n\nThank you for your interest in ${brandBrain.brand_name}...`
            }
        ];

        return {
            id: `sequence_${Date.now()}`,
            type: 'email_sequence',
            content: emails,
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'default',
                brandBrainId: brandBrain.domain,
                tokens: 0
            }
        };
    }

    private getDefaultSMSSequence(brandBrain: BrandBrain, length: number): GeneratedContent {
        const messages: ContentPiece[] = [
            {
                id: `sms_1`,
                body: `Hi {{firstName}}! Thanks for reaching out to ${brandBrain.brand_name}. How can we help you today?`
            }
        ];

        return {
            id: `sms_sequence_${Date.now()}`,
            type: 'sms_sequence',
            content: messages,
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'default',
                brandBrainId: brandBrain.domain,
                tokens: 0
            }
        };
    }

    private getDefaultBlogPost(brandBrain: BrandBrain, topic: string): GeneratedContent {
        return {
            id: `blog_${Date.now()}`,
            type: 'blog_post',
            content: `# ${topic}\n\nContent about ${topic} for ${brandBrain.brand_name}...`,
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'default',
                brandBrainId: brandBrain.domain,
                tokens: 0
            }
        };
    }

    /**
     * Generate a complete content calendar
     */
    async generateContentCalendar(params: {
        brandBrain: BrandBrain;
        platforms: string[];
        weeks: number;
        postsPerWeek: number;
        topics?: string[];
    }): Promise<ContentPiece[]> {
        const calendar: ContentPiece[] = [];
        const topics = params.topics || [
            'Educational tip',
            'Behind the scenes',
            'Customer success story',
            'Promotional offer',
            'Industry news',
            'Team spotlight',
            'FAQ answer'
        ];

        for (let week = 0; week < params.weeks; week++) {
            for (let post = 0; post < params.postsPerWeek; post++) {
                const topic = topics[(week * params.postsPerWeek + post) % topics.length];
                const platform = params.platforms[post % params.platforms.length];

                const content = await this.generateContent({
                    type: 'social_post',
                    topic,
                    brandBrainId: params.brandBrain.domain,
                    platforms: [platform as any]
                }, params.brandBrain);

                if (Array.isArray(content.content)) {
                    content.content.forEach(piece => {
                        const date = new Date();
                        date.setDate(date.getDate() + (week * 7) + post);
                        piece.scheduledFor = date.toISOString();
                        calendar.push(piece);
                    });
                }
            }
        }

        return calendar;
    }
}

/**
 * Create ContentCreator instance
 */
export function createContentCreator(): ContentCreator {
    return new ContentCreator();
}

export default ContentCreator;
