/**
 * Twitter/X Integration
 *
 * Handles Twitter posting via Twitter API v2
 */

import axios from 'axios';
import crypto from 'crypto';

const TWITTER_API_BASE = 'https://api.twitter.com/2';
const TWITTER_UPLOAD_BASE = 'https://upload.twitter.com/1.1';

interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
}

interface Tweet {
  text: string;
  mediaIds?: string[];
  replyToId?: string;
  quoteTweetId?: string;
  poll?: {
    options: string[];
    durationMinutes: number;
  };
}

interface TweetResponse {
  id: string;
  text: string;
}

export class TwitterIntegration {
  private config: TwitterConfig;

  constructor(config: TwitterConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth 1.0a signature
   */
  private generateOAuthSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    tokenSecret: string = this.config.accessTokenSecret
  ): string {
    const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
      Object.keys(params)
        .sort()
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&')
    )}`;

    const signingKey = `${encodeURIComponent(this.config.apiSecret)}&${encodeURIComponent(tokenSecret)}`;

    return crypto
      .createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');
  }

  /**
   * Generate OAuth header
   */
  private getOAuthHeader(method: string, url: string, extraParams: Record<string, string> = {}): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.config.apiKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: this.config.accessToken,
      oauth_version: '1.0',
      ...extraParams
    };

    const signature = this.generateOAuthSignature(method, url, oauthParams);
    oauthParams.oauth_signature = signature;

    const headerString = Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return `OAuth ${headerString}`;
  }

  /**
   * Get OAuth URL for user authorization
   */
  static async getOAuthUrl(
    apiKey: string,
    apiSecret: string,
    callbackUrl: string
  ): Promise<{ oauthToken: string; oauthTokenSecret: string; authUrl: string }> {
    // This would typically involve:
    // 1. Request token from Twitter
    // 2. Generate authorization URL
    // For now, returning placeholder
    return {
      oauthToken: '',
      oauthTokenSecret: '',
      authUrl: `https://api.twitter.com/oauth/authorize?oauth_token=`
    };
  }

  /**
   * Post a tweet
   */
  async tweet(tweet: Tweet): Promise<TweetResponse> {
    const url = `${TWITTER_API_BASE}/tweets`;

    const body: any = {
      text: tweet.text
    };

    if (tweet.mediaIds && tweet.mediaIds.length > 0) {
      body.media = { media_ids: tweet.mediaIds };
    }

    if (tweet.replyToId) {
      body.reply = { in_reply_to_tweet_id: tweet.replyToId };
    }

    if (tweet.quoteTweetId) {
      body.quote_tweet_id = tweet.quoteTweetId;
    }

    if (tweet.poll) {
      body.poll = {
        options: tweet.poll.options,
        duration_minutes: tweet.poll.durationMinutes
      };
    }

    const response = await axios.post(url, body, {
      headers: {
        Authorization: this.getOAuthHeader('POST', url),
        'Content-Type': 'application/json'
      }
    });

    return {
      id: response.data.data.id,
      text: response.data.data.text
    };
  }

  /**
   * Upload media
   */
  async uploadMedia(mediaData: Buffer, mediaType: string): Promise<string> {
    const url = `${TWITTER_UPLOAD_BASE}/media/upload.json`;

    // For small images, use simple upload
    if (mediaData.length < 5 * 1024 * 1024 && !mediaType.includes('video')) {
      const formData = new URLSearchParams();
      formData.append('media_data', mediaData.toString('base64'));

      const response = await axios.post(url, formData.toString(), {
        headers: {
          Authorization: this.getOAuthHeader('POST', url),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.media_id_string;
    }

    // For larger files or videos, use chunked upload
    return this.chunkedUpload(mediaData, mediaType);
  }

  /**
   * Chunked upload for large media
   */
  private async chunkedUpload(mediaData: Buffer, mediaType: string): Promise<string> {
    const url = `${TWITTER_UPLOAD_BASE}/media/upload.json`;

    // INIT
    const initParams = new URLSearchParams();
    initParams.append('command', 'INIT');
    initParams.append('total_bytes', mediaData.length.toString());
    initParams.append('media_type', mediaType);

    if (mediaType.includes('video')) {
      initParams.append('media_category', 'tweet_video');
    }

    const initResponse = await axios.post(url, initParams.toString(), {
      headers: {
        Authorization: this.getOAuthHeader('POST', url),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const mediaId = initResponse.data.media_id_string;

    // APPEND chunks
    const chunkSize = 1024 * 1024; // 1MB chunks
    let segmentIndex = 0;

    for (let i = 0; i < mediaData.length; i += chunkSize) {
      const chunk = mediaData.slice(i, i + chunkSize);

      const appendParams = new URLSearchParams();
      appendParams.append('command', 'APPEND');
      appendParams.append('media_id', mediaId);
      appendParams.append('segment_index', segmentIndex.toString());
      appendParams.append('media_data', chunk.toString('base64'));

      await axios.post(url, appendParams.toString(), {
        headers: {
          Authorization: this.getOAuthHeader('POST', url),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      segmentIndex++;
    }

    // FINALIZE
    const finalizeParams = new URLSearchParams();
    finalizeParams.append('command', 'FINALIZE');
    finalizeParams.append('media_id', mediaId);

    const finalizeResponse = await axios.post(url, finalizeParams.toString(), {
      headers: {
        Authorization: this.getOAuthHeader('POST', url),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Wait for processing if video
    if (finalizeResponse.data.processing_info) {
      await this.waitForProcessing(mediaId);
    }

    return mediaId;
  }

  /**
   * Wait for media processing
   */
  private async waitForProcessing(mediaId: string, maxAttempts: number = 60): Promise<void> {
    const url = `${TWITTER_UPLOAD_BASE}/media/upload.json`;

    for (let i = 0; i < maxAttempts; i++) {
      const statusParams = new URLSearchParams();
      statusParams.append('command', 'STATUS');
      statusParams.append('media_id', mediaId);

      const response = await axios.get(`${url}?${statusParams.toString()}`, {
        headers: {
          Authorization: this.getOAuthHeader('GET', url)
        }
      });

      const state = response.data.processing_info?.state;

      if (state === 'succeeded') {
        return;
      } else if (state === 'failed') {
        throw new Error('Media processing failed');
      }

      // Wait before checking again
      const checkAfter = response.data.processing_info?.check_after_secs || 5;
      await new Promise(resolve => setTimeout(resolve, checkAfter * 1000));
    }

    throw new Error('Media processing timeout');
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<boolean> {
    const url = `${TWITTER_API_BASE}/tweets/${tweetId}`;

    const response = await axios.delete(url, {
      headers: {
        Authorization: this.getOAuthHeader('DELETE', url)
      }
    });

    return response.data.data.deleted;
  }

  /**
   * Get tweet metrics
   */
  async getTweetMetrics(tweetId: string): Promise<any> {
    const url = `${TWITTER_API_BASE}/tweets/${tweetId}`;

    const response = await axios.get(url, {
      params: {
        'tweet.fields': 'public_metrics,organic_metrics,created_at'
      },
      headers: {
        Authorization: `Bearer ${this.config.bearerToken}`
      }
    });

    return response.data.data;
  }

  /**
   * Get user timeline
   */
  async getUserTimeline(userId: string, maxResults: number = 10): Promise<any[]> {
    const url = `${TWITTER_API_BASE}/users/${userId}/tweets`;

    const response = await axios.get(url, {
      params: {
        max_results: maxResults,
        'tweet.fields': 'created_at,public_metrics'
      },
      headers: {
        Authorization: `Bearer ${this.config.bearerToken}`
      }
    });

    return response.data.data;
  }

  /**
   * Create a thread
   */
  async createThread(tweets: string[]): Promise<TweetResponse[]> {
    const responses: TweetResponse[] = [];
    let previousTweetId: string | undefined;

    for (const text of tweets) {
      const response = await this.tweet({
        text,
        replyToId: previousTweetId
      });

      responses.push(response);
      previousTweetId = response.id;
    }

    return responses;
  }
}
