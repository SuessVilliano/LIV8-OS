/**
 * Social Content Service
 * Frontend service for AI-powered social media content generation
 */

import { apiCall } from './api';
import { BrandBrain } from '../types';

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'google';
export type ContentType = 'promotional' | 'educational' | 'engagement' | 'announcement' | 'testimonial' | 'behind-the-scenes';

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

export interface ContentRequest {
    type: ContentType;
    topic: string;
    platforms: SocialPlatform[];
    brandVoice: BrandVoice;
    includeHashtags?: boolean;
    includeEmojis?: boolean;
    includeCallToAction?: boolean;
    callToActionUrl?: string;
    customInstructions?: string;
}

export interface GeneratedContent {
    platform: SocialPlatform;
    content: string;
    hashtags: string[];
    suggestedMediaType: string;
    characterCount: number;
    estimatedEngagement: 'low' | 'medium' | 'high';
}

export interface ContentCalendarItem {
    id: string;
    scheduledAt: string;
    platforms: SocialPlatform[];
    content: GeneratedContent[];
    status: 'draft' | 'scheduled' | 'published' | 'failed';
}

export interface SocialAccount {
    id: string;
    platform: string;
    name: string;
    avatar?: string;
    active: boolean;
}

/**
 * Convert BrandBrain to BrandVoice
 */
export function brandBrainToVoice(brain: BrandBrain): BrandVoice {
    return {
        name: brain.brand_confirmed?.name || brain.domain || 'Business',
        industry: brain.industry || 'General',
        tone: brain.tones || ['professional', 'friendly'],
        values: brain.values || ['quality', 'service'],
        targetAudience: brain.target_audience || 'general audience',
        keyMessages: brain.key_messages || [],
        hashtags: brain.hashtags,
        emojis: true
    };
}

/**
 * Social Content API Service
 */
export const socialContentService = {
    /**
     * Generate social media content
     */
    async generateContent(request: ContentRequest): Promise<GeneratedContent[]> {
        const result = await apiCall('/api/social/generate', {
            method: 'POST',
            body: JSON.stringify(request)
        });
        return result.content;
    },

    /**
     * Generate content and immediately post to GHL
     */
    async generateAndPost(
        locationId: string,
        request: ContentRequest,
        accountIds: string[],
        scheduledAt?: string
    ): Promise<{
        success: boolean;
        content: GeneratedContent[];
        postIds: string[];
        errors: string[];
    }> {
        const result = await apiCall('/api/social/generate-and-post', {
            method: 'POST',
            body: JSON.stringify({
                locationId,
                ...request,
                accountIds,
                scheduledAt
            })
        });
        return result;
    },

    /**
     * Generate a content calendar
     */
    async generateCalendar(
        brandVoice: BrandVoice,
        platforms: SocialPlatform[],
        topics: string[],
        postsPerWeek: number = 5,
        weeks: number = 1
    ): Promise<ContentCalendarItem[]> {
        const result = await apiCall('/api/social/calendar', {
            method: 'POST',
            body: JSON.stringify({
                brandVoice,
                platforms,
                topics,
                postsPerWeek,
                weeks
            })
        });
        return result.calendar;
    },

    /**
     * Repurpose content for different platforms
     */
    async repurposeContent(
        originalContent: string,
        originalPlatform: SocialPlatform,
        targetPlatforms: SocialPlatform[],
        brandVoice: BrandVoice
    ): Promise<GeneratedContent[]> {
        const result = await apiCall('/api/social/repurpose', {
            method: 'POST',
            body: JSON.stringify({
                originalContent,
                originalPlatform,
                targetPlatforms,
                brandVoice
            })
        });
        return result.repurposed;
    },

    /**
     * Get connected social media accounts for a location
     */
    async getAccounts(locationId: string): Promise<SocialAccount[]> {
        const result = await apiCall(`/api/social/accounts/${locationId}`);
        return result.accounts;
    },

    /**
     * Get scheduled/published posts for a location
     */
    async getPosts(locationId: string, status?: string, limit?: number): Promise<any[]> {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (limit) params.append('limit', limit.toString());

        const queryString = params.toString();
        const url = `/api/social/posts/${locationId}${queryString ? `?${queryString}` : ''}`;

        const result = await apiCall(url);
        return result.posts;
    },

    /**
     * Quick generate - simplified method for common use case
     */
    async quickGenerate(
        topic: string,
        platforms: SocialPlatform[],
        brandBrain: BrandBrain,
        type: ContentType = 'promotional'
    ): Promise<GeneratedContent[]> {
        const brandVoice = brandBrainToVoice(brandBrain);

        return this.generateContent({
            type,
            topic,
            platforms,
            brandVoice,
            includeHashtags: true,
            includeEmojis: true,
            includeCallToAction: type === 'promotional'
        });
    },

    /**
     * Quick post - simplified method to generate and post immediately
     */
    async quickPost(
        locationId: string,
        topic: string,
        platforms: SocialPlatform[],
        accountIds: string[],
        brandBrain: BrandBrain,
        type: ContentType = 'promotional',
        scheduledAt?: string
    ): Promise<{
        success: boolean;
        content: GeneratedContent[];
        postIds: string[];
    }> {
        const brandVoice = brandBrainToVoice(brandBrain);

        return this.generateAndPost(
            locationId,
            {
                type,
                topic,
                platforms,
                brandVoice,
                includeHashtags: true,
                includeEmojis: true,
                includeCallToAction: type === 'promotional'
            },
            accountIds,
            scheduledAt
        );
    }
};

export default socialContentService;
