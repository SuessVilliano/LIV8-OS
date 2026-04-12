import { useState, useEffect } from 'react';
import {
    Zap,
    Play,
    Pause,
    CheckCircle2,
    XCircle,
    Clock,
    Image,
    Video,
    FileText,
    TrendingUp,
    Layers,
    Settings,
    RefreshCw,
    ChevronRight,
    Eye,
    Edit3,
    Trash2,
    Calendar,
    Target,
    Loader2,
    Sparkles,
    Bot,
    Send,
    Filter,
    BarChart3,
    Globe,
    Instagram,
    Twitter,
    Linkedin,
    Facebook,
    ArrowRight,
    CheckCheck,
    AlertCircle,
    Wand2
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

type PipelineView = 'dashboard' | 'pillars' | 'ideas' | 'media' | 'trends' | 'config';
type IdeaStatus = 'generated' | 'queued' | 'approved' | 'scheduled' | 'posted' | 'rejected';

interface ContentPillar {
    id: string;
    name: string;
    description: string;
    category: string;
    topics: string[];
    hooks: string[];
    ctas: string[];
    frequency: number;
    platforms: string[];
    isActive: boolean;
}

interface ContentIdea {
    id: string;
    pillarId: string;
    pillarName: string;
    title: string;
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    platform: string;
    contentType: string;
    status: IdeaStatus;
    mediaPrompt?: string;
    mediaUrl?: string;
    videoId?: string;
    score?: number;
    scheduledDate?: string;
    createdAt: string;
}

interface MarketTrend {
    id: string;
    topic: string;
    summary: string;
    relevanceScore: number;
    source: string;
    suggestedAngles: string[];
    suggestedPlatforms: string[];
}

interface PipelineStats {
    totalIdeas: number;
    byStatus: Record<string, number>;
    byPlatform: Record<string, number>;
    byType: Record<string, number>;
    pillarsActive: number;
    trendsAvailable: number;
}

interface PipelineConfig {
    locationId: string;
    brandName: string;
    brandVoice: {
        tone: string[];
        doSay: string[];
        dontSay: string[];
        targetAudience: string;
        industry: string;
    };
    defaultAvatarId?: string;
    defaultVoiceId?: string;
    postsPerDay: number;
    platforms: string[];
    requireApproval: boolean;
    autoGenerateMedia: boolean;
    preferredImageProvider: 'freepik' | 'openai';
    preferredVideoProvider: 'heygen' | 'kling';
    contentRatio: {
        textPosts: number;
        imagePosts: number;
        videoPosts: number;
        avatarVideos: number;
    };
}

const getToken = () => localStorage.getItem('auth_token') || '';
const getLocationId = () => localStorage.getItem('ghl_location_id') || '';

const apiFetch = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_BASE}/api/pipeline${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
            ...options.headers
        }
    });
    return res.json();
};

const platformIcon = (platform: string) => {
    switch (platform) {
        case 'instagram': return <Instagram className="h-4 w-4 text-pink-400" />;
        case 'twitter': return <Twitter className="h-4 w-4 text-sky-400" />;
        case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-400" />;
        case 'facebook': return <Facebook className="h-4 w-4 text-blue-500" />;
        case 'tiktok': return <Globe className="h-4 w-4 text-purple-400" />;
        default: return <Globe className="h-4 w-4 text-gray-400" />;
    }
};

const statusBadge = (status: IdeaStatus) => {
    const styles: Record<IdeaStatus, string> = {
        generated: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        queued: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        approved: 'bg-green-500/20 text-green-300 border-green-500/30',
        scheduled: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        posted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        rejected: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs border ${styles[status]}`}>
            {status}
        </span>
    );
};

const typeIcon = (type: string) => {
    switch (type) {
        case 'image_post': case 'carousel': return <Image className="h-4 w-4 text-pink-400" />;
        case 'video_script': case 'reel_script': return <Video className="h-4 w-4 text-purple-400" />;
        case 'avatar_video': return <Bot className="h-4 w-4 text-cyan-400" />;
        default: return <FileText className="h-4 w-4 text-blue-400" />;
    }
};

export default function ContentPipeline() {
    const [view, setView] = useState<PipelineView>('dashboard');
    const [stats, setStats] = useState<PipelineStats | null>(null);
    const [pillars, setPillars] = useState<ContentPillar[]>([]);
    const [ideas, setIdeas] = useState<ContentIdea[]>([]);
    const [trends, setTrends] = useState<MarketTrend[]>([]);
    const [config, setConfig] = useState<PipelineConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [pipelineRunning, setPipelineRunning] = useState(false);
    const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all');
    const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
    const [message, setMessage] = useState('');

    // Config form state
    const [configForm, setConfigForm] = useState<Partial<PipelineConfig>>({
        brandName: '',
        postsPerDay: 3,
        platforms: ['instagram', 'facebook', 'twitter'],
        requireApproval: true,
        autoGenerateMedia: true,
        preferredImageProvider: 'freepik',
        preferredVideoProvider: 'heygen',
        contentRatio: { textPosts: 40, imagePosts: 30, videoPosts: 15, avatarVideos: 15 },
        brandVoice: { tone: [], doSay: [], dontSay: [], targetAudience: '', industry: '' }
    });

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [statsRes, pillarsRes, configRes] = await Promise.all([
                apiFetch(`/stats?locationId=${getLocationId()}`),
                apiFetch(`/pillars?locationId=${getLocationId()}`),
                apiFetch(`/config?locationId=${getLocationId()}`)
            ]);
            if (statsRes.totalIdeas !== undefined) setStats(statsRes);
            if (pillarsRes.pillars) setPillars(pillarsRes.pillars);
            if (configRes.config) {
                setConfig(configRes.config);
                setConfigForm(configRes.config);
            }
        } catch (e) { console.error('Dashboard load error:', e); }
        setLoading(false);
    };

    const loadIdeas = async () => {
        const params = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const res = await apiFetch(`/ideas?locationId=${getLocationId()}${params}`);
        if (res.ideas) setIdeas(res.ideas);
    };

    const loadTrends = async () => {
        const res = await apiFetch(`/trends?locationId=${getLocationId()}`);
        if (res.trends) setTrends(res.trends);
    };

    const runFullPipeline = async () => {
        setPipelineRunning(true);
        setMessage('');
        try {
            const res = await apiFetch('/run', {
                method: 'POST',
                body: JSON.stringify({
                    locationId: getLocationId(),
                    days: 7,
                    autoApprove: !config?.requireApproval,
                    generateMedia: config?.autoGenerateMedia
                })
            });
            setMessage(res.message || 'Pipeline complete!');
            await loadDashboard();
            await loadIdeas();
        } catch (e: any) {
            setMessage(`Error: ${e.message}`);
        }
        setPipelineRunning(false);
    };

    const generatePillars = async () => {
        if (!configForm.brandName) return setMessage('Set brand name in config first');
        setLoading(true);
        try {
            const res = await apiFetch('/pillars/generate', {
                method: 'POST',
                body: JSON.stringify({
                    locationId: getLocationId(),
                    brandContext: {
                        name: configForm.brandName,
                        industry: configForm.brandVoice?.industry || '',
                        targetAudience: configForm.brandVoice?.targetAudience || '',
                        services: [],
                        uniqueValue: ''
                    }
                })
            });
            if (res.pillars) {
                setPillars(res.pillars);
                setMessage(`Generated ${res.count} content pillars`);
            }
        } catch (e: any) { setMessage(`Error: ${e.message}`); }
        setLoading(false);
    };

    const approveIdea = async (id: string) => {
        const res = await apiFetch(`/ideas/${id}/approve`, { method: 'POST' });
        if (res.idea) {
            setIdeas(ideas.map(i => i.id === id ? res.idea : i));
            setMessage('Idea approved');
        }
    };

    const rejectIdea = async (id: string) => {
        const res = await apiFetch(`/ideas/${id}/reject`, { method: 'POST' });
        if (res.idea) {
            setIdeas(ideas.map(i => i.id === id ? res.idea : i));
            setMessage('Idea rejected');
        }
    };

    const approveAll = async () => {
        const res = await apiFetch('/ideas/approve-all', {
            method: 'POST',
            body: JSON.stringify({ locationId: getLocationId() })
        });
        setMessage(res.message || 'All approved and scheduled');
        await loadIdeas();
        await loadDashboard();
    };

    const generateMedia = async (ideaId: string) => {
        setMessage('Generating media...');
        const res = await apiFetch(`/media/generate/${ideaId}`, {
            method: 'POST',
            body: JSON.stringify({ locationId: getLocationId() })
        });
        if (res.idea) {
            setIdeas(ideas.map(i => i.id === ideaId ? res.idea : i));
            setMessage(res.message || 'Media generated');
        }
    };

    const fetchTrends = async () => {
        setLoading(true);
        const res = await apiFetch('/trends/fetch', {
            method: 'POST',
            body: JSON.stringify({
                locationId: getLocationId(),
                industry: configForm.brandVoice?.industry || '',
                targetAudience: configForm.brandVoice?.targetAudience || '',
                keywords: configForm.brandVoice?.doSay || []
            })
        });
        if (res.trends) {
            setTrends(res.trends);
            setMessage(`Found ${res.count} trending topics`);
        }
        setLoading(false);
    };

    const saveConfig = async () => {
        const payload = { ...configForm, locationId: getLocationId() };
        const res = await apiFetch('/config', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (res.success) {
            setConfig(res.config);
            setMessage('Configuration saved');
        }
    };

    useEffect(() => {
        if (view === 'ideas') loadIdeas();
        if (view === 'trends') loadTrends();
    }, [view, statusFilter]);

    // ============ RENDER ============

    return (
        <div className="min-h-screen bg-[var(--os-bg)] text-[var(--os-text)] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Content Pipeline</h1>
                        <p className="text-sm text-[var(--os-text-muted)]">Automated content generation & publishing</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {message && (
                        <span className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                            {message}
                        </span>
                    )}
                    <button
                        onClick={runFullPipeline}
                        disabled={pipelineRunning || !config}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-medium text-sm disabled:opacity-50 transition-all"
                    >
                        {pipelineRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {pipelineRunning ? 'Running Pipeline...' : 'Run Pipeline'}
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 mb-6 bg-[var(--os-surface)] rounded-xl p-1 w-fit">
                {[
                    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { key: 'pillars', label: 'Pillars', icon: Layers },
                    { key: 'ideas', label: 'Content Queue', icon: FileText },
                    { key: 'media', label: 'Media Studio', icon: Image },
                    { key: 'trends', label: 'Trends', icon: TrendingUp },
                    { key: 'config', label: 'Config', icon: Settings },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setView(tab.key as PipelineView)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            view === tab.key
                                ? 'bg-neuro text-white shadow-lg shadow-neuro/20'
                                : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ============ DASHBOARD VIEW ============ */}
            {view === 'dashboard' && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Ideas', value: stats?.totalIdeas || 0, icon: FileText, color: 'text-blue-400' },
                            { label: 'Active Pillars', value: stats?.pillarsActive || 0, icon: Layers, color: 'text-purple-400' },
                            { label: 'Pending Approval', value: stats?.byStatus?.generated || 0, icon: Clock, color: 'text-yellow-400' },
                            { label: 'Trends Available', value: stats?.trendsAvailable || 0, icon: TrendingUp, color: 'text-green-400' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                    <span className="text-2xl font-bold">{stat.value}</span>
                                </div>
                                <p className="text-sm text-[var(--os-text-muted)]">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Status breakdown */}
                    {stats?.byStatus && Object.keys(stats.byStatus).length > 0 && (
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                            <h3 className="text-sm font-semibold mb-3">Content by Status</h3>
                            <div className="flex gap-3 flex-wrap">
                                {Object.entries(stats.byStatus).map(([status, count]) => (
                                    <div key={status} className="flex items-center gap-2">
                                        {statusBadge(status as IdeaStatus)}
                                        <span className="text-sm font-medium">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Generate 7 Days', desc: 'Create a week of content', icon: Sparkles, action: runFullPipeline, color: 'from-purple-600 to-pink-600' },
                            { label: 'Fetch Trends', desc: 'Find trending topics', icon: TrendingUp, action: fetchTrends, color: 'from-green-600 to-emerald-600' },
                            { label: 'Approve All', desc: 'Approve & schedule queue', icon: CheckCheck, action: approveAll, color: 'from-blue-600 to-cyan-600' },
                            { label: 'Generate Pillars', desc: 'Auto-create pillars', icon: Layers, action: generatePillars, color: 'from-orange-600 to-amber-600' },
                        ].map((action, i) => (
                            <button
                                key={i}
                                onClick={action.action}
                                disabled={loading || pipelineRunning}
                                className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4 text-left hover:border-neuro/50 transition-all group disabled:opacity-50"
                            >
                                <div className={`h-8 w-8 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                                    <action.icon className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-sm font-semibold">{action.label}</p>
                                <p className="text-xs text-[var(--os-text-muted)] mt-1">{action.desc}</p>
                            </button>
                        ))}
                    </div>

                    {!config && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-yellow-300">Pipeline not configured</p>
                                <p className="text-xs text-yellow-300/70">Go to the Config tab to set up your brand and pipeline settings.</p>
                            </div>
                            <button onClick={() => setView('config')} className="ml-auto text-xs bg-yellow-500/20 px-3 py-1.5 rounded-lg text-yellow-300 hover:bg-yellow-500/30">
                                Configure
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ============ PILLARS VIEW ============ */}
            {view === 'pillars' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Content Pillars</h2>
                        <button onClick={generatePillars} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-neuro/20 text-neuro rounded-lg text-sm hover:bg-neuro/30 disabled:opacity-50">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            Auto-Generate Pillars
                        </button>
                    </div>

                    {pillars.length === 0 ? (
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-8 text-center">
                            <Layers className="h-8 w-8 text-[var(--os-text-muted)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--os-text-muted)]">No pillars yet. Configure your brand and generate pillars automatically.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pillars.map(pillar => (
                                <div key={pillar.id} className={`bg-[var(--os-surface)] border rounded-xl p-4 ${pillar.isActive ? 'border-[var(--os-border)]' : 'border-red-500/30 opacity-60'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-sm">{pillar.name}</h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-neuro/20 text-neuro">{pillar.category}</span>
                                    </div>
                                    <p className="text-xs text-[var(--os-text-muted)] mb-3">{pillar.description}</p>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {pillar.platforms.map(p => (
                                            <span key={p} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-[var(--os-bg)] rounded-full">
                                                {platformIcon(p)} {p}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[var(--os-text-muted)]">
                                        <span>{pillar.frequency}x/week</span>
                                        <span>{pillar.topics.length} topics</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ IDEAS / CONTENT QUEUE VIEW ============ */}
            {view === 'ideas' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Content Queue</h2>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-[var(--os-surface)] rounded-lg p-0.5">
                                {(['all', 'generated', 'approved', 'scheduled', 'posted', 'rejected'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={`px-2 py-1 rounded-md text-xs transition-all ${statusFilter === s ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)]'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <button onClick={approveAll} className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs hover:bg-green-500/30">
                                <CheckCheck className="h-3 w-3" /> Approve All
                            </button>
                        </div>
                    </div>

                    {ideas.length === 0 ? (
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-8 text-center">
                            <FileText className="h-8 w-8 text-[var(--os-text-muted)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--os-text-muted)]">No content ideas yet. Run the pipeline to generate content.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {ideas.map(idea => (
                                <div key={idea.id} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4 hover:border-neuro/30 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="mt-1">{typeIcon(idea.contentType)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-semibold truncate">{idea.title}</h3>
                                                    {statusBadge(idea.status)}
                                                </div>
                                                <p className="text-xs text-neuro font-medium mb-1">"{idea.hook}"</p>
                                                <p className="text-xs text-[var(--os-text-muted)] line-clamp-2">{idea.body}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="flex items-center gap-1 text-xs text-[var(--os-text-muted)]">
                                                        {platformIcon(idea.platform)} {idea.platform}
                                                    </span>
                                                    <span className="text-xs text-[var(--os-text-muted)]">{idea.contentType}</span>
                                                    <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">{idea.pillarName}</span>
                                                    {idea.score && <span className="text-xs text-yellow-400">{idea.score}/10</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-3">
                                            {idea.status === 'generated' && (
                                                <>
                                                    <button onClick={() => approveIdea(idea.id)} className="p-1.5 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30" title="Approve">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => rejectIdea(idea.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30" title="Reject">
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            {idea.mediaPrompt && !idea.mediaUrl && !idea.videoId && (
                                                <button onClick={() => generateMedia(idea.id)} className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30" title="Generate Media">
                                                    <Image className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button onClick={() => setSelectedIdea(selectedIdea?.id === idea.id ? null : idea)} className="p-1.5 rounded-lg bg-[var(--os-bg)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]" title="Preview">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Preview */}
                                    {selectedIdea?.id === idea.id && (
                                        <div className="mt-4 pt-4 border-t border-[var(--os-border)] space-y-3">
                                            <div>
                                                <p className="text-xs font-semibold text-[var(--os-text-muted)] mb-1">Full Post</p>
                                                <div className="bg-[var(--os-bg)] rounded-lg p-3 text-sm">
                                                    <p className="font-medium text-neuro mb-2">{idea.hook}</p>
                                                    <p className="whitespace-pre-wrap">{idea.body}</p>
                                                    <p className="mt-2 font-medium">{idea.cta}</p>
                                                    {idea.hashtags.length > 0 && (
                                                        <p className="mt-2 text-blue-400">{idea.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {idea.mediaUrl && (
                                                <div>
                                                    <p className="text-xs font-semibold text-[var(--os-text-muted)] mb-1">Media</p>
                                                    <img src={idea.mediaUrl} alt="Generated" className="rounded-lg max-h-48 object-cover" />
                                                </div>
                                            )}
                                            {idea.mediaPrompt && (
                                                <div>
                                                    <p className="text-xs font-semibold text-[var(--os-text-muted)] mb-1">Media Prompt</p>
                                                    <p className="text-xs bg-[var(--os-bg)] rounded-lg p-2 text-[var(--os-text-muted)]">{idea.mediaPrompt}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ MEDIA STUDIO VIEW ============ */}
            {view === 'media' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Media Studio</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* HeyGen */}
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">HeyGen</h3>
                                    <p className="text-xs text-[var(--os-text-muted)]">Avatar Videos</p>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--os-text-muted)] mb-3">Generate talking-head videos with your AI avatar. Perfect for educational content, offers, and founder-style clips.</p>
                            <div className="text-xs text-emerald-400">BYOK Connected</div>
                        </div>

                        {/* Freepik */}
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                                    <Image className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">Freepik</h3>
                                    <p className="text-xs text-[var(--os-text-muted)]">AI Images</p>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--os-text-muted)] mb-3">Generate photorealistic images, branded graphics, carousels, and thumbnails with Flux models.</p>
                            <div className="text-xs text-emerald-400">BYOK Connected</div>
                        </div>

                        {/* Kling AI */}
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                                    <Video className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">Kling AI</h3>
                                    <p className="text-xs text-[var(--os-text-muted)]">AI Video</p>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--os-text-muted)] mb-3">Generate realistic AI videos from text prompts. Great for product demos, explainers, and b-roll content.</p>
                            <div className="text-xs text-emerald-400">BYOK Connected</div>
                        </div>
                    </div>

                    {/* Ideas needing media */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Content Needing Media</h3>
                        {ideas.filter(i => i.mediaPrompt && !i.mediaUrl && !i.videoId).length === 0 ? (
                            <p className="text-xs text-[var(--os-text-muted)]">No content waiting for media generation. Run the pipeline first.</p>
                        ) : (
                            <div className="space-y-2">
                                {ideas.filter(i => i.mediaPrompt && !i.mediaUrl && !i.videoId).map(idea => (
                                    <div key={idea.id} className="flex items-center justify-between bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            {typeIcon(idea.contentType)}
                                            <span className="text-sm">{idea.title}</span>
                                            {platformIcon(idea.platform)}
                                        </div>
                                        <button onClick={() => generateMedia(idea.id)} className="flex items-center gap-1 px-2 py-1 bg-neuro/20 text-neuro rounded-lg text-xs hover:bg-neuro/30">
                                            <Wand2 className="h-3 w-3" /> Generate
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============ TRENDS VIEW ============ */}
            {view === 'trends' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Market Trends</h2>
                        <button onClick={fetchTrends} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-neuro/20 text-neuro rounded-lg text-sm hover:bg-neuro/30 disabled:opacity-50">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Fetch Latest
                        </button>
                    </div>

                    {trends.length === 0 ? (
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-8 text-center">
                            <TrendingUp className="h-8 w-8 text-[var(--os-text-muted)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--os-text-muted)]">No trends yet. Click "Fetch Latest" to discover trending topics.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {trends.map(trend => (
                                <div key={trend.id} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold">{trend.topic}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">{trend.source}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${trend.relevanceScore >= 7 ? 'bg-green-500/20 text-green-300' : trend.relevanceScore >= 4 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                                                {trend.relevanceScore}/10
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--os-text-muted)] mb-3">{trend.summary}</p>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium">Content Angles:</p>
                                        {trend.suggestedAngles.map((angle, i) => (
                                            <p key={i} className="text-xs text-[var(--os-text-muted)] flex items-center gap-1">
                                                <ArrowRight className="h-3 w-3 text-neuro flex-shrink-0" /> {angle}
                                            </p>
                                        ))}
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                        {trend.suggestedPlatforms.map(p => (
                                            <span key={p} className="flex items-center gap-1 text-xs">{platformIcon(p)}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============ CONFIG VIEW ============ */}
            {view === 'config' && (
                <div className="max-w-2xl space-y-6">
                    <h2 className="text-lg font-semibold">Pipeline Configuration</h2>

                    {/* Brand Info */}
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-semibold">Brand Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-[var(--os-text-muted)] block mb-1">Brand Name</label>
                                <input
                                    type="text"
                                    value={configForm.brandName || ''}
                                    onChange={e => setConfigForm({ ...configForm, brandName: e.target.value })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                    placeholder="Hybrid Funding"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--os-text-muted)] block mb-1">Industry</label>
                                <input
                                    type="text"
                                    value={configForm.brandVoice?.industry || ''}
                                    onChange={e => setConfigForm({ ...configForm, brandVoice: { ...configForm.brandVoice!, industry: e.target.value } })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                    placeholder="Prop Trading / Fintech"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--os-text-muted)] block mb-1">Target Audience</label>
                            <input
                                type="text"
                                value={configForm.brandVoice?.targetAudience || ''}
                                onChange={e => setConfigForm({ ...configForm, brandVoice: { ...configForm.brandVoice!, targetAudience: e.target.value } })}
                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                placeholder="Aspiring and funded traders, ages 20-40"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-[var(--os-text-muted)] block mb-1">Voice Tone (comma-separated)</label>
                                <input
                                    type="text"
                                    value={configForm.brandVoice?.tone?.join(', ') || ''}
                                    onChange={e => setConfigForm({ ...configForm, brandVoice: { ...configForm.brandVoice!, tone: e.target.value.split(',').map(s => s.trim()) } })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                    placeholder="authoritative, motivational, direct"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--os-text-muted)] block mb-1">Posts Per Day</label>
                                <input
                                    type="number"
                                    value={configForm.postsPerDay || 3}
                                    onChange={e => setConfigForm({ ...configForm, postsPerDay: parseInt(e.target.value) || 3 })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                    min={1} max={10}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Generation Settings */}
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-semibold">Generation Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-[var(--os-text-muted)] block mb-1">Image Provider</label>
                                <select
                                    value={configForm.preferredImageProvider || 'freepik'}
                                    onChange={e => setConfigForm({ ...configForm, preferredImageProvider: e.target.value as any })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="freepik">Freepik (Flux)</option>
                                    <option value="openai">OpenAI (DALL-E)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-[var(--os-text-muted)] block mb-1">Video Provider</label>
                                <select
                                    value={configForm.preferredVideoProvider || 'heygen'}
                                    onChange={e => setConfigForm({ ...configForm, preferredVideoProvider: e.target.value as any })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="heygen">HeyGen (Avatar)</option>
                                    <option value="kling">Kling AI</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { key: 'textPosts', label: 'Text %' },
                                { key: 'imagePosts', label: 'Image %' },
                                { key: 'videoPosts', label: 'Video %' },
                                { key: 'avatarVideos', label: 'Avatar %' },
                            ].map(item => (
                                <div key={item.key}>
                                    <label className="text-xs text-[var(--os-text-muted)] block mb-1">{item.label}</label>
                                    <input
                                        type="number"
                                        value={(configForm.contentRatio as any)?.[item.key] || 0}
                                        onChange={e => setConfigForm({
                                            ...configForm,
                                            contentRatio: { ...configForm.contentRatio!, [item.key]: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                        min={0} max={100}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={configForm.requireApproval ?? true}
                                    onChange={e => setConfigForm({ ...configForm, requireApproval: e.target.checked })}
                                    className="rounded"
                                />
                                Require approval before posting
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={configForm.autoGenerateMedia ?? true}
                                    onChange={e => setConfigForm({ ...configForm, autoGenerateMedia: e.target.checked })}
                                    className="rounded"
                                />
                                Auto-generate media
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={saveConfig}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-medium text-sm transition-all"
                    >
                        Save Configuration
                    </button>
                </div>
            )}
        </div>
    );
}
