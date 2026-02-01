/**
 * LinkedIn Integration
 *
 * Handles LinkedIn posting for personal profiles and company pages
 */

import axios from 'axios';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_OAUTH_BASE = 'https://www.linkedin.com/oauth/v2';

interface LinkedInConfig {
  accessToken: string;
  personUrn?: string;
  organizationUrn?: string;
}

interface LinkedInPost {
  text: string;
  imageUrls?: string[];
  videoUrl?: string;
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

interface LinkedInResponse {
  id: string;
  activity?: string;
}

export class LinkedInIntegration {
  private config: LinkedInConfig;

  constructor(config: LinkedInConfig) {
    this.config = config;
  }

  /**
   * Get OAuth URL for user authorization
   */
  static getOAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const scopes = [
      'openid',
      'profile',
      'email',
      'w_member_social',
      'r_organization_admin',
      'w_organization_social',
      'rw_organization_admin'
    ].join(' ');

    return `${LINKEDIN_OAUTH_BASE}/authorization?` +
      `response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(scopes)}`;
  }

  /**
   * Exchange auth code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await axios.post(
      `${LINKEDIN_OAUTH_BASE}/accessToken`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
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
      expiresIn: response.data.expires_in
    };
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<any> {
    const response = await axios.get(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`
      }
    });

    return response.data;
  }

  /**
   * Get organizations the user administers
   */
  async getOrganizations(): Promise<Array<{ urn: string; name: string }>> {
    const response = await axios.get(
      `${LINKEDIN_API_BASE}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName)))`,
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`
        }
      }
    );

    return response.data.elements.map((element: any) => ({
      urn: element.organization,
      name: element['organization~']?.localizedName || ''
    }));
  }

  /**
   * Register image upload
   */
  private async registerImageUpload(ownerUrn: string): Promise<{ uploadUrl: string; asset: string }> {
    const response = await axios.post(
      `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const uploadMechanism = response.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];

    return {
      uploadUrl: uploadMechanism.uploadUrl,
      asset: response.data.value.asset
    };
  }

  /**
   * Upload image from URL
   */
  private async uploadImageFromUrl(imageUrl: string, ownerUrn: string): Promise<string> {
    // Get upload URL
    const { uploadUrl, asset } = await this.registerImageUpload(ownerUrn);

    // Fetch image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    // Upload to LinkedIn
    await axios.put(uploadUrl, imageResponse.data, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'image/jpeg'
      }
    });

    return asset;
  }

  /**
   * Register video upload
   */
  private async registerVideoUpload(ownerUrn: string, fileSize: number): Promise<{ uploadUrl: string; asset: string }> {
    const response = await axios.post(
      `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ],
          supportedUploadMechanism: ['SINGLE_REQUEST_UPLOAD'],
          fileSize
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const uploadMechanism = response.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];

    return {
      uploadUrl: uploadMechanism.uploadUrl,
      asset: response.data.value.asset
    };
  }

  /**
   * Post to personal profile
   */
  async postToProfile(post: LinkedInPost): Promise<LinkedInResponse> {
    const personUrn = this.config.personUrn || await this.getPersonUrn();
    return this.createPost(personUrn, post);
  }

  /**
   * Post to organization page
   */
  async postToOrganization(organizationUrn: string, post: LinkedInPost): Promise<LinkedInResponse> {
    return this.createPost(organizationUrn, post);
  }

  /**
   * Get person URN
   */
  private async getPersonUrn(): Promise<string> {
    const profile = await this.getProfile();
    return `urn:li:person:${profile.sub}`;
  }

  /**
   * Create a post
   */
  private async createPost(authorUrn: string, post: LinkedInPost): Promise<LinkedInResponse> {
    const requestBody: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.text
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': post.visibility || 'PUBLIC'
      }
    };

    // Handle media
    if (post.imageUrls && post.imageUrls.length > 0) {
      const mediaAssets = await Promise.all(
        post.imageUrls.map(url => this.uploadImageFromUrl(url, authorUrn))
      );

      requestBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
      requestBody.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets.map(asset => ({
        status: 'READY',
        media: asset
      }));
    } else if (post.articleUrl) {
      requestBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      requestBody.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: post.articleUrl,
        title: {
          text: post.articleTitle || ''
        },
        description: {
          text: post.articleDescription || ''
        }
      }];
    }

    const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, requestBody, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    return {
      id: response.data.id,
      activity: response.headers['x-restli-id']
    };
  }

  /**
   * Delete a post
   */
  async deletePost(postUrn: string): Promise<boolean> {
    await axios.delete(`${LINKEDIN_API_BASE}/ugcPosts/${encodeURIComponent(postUrn)}`, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`
      }
    });

    return true;
  }

  /**
   * Get post statistics
   */
  async getPostStatistics(postUrn: string): Promise<any> {
    const response = await axios.get(
      `${LINKEDIN_API_BASE}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(postUrn)}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`
        }
      }
    );

    return response.data.elements[0]?.totalShareStatistics || {};
  }

  /**
   * Get page followers count
   */
  async getOrganizationFollowers(organizationUrn: string): Promise<number> {
    const response = await axios.get(
      `${LINKEDIN_API_BASE}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(organizationUrn)}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`
        }
      }
    );

    return response.data.elements[0]?.followerCounts?.organicFollowerCount || 0;
  }
}
