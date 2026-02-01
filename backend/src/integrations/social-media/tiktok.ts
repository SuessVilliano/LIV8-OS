/**
 * TikTok Integration
 *
 * Handles TikTok posting via TikTok Content Posting API
 */

import axios from 'axios';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
const TIKTOK_OAUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize';

interface TikTokConfig {
  accessToken: string;
  clientKey: string;
  clientSecret: string;
  openId?: string;
}

interface TikTokVideo {
  videoUrl: string;
  title: string;
  description?: string;
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  disableDuet?: boolean;
  disableStitch?: boolean;
  disableComment?: boolean;
  videoCoverTimestamp?: number;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
}

interface TikTokResponse {
  publishId: string;
  uploadUrl?: string;
}

export class TikTokIntegration {
  private config: TikTokConfig;

  constructor(config: TikTokConfig) {
    this.config = config;
  }

  /**
   * Get OAuth URL for user authorization
   */
  static getOAuthUrl(clientKey: string, redirectUri: string, state: string): string {
    const scopes = [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
      'video.publish',
      'video.upload'
    ].join(',');

    return `${TIKTOK_OAUTH_BASE}?` +
      `client_key=${clientKey}` +
      `&response_type=code` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;
  }

  /**
   * Exchange auth code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    clientKey: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; openId: string; expiresIn: number }> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/oauth/token/`,
      new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      openId: response.data.open_id,
      expiresIn: response.data.expires_in
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/oauth/token/`,
      new URLSearchParams({
        client_key: this.config.clientKey,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    };
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<any> {
    const response = await axios.get(`${TIKTOK_API_BASE}/user/info/`, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`
      },
      params: {
        fields: 'open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count'
      }
    });

    return response.data.data.user;
  }

  /**
   * Get creator info for posting permissions
   */
  async getCreatorInfo(): Promise<any> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/post/publish/creator_info/query/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.data;
  }

  /**
   * Initialize video upload from URL
   */
  async initializeVideoUploadFromUrl(video: TikTokVideo): Promise<TikTokResponse> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        post_info: {
          title: video.title,
          description: video.description || '',
          privacy_level: video.privacyLevel || 'PUBLIC_TO_EVERYONE',
          disable_duet: video.disableDuet || false,
          disable_stitch: video.disableStitch || false,
          disable_comment: video.disableComment || false,
          video_cover_timestamp_ms: video.videoCoverTimestamp || 0,
          brand_content_toggle: video.brandContentToggle || false,
          brand_organic_toggle: video.brandOrganicToggle || false
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: video.videoUrl
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );

    return {
      publishId: response.data.data.publish_id
    };
  }

  /**
   * Initialize video upload for direct upload
   */
  async initializeVideoUpload(video: TikTokVideo, videoSize: number, chunkSize: number, totalChunkCount: number): Promise<TikTokResponse> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        post_info: {
          title: video.title,
          description: video.description || '',
          privacy_level: video.privacyLevel || 'PUBLIC_TO_EVERYONE',
          disable_duet: video.disableDuet || false,
          disable_stitch: video.disableStitch || false,
          disable_comment: video.disableComment || false
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );

    return {
      publishId: response.data.data.publish_id,
      uploadUrl: response.data.data.upload_url
    };
  }

  /**
   * Check video upload status
   */
  async checkPublishStatus(publishId: string): Promise<{ status: string; failReason?: string }> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
      {
        publish_id: publishId
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      status: response.data.data.status,
      failReason: response.data.data.fail_reason
    };
  }

  /**
   * Post video from URL
   */
  async postVideo(video: TikTokVideo): Promise<{ publishId: string; status: string }> {
    // Initialize upload from URL
    const { publishId } = await this.initializeVideoUploadFromUrl(video);

    // Poll for status
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      const { status, failReason } = await this.checkPublishStatus(publishId);

      if (status === 'PUBLISH_COMPLETE') {
        return { publishId, status: 'success' };
      } else if (status === 'FAILED') {
        throw new Error(`Video publishing failed: ${failReason}`);
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Video publishing timeout');
  }

  /**
   * Get user videos
   */
  async getUserVideos(maxCount: number = 20): Promise<any[]> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/video/list/`,
      {
        max_count: maxCount
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'id,create_time,cover_image_url,share_url,video_description,duration,title,like_count,comment_count,share_count,view_count'
        }
      }
    );

    return response.data.data.videos;
  }

  /**
   * Query specific video
   */
  async getVideo(videoId: string): Promise<any> {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/video/query/`,
      {
        filters: {
          video_ids: [videoId]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'id,create_time,cover_image_url,share_url,video_description,duration,title,like_count,comment_count,share_count,view_count'
        }
      }
    );

    return response.data.data.videos[0];
  }
}
