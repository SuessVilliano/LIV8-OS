import { useState, useEffect } from 'react';

interface IntegrationStatus {
  voice: { provider: string; status: string };
  messaging: { telegram: string; discord: string; whatsapp: string; slack: string };
  crm: { provider: string; status: string; connected?: boolean };
}

interface IntegrationConfig {
  ghl?: { apiKey: string; locationId: string };
  vbout?: { apiKey: string; accountId: string };
  vapi?: { apiKey: string };
  telegram?: { botToken: string };
}

export default function IntegrationsDashboard() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'crm' | 'voice' | 'messaging' | 'content'>('crm');
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [config, setConfig] = useState<IntegrationConfig>({});
  const [saving, setSaving] = useState(false);

  const locationId = localStorage.getItem('locationId') || 'demo_location';
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/integrations/status/${locationId}`);
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectIntegration = async (type: string) => {
    setSaving(true);
    try {
      let endpoint = '';
      let body = {};

      switch (type) {
        case 'ghl':
          endpoint = `/api/integrations/crm/ghl/connect`;
          body = { apiKey: config.ghl?.apiKey, locationId: config.ghl?.locationId };
          break;
        case 'vbout':
          endpoint = `/api/integrations/crm/vbout/connect`;
          body = { apiKey: config.vbout?.apiKey, accountId: config.vbout?.accountId };
          break;
        case 'vapi':
          endpoint = `/api/integrations/vapi/assistant`;
          body = { locationId, agentRole: 'assistant' };
          break;
        case 'telegram':
          endpoint = `/api/integrations/telegram/connect`;
          body = {
            botToken: config.telegram?.botToken,
            locationId,
            webhookUrl: `${API_BASE}/api/integrations/telegram/webhook`
          };
          break;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.success) {
        setConfigModal(null);
        fetchStatus();
      } else {
        alert(`Failed to connect: ${data.error}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect integration');
    } finally {
      setSaving(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      connected: 'bg-green-100 text-green-800',
      configured: 'bg-blue-100 text-blue-800',
      ready: 'bg-blue-100 text-blue-800',
      not_configured: 'bg-gray-100 text-gray-600',
      error: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.not_configured}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500">Connect your tools and services</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <nav className="flex -mb-px">
          {[
            { id: 'crm', label: 'CRM', icon: '📊' },
            { id: 'voice', label: 'Voice (VAPI)', icon: '📞' },
            { id: 'messaging', label: 'Messaging', icon: '💬' },
            { id: 'content', label: 'Content', icon: '✍️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* CRM Tab */}
        {activeTab === 'crm' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GoHighLevel */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 font-bold">GHL</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">GoHighLevel</h3>
                      <p className="text-sm text-gray-500">Full-featured CRM with AI agents</p>
                    </div>
                  </div>
                  <StatusBadge status={status?.crm?.provider === 'ghl' ? 'connected' : 'not_configured'} />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setConfigModal('ghl')}
                    className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  >
                    {status?.crm?.provider === 'ghl' ? 'Reconfigure' : 'Connect'}
                  </button>
                </div>
                <ul className="mt-3 text-xs text-gray-500 space-y-1">
                  <li>• Native AI call agents</li>
                  <li>• Workflow automations</li>
                  <li>• Contact & pipeline management</li>
                </ul>
              </div>

              {/* Vbout */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-bold">V</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Vbout</h3>
                      <p className="text-sm text-gray-500">Whitelabel CRM option</p>
                    </div>
                  </div>
                  <StatusBadge status={status?.crm?.provider === 'vbout' ? 'connected' : 'not_configured'} />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setConfigModal('vbout')}
                    className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  >
                    {status?.crm?.provider === 'vbout' ? 'Reconfigure' : 'Connect'}
                  </button>
                </div>
                <ul className="mt-3 text-xs text-gray-500 space-y-1">
                  <li>• Email marketing automation</li>
                  <li>• Social media publishing</li>
                  <li>• Whitelabel branding</li>
                </ul>
              </div>
            </div>

            {/* CRM Status Summary */}
            {status?.crm?.connected && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-800 font-medium">
                    Connected to {status.crm.provider.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-green-700">
                  Your AI staff can now access contacts, pipelines, and automations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold">V</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">VAPI Voice AI</h3>
                    <p className="text-sm text-gray-500">AI-powered voice calls and agents</p>
                  </div>
                </div>
                <StatusBadge status={status?.voice?.status || 'not_configured'} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-500">Outbound Calls</div>
                  <div className="font-medium">Enabled</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-500">Inbound Calls</div>
                  <div className="font-medium">Enabled</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfigModal('vapi')}
                  className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                >
                  Configure VAPI
                </button>
                <button className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                  Test Call
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Pro tip:</strong> VAPI integrates seamlessly with both GHL and your whitelabel CRM via Twilio.
                  All conversations sync automatically.
                </p>
              </div>
            </div>

            {/* Voice Agent List */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Voice Agents</h4>
              <div className="space-y-2">
                {['Sales Agent', 'Support Agent', 'Booking Agent'].map(agent => (
                  <div key={agent} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{agent}</span>
                    <button className="text-xs text-indigo-600 hover:text-indigo-800">Configure</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messaging Tab */}
        {activeTab === 'messaging' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Telegram */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-sky-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Telegram</h3>
                      <p className="text-sm text-gray-500">Bot messaging via BotFather</p>
                    </div>
                  </div>
                  <StatusBadge status={status?.messaging?.telegram || 'not_configured'} />
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setConfigModal('telegram')}
                    className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  >
                    Connect Bot
                  </button>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="border border-gray-200 rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">WhatsApp</h3>
                      <p className="text-sm text-gray-500">Business API integration</p>
                    </div>
                  </div>
                  <StatusBadge status="not_configured" />
                </div>
                <div className="mt-4">
                  <span className="px-3 py-1.5 text-sm bg-gray-100 text-gray-500 rounded-lg">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Discord */}
              <div className="border border-gray-200 rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Discord</h3>
                      <p className="text-sm text-gray-500">Community bot integration</p>
                    </div>
                  </div>
                  <StatusBadge status="not_configured" />
                </div>
                <div className="mt-4">
                  <span className="px-3 py-1.5 text-sm bg-gray-100 text-gray-500 rounded-lg">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Slack */}
              <div className="border border-gray-200 rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Slack</h3>
                      <p className="text-sm text-gray-500">Workspace bot integration</p>
                    </div>
                  </div>
                  <StatusBadge status="not_configured" />
                </div>
                <div className="mt-4">
                  <span className="px-3 py-1.5 text-sm bg-gray-100 text-gray-500 rounded-lg">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Content Creation Engine</h3>
              <p className="text-sm text-gray-600 mt-1">
                Generate scroll-stopping content optimized for SEO, AEO, and GEO.
              </p>
              <div className="mt-3 flex gap-2">
                <span className="px-2 py-1 bg-white rounded text-xs">SEO Optimized</span>
                <span className="px-2 py-1 bg-white rounded text-xs">AEO Ready</span>
                <span className="px-2 py-1 bg-white rounded text-xs">GEO Enhanced</span>
                <span className="px-2 py-1 bg-white rounded text-xs">Zero Hallucination</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: 'Social Posts', icon: '📱', count: '10/month' },
                { type: 'Blog Articles', icon: '📝', count: '5/month' },
                { type: 'Email Campaigns', icon: '📧', count: 'Unlimited' },
                { type: 'Ad Copy', icon: '📢', count: '20/month' }
              ].map(item => (
                <div key={item.type} className="p-3 border border-gray-200 rounded-lg text-center">
                  <div className="text-2xl">{item.icon}</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">{item.type}</div>
                  <div className="text-xs text-gray-500">{item.count}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Create Content
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                View Calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modals */}
      {configModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configure {configModal.toUpperCase()}
            </h3>

            {configModal === 'ghl' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={config.ghl?.apiKey || ''}
                    onChange={e => setConfig({ ...config, ghl: { ...config.ghl, apiKey: e.target.value, locationId: config.ghl?.locationId || '' } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter your GHL API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location ID</label>
                  <input
                    type="text"
                    value={config.ghl?.locationId || ''}
                    onChange={e => setConfig({ ...config, ghl: { ...config.ghl, locationId: e.target.value, apiKey: config.ghl?.apiKey || '' } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter your location ID"
                  />
                </div>
              </div>
            )}

            {configModal === 'vbout' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={config.vbout?.apiKey || ''}
                    onChange={e => setConfig({ ...config, vbout: { ...config.vbout, apiKey: e.target.value, accountId: config.vbout?.accountId || '' } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter your Vbout API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account ID</label>
                  <input
                    type="text"
                    value={config.vbout?.accountId || ''}
                    onChange={e => setConfig({ ...config, vbout: { ...config.vbout, accountId: e.target.value, apiKey: config.vbout?.apiKey || '' } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter your account ID"
                  />
                </div>
              </div>
            )}

            {configModal === 'telegram' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                  <input
                    type="password"
                    value={config.telegram?.botToken || ''}
                    onChange={e => setConfig({ ...config, telegram: { botToken: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter bot token from BotFather"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Get your bot token from <a href="https://t.me/BotFather" target="_blank" className="text-indigo-600 hover:underline">@BotFather</a> on Telegram.
                </p>
              </div>
            )}

            {configModal === 'vapi' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAPI API Key</label>
                  <input
                    type="password"
                    value={config.vapi?.apiKey || ''}
                    onChange={e => setConfig({ ...config, vapi: { apiKey: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter your VAPI API key"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Get your API key from <a href="https://vapi.ai" target="_blank" className="text-indigo-600 hover:underline">vapi.ai</a>
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfigModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => connectIntegration(configModal)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
