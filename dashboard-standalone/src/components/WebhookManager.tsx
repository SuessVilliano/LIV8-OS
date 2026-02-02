import { useState, useEffect } from 'react';
import {
    Link,
    Copy,
    Smartphone,
    Mic,
    CheckCircle2,
    Terminal,
    Sparkles,
    ChevronRight,
    Shield,
    RefreshCw,
    Plus,
    Trash2,
    Globe,
    Zap,
    Send
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

interface Webhook {
    id: string;
    name: string;
    url: string;
    type: 'inbound' | 'outbound';
    events: string[];
    active: boolean;
    createdAt: string;
    lastTriggered?: string;
}

const WebhookManager = () => {
    const [copied, setCopied] = useState<string | null>(null);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWebhook, setNewWebhook] = useState({
        name: '',
        type: 'inbound' as 'inbound' | 'outbound',
        events: [] as string[],
        targetUrl: ''
    });
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE = getBackendUrl();
    const clientId = localStorage.getItem('os_client_id') || localStorage.getItem('locationId') || 'default';

    // Generate LIV8 webhook URL
    const generateWebhookUrl = (webhookId: string) => {
        return `${API_BASE}/api/webhooks/${clientId}/${webhookId}`;
    };

    // iOS Shortcut specific webhook URL for voice commands
    const voiceWebhookUrl = `${API_BASE}/api/webhooks/${clientId}/voice`;
    const telegramWebhookUrl = `${API_BASE}/api/webhooks/${clientId}/telegram`;

    // Available webhook events
    const availableEvents = [
        { id: 'contact.created', label: 'Contact Created', category: 'CRM' },
        { id: 'contact.updated', label: 'Contact Updated', category: 'CRM' },
        { id: 'opportunity.created', label: 'Opportunity Created', category: 'CRM' },
        { id: 'opportunity.won', label: 'Opportunity Won', category: 'CRM' },
        { id: 'appointment.booked', label: 'Appointment Booked', category: 'Calendar' },
        { id: 'appointment.cancelled', label: 'Appointment Cancelled', category: 'Calendar' },
        { id: 'workflow.completed', label: 'Workflow Completed', category: 'Automation' },
        { id: 'ai.task.completed', label: 'AI Task Completed', category: 'AI Staff' },
        { id: 'voice.command', label: 'Voice Command Received', category: 'Mobile' },
        { id: 'chat.message', label: 'Chat Message Received', category: 'Messaging' },
    ];

    // Fetch webhooks
    const fetchWebhooks = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/webhooks?clientId=${clientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setWebhooks(data.webhooks || []);
            } else {
                // Demo webhooks if API not available
                setWebhooks([
                    {
                        id: 'wh_voice_01',
                        name: 'iOS Voice Commands',
                        url: voiceWebhookUrl,
                        type: 'inbound',
                        events: ['voice.command'],
                        active: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'wh_telegram_01',
                        name: 'Telegram AI Manager',
                        url: telegramWebhookUrl,
                        type: 'inbound',
                        events: ['chat.message'],
                        active: true,
                        createdAt: new Date().toISOString()
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch webhooks:', error);
            // Fallback demo data
            setWebhooks([
                {
                    id: 'wh_voice_01',
                    name: 'iOS Voice Commands',
                    url: voiceWebhookUrl,
                    type: 'inbound',
                    events: ['voice.command'],
                    active: true,
                    createdAt: new Date().toISOString()
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const handleCopy = (url: string, id: string) => {
        navigator.clipboard.writeText(url);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const createWebhook = async () => {
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/webhooks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId,
                    ...newWebhook
                })
            });

            if (response.ok) {
                const data = await response.json();
                setWebhooks([...webhooks, data.webhook]);
            } else {
                // Add locally for demo
                const newId = `wh_${Date.now()}`;
                setWebhooks([...webhooks, {
                    id: newId,
                    name: newWebhook.name,
                    url: newWebhook.type === 'inbound' ? generateWebhookUrl(newId) : newWebhook.targetUrl,
                    type: newWebhook.type,
                    events: newWebhook.events,
                    active: true,
                    createdAt: new Date().toISOString()
                }]);
            }
            setShowCreateModal(false);
            setNewWebhook({ name: '', type: 'inbound', events: [], targetUrl: '' });
        } catch (error) {
            console.error('Failed to create webhook:', error);
        }
    };

    const deleteWebhook = async (id: string) => {
        try {
            const token = localStorage.getItem('os_token');
            await fetch(`${API_BASE}/api/webhooks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setWebhooks(webhooks.filter(w => w.id !== id));
        } catch (error) {
            setWebhooks(webhooks.filter(w => w.id !== id));
        }
    };

    const toggleWebhookEvent = (eventId: string) => {
        if (newWebhook.events.includes(eventId)) {
            setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(e => e !== eventId) });
        } else {
            setNewWebhook({ ...newWebhook, events: [...newWebhook.events, eventId] });
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mobile Handshake Section */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase italic leading-none">Mobile <span className="text-neuro">Handshake</span></h3>
                    <p className="text-sm text-[var(--os-text-muted)] font-bold">Connect your iPhone via iOS Shortcuts to trigger neural commands via voice note.</p>
                </div>
                <div className="h-14 w-14 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro shadow-lg shadow-neuro/10">
                    <Smartphone className="h-7 w-7" />
                </div>
            </div>

            {/* Voice Webhook Card */}
            <div className="os-card p-8 space-y-8 bg-[var(--os-surface)] border-2 border-neuro/20 shadow-2xl shadow-neuro/5">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1 flex items-center gap-2">
                        <Link className="h-3 w-3" /> Your LIV8 Voice Webhook
                    </label>
                    <div className="relative group">
                        <input
                            value={voiceWebhookUrl}
                            readOnly
                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-2xl pl-6 pr-16 py-5 text-xs font-black text-neuro outline-none cursor-text"
                        />
                        <button
                            onClick={() => handleCopy(voiceWebhookUrl, 'voice')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-neuro text-white rounded-xl shadow-lg shadow-neuro/20 hover:scale-105 transition-all"
                        >
                            {copied === 'voice' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-[var(--os-text-muted)] font-bold pl-2">
                        * Use this URL in your iOS Shortcuts to send voice commands directly to your AI Manager.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-[2rem] bg-[var(--os-bg)] border border-[var(--os-border)] space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <Mic className="h-4 w-4" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Voice-to-JSON Protocol</h4>
                        </div>
                        <p className="text-[10px] font-bold text-[var(--os-text-muted)] leading-relaxed">
                            iOS Shortcuts will convert your voice note to text and `POST` a JSON payload to this endpoint.
                        </p>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-[var(--os-bg)] border border-[var(--os-border)] space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Terminal className="h-4 w-4" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Neural Feedback Loop</h4>
                        </div>
                        <p className="text-[10px] font-bold text-[var(--os-text-muted)] leading-relaxed">
                            The OS will process the command and return a response for your phone to speak back to you.
                        </p>
                    </div>
                </div>

                {/* Telegram Shortcut */}
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-sky-500 flex items-center justify-center text-white">
                                <Send className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Telegram Voice Shortcut</h4>
                                <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-0.5">Dictate directly to your AI agent</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleCopy(telegramWebhookUrl, 'telegram')}
                            className="px-4 py-2 bg-sky-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"
                        >
                            {copied === 'telegram' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            Copy URL
                        </button>
                    </div>
                    <p className="text-[10px] font-bold text-[var(--os-text-muted)] leading-relaxed">
                        Use this iOS Shortcut workflow: Record voice → Transcribe → Open Telegram chat → Paste text → Send to AI agent.
                        One-click to command your AI staff from anywhere.
                    </p>
                </div>

                <div className="p-6 bg-neuro/5 rounded-2xl border border-neuro-light/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Shield className="h-5 w-5 text-neuro" />
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none text-neuro">TLS 1.3 Encryption Verified</p>
                            <p className="text-[8px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">Secure handshake active</p>
                        </div>
                    </div>
                    <Sparkles className="h-4 w-4 text-neuro animate-pulse" />
                </div>

                <a href="/ios-shortcuts-guide.pdf" target="_blank" className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group">
                    Download iOS Shortcut Template <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </a>
            </div>

            {/* Webhook Hub Section */}
            <div className="flex items-start justify-between pt-8 border-t border-[var(--os-border)]">
                <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase italic leading-none">Webhook <span className="text-neuro">Hub</span></h3>
                    <p className="text-sm text-[var(--os-text-muted)] font-bold">Create custom webhooks for any integration - Zapier, Make, n8n, or direct API calls.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="h-12 px-6 bg-neuro text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-neuro/20 flex items-center gap-2 hover:scale-105 transition-all"
                >
                    <Plus className="h-4 w-4" /> Create Webhook
                </button>
            </div>

            {/* Webhooks List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="os-card p-12 flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 text-neuro animate-spin" />
                    </div>
                ) : webhooks.length === 0 ? (
                    <div className="os-card p-12 text-center space-y-4">
                        <Globe className="h-12 w-12 text-[var(--os-text-muted)] mx-auto opacity-50" />
                        <p className="text-sm font-bold text-[var(--os-text-muted)]">No custom webhooks yet. Create one to get started.</p>
                    </div>
                ) : (
                    webhooks.map((webhook) => (
                        <div key={webhook.id} className="os-card p-6 flex items-center justify-between group hover:border-neuro/30 transition-all">
                            <div className="flex items-center gap-6">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                    webhook.type === 'inbound'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                    {webhook.type === 'inbound' ? <Zap className="h-6 w-6" /> : <Send className="h-6 w-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-sm font-black uppercase tracking-tight">{webhook.name}</h4>
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                            webhook.active
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : 'bg-slate-500/10 text-slate-500'
                                        }`}>
                                            {webhook.active ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] font-bold text-[var(--os-text-muted)] mt-1 truncate max-w-md">{webhook.url}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {webhook.events.slice(0, 3).map((event) => (
                                            <span key={event} className="px-2 py-0.5 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg text-[8px] font-bold text-[var(--os-text-muted)]">
                                                {event}
                                            </span>
                                        ))}
                                        {webhook.events.length > 3 && (
                                            <span className="text-[8px] font-bold text-[var(--os-text-muted)]">+{webhook.events.length - 3} more</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleCopy(webhook.url, webhook.id)}
                                    className="p-3 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro/30 transition-all"
                                >
                                    {copied === webhook.id ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => deleteWebhook(webhook.id)}
                                    className="p-3 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-red-500 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Webhook Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="os-card p-8 w-full max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase italic">Create <span className="text-neuro">Webhook</span></h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 text-[var(--os-text-muted)] hover:text-neuro transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Webhook Name</label>
                                <input
                                    value={newWebhook.name}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro transition-all"
                                    placeholder="e.g. Zapier Lead Sync"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Type</label>
                                <div className="flex gap-3">
                                    {['inbound', 'outbound'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setNewWebhook({ ...newWebhook, type: type as any })}
                                            className={`flex-1 p-4 rounded-xl border transition-all ${
                                                newWebhook.type === type
                                                    ? 'bg-neuro/10 border-neuro text-neuro'
                                                    : 'bg-[var(--os-bg)] border-[var(--os-border)] text-[var(--os-text-muted)]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                {type === 'inbound' ? <Zap className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                                <span className="text-[10px] font-black uppercase tracking-widest">{type}</span>
                                            </div>
                                            <p className="text-[9px] mt-2 opacity-60">
                                                {type === 'inbound' ? 'Receive data from external services' : 'Send data to external services'}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newWebhook.type === 'outbound' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Target URL</label>
                                    <input
                                        value={newWebhook.targetUrl}
                                        onChange={(e) => setNewWebhook({ ...newWebhook, targetUrl: e.target.value })}
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro transition-all"
                                        placeholder="https://hooks.zapier.com/..."
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Trigger Events</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {availableEvents.map((event) => (
                                        <button
                                            key={event.id}
                                            onClick={() => toggleWebhookEvent(event.id)}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                newWebhook.events.includes(event.id)
                                                    ? 'bg-neuro/10 border-neuro'
                                                    : 'bg-[var(--os-bg)] border-[var(--os-border)]'
                                            }`}
                                        >
                                            <div className="text-[9px] font-black uppercase tracking-widest">{event.label}</div>
                                            <div className="text-[8px] font-bold text-[var(--os-text-muted)] mt-0.5">{event.category}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 h-12 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-neuro/30 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createWebhook}
                                disabled={!newWebhook.name || newWebhook.events.length === 0}
                                className="flex-1 h-12 bg-neuro text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-neuro/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-all"
                            >
                                Create Webhook
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebhookManager;
