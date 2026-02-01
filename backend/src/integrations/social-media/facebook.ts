/**
 * Facebook Integration
 *
 * Handles Facebook Pages and Groups posting via Graph API
 */

import axios from 'axios';

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface FacebookConfig {
  accessToken: string;
  pageId?: string;
  appId: string;
  appSecret: string;
}

interface FacebookPost {
  message: string;
  link?: string;
  imageUrl?: string;
  videoUrl?: string;
  scheduledTime?: Date;
}

interface FacebookResponse {
  id: string;
  post_id?: string;
}

export class FacebookIntegration {
  private config: FacebookConfig;

  constructor(config: FacebookConfig) {
    this.config = config;
  }

  /**
   * Get OAuth URL for user authorization
   */
  static getOAuthUrl(appId: string, redirectUri: string, state: string): string {
    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'publish_to_groups',
      'business_management'
    ].join(',');

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${scopes}`;
  }

  /**
   * Exchange auth code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  }

  /**
   * Get long-lived page access token
   */
  async getPageAccessToken(pageId: string): Promise<string> {
    const response = await axios.get(`${GRAPH_API_BASE}/${pageId}`, {
      params: {
        fields: 'access_token',
        access_token: this.config.accessToken
      }
    });

    return response.data.access_token;
  }

  /**
   * Get list of pages the user manages
   */
  async getPages(): Promise<Array<{ id: string; name: string; category: string }>> {
    const response = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
      params: {
        access_token: this.config.accessToken
      }
    });

    return response.data.data.map((page: any) => ({
      id: page.id,
      name: page.name,
      category: page.category
    }));
  }

  /**
   * Post to a Facebook Page
   */
  async postToPage(pageId: string, post: FacebookPost): Promise<FacebookResponse> {
    const pageToken = await this.getPageAccessToken(pageId);

    // Determine post type
    if (post.videoUrl) {
      return this.postVideo(pageId, pageToken, post);
    } else if (post.imageUrl) {
      return this.postPhoto(pageId, pageToken, post);
    } else {
      return this.postText(pageId, pageToken, post);
    }
  }

  /**
   * Post text content
   */
  private async postText(pageId: string, pageToken: string, post: FacebookPost): Promise<FacebookResponse> {
    const params: any = {
      message: post.message,
      access_token: pageToken
    };

    if (post.link) {
      params.link = post.link;
    }

    if (post.scheduledTime) {
      params.published = false;
      params.scheduled_publish_time = Math.floor(post.scheduledTime.getTime() / 1000);
    }

    const response = await axios.post(`${GRAPH_API_BASE}/${pageId}/feed`, params);
    return { id: response.data.id };
  }

  /**
   * Post photo
   */
  private async postPhoto(pageId: string, pageToken: string, post: FacebookPost): Promise<FacebookResponse> {
    const params: any = {
      url: post.imageUrl,
      caption: post.message,
      access_token: pageToken
    };

    if (post.scheduledTime) {
      params.published = false;
      params.scheduled_publish_time = Math.floor(post.scheduledTime.getTime() / 1000);
    }

    const response = await axios.post(`${GRAPH_API_BASE}/${pageId}/photos`, params);
    return { id: response.data.id, post_id: response.data.post_id };
  }

  /**
   * Post video
   */
  private async postVideo(pageId: string, pageToken: string, post: FacebookPost): Promise<FacebookResponse> {
    const params: any = {
      file_url: post.videoUrl,
      description: post.message,
      access_token: pageToken
    };

    if (post.scheduledTime) {
      params.published = false;
      params.scheduled_publish_time = Math.floor(post.scheduledTime.getTime() / 1000);
    }

    const response = await axios.post(`${GRAPH_API_BASE}/${pageId}/videos`, params);
    return { id: response.data.id };
  }

  /**
   * Get page insights
   */
  async getPageInsights(pageId: string, metrics: string[] = ['page_impressions', 'page_engaged_users']): Promise<any> {
    const pageToken = await this.getPageAccessToken(pageId);

    const response = await axios.get(`${GRAPH_API_BASE}/${pageId}/insights`, {
      params: {
        metric: metrics.join(','),
        period: 'day',
        access_token: pageToken
      }
    });

    return response.data.data;
  }

  /**
   * Get post performance
   */
  async getPostInsights(postId: string): Promise<any> {
    const response = await axios.get(`${GRAPH_API_BASE}/${postId}/insights`, {
      params: {
        metric: 'post_impressions,post_engaged_users,post_reactions_by_type_total',
        access_token: this.config.accessToken
      }
    });

    return response.data.data;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<boolean> {
    const response = await axios.delete(`${GRAPH_API_BASE}/${postId}`, {
      params: {
        access_token: this.config.accessToken
      }
    });

    return response.data.success;
  }
}
