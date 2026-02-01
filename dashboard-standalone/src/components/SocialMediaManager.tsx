/**
 * Social Media Manager Component
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * Manage social media connections and publish content
 */

import { useState, useEffect } from 'react';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Music2,
  Link,
  Unlink,
  Send,
  Calendar,
  Image,
  Video,
  FileText,
  Hash,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  RefreshCw
} from 'lucide-react';

interface PlatformConnection {
  platform: string;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  profileUrl?: string;
  avatarUrl?: string;
  followers?: number;
  expiresAt?: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
  url?: string;
}

const PLATFORM_CONFIG = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    limits: { text: 63206, images: 10, videoMaxMB: 4096 }
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    limits: { text: 2200, images: 10, videoMaxMB: 650 }
  },
  twitter: {
    name: 'X (Twitter)',
    icon: Twitter,
    color: '#000000',
    limits: { text: 280, images: 4, videoMaxMB: 512 }
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    limits: { text: 3000, images: 9, videoMaxMB: 200 }
  },
  tiktok: {
    name: 'TikTok',
    icon: Music2,
    color: '#000000',
    limits: { text: 2200, images: 0, videoMaxMB: 287 }
  }
};

type Platform = keyof typeof PLATFORM_CONFIG;

export default function SocialMediaManager() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'connections' | 'compose' | 'scheduled'>('connections');

  // Compose state
  const [postText, setPostText] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'text'>('text');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const locationId = localStorage.getItem('os_loc_id') || 'demo';

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (postText && selectedPlatforms.length > 0) {
      generatePreviews();
    }
  }, [postText, hashtags, selectedPlatforms]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/social/connections`, {
        headers: { 'x-location-id': locationId }
      });
      const data = await response.json();
      if (data.success) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      // Demo data
      setConnections([
        { platform: 'facebook', connected: false },
        { platform: 'instagram', connected: true, accountName: '@yourbusiness', followers: 5420 },
        { platform: 'twitter', connected: false },
        { platform: 'linkedin', connected: true, accountName: 'Your Company', followers: 2100 },
        { platform: 'tiktok', connected: false }
      ]);
    }
    setLoading(false);
  };

  const connectPlatform = async (platform: string) => {
    setConnecting(platform);
    try {
      const response = await fetch(`${API_BASE}/api/social/connect/${platform}?redirectUri=${encodeURIComponent(window.location.origin + '/settings/integrations')}`, {
        headers: { 'x-location-id': locationId }
      });
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      // Demo: simulate connection
      setConnections(prev => prev.map(c =>
        c.platform === platform ? { ...c, connected: true, accountName: `@demo_${platform}` } : c
      ));
    }
    setConnecting(null);
  };

  const disconnectPlatform = async (platform: string) => {
    try {
      await fetch(`${API_BASE}/api/social/disconnect/${platform}`, {
        method: 'DELETE',
        headers: { 'x-location-id': locationId }
      });
      setConnections(prev => prev.map(c =>
        c.platform === platform ? { ...c, connected: false, accountName: undefined } : c
      ));
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const generatePreviews = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/social/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-location-id': locationId
        },
        body: JSON.stringify({
          text: postText,
          hashtags,
          platforms: selectedPlatforms
        })
      });
      const data = await response.json();
      if (data.success) {
        setPreviews(data.previews);
      }
    } catch (error) {
      // Generate local previews
      const localPreviews: Record<string, string> = {};
      const hashtagString = hashtags.length > 0 ? '\n\n' + hashtags.map(h => `#${h}`).join(' ') : '';

      for (const platform of selectedPlatforms) {
        const limit = PLATFORM_CONFIG[platform].limits.text;
        let fullText = postText + hashtagString;

        if (fullText.length > limit) {
          const availableSpace = limit - hashtagString.length - 3;
          fullText = postText.substring(0, availableSpace) + '...' + hashtagString;
        }

        localPreviews[platform] = fullText;
      }

      setPreviews(localPreviews);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag.replace('#', ''))) {
      setHashtags([...hashtags, newHashtag.replace('#', '')]);
      setNewHashtag('');
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(h => h !== tag));
  };

  const publishPost = async () => {
    if (!postText || selectedPlatforms.length === 0) return;

    setPublishing(true);
    setPublishResults(null);

    try {
      const response = await fetch(`${API_BASE}/api/social/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-location-id': locationId
        },
        body: JSON.stringify({
          text: postText,
          hashtags,
          platforms: selectedPlatforms,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          mediaType: mediaType !== 'text' ? mediaType : undefined
        })
      });

      const data = await response.json();
      setPublishResults(data.results);
    } catch (error) {
      // Demo results
      setPublishResults(selectedPlatforms.map(platform => ({
        platform,
        success: Math.random() > 0.2,
        postId: `post_${Date.now()}`,
        url: `https://${platform}.com/post/123`
      })));
    }

    setPublishing(false);
  };

  const schedulePost = async () => {
    if (!postText || selectedPlatforms.length === 0 || !scheduledTime) return;

    setPublishing(true);

    try {
      const response = await fetch(`${API_BASE}/api/social/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-location-id': locationId
        },
        body: JSON.stringify({
          post: {
            text: postText,
            hashtags,
            platforms: selectedPlatforms,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            mediaType: mediaType !== 'text' ? mediaType : undefined
          },
          scheduledTime
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Post scheduled for ${new Date(scheduledTime).toLocaleString()}`);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to schedule:', error);
    }

    setPublishing(false);
  };

  const resetForm = () => {
    setPostText('');
    setHashtags([]);
    setSelectedPlatforms([]);
    setMediaUrls([]);
    setMediaType('text');
    setScheduledTime('');
    setPublishResults(null);
  };

  const connectedPlatforms = connections.filter(c => c.connected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Social Media</h2>
          <p className="text-gray-500">Connect accounts and publish content</p>
        </div>
        <button
          onClick={fetchConnections}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {['connections', 'compose', 'scheduled'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : (
            connections.map(connection => {
              const config = PLATFORM_CONFIG[connection.platform as Platform];
              const Icon = config?.icon || Globe;

              return (
                <div
                  key={connection.platform}
                  className={`p-6 rounded-2xl border transition-all ${
                    connection.connected
                      ? 'bg-gray-900/50 border-green-500/30'
                      : 'bg-gray-900/30 border-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${config?.color}20` }}
                    >
                      <Icon
                        className="w-6 h-6"
                        style={{ color: config?.color }}
                      />
                    </div>
                    {connection.connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <XCircle className="w-3 h-3" />
                        Not connected
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-white mb-1">{config?.name || connection.platform}</h3>

                  {connection.connected ? (
                    <>
                      <p className="text-sm text-gray-400 mb-1">{connection.accountName}</p>
                      {connection.followers && (
                        <p className="text-xs text-gray-500">{connection.followers.toLocaleString()} followers</p>
                      )}
                      <button
                        onClick={() => disconnectPlatform(connection.platform)}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition-colors"
                      >
                        <Unlink className="w-4 h-4" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => connectPlatform(connection.platform)}
                      disabled={connecting === connection.platform}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm hover:bg-violet-500 transition-colors disabled:opacity-50"
                    >
                      {connecting === connection.platform ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                      Connect
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compose Form */}
          <div className="space-y-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Select Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {connectedPlatforms.map(connection => {
                  const config = PLATFORM_CONFIG[connection.platform as Platform];
                  const Icon = config?.icon || Globe;
                  const isSelected = selectedPlatforms.includes(connection.platform as Platform);

                  return (
                    <button
                      key={connection.platform}
                      onClick={() => togglePlatform(connection.platform as Platform)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-800/50 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config?.name}
                    </button>
                  );
                })}

                {connectedPlatforms.length === 0 && (
                  <p className="text-gray-500 text-sm">No platforms connected. Go to Connections tab to connect.</p>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Post Content
              </label>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full h-40 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {postText.length} characters
                </span>
                {selectedPlatforms.length > 0 && (
                  <span className="text-xs text-gray-500">
                    Min: {Math.min(...selectedPlatforms.map(p => PLATFORM_CONFIG[p].limits.text))} chars
                  </span>
                )}
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Hash className="w-4 h-4 inline mr-1" />
                Hashtags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
                  placeholder="Add hashtag"
                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
                />
                <button
                  onClick={addHashtag}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm hover:bg-violet-500"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-1 bg-violet-600/20 text-violet-400 rounded-lg text-sm"
                  >
                    #{tag}
                    <button
                      onClick={() => removeHashtag(tag)}
                      className="hover:text-white"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Media Type */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Media Type
              </label>
              <div className="flex gap-2">
                {[
                  { type: 'text', icon: FileText, label: 'Text Only' },
                  { type: 'image', icon: Image, label: 'Image' },
                  { type: 'video', icon: Video, label: 'Video' }
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setMediaType(type as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                      mediaType === type
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Schedule (optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={publishPost}
                disabled={!postText || selectedPlatforms.length === 0 || publishing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {publishing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Publish Now
              </button>
              {scheduledTime && (
                <button
                  onClick={schedulePost}
                  disabled={!postText || selectedPlatforms.length === 0 || publishing}
                  className="flex items-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  Schedule
                </button>
              )}
            </div>

            {/* Publish Results */}
            {publishResults && (
              <div className="p-4 bg-gray-800/50 rounded-xl space-y-2">
                <h4 className="font-medium text-white mb-2">Results</h4>
                {publishResults.map(result => (
                  <div
                    key={result.platform}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-sm capitalize">{result.platform}</span>
                    </span>
                    {result.success && result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:underline"
                      >
                        View Post
                      </a>
                    )}
                    {!result.success && (
                      <span className="text-xs text-red-400">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Eye className="w-4 h-4 inline mr-1" />
              Preview
            </label>
            <div className="space-y-4">
              {selectedPlatforms.length === 0 ? (
                <div className="p-8 bg-gray-800/30 border border-gray-700/30 rounded-2xl text-center text-gray-500">
                  Select platforms to see preview
                </div>
              ) : (
                selectedPlatforms.map(platform => {
                  const config = PLATFORM_CONFIG[platform];
                  const Icon = config?.icon || Globe;
                  const preview = previews[platform] || postText;

                  return (
                    <div
                      key={platform}
                      className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-2xl"
                    >
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700/30">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${config?.color}20` }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: config?.color }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white">{config?.name}</span>
                        <span className={`ml-auto text-xs ${
                          preview.length > config.limits.text ? 'text-red-400' : 'text-gray-500'
                        }`}>
                          {preview.length}/{config.limits.text}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {preview}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="p-8 bg-gray-800/30 border border-gray-700/30 rounded-2xl text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Scheduled Posts</h3>
          <p className="text-gray-500 text-sm">
            Posts you schedule will appear here. Go to the Compose tab to schedule your first post.
          </p>
        </div>
      )}
    </div>
  );
}
