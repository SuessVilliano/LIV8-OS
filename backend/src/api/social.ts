/**
 * Social Media API Routes
 *
 * Endpoints for managing social media connections and publishing
 */

import { Router, Request, Response } from 'express';
import { UnifiedPublisher, Platform, UnifiedPost, SocialMediaCredentials } from '../integrations/social-media/unified-publisher';
import { FacebookIntegration } from '../integrations/social-media/facebook';
import { LinkedInIntegration } from '../integrations/social-media/linkedin';
import { TikTokIntegration } from '../integrations/social-media/tiktok';

const router = Router();

// In-memory storage for demo (use database in production)
const credentialsStore: Map<string, SocialMediaCredentials[]> = new Map();

// Environment config (would come from env vars)
const OAUTH_CONFIG = {
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || '',
    appSecret: process.env.FACEBOOK_APP_SECRET || ''
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || ''
  },
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || ''
  },
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || ''
  }
};

/**
 * Get all social media connections for a location
 */
router.get('/connections', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const publisher = new UnifiedPublisher(locationId);
    const credentials = credentialsStore.get(locationId) || [];
    await publisher.loadCredentials(credentials);

    const connections = await publisher.getConnections();

    res.json({
      success: true,
      connections
    });
  } catch (error: any) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get OAuth URL for connecting a platform
 */
router.get('/connect/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const locationId = req.headers['x-location-id'] as string;
    const redirectUri = req.query.redirectUri as string || `${process.env.APP_URL}/api/social/callback/${platform}`;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      locationId,
      platform,
      timestamp: Date.now()
    })).toString('base64');

    let authUrl: string;

    switch (platform) {
      case 'facebook':
      case 'instagram':
        authUrl = FacebookIntegration.getOAuthUrl(
          OAUTH_CONFIG.facebook.appId,
          redirectUri,
          state
        );
        break;

      case 'linkedin':
        authUrl = LinkedInIntegration.getOAuthUrl(
          OAUTH_CONFIG.linkedin.clientId,
          redirectUri,
          state
        );
        break;

      case 'tiktok':
        authUrl = TikTokIntegration.getOAuthUrl(
          OAUTH_CONFIG.tiktok.clientKey,
          redirectUri,
          state
        );
        break;

      case 'twitter':
        // Twitter uses OAuth 1.0a, more complex flow
        return res.status(501).json({ error: 'Twitter OAuth not fully implemented' });

      default:
        return res.status(400).json({ error: 'Invalid platform' });
    }

    res.json({
      success: true,
      authUrl,
      state
    });
  } catch (error: any) {
    console.error('Get OAuth URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * OAuth callback handler
 */
router.get('/callback/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/settings/integrations?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/settings/integrations?error=missing_params');
    }

    // Decode state
    let stateData: { locationId: string; platform: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch (e) {
      return res.redirect('/settings/integrations?error=invalid_state');
    }

    const redirectUri = `${process.env.APP_URL}/api/social/callback/${platform}`;
    let credentials: SocialMediaCredentials;

    switch (platform) {
      case 'facebook':
      case 'instagram': {
        const tokenData = await FacebookIntegration.exchangeCodeForToken(
          code as string,
          OAUTH_CONFIG.facebook.appId,
          OAUTH_CONFIG.facebook.appSecret,
          redirectUri
        );

        credentials = {
          platform: platform as Platform,
          accessToken: tokenData.accessToken,
          expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
          additionalConfig: {
            appId: OAUTH_CONFIG.facebook.appId,
            appSecret: OAUTH_CONFIG.facebook.appSecret
          }
        };

        // For Instagram, get the Instagram account ID
        if (platform === 'instagram') {
          const fb = new FacebookIntegration({
            accessToken: tokenData.accessToken,
            appId: OAUTH_CONFIG.facebook.appId,
            appSecret: OAUTH_CONFIG.facebook.appSecret
          });
          const pages = await fb.getPages();
          if (pages.length > 0) {
            const pageToken = await fb.getPageAccessToken(pages[0].id);
            const igAccountId = await (await import('../integrations/social-media/instagram')).InstagramIntegration.getInstagramAccountId(pages[0].id, pageToken);
            if (igAccountId) {
              credentials.platformUserId = igAccountId;
            }
          }
        }
        break;
      }

      case 'linkedin': {
        const tokenData = await LinkedInIntegration.exchangeCodeForToken(
          code as string,
          OAUTH_CONFIG.linkedin.clientId,
          OAUTH_CONFIG.linkedin.clientSecret,
          redirectUri
        );

        credentials = {
          platform: 'linkedin',
          accessToken: tokenData.accessToken,
          expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000)
        };
        break;
      }

      case 'tiktok': {
        const tokenData = await TikTokIntegration.exchangeCodeForToken(
          code as string,
          OAUTH_CONFIG.tiktok.clientKey,
          OAUTH_CONFIG.tiktok.clientSecret,
          redirectUri
        );

        credentials = {
          platform: 'tiktok',
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          platformUserId: tokenData.openId,
          expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
          additionalConfig: {
            clientKey: OAUTH_CONFIG.tiktok.clientKey,
            clientSecret: OAUTH_CONFIG.tiktok.clientSecret
          }
        };
        break;
      }

      default:
        return res.redirect('/settings/integrations?error=invalid_platform');
    }

    // Store credentials
    const existingCredentials = credentialsStore.get(stateData.locationId) || [];
    const updatedCredentials = existingCredentials.filter(c => c.platform !== platform);
    updatedCredentials.push(credentials);
    credentialsStore.set(stateData.locationId, updatedCredentials);

    res.redirect(`/settings/integrations?success=${platform}_connected`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`/settings/integrations?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Disconnect a platform
 */
router.delete('/disconnect/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const locationId = req.headers['x-location-id'] as string;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const existingCredentials = credentialsStore.get(locationId) || [];
    const updatedCredentials = existingCredentials.filter(c => c.platform !== platform);
    credentialsStore.set(locationId, updatedCredentials);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Publish to social media
 */
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;
    const post: UnifiedPost = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    if (!post.platforms || post.platforms.length === 0) {
      return res.status(400).json({ error: 'At least one platform required' });
    }

    if (!post.text && !post.mediaUrls?.length) {
      return res.status(400).json({ error: 'Post must have text or media' });
    }

    const publisher = new UnifiedPublisher(locationId);
    const credentials = credentialsStore.get(locationId) || [];
    await publisher.loadCredentials(credentials);

    const results = await publisher.publish(post);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: failed.length === 0,
      results,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length
      }
    });
  } catch (error: any) {
    console.error('Publish error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Schedule a post
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;
    const { post, scheduledTime } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    if (!scheduledTime) {
      return res.status(400).json({ error: 'Scheduled time required' });
    }

    const publisher = new UnifiedPublisher(locationId);

    const result = await publisher.schedulePost({
      ...post,
      scheduledTime: new Date(scheduledTime)
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get platform-specific limits
 */
router.get('/limits', (req: Request, res: Response) => {
  const limits = {
    facebook: { text: 63206, images: 10, videoMaxMB: 4096 },
    instagram: { text: 2200, images: 10, videoMaxMB: 650 },
    twitter: { text: 280, images: 4, videoMaxMB: 512 },
    linkedin: { text: 3000, images: 9, videoMaxMB: 200 },
    tiktok: { text: 2200, images: 0, videoMaxMB: 287 }
  };

  res.json({ success: true, limits });
});

/**
 * Preview optimized post for each platform
 */
router.post('/preview', (req: Request, res: Response) => {
  try {
    const { text, hashtags, platforms } = req.body;

    const publisher = new UnifiedPublisher('preview');

    const previews: Record<string, string> = {};

    for (const platform of platforms || ['facebook', 'instagram', 'twitter', 'linkedin']) {
      previews[platform] = publisher.optimizeForPlatform(text, hashtags || [], platform as Platform);
    }

    res.json({ success: true, previews });
  } catch (error: any) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
