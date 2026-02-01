/**
 * Instagram Integration
 *
 * Handles Instagram posting via Facebook Graph API (Instagram Graph API)
 * Requires Facebook Page connected to Instagram Professional Account
 */

import axios from 'axios';

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface InstagramConfig {
  accessToken: string;
  instagramAccountId: string;
}

interface InstagramPost {
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  carouselItems?: Array<{ imageUrl?: string; videoUrl?: string }>;
  locationId?: string;
  userTags?: Array<{ username: string; x: number; y: number }>;
}

interface InstagramResponse {
  id: string;
  mediaId?: string;
}

export class InstagramIntegration {
  private config: InstagramConfig;

  constructor(config: InstagramConfig) {
    this.config = config;
  }

  /**
   * Get Instagram account ID from connected Facebook page
   */
  static async getInstagramAccountId(pageId: string, pageToken: string): Promise<string | null> {
    try {
      const response = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageToken
        }
      });

      return response.data.instagram_business_account?.id || null;
    } catch (error) {
      console.error('Failed to get Instagram account:', error);
      return null;
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(): Promise<any> {
    const response = await axios.get(`${GRAPH_API_BASE}/${this.config.instagramAccountId}`, {
      params: {
        fields: 'username,name,profile_picture_url,followers_count,follows_count,media_count',
        access_token: this.config.accessToken
      }
    });

    return response.data;
  }

  /**
   * Create a media container (first step in posting)
   */
  private async createMediaContainer(post: InstagramPost): Promise<string> {
    const params: any = {
      access_token: this.config.accessToken
    };

    if (post.carouselItems && post.carouselItems.length > 1) {
      // Carousel post
      const childIds = await Promise.all(
        post.carouselItems.map(item => this.createCarouselItem(item))
      );

      params.media_type = 'CAROUSEL';
      params.caption = post.caption;
      params.children = childIds.join(',');
    } else if (post.videoUrl) {
      // Video/Reel
      params.media_type = 'REELS';
      params.video_url = post.videoUrl;
      params.caption = post.caption;
    } else if (post.imageUrl) {
      // Single image
      params.image_url = post.imageUrl;
      params.caption = post.caption;
    }

    if (post.locationId) {
      params.location_id = post.locationId;
    }

    if (post.userTags && post.userTags.length > 0) {
      params.user_tags = JSON.stringify(
        post.userTags.map(tag => ({
          username: tag.username,
          x: tag.x,
          y: tag.y
        }))
      );
    }

    const response = await axios.post(
      `${GRAPH_API_BASE}/${this.config.instagramAccountId}/media`,
      params
    );

    return response.data.id;
  }

  /**
   * Create carousel item container
   */
  private async createCarouselItem(item: { imageUrl?: string; videoUrl?: string }): Promise<string> {
    const params: any = {
      access_token: this.config.accessToken,
      is_carousel_item: true
    };

    if (item.videoUrl) {
      params.media_type = 'VIDEO';
      params.video_url = item.videoUrl;
    } else if (item.imageUrl) {
      params.image_url = item.imageUrl;
    }

    const response = await axios.post(
      `${GRAPH_API_BASE}/${this.config.instagramAccountId}/media`,
      params
    );

    return response.data.id;
  }

  /**
   * Check media container status
   */
  private async checkMediaStatus(containerId: string): Promise<string> {
    const response = await axios.get(`${GRAPH_API_BASE}/${containerId}`, {
      params: {
        fields: 'status_code',
        access_token: this.config.accessToken
      }
    });

    return response.data.status_code;
  }

  /**
   * Wait for media to be ready
   */
  private async waitForMediaReady(containerId: string, maxAttempts: number = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkMediaStatus(containerId);

      if (status === 'FINISHED') {
        return true;
      } else if (status === 'ERROR') {
        throw new Error('Media processing failed');
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Media processing timeout');
  }

  /**
   * Publish media container
   */
  private async publishMedia(containerId: string): Promise<string> {
    const response = await axios.post(
      `${GRAPH_API_BASE}/${this.config.instagramAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: this.config.accessToken
      }
    );

    return response.data.id;
  }

  /**
   * Post to Instagram
   */
  async post(post: InstagramPost): Promise<InstagramResponse> {
    // Step 1: Create media container
    const containerId = await this.createMediaContainer(post);

    // Step 2: Wait for media to process (especially for videos)
    if (post.videoUrl || (post.carouselItems?.some(item => item.videoUrl))) {
      await this.waitForMediaReady(containerId);
    }

    // Step 3: Publish
    const mediaId = await this.publishMedia(containerId);

    return {
      id: containerId,
      mediaId
    };
  }

  /**
   * Create a story
   */
  async postStory(imageUrl?: string, videoUrl?: string): Promise<InstagramResponse> {
    const params: any = {
      access_token: this.config.accessToken
    };

    if (videoUrl) {
      params.media_type = 'STORIES';
      params.video_url = videoUrl;
    } else if (imageUrl) {
      params.media_type = 'STORIES';
      params.image_url = imageUrl;
    }

    // Create container
    const containerResponse = await axios.post(
      `${GRAPH_API_BASE}/${this.config.instagramAccountId}/media`,
      params
    );

    const containerId = containerResponse.data.id;

    // Wait if video
    if (videoUrl) {
      await this.waitForMediaReady(containerId);
    }

    // Publish
    const mediaId = await this.publishMedia(containerId);

    return { id: containerId, mediaId };
  }

  /**
   * Get media insights
   */
  async getMediaInsights(mediaId: string): Promise<any> {
    const response = await axios.get(`${GRAPH_API_BASE}/${mediaId}/insights`, {
      params: {
        metric: 'impressions,reach,engagement,saved,video_views',
        access_token: this.config.accessToken
      }
    });

    return response.data.data;
  }

  /**
   * Get account insights
   */
  async getAccountInsights(period: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const metrics = [
      'impressions',
      'reach',
      'follower_count',
      'profile_views',
      'website_clicks'
    ];

    const response = await axios.get(`${GRAPH_API_BASE}/${this.config.instagramAccountId}/insights`, {
      params: {
        metric: metrics.join(','),
        period,
        access_token: this.config.accessToken
      }
    });

    return response.data.data;
  }

  /**
   * Get recent media
   */
  async getRecentMedia(limit: number = 25): Promise<any[]> {
    const response = await axios.get(`${GRAPH_API_BASE}/${this.config.instagramAccountId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        limit,
        access_token: this.config.accessToken
      }
    });

    return response.data.data;
  }

  /**
   * Search hashtags
   */
  async searchHashtag(hashtag: string): Promise<any> {
    const searchResponse = await axios.get(`${GRAPH_API_BASE}/ig_hashtag_search`, {
      params: {
        user_id: this.config.instagramAccountId,
        q: hashtag,
        access_token: this.config.accessToken
      }
    });

    if (!searchResponse.data.data?.[0]?.id) {
      return null;
    }

    const hashtagId = searchResponse.data.data[0].id;

    // Get recent media for hashtag
    const mediaResponse = await axios.get(`${GRAPH_API_BASE}/${hashtagId}/recent_media`, {
      params: {
        user_id: this.config.instagramAccountId,
        fields: 'id,caption,media_type,permalink',
        access_token: this.config.accessToken
      }
    });

    return mediaResponse.data.data;
  }
}
