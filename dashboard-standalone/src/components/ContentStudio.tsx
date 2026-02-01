import { useState, useEffect } from 'react';

// Types
interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  platform: string[];
  isSystemTemplate: boolean;
}

interface ScheduledContent {
  id: string;
  content: { text?: string; mediaUrls?: string[] };
  platforms: string[];
  schedule: { startDate: string; time: string; type: string };
  status: string;
  aiGenerated: boolean;
}

interface AIProvider {
  provider: string;
  isUserKey: boolean;
  capabilities: string[];
}

type TabType = 'create' | 'templates' | 'schedule' | 'calendar' | 'settings';

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([]);
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Create content state
  const [contentType, setContentType] = useState('social_post');
  const [platform, setPlatform] = useState('instagram');
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [includeImage, setIncludeImage] = useState(false);

  // Scheduling state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleType, setScheduleType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [requireApproval, setRequireApproval] = useState(false);

  // API Key settings state
  const [apiKeyModal, setApiKeyModal] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');

  const locationId = localStorage.getItem('locationId') || 'demo_location';
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchTemplates();
    fetchScheduledContent();
    fetchProviders();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scheduler/templates?locationId=${locationId}`);
      const data = await response.json();
      if (data.success) setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchScheduledContent = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scheduler/content?locationId=${locationId}`);
      const data = await response.json();
      if (data.success) setScheduledContent(data.content);
    } catch (error) {
      console.error('Failed to fetch scheduled content:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/providers?locationId=${locationId}`);
      const data = await response.json();
      if (data.success) setAIProviders(data.providers);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  };

  const generateContent = async () => {
    if (!topic.trim()) return;

    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/api/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          contentType,
          platform,
          topic,
          optimization: {
            seo: { primaryKeyword: topic.split(' ')[0] },
            aeo: { conciseAnswers: true },
            geo: { factualDensity: 'high' }
          },
          tone: 'professional',
          includeCallToAction: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedContent(data.content.content);
      } else {
        alert(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!topic.trim()) return;

    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/api/ai/generate/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          prompt: topic,
          provider: 'openai',
          size: '1024x1024'
        })
      });

      const data = await response.json();
      if (data.success && data.mediaUrl) {
        setGeneratedContent(prev => prev + `\n\n[Image: ${data.mediaUrl}]`);
      }
    } catch (error) {
      console.error('Image generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const scheduleContent = async () => {
    if (!generatedContent.trim() || !scheduleDate) {
      alert('Please generate content and select a date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/scheduler/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          content: { text: generatedContent },
          platforms: [platform],
          schedule: {
            type: scheduleType,
            startDate: scheduleDate,
            time: scheduleTime,
            timezone: 'UTC'
          },
          workflow: {
            requiresApproval: requireApproval,
            approvers: ['owner'],
            notifyViaTelegram: requireApproval
          },
          aiGenerated: true,
          aiProvider: selectedProvider,
          createdBy: 'user'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(requireApproval ? 'Content submitted for approval!' : 'Content scheduled!');
        setGeneratedContent('');
        setTopic('');
        fetchScheduledContent();
      }
    } catch (error) {
      console.error('Scheduling error:', error);
      alert('Failed to schedule content');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string) => {
    if (!newApiKey.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/ai/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          provider,
          apiKey: newApiKey
        })
      });

      const data = await response.json();
      if (data.success) {
        setApiKeyModal(null);
        setNewApiKey('');
        fetchProviders();
        alert(`${provider} API key saved!`);
      }
    } catch (error) {
      console.error('Error saving key:', error);
    }
  };

  const approveContent = async (contentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/scheduler/content/${contentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'owner' })
      });

      if ((await response.json()).success) {
        fetchScheduledContent();
      }
    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  const contentTypes = [
    { value: 'social_post', label: 'Social Post', icon: '📱' },
    { value: 'blog_article', label: 'Blog Article', icon: '📝' },
    { value: 'email_campaign', label: 'Email', icon: '📧' },
    { value: 'video_script', label: 'Video Script', icon: '🎬' },
    { value: 'ad_copy', label: 'Ad Copy', icon: '📢' },
    { value: 'sms', label: 'SMS', icon: '💬' }
  ];

  const platforms = [
    { value: 'instagram', label: 'Instagram', icon: '📸' },
    { value: 'facebook', label: 'Facebook', icon: '👤' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'twitter', label: 'X/Twitter', icon: '🐦' },
    { value: 'tiktok', label: 'TikTok', icon: '🎵' },
    { value: 'youtube', label: 'YouTube', icon: '▶️' },
    { value: 'email', label: 'Email', icon: '📧' }
  ];

  const providers = [
    { value: 'gemini', label: 'Gemini', color: 'bg-blue-500' },
    { value: 'openai', label: 'ChatGPT', color: 'bg-green-500' },
    { value: 'claude', label: 'Claude', color: 'bg-orange-500' },
    { value: 'deepseek', label: 'DeepSeek', color: 'bg-purple-500' },
    { value: 'kling', label: 'Kling AI', color: 'bg-pink-500' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <h2 className="text-lg font-semibold text-gray-900">Content Studio</h2>
        <p className="text-sm text-gray-600">Create, schedule, and manage your content with AI</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <nav className="flex overflow-x-auto">
          {[
            { id: 'create', label: 'Create', icon: '✨' },
            { id: 'templates', label: 'Templates', icon: '📋' },
            { id: 'schedule', label: 'Scheduled', icon: '📅' },
            { id: 'calendar', label: 'Calendar', icon: '🗓️' },
            { id: 'settings', label: 'AI Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Content Type & Platform */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {contentTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setContentType(type.value)}
                      className={`p-2 text-center rounded-lg border text-sm transition-all ${
                        contentType === type.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg block">{type.icon}</span>
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {platforms.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`p-2 text-center rounded-lg border text-sm transition-all ${
                        platform === p.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg block">{p.icon}</span>
                      <span className="text-xs">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
              <div className="flex gap-2 flex-wrap">
                {providers.map(p => {
                  const configured = aiProviders.some(ap => ap.provider === p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => setSelectedProvider(p.value)}
                      className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-all ${
                        selectedProvider === p.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${configured ? p.color : 'bg-gray-300'}`} />
                      {p.label}
                      {configured && <span className="text-xs text-green-600">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic / Prompt</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="What would you like to create content about?"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Generate Buttons */}
            <div className="flex gap-3">
              <button
                onClick={generateContent}
                disabled={generating || !topic.trim()}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    ✨ Generate Content
                  </>
                )}
              </button>
              <button
                onClick={generateImage}
                disabled={generating || !topic.trim()}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                title="Generate Image"
              >
                🖼️
              </button>
            </div>

            {/* Generated Content */}
            {generatedContent && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Generated Content</label>
                  <textarea
                    value={generatedContent}
                    onChange={e => setGeneratedContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={8}
                  />
                </div>

                {/* Schedule Options */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-900">Schedule Options</h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                      <select
                        value={scheduleType}
                        onChange={e => setScheduleType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requireApproval}
                          onChange={e => setRequireApproval(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm text-gray-700">Require approval</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={scheduleContent}
                      disabled={loading || !scheduleDate}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Scheduling...' : requireApproval ? 'Submit for Approval' : 'Schedule Post'}
                    </button>
                    <button
                      onClick={() => {/* Publish now logic */}}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Publish Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Content Templates</h3>
              <button className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                + Create Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </div>
                    {template.isSystemTemplate && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        System
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">{template.type}</span>
                    {template.platform.slice(0, 3).map(p => (
                      <span key={p} className="px-2 py-0.5 bg-gray-100 rounded">{p}</span>
                    ))}
                    {template.platform.length > 3 && (
                      <span className="text-gray-400">+{template.platform.length - 3}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('create');
                      setContentType(template.type);
                    }}
                    className="mt-3 w-full py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Scheduled Content</h3>
              <div className="flex gap-2">
                <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {scheduledContent.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">📭</p>
                <p>No scheduled content yet</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-3 text-indigo-600 hover:text-indigo-700"
                >
                  Create your first post
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledContent.map(item => (
                  <div
                    key={item.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-900 line-clamp-2">
                          {item.content.text?.substring(0, 150)}
                          {(item.content.text?.length || 0) > 150 && '...'}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            📅 {item.schedule.startDate} at {item.schedule.time}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">
                            {item.schedule.type}
                          </span>
                          {item.platforms.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-gray-100 rounded">{p}</span>
                          ))}
                          {item.aiGenerated && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">AI</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          item.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                          item.status === 'published' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {item.status === 'pending_approval' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => approveContent(item.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200">
                          Reject
                        </button>
                        <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Content Calendar</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded">◀️</button>
                <span className="font-medium">February 2026</span>
                <button className="p-2 hover:bg-gray-100 rounded">▶️</button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 6; // Adjust for month start
                  const isCurrentMonth = day > 0 && day <= 28;
                  const content = scheduledContent.filter(
                    c => c.schedule.startDate.endsWith(`-${String(day).padStart(2, '0')}`)
                  );

                  return (
                    <div
                      key={i}
                      className={`min-h-[80px] p-1 border-b border-r border-gray-200 ${
                        !isCurrentMonth ? 'bg-gray-50' : ''
                      }`}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className="text-sm text-gray-700 p-1">{day}</div>
                          {content.slice(0, 2).map((c, idx) => (
                            <div
                              key={idx}
                              className={`text-xs p-1 mb-1 rounded truncate ${
                                c.status === 'published'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {c.platforms[0]} - {c.schedule.time}
                            </div>
                          ))}
                          {content.length > 2 && (
                            <div className="text-xs text-gray-500 p-1">
                              +{content.length - 2} more
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-4">AI Provider API Keys</h3>
              <p className="text-sm text-gray-500 mb-4">
                Add your own API keys for unlimited usage, or use our included credits.
              </p>

              <div className="space-y-3">
                {providers.map(p => {
                  const configured = aiProviders.find(ap => ap.provider === p.value);
                  return (
                    <div
                      key={p.value}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${configured ? p.color : 'bg-gray-300'}`} />
                        <div>
                          <div className="font-medium text-gray-900">{p.label}</div>
                          <div className="text-sm text-gray-500">
                            {configured?.isUserKey
                              ? 'Using your API key (unlimited)'
                              : configured
                              ? 'Using LIV8 credits'
                              : 'Not configured'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setApiKeyModal(p.value)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        {configured?.isUserKey ? 'Update Key' : 'Add Key'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Usage This Month</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Text', used: 45, limit: 500, icon: '📝' },
                  { label: 'Images', used: 12, limit: 100, icon: '🖼️' },
                  { label: 'Videos', used: 3, limit: 25, icon: '🎬' },
                  { label: 'Code', used: 20, limit: 200, icon: '💻' }
                ].map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-sm text-gray-500">{item.label}</div>
                    <div className="font-medium">{item.used} / {item.limit}</div>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(item.used / item.limit) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Publishing Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600" />
                  <div>
                    <div className="font-medium text-gray-900">Require approval for all posts</div>
                    <div className="text-sm text-gray-500">All AI-generated content must be approved before publishing</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600" />
                  <div>
                    <div className="font-medium text-gray-900">Telegram notifications</div>
                    <div className="text-sm text-gray-500">Receive approval requests via Telegram</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add {providers.find(p => p.value === apiKeyModal)?.label} API Key
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Adding your own API key gives you unlimited generations for this provider.
            </p>
            <input
              type="password"
              value={newApiKey}
              onChange={e => setNewApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setApiKeyModal(null); setNewApiKey(''); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => saveApiKey(apiKeyModal)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
