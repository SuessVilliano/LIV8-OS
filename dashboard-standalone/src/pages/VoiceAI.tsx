import { useState, useEffect, useCallback } from 'react';
import {
    Phone,
    PhoneCall,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Bot,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Play,
    Pause,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Trash2,
    Edit3,
    Copy,
    BarChart3,
    Activity,
    Users,
    Timer,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Mic,
    Volume2,
    FileText,
    ExternalLink,
    RefreshCw,
    X,
    Save,
    Sparkles,
    Zap,
    Globe,
    Hash,
    MessageSquare,
    Settings,
    ChevronLeft,
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

// ============================================================
// Types
// ============================================================

interface Assistant {
    id: string;
    name: string;
    model?: { provider?: string; model?: string };
    voice?: { provider?: string; voiceId?: string };
    firstMessage?: string;
    firstMessageMode?: string;
    transcriber?: { provider?: string };
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, any>;
}

interface Call {
    id: string;
    type?: string;
    status?: string;
    endedReason?: string;
    assistantId?: string;
    assistant?: { name?: string };
    phoneNumber?: { number?: string };
    customer?: { number?: string };
    duration?: number;
    costs?: Array<{ type?: string; minutes?: number; cost?: number }>;
    artifact?: {
        recording?: string;
        recordingUrl?: string;
        transcript?: string;
        messages?: Array<{ role: string; message: string; time?: number }>;
    };
    analysis?: {
        summary?: string;
        structuredData?: any;
        successEvaluation?: string;
    };
    createdAt?: string;
    startedAt?: string;
    endedAt?: string;
    metadata?: Record<string, any>;
}

interface PhoneNumber {
    id: string;
    number?: string;
    name?: string;
    provider?: string;
    assistantId?: string;
    serverUrl?: string;
    createdAt?: string;
}

interface AnalyticsSummary {
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    totalMinutes: number;
    successRate: number;
    activeAssistants: number;
    costTotal: number;
}

type Tab = 'overview' | 'assistants' | 'calls' | 'phone-numbers' | 'analytics';

// ============================================================
// API Helpers
// ============================================================

function getHeaders(): Record<string, string> {
    const token = localStorage.getItem('os_token') || localStorage.getItem('sessionToken');
    const locationId = localStorage.getItem('os_loc_id') || 'default';
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'x-location-id': locationId,
    };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}/api/voice-ai${path}`, {
        ...options,
        headers: { ...getHeaders(), ...(options?.headers || {}) },
    });
    if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const e = await res.json(); msg = e.error || msg; } catch {}
        throw new Error(msg);
    }
    return res.json();
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ icon: Icon, label, value, subtext, trend, color = 'neuro' }: {
    icon: any; label: string; value: string | number; subtext?: string; trend?: 'up' | 'down' | 'neutral'; color?: string;
}) {
    return (
        <div className="os-glass rounded-2xl p-5 border border-[var(--os-border)] hover:border-neuro/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
                <div className={`h-10 w-10 rounded-xl bg-${color}/10 flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 text-${color}`} />
                </div>
                {trend && (
                    <span className={`text-xs font-bold flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-400' : 'text-[var(--os-text-muted)]'}`}>
                        {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                    </span>
                )}
            </div>
            <div className="text-2xl font-black text-[var(--os-text)] tracking-tight">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-text-muted)] mt-1">{label}</div>
            {subtext && <div className="text-[10px] text-[var(--os-text-muted)] mt-0.5">{subtext}</div>}
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const config: Record<string, { bg: string; text: string; label: string }> = {
        ended: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Completed' },
        'in-progress': { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'In Progress' },
        ringing: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Ringing' },
        queued: { bg: 'bg-slate-500/10', text: 'text-slate-500', label: 'Queued' },
        failed: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Failed' },
    };
    const c = config[status || ''] || { bg: 'bg-slate-500/10', text: 'text-slate-400', label: status || 'Unknown' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.bg} ${c.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.text.replace('text-', 'bg-')}`} />
            {c.label}
        </span>
    );
}

function EndReasonBadge({ reason }: { reason?: string }) {
    if (!reason) return null;
    const labels: Record<string, string> = {
        'assistant-ended-call': 'Assistant ended',
        'customer-ended-call': 'Customer ended',
        'assistant-error': 'Error',
        'customer-did-not-answer': 'No answer',
        'voicemail': 'Voicemail',
        'max-duration-reached': 'Max duration',
        'silence-timed-out': 'Silence timeout',
    };
    return (
        <span className="text-[10px] text-[var(--os-text-muted)] font-medium">
            {labels[reason] || reason.replace(/-/g, ' ')}
        </span>
    );
}

function formatDuration(seconds?: number): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function EmptyState({ icon: Icon, title, description, action, onAction }: {
    icon: any; title: string; description: string; action?: string; onAction?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-neuro/10 flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-neuro" />
            </div>
            <h3 className="text-lg font-black text-[var(--os-text)] mb-1">{title}</h3>
            <p className="text-sm text-[var(--os-text-muted)] max-w-md mb-4">{description}</p>
            {action && onAction && (
                <button onClick={onAction} className="flex items-center gap-2 px-4 py-2 bg-neuro text-white rounded-xl text-xs font-bold hover:bg-neuro/90 transition-all">
                    <Plus className="h-3.5 w-3.5" />
                    {action}
                </button>
            )}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

const VoiceAI = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [calls, setCalls] = useState<Call[]>([]);
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
    const [showCreateAssistant, setShowCreateAssistant] = useState(false);
    const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
    const [showCallModal, setShowCallModal] = useState(false);
    const [callFilter, setCallFilter] = useState<string>('all');
    const [assistantMenuId, setAssistantMenuId] = useState<string | null>(null);
    const [playingAudio, setPlayingAudio] = useState<string | null>(null);

    // ============================================================
    // Data Fetching
    // ============================================================

    const fetchAssistants = useCallback(async () => {
        try {
            const data = await apiFetch<{ assistants: Assistant[] }>('/assistants');
            setAssistants(data.assistants || []);
        } catch (err: any) {
            console.error('[VoiceAI] Fetch assistants:', err);
        }
    }, []);

    const fetchCalls = useCallback(async () => {
        try {
            const data = await apiFetch<{ calls: Call[] }>('/calls?limit=100');
            setCalls(data.calls || []);
        } catch (err: any) {
            console.error('[VoiceAI] Fetch calls:', err);
        }
    }, []);

    const fetchPhoneNumbers = useCallback(async () => {
        try {
            const data = await apiFetch<{ phoneNumbers: PhoneNumber[] }>('/phone-numbers');
            setPhoneNumbers(data.phoneNumbers || []);
        } catch (err: any) {
            console.error('[VoiceAI] Fetch phone numbers:', err);
        }
    }, []);

    const fetchSummary = useCallback(async () => {
        try {
            const data = await apiFetch<{ summary: AnalyticsSummary }>('/analytics/summary');
            setSummary(data.summary || null);
        } catch (err: any) {
            console.error('[VoiceAI] Fetch summary:', err);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([fetchAssistants(), fetchCalls(), fetchPhoneNumbers(), fetchSummary()]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchAssistants, fetchCalls, fetchPhoneNumbers, fetchSummary]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // ============================================================
    // Assistant CRUD
    // ============================================================

    const deleteAssistant = async (id: string) => {
        if (!confirm('Delete this assistant? This cannot be undone.')) return;
        try {
            await apiFetch(`/assistants/${id}`, { method: 'DELETE' });
            setAssistants(prev => prev.filter(a => a.id !== id));
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    };

    const duplicateAssistant = async (id: string) => {
        try {
            const data = await apiFetch<{ assistant: Assistant }>(`/assistants/${id}/duplicate`, { method: 'POST' });
            if (data.assistant) setAssistants(prev => [data.assistant, ...prev]);
        } catch (err: any) {
            alert('Failed to duplicate: ' + err.message);
        }
    };

    const saveAssistant = async (config: any, editId?: string) => {
        try {
            if (editId) {
                await apiFetch(`/assistants/${editId}`, { method: 'PATCH', body: JSON.stringify(config) });
            } else {
                await apiFetch('/assistants', { method: 'POST', body: JSON.stringify(config) });
            }
            await fetchAssistants();
            setShowCreateAssistant(false);
            setEditingAssistant(null);
        } catch (err: any) {
            alert('Failed to save: ' + err.message);
        }
    };

    // ============================================================
    // Outbound Call
    // ============================================================

    const makeCall = async (assistantId: string, customerNumber: string, phoneNumberId?: string) => {
        try {
            await apiFetch('/calls', {
                method: 'POST',
                body: JSON.stringify({ assistantId, customerNumber, phoneNumberId }),
            });
            setShowCallModal(false);
            await fetchCalls();
        } catch (err: any) {
            alert('Failed to initiate call: ' + err.message);
        }
    };

    // ============================================================
    // Filtered data
    // ============================================================

    const filteredCalls = calls.filter(c => {
        const matchesSearch = searchQuery === '' ||
            c.customer?.number?.includes(searchQuery) ||
            c.phoneNumber?.number?.includes(searchQuery) ||
            c.assistant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id.includes(searchQuery);

        const matchesFilter = callFilter === 'all' ||
            (callFilter === 'completed' && (c.endedReason === 'assistant-ended-call' || c.endedReason === 'customer-ended-call')) ||
            (callFilter === 'failed' && (c.status === 'failed' || c.endedReason === 'assistant-error')) ||
            (callFilter === 'inbound' && c.type === 'inboundPhoneCall') ||
            (callFilter === 'outbound' && c.type === 'outboundPhoneCall');

        return matchesSearch && matchesFilter;
    });

    const filteredAssistants = assistants.filter(a =>
        searchQuery === '' || a.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ============================================================
    // Tab navigation
    // ============================================================

    const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
        { key: 'overview', label: 'Overview', icon: Activity },
        { key: 'assistants', label: 'Assistants', icon: Bot, count: assistants.length },
        { key: 'calls', label: 'Call Logs', icon: PhoneCall, count: calls.length },
        { key: 'phone-numbers', label: 'Phone Numbers', icon: Phone, count: phoneNumbers.length },
        { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    // ============================================================
    // Render
    // ============================================================

    return (
        <div className="h-full flex flex-col bg-[var(--os-bg)]">
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-[var(--os-text)]">
                            Voice <span className="text-neuro">AI</span>
                        </h1>
                        <p className="text-xs text-[var(--os-text-muted)] mt-0.5">
                            Manage your AI voice assistants, call logs, and phone numbers
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadAll}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--os-text-muted)] hover:text-neuro hover:bg-neuro/5 transition-all"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowCallModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <PhoneOutgoing className="h-3.5 w-3.5" />
                            New Call
                        </button>
                        <button
                            onClick={() => { setEditingAssistant(null); setShowCreateAssistant(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-neuro text-white rounded-xl text-xs font-bold hover:bg-neuro/90 transition-all shadow-lg shadow-neuro/20"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New Assistant
                        </button>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-1 border-b border-[var(--os-border)]">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all relative ${
                                activeTab === tab.key
                                    ? 'text-neuro'
                                    : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                            }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                                    activeTab === tab.key ? 'bg-neuro/10 text-neuro' : 'bg-[var(--os-surface)] text-[var(--os-text-muted)]'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.key && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neuro rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mx-6 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                {activeTab === 'overview' && <OverviewTab summary={summary} calls={calls} assistants={assistants} phoneNumbers={phoneNumbers} loading={loading} setActiveTab={setActiveTab} />}
                {activeTab === 'assistants' && (
                    <AssistantsTab
                        assistants={filteredAssistants}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        loading={loading}
                        onEdit={(a) => { setEditingAssistant(a); setShowCreateAssistant(true); }}
                        onDelete={deleteAssistant}
                        onDuplicate={duplicateAssistant}
                        onCreate={() => { setEditingAssistant(null); setShowCreateAssistant(true); }}
                        assistantMenuId={assistantMenuId}
                        setAssistantMenuId={setAssistantMenuId}
                    />
                )}
                {activeTab === 'calls' && (
                    <CallLogsTab
                        calls={filteredCalls}
                        assistants={assistants}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        callFilter={callFilter}
                        setCallFilter={setCallFilter}
                        expandedCallId={expandedCallId}
                        setExpandedCallId={setExpandedCallId}
                        loading={loading}
                        playingAudio={playingAudio}
                        setPlayingAudio={setPlayingAudio}
                    />
                )}
                {activeTab === 'phone-numbers' && (
                    <PhoneNumbersTab phoneNumbers={phoneNumbers} assistants={assistants} loading={loading} onRefresh={fetchPhoneNumbers} />
                )}
                {activeTab === 'analytics' && (
                    <AnalyticsTab summary={summary} calls={calls} assistants={assistants} loading={loading} />
                )}
            </div>

            {/* Create/Edit Assistant Modal */}
            {showCreateAssistant && (
                <AssistantModal
                    assistant={editingAssistant}
                    onClose={() => { setShowCreateAssistant(false); setEditingAssistant(null); }}
                    onSave={saveAssistant}
                />
            )}

            {/* New Call Modal */}
            {showCallModal && (
                <NewCallModal
                    assistants={assistants}
                    phoneNumbers={phoneNumbers}
                    onClose={() => setShowCallModal(false)}
                    onCall={makeCall}
                />
            )}
        </div>
    );
};

// ============================================================
// OVERVIEW TAB
// ============================================================

function OverviewTab({ summary, calls, assistants, phoneNumbers, loading, setActiveTab }: {
    summary: AnalyticsSummary | null; calls: Call[]; assistants: Assistant[]; phoneNumbers: PhoneNumber[]; loading: boolean; setActiveTab: (t: Tab) => void;
}) {
    const recentCalls = calls.slice(0, 5);
    const activeAssistants = assistants.slice(0, 4);

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={PhoneCall} label="Total Calls" value={summary?.totalCalls ?? '--'} trend="up" />
                <StatCard icon={Bot} label="Active Assistants" value={summary?.activeAssistants ?? '--'} color="blue-500" />
                <StatCard icon={Timer} label="Total Minutes" value={summary?.totalMinutes ? `${summary.totalMinutes}m` : '--'} color="emerald-500" />
                <StatCard icon={TrendingUp} label="Success Rate" value={summary?.successRate ? `${summary.successRate}%` : '--'} trend={summary?.successRate && summary.successRate > 70 ? 'up' : 'down'} color="amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Calls */}
                <div className="os-glass rounded-2xl border border-[var(--os-border)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--os-border)]">
                        <h3 className="text-sm font-black text-[var(--os-text)]">Recent Calls</h3>
                        <button onClick={() => setActiveTab('calls')} className="text-[10px] font-bold text-neuro hover:underline flex items-center gap-1">
                            View All <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-[var(--os-border)]">
                        {recentCalls.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--os-text-muted)]">
                                {loading ? 'Loading calls...' : 'No calls yet'}
                            </div>
                        ) : recentCalls.map(call => (
                            <div key={call.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--os-surface)] transition-colors">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                    call.type === 'inboundPhoneCall' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                                }`}>
                                    {call.type === 'inboundPhoneCall'
                                        ? <PhoneIncoming className="h-4 w-4 text-blue-500" />
                                        : <PhoneOutgoing className="h-4 w-4 text-emerald-500" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-[var(--os-text)] truncate">
                                        {call.customer?.number || 'Unknown'}
                                    </div>
                                    <div className="text-[10px] text-[var(--os-text-muted)]">
                                        {call.assistant?.name || 'Unassigned'} &middot; {formatDuration(call.duration)}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <StatusBadge status={call.status} />
                                    <div className="text-[9px] text-[var(--os-text-muted)] mt-0.5">{formatDate(call.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Active Assistants */}
                <div className="os-glass rounded-2xl border border-[var(--os-border)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--os-border)]">
                        <h3 className="text-sm font-black text-[var(--os-text)]">Your Assistants</h3>
                        <button onClick={() => setActiveTab('assistants')} className="text-[10px] font-bold text-neuro hover:underline flex items-center gap-1">
                            Manage <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-[var(--os-border)]">
                        {activeAssistants.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--os-text-muted)]">
                                {loading ? 'Loading assistants...' : 'No assistants yet'}
                            </div>
                        ) : activeAssistants.map(assistant => (
                            <div key={assistant.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--os-surface)] transition-colors">
                                <div className="h-9 w-9 rounded-xl bg-neuro/10 flex items-center justify-center">
                                    <Bot className="h-4.5 w-4.5 text-neuro" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-[var(--os-text)] truncate">{assistant.name}</div>
                                    <div className="text-[10px] text-[var(--os-text-muted)]">
                                        {assistant.model?.model || 'Default model'} &middot; {assistant.voice?.provider || 'Default voice'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-500">Active</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="os-glass rounded-2xl border border-[var(--os-border)] p-4 text-center">
                    <div className="text-lg font-black text-[var(--os-text)]">{phoneNumbers.length}</div>
                    <div className="text-[10px] font-bold uppercase text-[var(--os-text-muted)]">Phone Numbers</div>
                </div>
                <div className="os-glass rounded-2xl border border-[var(--os-border)] p-4 text-center">
                    <div className="text-lg font-black text-[var(--os-text)]">{summary?.completedCalls ?? 0}</div>
                    <div className="text-[10px] font-bold uppercase text-[var(--os-text-muted)]">Completed Calls</div>
                </div>
                <div className="os-glass rounded-2xl border border-[var(--os-border)] p-4 text-center">
                    <div className="text-lg font-black text-[var(--os-text)]">{summary?.failedCalls ?? 0}</div>
                    <div className="text-[10px] font-bold uppercase text-[var(--os-text-muted)]">Failed Calls</div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// ASSISTANTS TAB
// ============================================================

function AssistantsTab({ assistants, searchQuery, setSearchQuery, loading, onEdit, onDelete, onDuplicate, onCreate, assistantMenuId, setAssistantMenuId }: {
    assistants: Assistant[]; searchQuery: string; setSearchQuery: (q: string) => void; loading: boolean;
    onEdit: (a: Assistant) => void; onDelete: (id: string) => void; onDuplicate: (id: string) => void; onCreate: () => void;
    assistantMenuId: string | null; setAssistantMenuId: (id: string | null) => void;
}) {
    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--os-text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search assistants..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-surface)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro transition-colors"
                    />
                </div>
                <button onClick={onCreate} className="flex items-center gap-1.5 px-4 py-2.5 bg-neuro text-white rounded-xl text-xs font-bold hover:bg-neuro/90 transition-all flex-shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                    Create Assistant
                </button>
            </div>

            {/* Assistant Grid */}
            {assistants.length === 0 ? (
                <EmptyState
                    icon={Bot}
                    title="No Assistants Yet"
                    description="Create your first AI voice assistant to start handling calls automatically."
                    action="Create Assistant"
                    onAction={onCreate}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {assistants.map(assistant => (
                        <div key={assistant.id} className="os-glass rounded-2xl border border-[var(--os-border)] p-5 hover:border-neuro/30 transition-all group relative">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-neuro/10 flex items-center justify-center">
                                        <Bot className="h-5 w-5 text-neuro" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-[var(--os-text)] truncate max-w-[180px]">{assistant.name}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] text-emerald-500 font-bold">Active</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setAssistantMenuId(assistantMenuId === assistant.id ? null : assistant.id)}
                                        className="p-1.5 rounded-lg hover:bg-[var(--os-surface)] text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                    {assistantMenuId === assistant.id && (
                                        <div className="absolute right-0 top-8 z-50 w-40 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-1">
                                            <button onClick={() => { onEdit(assistant); setAssistantMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--os-text)] hover:bg-neuro/5 transition-colors">
                                                <Edit3 className="h-3 w-3" /> Edit
                                            </button>
                                            <button onClick={() => { onDuplicate(assistant.id); setAssistantMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--os-text)] hover:bg-neuro/5 transition-colors">
                                                <Copy className="h-3 w-3" /> Duplicate
                                            </button>
                                            <hr className="border-[var(--os-border)] my-1" />
                                            <button onClick={() => { onDelete(assistant.id); setAssistantMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/5 transition-colors">
                                                <Trash2 className="h-3 w-3" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Config Details */}
                            <div className="space-y-2 text-[10px] text-[var(--os-text-muted)]">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 text-neuro flex-shrink-0" />
                                    <span className="truncate">Model: <strong className="text-[var(--os-text)]">{assistant.model?.model || 'gpt-4o'}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Volume2 className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                    <span className="truncate">Voice: <strong className="text-[var(--os-text)]">{assistant.voice?.provider || 'Default'}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mic className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                                    <span className="truncate">Transcriber: <strong className="text-[var(--os-text)]">{assistant.transcriber?.provider || 'deepgram'}</strong></span>
                                </div>
                            </div>

                            {/* First Message Preview */}
                            {assistant.firstMessage && (
                                <div className="mt-3 p-2.5 rounded-lg bg-[var(--os-bg)] border border-[var(--os-border)]">
                                    <div className="text-[9px] font-bold uppercase text-[var(--os-text-muted)] mb-1">First Message</div>
                                    <div className="text-[10px] text-[var(--os-text)] line-clamp-2">{assistant.firstMessage}</div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--os-border)]">
                                <span className="text-[9px] text-[var(--os-text-muted)]">
                                    Created {formatDate(assistant.createdAt)}
                                </span>
                                <button
                                    onClick={() => onEdit(assistant)}
                                    className="text-[10px] font-bold text-neuro hover:underline"
                                >
                                    Configure
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================
// CALL LOGS TAB
// ============================================================

function CallLogsTab({ calls, assistants, searchQuery, setSearchQuery, callFilter, setCallFilter, expandedCallId, setExpandedCallId, loading, playingAudio, setPlayingAudio }: {
    calls: Call[]; assistants: Assistant[]; searchQuery: string; setSearchQuery: (q: string) => void;
    callFilter: string; setCallFilter: (f: string) => void; expandedCallId: string | null; setExpandedCallId: (id: string | null) => void;
    loading: boolean; playingAudio: string | null; setPlayingAudio: (id: string | null) => void;
}) {
    const filters = [
        { key: 'all', label: 'All Calls' },
        { key: 'completed', label: 'Completed' },
        { key: 'failed', label: 'Failed' },
        { key: 'inbound', label: 'Inbound' },
        { key: 'outbound', label: 'Outbound' },
    ];

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--os-text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search calls by number, assistant, or ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-surface)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro transition-colors"
                    />
                </div>
                <div className="flex items-center gap-1 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-0.5">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setCallFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                callFilter === f.key ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Call List */}
            {calls.length === 0 ? (
                <EmptyState
                    icon={PhoneCall}
                    title="No Calls Found"
                    description={loading ? 'Loading call history...' : 'No calls match your filters. Start by making an outbound call or wait for inbound calls.'}
                />
            ) : (
                <div className="os-glass rounded-2xl border border-[var(--os-border)] overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[40px_1fr_1fr_1fr_100px_80px_80px_40px] gap-2 px-5 py-3 bg-[var(--os-surface)] border-b border-[var(--os-border)] text-[9px] font-bold uppercase tracking-wider text-[var(--os-text-muted)]">
                        <div></div>
                        <div>Contact</div>
                        <div>Assistant</div>
                        <div>From</div>
                        <div>Status</div>
                        <div>Duration</div>
                        <div>Date</div>
                        <div></div>
                    </div>

                    {/* Call Rows */}
                    <div className="divide-y divide-[var(--os-border)]">
                        {calls.map(call => {
                            const isExpanded = expandedCallId === call.id;
                            const recording = call.artifact?.recording || call.artifact?.recordingUrl;
                            const hasTranscript = !!(call.artifact?.messages?.length || call.artifact?.transcript);

                            return (
                                <div key={call.id}>
                                    <div
                                        className={`grid grid-cols-[40px_1fr_1fr_1fr_100px_80px_80px_40px] gap-2 px-5 py-3 items-center cursor-pointer hover:bg-[var(--os-surface)] transition-colors ${isExpanded ? 'bg-[var(--os-surface)]' : ''}`}
                                        onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                                    >
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                            call.type === 'inboundPhoneCall' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                                        }`}>
                                            {call.type === 'inboundPhoneCall'
                                                ? <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />
                                                : <PhoneOutgoing className="h-3.5 w-3.5 text-emerald-500" />
                                            }
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-[var(--os-text)]">{call.customer?.number || 'Unknown'}</div>
                                            <EndReasonBadge reason={call.endedReason} />
                                        </div>
                                        <div className="text-xs text-[var(--os-text-muted)] truncate">
                                            {call.assistant?.name || assistants.find(a => a.id === call.assistantId)?.name || 'Unassigned'}
                                        </div>
                                        <div className="text-xs text-[var(--os-text-muted)] truncate">
                                            {call.phoneNumber?.number || '--'}
                                        </div>
                                        <div><StatusBadge status={call.status} /></div>
                                        <div className="text-xs font-mono text-[var(--os-text)]">{formatDuration(call.duration)}</div>
                                        <div className="text-[10px] text-[var(--os-text-muted)]">{formatDate(call.createdAt)}</div>
                                        <div className="flex items-center gap-1">
                                            {recording && <Volume2 className="h-3 w-3 text-neuro" />}
                                            {hasTranscript && <FileText className="h-3 w-3 text-emerald-400" />}
                                            <ChevronDown className={`h-3 w-3 text-[var(--os-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-5 pb-4 pt-1 bg-[var(--os-bg)] border-t border-[var(--os-border)]">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                                                {/* Call Info */}
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider">Call Details</h4>
                                                    <div className="space-y-1.5 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--os-text-muted)]">Call ID</span>
                                                            <span className="font-mono text-[var(--os-text)] text-[10px]">{call.id}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--os-text-muted)]">Type</span>
                                                            <span className="text-[var(--os-text)]">{call.type === 'inboundPhoneCall' ? 'Inbound' : 'Outbound'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--os-text-muted)]">Started</span>
                                                            <span className="text-[var(--os-text)]">{formatDate(call.startedAt)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--os-text-muted)]">Ended</span>
                                                            <span className="text-[var(--os-text)]">{formatDate(call.endedAt)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-[var(--os-text-muted)]">End Reason</span>
                                                            <span className="text-[var(--os-text)]">{call.endedReason?.replace(/-/g, ' ') || '--'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Cost Breakdown */}
                                                    {call.costs && call.costs.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">Cost Breakdown</h4>
                                                            <div className="space-y-1">
                                                                {call.costs.map((c, i) => (
                                                                    <div key={i} className="flex justify-between text-[10px]">
                                                                        <span className="text-[var(--os-text-muted)] capitalize">{c.type?.replace(/-/g, ' ')}</span>
                                                                        <span className="text-[var(--os-text)] font-mono">${c.cost?.toFixed(4) || '0.00'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Recording */}
                                                    {recording && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">Recording</h4>
                                                            <audio controls className="w-full h-8" src={typeof recording === 'string' ? recording : undefined}>
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                        </div>
                                                    )}

                                                    {/* AI Analysis */}
                                                    {call.analysis?.summary && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">AI Summary</h4>
                                                            <div className="p-3 rounded-lg bg-neuro/5 border border-neuro/10 text-xs text-[var(--os-text)]">
                                                                {call.analysis.summary}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {call.analysis?.successEvaluation && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-[var(--os-text-muted)]">Success:</span>
                                                            <span className={`text-[10px] font-bold ${call.analysis.successEvaluation === 'true' ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                {call.analysis.successEvaluation === 'true' ? 'Successful' : 'Unsuccessful'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Transcript */}
                                                <div>
                                                    <h4 className="text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-2">Transcript</h4>
                                                    <div className="max-h-72 overflow-auto rounded-xl border border-[var(--os-border)] bg-[var(--os-surface)] p-3 custom-scrollbar">
                                                        {call.artifact?.messages && call.artifact.messages.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {call.artifact.messages.map((msg, i) => (
                                                                    <div key={i} className={`flex gap-2 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                                                                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] ${
                                                                            msg.role === 'assistant'
                                                                                ? 'bg-neuro/10 text-[var(--os-text)]'
                                                                                : 'bg-[var(--os-bg)] text-[var(--os-text)]'
                                                                        }`}>
                                                                            <div className="text-[9px] font-bold uppercase text-[var(--os-text-muted)] mb-0.5">
                                                                                {msg.role === 'assistant' ? 'AI' : 'Customer'}
                                                                            </div>
                                                                            {msg.message}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : call.artifact?.transcript ? (
                                                            <pre className="text-[11px] text-[var(--os-text)] whitespace-pre-wrap font-sans">{call.artifact.transcript}</pre>
                                                        ) : (
                                                            <div className="text-xs text-[var(--os-text-muted)] text-center py-6">No transcript available</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// PHONE NUMBERS TAB
// ============================================================

function PhoneNumbersTab({ phoneNumbers, assistants, loading, onRefresh }: {
    phoneNumbers: PhoneNumber[]; assistants: Assistant[]; loading: boolean; onRefresh: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-[var(--os-text)]">Phone Numbers</h3>
                    <p className="text-[10px] text-[var(--os-text-muted)]">Manage phone numbers assigned to your voice AI assistants</p>
                </div>
                <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--os-text-muted)] hover:text-neuro hover:bg-neuro/5 transition-all">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                </button>
            </div>

            {phoneNumbers.length === 0 ? (
                <EmptyState
                    icon={Phone}
                    title="No Phone Numbers"
                    description={loading ? 'Loading phone numbers...' : 'Import phone numbers from Twilio or Telnyx, or use VAPI free numbers to get started.'}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {phoneNumbers.map(pn => (
                        <div key={pn.id} className="os-glass rounded-2xl border border-[var(--os-border)] p-5 hover:border-neuro/30 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <Phone className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-[var(--os-text)]">{pn.number || pn.id}</h4>
                                        {pn.name && <div className="text-[10px] text-[var(--os-text-muted)]">{pn.name}</div>}
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-500 uppercase">
                                    {pn.provider || 'vapi'}
                                </span>
                            </div>

                            <div className="space-y-1.5 text-[10px] text-[var(--os-text-muted)]">
                                <div className="flex items-center gap-2">
                                    <Bot className="h-3 w-3" />
                                    <span>
                                        Assigned to: <strong className="text-[var(--os-text)]">
                                            {pn.assistantId ? assistants.find(a => a.id === pn.assistantId)?.name || 'Unknown' : 'Unassigned'}
                                        </strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    <span>Added {formatDate(pn.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================
// ANALYTICS TAB
// ============================================================

function AnalyticsTab({ summary, calls, assistants, loading }: {
    summary: AnalyticsSummary | null; calls: Call[]; assistants: Assistant[]; loading: boolean;
}) {
    // Compute per-assistant stats
    const assistantStats = assistants.map(a => {
        const aCalls = calls.filter(c => c.assistantId === a.id);
        const completed = aCalls.filter(c => c.endedReason === 'assistant-ended-call' || c.endedReason === 'customer-ended-call');
        const totalDuration = aCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
        return {
            id: a.id,
            name: a.name,
            totalCalls: aCalls.length,
            completedCalls: completed.length,
            successRate: aCalls.length > 0 ? Math.round((completed.length / aCalls.length) * 100) : 0,
            avgDuration: aCalls.length > 0 ? Math.round(totalDuration / aCalls.length) : 0,
        };
    }).sort((a, b) => b.totalCalls - a.totalCalls);

    // Call distribution by end reason
    const endReasons: Record<string, number> = {};
    for (const call of calls) {
        const reason = call.endedReason || 'unknown';
        endReasons[reason] = (endReasons[reason] || 0) + 1;
    }

    // Calls by hour
    const hourlyDistribution: number[] = new Array(24).fill(0);
    for (const call of calls) {
        if (call.createdAt) {
            const hour = new Date(call.createdAt).getHours();
            hourlyDistribution[hour]++;
        }
    }
    const maxHourly = Math.max(...hourlyDistribution, 1);

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={PhoneCall} label="Total Calls" value={summary?.totalCalls ?? 0} />
                <StatCard icon={CheckCircle} label="Completed" value={summary?.completedCalls ?? 0} color="emerald-500" />
                <StatCard icon={Timer} label="Total Minutes" value={`${summary?.totalMinutes ?? 0}m`} color="blue-500" />
                <StatCard icon={TrendingUp} label="Success Rate" value={`${summary?.successRate ?? 0}%`} color="amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Per-Assistant Performance */}
                <div className="os-glass rounded-2xl border border-[var(--os-border)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--os-border)]">
                        <h3 className="text-sm font-black text-[var(--os-text)]">Assistant Performance</h3>
                    </div>
                    <div className="divide-y divide-[var(--os-border)]">
                        {assistantStats.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[var(--os-text-muted)]">No data yet</div>
                        ) : assistantStats.map(stat => (
                            <div key={stat.id} className="px-5 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-[var(--os-text)] truncate">{stat.name}</span>
                                    <span className="text-[10px] font-bold text-neuro">{stat.totalCalls} calls</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-[var(--os-text-muted)]">
                                    <span>Success: <strong className="text-emerald-500">{stat.successRate}%</strong></span>
                                    <span>Avg: <strong className="text-[var(--os-text)]">{formatDuration(stat.avgDuration)}</strong></span>
                                    <span>Completed: <strong className="text-[var(--os-text)]">{stat.completedCalls}</strong></span>
                                </div>
                                {/* Mini progress bar */}
                                <div className="mt-1.5 h-1 rounded-full bg-[var(--os-border)] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-neuro transition-all"
                                        style={{ width: `${stat.successRate}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* End Reason Breakdown */}
                <div className="os-glass rounded-2xl border border-[var(--os-border)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--os-border)]">
                        <h3 className="text-sm font-black text-[var(--os-text)]">Call Outcomes</h3>
                    </div>
                    <div className="p-5 space-y-2">
                        {Object.keys(endReasons).length === 0 ? (
                            <div className="text-center text-xs text-[var(--os-text-muted)] py-4">No data yet</div>
                        ) : Object.entries(endReasons).sort(([, a], [, b]) => b - a).map(([reason, count]) => (
                            <div key={reason} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[10px] text-[var(--os-text)] capitalize">{reason.replace(/-/g, ' ')}</span>
                                        <span className="text-[10px] font-bold text-[var(--os-text-muted)]">{count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[var(--os-border)] overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                reason.includes('ended-call') ? 'bg-emerald-500' : reason.includes('error') || reason.includes('failed') ? 'bg-red-400' : 'bg-blue-400'
                                            }`}
                                            style={{ width: `${(count / calls.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hourly Distribution */}
            <div className="os-glass rounded-2xl border border-[var(--os-border)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--os-border)]">
                    <h3 className="text-sm font-black text-[var(--os-text)]">Call Volume by Hour</h3>
                </div>
                <div className="p-5">
                    <div className="flex items-end gap-1 h-32">
                        {hourlyDistribution.map((count, hour) => (
                            <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full bg-neuro/20 hover:bg-neuro/40 rounded-t transition-all relative group"
                                    style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? '4px' : '1px' }}
                                >
                                    {count > 0 && (
                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-neuro opacity-0 group-hover:opacity-100 transition-opacity">
                                            {count}
                                        </div>
                                    )}
                                </div>
                                {hour % 3 === 0 && (
                                    <span className="text-[8px] text-[var(--os-text-muted)]">{hour}h</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// ASSISTANT CREATE/EDIT MODAL
// ============================================================

function AssistantModal({ assistant, onClose, onSave }: {
    assistant: Assistant | null; onClose: () => void; onSave: (config: any, editId?: string) => void;
}) {
    const [name, setName] = useState(assistant?.name || '');
    const [firstMessage, setFirstMessage] = useState(assistant?.firstMessage || '');
    const [firstMessageMode, setFirstMessageMode] = useState(assistant?.firstMessageMode || 'assistant-speaks-first');
    const [modelProvider, setModelProvider] = useState(assistant?.model?.provider || 'openai');
    const [modelId, setModelId] = useState(assistant?.model?.model || 'gpt-4o');
    const [voiceProvider, setVoiceProvider] = useState(assistant?.voice?.provider || 'elevenlabs');
    const [voiceId, setVoiceId] = useState(assistant?.voice?.voiceId || '');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [saving, setSaving] = useState(false);

    // Try to extract system prompt from existing assistant
    useEffect(() => {
        if (assistant && (assistant as any).model?.messages) {
            const sysMsg = (assistant as any).model.messages.find((m: any) => m.role === 'system');
            if (sysMsg) setSystemPrompt(sysMsg.content || '');
        }
    }, [assistant]);

    const handleSave = async () => {
        if (!name.trim()) { alert('Name is required'); return; }
        setSaving(true);

        const config: any = {
            name: name.trim(),
            firstMessage: firstMessage.trim() || undefined,
            firstMessageMode,
            model: {
                provider: modelProvider,
                model: modelId,
                ...(systemPrompt.trim() ? {
                    messages: [{ role: 'system', content: systemPrompt.trim() }]
                } : {}),
            },
            voice: {
                provider: voiceProvider,
                ...(voiceId.trim() ? { voiceId: voiceId.trim() } : {}),
            },
            transcriber: { provider: 'deepgram' },
        };

        await onSave(config, assistant?.id);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl shadow-2xl custom-scrollbar" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--os-border)]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-neuro/10 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-neuro" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--os-text)]">
                                {assistant ? 'Edit Assistant' : 'Create New Assistant'}
                            </h2>
                            <p className="text-[10px] text-[var(--os-text-muted)]">Configure your AI voice agent</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--os-bg)] text-[var(--os-text-muted)] transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">Assistant Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Sales Agent, Receptionist..."
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro transition-colors"
                        />
                    </div>

                    {/* First Message */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">First Message</label>
                        <textarea
                            value={firstMessage}
                            onChange={e => setFirstMessage(e.target.value)}
                            placeholder="Hi! Thanks for calling. How can I help you today?"
                            rows={2}
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro transition-colors resize-none"
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                            <label className="text-[10px] text-[var(--os-text-muted)]">Mode:</label>
                            <select
                                value={firstMessageMode}
                                onChange={e => setFirstMessageMode(e.target.value)}
                                className="px-2 py-1 rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)] text-[10px] text-[var(--os-text)] focus:outline-none focus:border-neuro"
                            >
                                <option value="assistant-speaks-first">Assistant speaks first</option>
                                <option value="assistant-waits-for-user">Wait for user</option>
                                <option value="assistant-speaks-first-with-model-generated-message">AI-generated greeting</option>
                            </select>
                        </div>
                    </div>

                    {/* Model & Voice Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">AI Model</label>
                            <select
                                value={modelProvider}
                                onChange={e => setModelProvider(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] focus:outline-none focus:border-neuro mb-2"
                            >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="google">Google</option>
                            </select>
                            <input
                                type="text"
                                value={modelId}
                                onChange={e => setModelId(e.target.value)}
                                placeholder="gpt-4o"
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">Voice</label>
                            <select
                                value={voiceProvider}
                                onChange={e => setVoiceProvider(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] focus:outline-none focus:border-neuro mb-2"
                            >
                                <option value="elevenlabs">ElevenLabs</option>
                                <option value="playht">PlayHT</option>
                                <option value="deepgram">Deepgram</option>
                                <option value="openai">OpenAI</option>
                            </select>
                            <input
                                type="text"
                                value={voiceId}
                                onChange={e => setVoiceId(e.target.value)}
                                placeholder="Voice ID (optional)"
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro"
                            />
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">System Prompt / Instructions</label>
                        <textarea
                            value={systemPrompt}
                            onChange={e => setSystemPrompt(e.target.value)}
                            placeholder="You are a professional AI assistant for [Business Name]. Your role is to..."
                            rows={6}
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro transition-colors resize-none font-mono"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--os-border)]">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-5 py-2 bg-neuro text-white rounded-xl text-xs font-bold hover:bg-neuro/90 transition-all disabled:opacity-50"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving...' : (assistant ? 'Save Changes' : 'Create Assistant')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// NEW CALL MODAL
// ============================================================

function NewCallModal({ assistants, phoneNumbers, onClose, onCall }: {
    assistants: Assistant[]; phoneNumbers: PhoneNumber[]; onClose: () => void;
    onCall: (assistantId: string, customerNumber: string, phoneNumberId?: string) => void;
}) {
    const [selectedAssistant, setSelectedAssistant] = useState(assistants[0]?.id || '');
    const [customerNumber, setCustomerNumber] = useState('');
    const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
    const [calling, setCalling] = useState(false);

    const handleCall = async () => {
        if (!selectedAssistant || !customerNumber.trim()) {
            alert('Please select an assistant and enter a phone number');
            return;
        }
        setCalling(true);
        await onCall(selectedAssistant, customerNumber.trim(), selectedPhoneNumber || undefined);
        setCalling(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--os-border)]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <PhoneOutgoing className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--os-text)]">New Outbound Call</h2>
                            <p className="text-[10px] text-[var(--os-text-muted)]">Initiate an AI-powered call</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--os-bg)] text-[var(--os-text-muted)] transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">Assistant *</label>
                        <select
                            value={selectedAssistant}
                            onChange={e => setSelectedAssistant(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] focus:outline-none focus:border-neuro"
                        >
                            {assistants.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">Customer Phone Number *</label>
                        <input
                            type="tel"
                            value={customerNumber}
                            onChange={e => setCustomerNumber(e.target.value)}
                            placeholder="+1 555 123 4567"
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:outline-none focus:border-neuro"
                        />
                    </div>

                    {phoneNumbers.length > 0 && (
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-[var(--os-text-muted)] tracking-wider mb-1.5">Call From (optional)</label>
                            <select
                                value={selectedPhoneNumber}
                                onChange={e => setSelectedPhoneNumber(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-xs text-[var(--os-text)] focus:outline-none focus:border-neuro"
                            >
                                <option value="">Auto-select</option>
                                {phoneNumbers.map(pn => (
                                    <option key={pn.id} value={pn.id}>{pn.number || pn.id}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--os-border)]">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleCall}
                        disabled={calling || !selectedAssistant || !customerNumber.trim()}
                        className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                    >
                        <PhoneOutgoing className="h-3.5 w-3.5" />
                        {calling ? 'Initiating...' : 'Start Call'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VoiceAI;
