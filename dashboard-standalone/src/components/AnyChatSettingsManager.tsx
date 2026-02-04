import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Settings,
  Slack,
  Send,
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  TestTube,
  Users,
  Bell
} from 'lucide-react';

interface ChannelConfig {
  slack?: {
    webhookUrl: string;
    channelId?: string;
  };
  telegram?: {
    botToken: string;
    chatId: string;
  };
  discord?: {
    webhookUrl: string;
  };
}

interface EscalationMentions {
  slack?: string[];
  telegram?: string[];
  discord?: string[];
}

interface AnyChatConfig {
  apiKey: string;
  workspaceId: string;
  webhookSecret?: string;
  channels: ChannelConfig;
  escalationMentions?: EscalationMentions;
}

const AnyChatSettingsManager: React.FC = () => {
  const [config, setConfig] = useState<AnyChatConfig>({
    apiKey: '',
    workspaceId: '',
    webhookSecret: '',
    channels: {},
    escalationMentions: {}
  });

  const [activeChannel, setActiveChannel] = useState<'slack' | 'telegram' | 'discord' | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  // Load existing config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const locationId = localStorage.getItem('locationId') || 'default';
      const response = await fetch(`/api/anychat/config/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          // Config exists, show which channels are configured
          setConfig(prev => ({
            ...prev,
            workspaceId: data.config.workspaceId || '',
            escalationMentions: data.config.escalationMentions || {}
          }));

          if (data.config.channels?.slack?.configured) {
            setActiveChannel('slack');
          } else if (data.config.channels?.telegram?.configured) {
            setActiveChannel('telegram');
          } else if (data.config.channels?.discord?.configured) {
            setActiveChannel('discord');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load AnyChat config:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const locationId = localStorage.getItem('locationId') || 'default';

      const response = await fetch('/api/anychat/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          locationId,
          config
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setWebhookUrl(data.webhookUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testChannel = async (channel: 'slack' | 'telegram' | 'discord') => {
    setTesting(channel);
    setError(null);

    try {
      const channelConfig = config.channels[channel];
      if (!channelConfig) {
        throw new Error(`${channel} is not configured`);
      }

      const response = await fetch('/api/anychat/test-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          channel,
          config: channelConfig
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Failed to send test message to ${channel}`);
      }

      alert(`✅ Test message sent to ${channel} successfully!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(null);
    }
  };

  const updateChannel = (channel: 'slack' | 'telegram' | 'discord', data: any) => {
    setConfig(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: data
      }
    }));
  };

  const updateMentions = (channel: 'slack' | 'telegram' | 'discord', mentions: string) => {
    setConfig(prev => ({
      ...prev,
      escalationMentions: {
        ...prev.escalationMentions,
        [channel]: mentions.split(',').map(m => m.trim()).filter(Boolean)
      }
    }));
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <MessageCircle className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AnyChat Live Chat</h3>
            <p className="text-sm text-gray-400">Route live chat to your team channels</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {webhookUrl && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-sm text-green-400 mb-1">Webhook URL (add this in AnyChat settings):</p>
          <code className="text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded block overflow-x-auto">
            {webhookUrl}
          </code>
        </div>
      )}

      {/* AnyChat Credentials */}
      <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          AnyChat Credentials
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Your AnyChat API key"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Workspace ID</label>
            <input
              type="text"
              value={config.workspaceId}
              onChange={(e) => setConfig(prev => ({ ...prev, workspaceId: e.target.value }))}
              placeholder="Your workspace GUID"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Channel Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Team Channel (where messages are routed)
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {/* Slack */}
          <button
            onClick={() => setActiveChannel('slack')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeChannel === 'slack'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
            }`}
          >
            <Slack className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-white">Slack</p>
            {config.channels.slack && (
              <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
            )}
          </button>

          {/* Telegram */}
          <button
            onClick={() => setActiveChannel('telegram')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeChannel === 'telegram'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
            }`}
          >
            <Send className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-white">Telegram</p>
            {config.channels.telegram && (
              <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
            )}
          </button>

          {/* Discord */}
          <button
            onClick={() => setActiveChannel('discord')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeChannel === 'discord'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
            }`}
          >
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
            <p className="text-sm text-white">Discord</p>
            {config.channels.discord && (
              <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
            )}
          </button>
        </div>
      </div>

      {/* Channel Configuration */}
      {activeChannel && (
        <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)} Configuration
            </h4>
            <button
              onClick={() => testChannel(activeChannel)}
              disabled={testing === activeChannel}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
            >
              {testing === activeChannel ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <TestTube className="w-3 h-3" />
              )}
              Test
            </button>
          </div>

          {activeChannel === 'slack' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Webhook URL</label>
                <input
                  type="text"
                  value={config.channels.slack?.webhookUrl || ''}
                  onChange={(e) => updateChannel('slack', { ...config.channels.slack, webhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">Create an incoming webhook in your Slack workspace</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Escalation Mentions (User IDs, comma-separated)</label>
                <input
                  type="text"
                  value={config.escalationMentions?.slack?.join(', ') || ''}
                  onChange={(e) => updateMentions('slack', e.target.value)}
                  placeholder="U123ABC, U456DEF"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">These users will be @mentioned on escalations</p>
              </div>
            </div>
          )}

          {activeChannel === 'telegram' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Bot Token</label>
                <input
                  type="password"
                  value={config.channels.telegram?.botToken || ''}
                  onChange={(e) => updateChannel('telegram', { ...config.channels.telegram, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGHIjklMNO..."
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">Get this from @BotFather on Telegram</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Chat ID (group or channel)</label>
                <input
                  type="text"
                  value={config.channels.telegram?.chatId || ''}
                  onChange={(e) => updateChannel('telegram', { ...config.channels.telegram, chatId: e.target.value })}
                  placeholder="-1001234567890"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">Add your bot to the group and get the chat ID</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Escalation Mentions (usernames, comma-separated)</label>
                <input
                  type="text"
                  value={config.escalationMentions?.telegram?.join(', ') || ''}
                  onChange={(e) => updateMentions('telegram', e.target.value)}
                  placeholder="john_doe, jane_smith"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          {activeChannel === 'discord' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Webhook URL</label>
                <input
                  type="text"
                  value={config.channels.discord?.webhookUrl || ''}
                  onChange={(e) => updateChannel('discord', { webhookUrl: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-gray-500 mt-1">Create a webhook in your Discord channel settings</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Escalation Mentions (User IDs, comma-separated)</label>
                <input
                  type="text"
                  value={config.escalationMentions?.discord?.join(', ') || ''}
                  onChange={(e) => updateMentions('discord', e.target.value)}
                  placeholder="123456789012345678"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          How It Works
        </h4>
        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
          <li>Customer sends a message via your AnyChat widget</li>
          <li>Message is routed to your team channel (Slack/Telegram/Discord)</li>
          <li>Your AI bot (MoltBolt) or team responds in the channel</li>
          <li>Response is sent back to the customer through AnyChat</li>
          <li>All messages are logged in LIV8 OS inbox for visibility</li>
          <li>Escalations auto-tag managers when triggered</li>
        </ol>
      </div>
    </div>
  );
};

export default AnyChatSettingsManager;
