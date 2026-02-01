/**
 * Unified Social Media Publisher
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * Single interface for publishing to all connected social platforms
 */

import { FacebookIntegration } from './facebook';
import { InstagramIntegration } from './instagram';
import { TwitterIntegration } from './twitter';
import { LinkedInIntegration } from './linkedin';
import { TikTokIntegration } from './tiktok';

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok';

export interface SocialMediaCredentials {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  platformUserId?: string;
  platformPageId?: string;
  additionalConfig?: Record<string, string>;
}

export interface UnifiedPost {
  text: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'carousel';
  link?: string;
  linkTitle?: string;
  linkDescription?: string;
  hashtags?: string[];
  scheduledTime?: Date;
  platforms: Platform[];
  platformSpecific?: {
    facebook?: { pageId?: string };
    instagram?: { locationId?: string; userTags?: Array<{ username: string; x: number; y: number }> };
    twitter?: { poll?: { options: string[]; durationMinutes: number } };
    linkedin?: { organizationUrn?: string; visibility?: 'PUBLIC' | 'CONNECTIONS' };
    tiktok?: { privacyLevel?: string; disableDuet?: boolean; disableStitch?: boolean };
  };
}

export interface PublishResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  error?: string;
  url?: string;
}

export interface PlatformConnection {
  platform: Platform;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  profileUrl?: string;
  avatarUrl?: string;
  followers?: number;
  expiresAt?: Date;
}

// Platform-specific character limits
const PLATFORM_LIMITS: Record<Platform, { text: number; images: number; videoMaxMB: number }> = {
  facebook: { text: 63206, images: 10, videoMaxMB: 4096 },
  instagram: { text: 2200, images: 10, videoMaxMB: 650 },
  twitter: { text: 280, images: 4, videoMaxMB: 512 },
  linkedin: { text: 3000, images: 9, videoMaxMB: 200 },
  tiktok: { text: 2200, images: 0, videoMaxMB: 287 }
};

export class UnifiedPublisher {
  private credentials: Map<Platform, SocialMediaCredentials> = new Map();
  private locationId: string;

  constructor(locationId: string) {
    this.locationId = locationId;
  }

  /**
   * Load credentials for a location
   */
  async loadCredentials(credentials: SocialMediaCredentials[]): Promise<void> {
    for (const cred of credentials) {
      this.credentials.set(cred.platform, cred);
    }
  }

  /**
   * Add or update credentials for a platform
   */
  setCredentials(platform: Platform, credentials: SocialMediaCredentials): void {
    this.credentials.set(platform, credentials);
  }

  /**
   * Get platform character limit
   */
  getPlatformLimits(platform: Platform): { text: number; images: number; videoMaxMB: number } {
    return PLATFORM_LIMITS[platform];
  }

  /**
   * Check if platform is connected
   */
  isConnected(platform: Platform): boolean {
    const creds = this.credentials.get(platform);
    if (!creds) return false;

    // Check if token is expired
    if (creds.expiresAt && new Date() > creds.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Get all connected platforms
   */
  async getConnections(): Promise<PlatformConnection[]> {
    const connections: PlatformConnection[] = [];

    for (const platform of ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'] as Platform[]) {
      const creds = this.credentials.get(platform);

      if (!creds) {
        connections.push({ platform, connected: false });
        continue;
      }

      try {
        const accountInfo = await this.getAccountInfo(platform);
        connections.push({
          platform,
          connected: true,
          ...accountInfo,
          expiresAt: creds.expiresAt
        });
      } catch (error) {
        connections.push({
          platform,
          connected: false,
          error: 'Failed to fetch account info'
        } as any);
      }
    }

    return connections;
  }

  /**
   * Get account info for a platform
   */
  private async getAccountInfo(platform: Platform): Promise<Partial<PlatformConnection>> {
    const creds = this.credentials.get(platform);
    if (!creds) throw new Error('Platform not connected');

    switch (platform) {
      case 'facebook': {
        const fb = new FacebookIntegration({
          accessToken: creds.accessToken,
          appId: creds.additionalConfig?.appId || '',
          appSecret: creds.additionalConfig?.appSecret || ''
        });
        const pages = await fb.getPages();
        const page = pages[0];
        return {
          accountName: page?.name,
          accountId: page?.id
        };
      }

      case 'instagram': {
        const ig = new InstagramIntegration({
          accessToken: creds.accessToken,
          instagramAccountId: creds.platformUserId || ''
        });
        const info = await ig.getAccountInfo();
        return {
          accountName: info.username,
          accountId: info.id,
          profileUrl: `https://instagram.com/${info.username}`,
          avatarUrl: info.profile_picture_url,
          followers: info.followers_count
        };
      }

      case 'twitter': {
        // Would need to implement get user info
        return {
          accountName: creds.additionalConfig?.username,
          accountId: creds.platformUserId
        };
      }

      case 'linkedin': {
        const li = new LinkedInIntegration({
          accessToken: creds.accessToken
        });
        const profile = await li.getProfile();
        return {
          accountName: profile.name,
          accountId: profile.sub,
          profileUrl: `https://linkedin.com/in/${profile.sub}`
        };
      }

      case 'tiktok': {
        const tt = new TikTokIntegration({
          accessToken: creds.accessToken,
          clientKey: creds.additionalConfig?.clientKey || '',
          clientSecret: creds.additionalConfig?.clientSecret || ''
        });
        const info = await tt.getUserInfo();
        return {
          accountName: info.display_name,
          accountId: info.open_id,
          profileUrl: info.profile_deep_link,
          avatarUrl: info.avatar_url,
          followers: info.follower_count
        };
      }
    }
  }

  /**
   * Optimize post text for platform limits
   */
  optimizeForPlatform(text: string, hashtags: string[], platform: Platform): string {
    const limit = PLATFORM_LIMITS[platform].text;
    const hashtagString = hashtags.length > 0 ? '\n\n' + hashtags.map(h => `#${h}`).join(' ') : '';

    let fullText = text + hashtagString;

    if (fullText.length <= limit) {
      return fullText;
    }

    // Truncate text to fit
    const availableSpace = limit - hashtagString.length - 3; // 3 for "..."
    return text.substring(0, availableSpace) + '...' + hashtagString;
  }

  /**
   * Publish to a single platform
   */
  async publishToPlatform(post: UnifiedPost, platform: Platform): Promise<PublishResult> {
    const creds = this.credentials.get(platform);

    if (!creds) {
      return { platform, success: false, error: 'Platform not connected' };
    }

    try {
      const optimizedText = this.optimizeForPlatform(
        post.text,
        post.hashtags || [],
        platform
      );

      switch (platform) {
        case 'facebook': {
          const fb = new FacebookIntegration({
            accessToken: creds.accessToken,
            appId: creds.additionalConfig?.appId || '',
            appSecret: creds.additionalConfig?.appSecret || ''
          });

          const pageId = post.platformSpecific?.facebook?.pageId || creds.platformPageId;
          if (!pageId) throw new Error('No Facebook page ID configured');

          const result = await fb.postToPage(pageId, {
            message: optimizedText,
            link: post.link,
            imageUrl: post.mediaUrls?.[0],
            videoUrl: post.mediaType === 'video' ? post.mediaUrls?.[0] : undefined,
            scheduledTime: post.scheduledTime
          });

          return {
            platform,
            success: true,
            postId: result.id,
            url: `https://facebook.com/${result.id}`
          };
        }

        case 'instagram': {
          const ig = new InstagramIntegration({
            accessToken: creds.accessToken,
            instagramAccountId: creds.platformUserId || ''
          });

          const result = await ig.post({
            caption: optimizedText,
            imageUrl: post.mediaType !== 'video' ? post.mediaUrls?.[0] : undefined,
            videoUrl: post.mediaType === 'video' ? post.mediaUrls?.[0] : undefined,
            carouselItems: post.mediaType === 'carousel' ? post.mediaUrls?.map(url => ({ imageUrl: url })) : undefined,
            locationId: post.platformSpecific?.instagram?.locationId,
            userTags: post.platformSpecific?.instagram?.userTags
          });

          return {
            platform,
            success: true,
            postId: result.mediaId,
            url: `https://instagram.com/p/${result.mediaId}`
          };
        }

        case 'twitter': {
          const tw = new TwitterIntegration({
            apiKey: creds.additionalConfig?.apiKey || '',
            apiSecret: creds.additionalConfig?.apiSecret || '',
            accessToken: creds.accessToken,
            accessTokenSecret: creds.additionalConfig?.accessTokenSecret || ''
          });

          // Upload media if present
          let mediaIds: string[] = [];
          if (post.mediaUrls && post.mediaUrls.length > 0) {
            // Would need to download and upload media
            // For now, skip media handling
          }

          const result = await tw.tweet({
            text: optimizedText,
            mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            poll: post.platformSpecific?.twitter?.poll
          });

          return {
            platform,
            success: true,
            postId: result.id,
            url: `https://twitter.com/i/web/status/${result.id}`
          };
        }

        case 'linkedin': {
          const li = new LinkedInIntegration({
            accessToken: creds.accessToken,
            personUrn: creds.platformUserId
          });

          const orgUrn = post.platformSpecific?.linkedin?.organizationUrn;

          const result = orgUrn
            ? await li.postToOrganization(orgUrn, {
                text: optimizedText,
                imageUrls: post.mediaType === 'image' ? post.mediaUrls : undefined,
                articleUrl: post.link,
                articleTitle: post.linkTitle,
                articleDescription: post.linkDescription,
                visibility: post.platformSpecific?.linkedin?.visibility
              })
            : await li.postToProfile({
                text: optimizedText,
                imageUrls: post.mediaType === 'image' ? post.mediaUrls : undefined,
                articleUrl: post.link,
                articleTitle: post.linkTitle,
                articleDescription: post.linkDescription,
                visibility: post.platformSpecific?.linkedin?.visibility
              });

          return {
            platform,
            success: true,
            postId: result.id,
            url: `https://linkedin.com/feed/update/${result.activity || result.id}`
          };
        }

        case 'tiktok': {
          if (post.mediaType !== 'video' || !post.mediaUrls?.[0]) {
            return { platform, success: false, error: 'TikTok requires a video' };
          }

          const tt = new TikTokIntegration({
            accessToken: creds.accessToken,
            clientKey: creds.additionalConfig?.clientKey || '',
            clientSecret: creds.additionalConfig?.clientSecret || ''
          });

          const result = await tt.postVideo({
            videoUrl: post.mediaUrls[0],
            title: optimizedText.substring(0, 150),
            description: optimizedText,
            privacyLevel: post.platformSpecific?.tiktok?.privacyLevel as any,
            disableDuet: post.platformSpecific?.tiktok?.disableDuet,
            disableStitch: post.platformSpecific?.tiktok?.disableStitch
          });

          return {
            platform,
            success: true,
            postId: result.publishId
          };
        }

        default:
          return { platform, success: false, error: 'Unknown platform' };
      }
    } catch (error: any) {
      console.error(`Failed to publish to ${platform}:`, error);
      return {
        platform,
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Publish to multiple platforms
   */
  async publish(post: UnifiedPost): Promise<PublishResult[]> {
    const results = await Promise.all(
      post.platforms.map(platform => this.publishToPlatform(post, platform))
    );

    return results;
  }

  /**
   * Schedule post for later (store in database)
   */
  async schedulePost(post: UnifiedPost): Promise<{ scheduledId: string; scheduledTime: Date }> {
    // This would store the post in the database for later publishing
    // The content scheduler service would pick it up
    const scheduledId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store in database (implementation would depend on your DB)
    console.log('Scheduling post:', scheduledId, post.scheduledTime);

    return {
      scheduledId,
      scheduledTime: post.scheduledTime || new Date()
    };
  }

  /**
   * Get OAuth URL for a platform
   */
  static getOAuthUrl(
    platform: Platform,
    config: { clientId: string; clientSecret?: string; redirectUri: string; state: string }
  ): string {
    switch (platform) {
      case 'facebook':
        return FacebookIntegration.getOAuthUrl(config.clientId, config.redirectUri, config.state);
      case 'linkedin':
        return LinkedInIntegration.getOAuthUrl(config.clientId, config.redirectUri, config.state);
      case 'tiktok':
        return TikTokIntegration.getOAuthUrl(config.clientId, config.redirectUri, config.state);
      default:
        throw new Error(`OAuth not implemented for ${platform}`);
    }
  }
}

export default UnifiedPublisher;
