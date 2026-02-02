import { useState, useEffect } from 'react';
import {
    Ticket,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Brain,
    Send,
    RefreshCw,
    Mail,
    Settings,
    ChevronRight,
    MessageSquare,
    Zap,
    Search,
    Download,
    Calendar,
    Target,
    Loader2
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

interface TicketData {
    id: number;
    subject: string;
    description_text: string;
    status: number;
    priority: number;
    type: string | null;
    created_at: string;
    updated_at: string;
    requester?: {
        name: string;
        email: string;
    };
}

interface TicketAnalysis {
    ticketId: number;
    subject: string;
    category: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    sentiment: 'frustrated' | 'neutral' | 'positive';
    summary: string;
    suggestedResponse: string;
    similarResolved: {
        ticketId: number;
        subject: string;
        resolution: string;
        similarity: number;
    }[];
    estimatedResolutionTime: string;
    requiresEscalation: boolean;
    escalationReason?: string;
}

interface Stats {
    open: number;
    pending: number;
    resolved: number;
    overdue: number;
}

interface ReportSchedule {
    scheduled: boolean;
    time: string;
    recipients: string[];
    lastSent: string | null;
}

export default function Tickets() {
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [analyses, setAnalyses] = useState<TicketAnalysis[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketAnalysis | null>(null);
    const [filter, setFilter] = useState<'all' | 'critical' | 'escalation'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [schedule, setSchedule] = useState<ReportSchedule | null>(null);
    const [sendingReport, setSendingReport] = useState(false);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);

    const API_BASE = getBackendUrl();
    const token = localStorage.getItem('os_token');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ticketsRes, statsRes, scheduleRes] = await Promise.all([
                fetch(`${API_BASE}/api/tickets`, { headers }),
                fetch(`${API_BASE}/api/tickets/stats`, { headers }),
                fetch(`${API_BASE}/api/tickets/report/schedule`, { headers })
            ]);

            if (ticketsRes.ok) {
                const data = await ticketsRes.json();
                setTickets(data.tickets || []);
            }

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            if (scheduleRes.ok) {
                const data = await scheduleRes.json();
                setSchedule(data);
            }
        } catch (error) {
            console.error('Load data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const analyzeTickets = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch(`${API_BASE}/api/tickets/analyze`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAnalyses(data.analyses || []);
            }
        } catch (error) {
            console.error('Analyze error:', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const sendDailyReport = async () => {
        setSendingReport(true);
        try {
            const res = await fetch(`${API_BASE}/api/tickets/report/send`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Report sent to ${data.sentTo.join(', ')}`);
                loadData();
            }
        } catch (error) {
            console.error('Send report error:', error);
        } finally {
            setSendingReport(false);
        }
    };

    const downloadReport = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/tickets/report/pdf`, { headers });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `support-report-${new Date().toISOString().split('T')[0]}.html`;
                a.click();
            }
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    const sendAiReply = async (ticketId: number) => {
        setReplyingTo(ticketId);
        try {
            const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/reply`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ useAiSuggestion: true })
            });
            if (res.ok) {
                alert('AI response sent successfully!');
                loadData();
            }
        } catch (error) {
            console.error('Reply error:', error);
        } finally {
            setReplyingTo(null);
        }
    };

    const updateSchedule = async (updates: { enabled?: boolean; time?: string; recipients?: string[] }) => {
        try {
            const res = await fetch(`${API_BASE}/api/tickets/report/schedule`, {
                method: 'POST',
                headers,
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const data = await res.json();
                setSchedule(data);
            }
        } catch (error) {
            console.error('Update schedule error:', error);
        }
    };

    const getUrgencyColor = (urgency: string) => {
        const colors = {
            critical: 'bg-red-500',
            high: 'bg-amber-500',
            medium: 'bg-blue-500',
            low: 'bg-emerald-500'
        };
        return colors[urgency as keyof typeof colors] || 'bg-gray-500';
    };

    const getSentimentIcon = (sentiment: string) => {
        const icons = {
            frustrated: '😤',
            neutral: '😐',
            positive: '😊'
        };
        return icons[sentiment as keyof typeof icons] || '😐';
    };

    const filteredAnalyses = analyses.filter(a => {
        if (filter === 'critical') return a.urgency === 'critical' || a.urgency === 'high';
        if (filter === 'escalation') return a.requiresEscalation;
        return true;
    }).filter(a =>
        searchQuery === '' ||
        a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[var(--os-bg)]">
                <Loader2 className="h-8 w-8 text-neuro animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[var(--os-bg)] overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--os-text)]">Support Tickets</h1>
                        <p className="text-sm text-[var(--os-text-muted)]">AI-powered ticket management with Freshdesk</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={downloadReport}
                            className="px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-sm font-medium flex items-center gap-2 hover:border-neuro transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Export Report
                        </button>
                        <button
                            onClick={sendDailyReport}
                            disabled={sendingReport}
                            className="px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-sm font-medium flex items-center gap-2 hover:border-neuro transition-colors"
                        >
                            {sendingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Send Report
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-sm font-medium flex items-center gap-2 hover:border-neuro transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                        </button>
                        <button
                            onClick={loadData}
                            className="px-4 py-2 bg-neuro text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neuro/90 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <Ticket className="h-5 w-5 text-blue-500" />
                                <span className="text-xs text-[var(--os-text-muted)]">Open</span>
                            </div>
                            <div className="text-3xl font-bold text-[var(--os-text)]">{stats.open}</div>
                        </div>
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <Clock className="h-5 w-5 text-amber-500" />
                                <span className="text-xs text-[var(--os-text-muted)]">Pending</span>
                            </div>
                            <div className="text-3xl font-bold text-[var(--os-text)]">{stats.pending}</div>
                        </div>
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <span className="text-xs text-[var(--os-text-muted)]">Resolved</span>
                            </div>
                            <div className="text-3xl font-bold text-[var(--os-text)]">{stats.resolved}</div>
                        </div>
                        <div className={`bg-[var(--os-surface)] border rounded-xl p-5 ${stats.overdue > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-[var(--os-border)]'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <AlertTriangle className={`h-5 w-5 ${stats.overdue > 0 ? 'text-red-500' : 'text-[var(--os-text-muted)]'}`} />
                                <span className="text-xs text-[var(--os-text-muted)]">Overdue</span>
                            </div>
                            <div className={`text-3xl font-bold ${stats.overdue > 0 ? 'text-red-500' : 'text-[var(--os-text)]'}`}>{stats.overdue}</div>
                        </div>
                    </div>
                )}

                {/* Settings Panel */}
                {showSettings && schedule && (
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-neuro" />
                            Daily Report Settings
                        </h3>
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Schedule</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => updateSchedule({ enabled: !schedule.scheduled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${schedule.scheduled ? 'bg-neuro' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${schedule.scheduled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                    <span className="text-sm text-[var(--os-text-muted)]">
                                        {schedule.scheduled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Send Time</label>
                                <input
                                    type="time"
                                    value={schedule.time}
                                    onChange={(e) => updateSchedule({ time: e.target.value })}
                                    className="bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Last Sent</label>
                                <p className="text-sm text-[var(--os-text-muted)]">
                                    {schedule.lastSent ? new Date(schedule.lastSent).toLocaleString() : 'Never'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Analysis Section */}
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[var(--os-border)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Brain className="h-5 w-5 text-neuro" />
                            <h3 className="font-semibold">AI Ticket Analysis</h3>
                            {analyses.length > 0 && (
                                <span className="px-2 py-0.5 bg-neuro/10 text-neuro text-xs font-medium rounded-full">
                                    {analyses.length} analyzed
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Search tickets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg text-sm w-64 focus:border-neuro outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-1 bg-[var(--os-bg)] rounded-lg p-1">
                                {(['all', 'critical', 'escalation'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f
                                            ? 'bg-neuro text-white'
                                            : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                                            }`}
                                    >
                                        {f === 'all' ? 'All' : f === 'critical' ? 'Urgent' : 'Escalation'}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={analyzeTickets}
                                disabled={analyzing}
                                className="px-4 py-2 bg-neuro text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neuro/90 disabled:opacity-50"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-4 w-4" />
                                        Analyze All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {analyses.length === 0 ? (
                        <div className="p-12 text-center">
                            <Brain className="h-12 w-12 text-[var(--os-text-muted)] mx-auto mb-4 opacity-50" />
                            <h4 className="font-medium text-[var(--os-text)] mb-2">No Analysis Yet</h4>
                            <p className="text-sm text-[var(--os-text-muted)] mb-4">
                                Click "Analyze All" to get AI-powered insights and suggested responses
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--os-border)]">
                            {filteredAnalyses.map((analysis) => (
                                <div
                                    key={analysis.ticketId}
                                    className="p-4 hover:bg-[var(--os-bg)]/50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedTicket(selectedTicket?.ticketId === analysis.ticketId ? null : analysis)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-mono text-neuro">#{analysis.ticketId}</span>
                                                <span className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${getUrgencyColor(analysis.urgency)}`}>
                                                    {analysis.urgency.toUpperCase()}
                                                </span>
                                                {analysis.requiresEscalation && (
                                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs font-medium rounded-full flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Escalation
                                                    </span>
                                                )}
                                                <span className="text-lg">{getSentimentIcon(analysis.sentiment)}</span>
                                            </div>
                                            <h4 className="font-medium text-[var(--os-text)] mb-1">{analysis.subject}</h4>
                                            <p className="text-sm text-[var(--os-text-muted)]">{analysis.summary}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-[var(--os-text-muted)]">{analysis.estimatedResolutionTime}</span>
                                            <ChevronRight className={`h-4 w-4 text-[var(--os-text-muted)] transition-transform ${selectedTicket?.ticketId === analysis.ticketId ? 'rotate-90' : ''}`} />
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {selectedTicket?.ticketId === analysis.ticketId && (
                                        <div className="mt-4 pt-4 border-t border-[var(--os-border)] space-y-4" onClick={e => e.stopPropagation()}>
                                            {analysis.requiresEscalation && analysis.escalationReason && (
                                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                    <p className="text-sm text-red-600 font-medium">
                                                        ⚠️ {analysis.escalationReason}
                                                    </p>
                                                </div>
                                            )}

                                            {analysis.similarResolved.length > 0 && (
                                                <div>
                                                    <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                        <Target className="h-4 w-4 text-neuro" />
                                                        Similar Resolved Tickets
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {analysis.similarResolved.map((similar) => (
                                                            <div key={similar.ticketId} className="p-3 bg-[var(--os-bg)] rounded-lg">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-mono text-neuro">#{similar.ticketId}</span>
                                                                    <span className="text-xs text-emerald-500 font-medium">{similar.similarity}% match</span>
                                                                </div>
                                                                <p className="text-xs text-[var(--os-text-muted)]">{similar.resolution.substring(0, 150)}...</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4 text-neuro" />
                                                    AI Suggested Response
                                                </h5>
                                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/30 rounded-lg">
                                                    <p className="text-sm whitespace-pre-wrap text-[var(--os-text)]">
                                                        {analysis.suggestedResponse}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => sendAiReply(analysis.ticketId)}
                                                        disabled={replyingTo === analysis.ticketId}
                                                        className="flex-1 py-2.5 bg-neuro text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-neuro/90 disabled:opacity-50"
                                                    >
                                                        {replyingTo === analysis.ticketId ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Send className="h-4 w-4" />
                                                        )}
                                                        Send AI Response
                                                    </button>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(analysis.suggestedResponse)}
                                                        className="px-4 py-2.5 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg text-sm font-medium hover:border-neuro"
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Tickets List */}
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[var(--os-border)] flex items-center gap-3">
                        <Ticket className="h-5 w-5 text-neuro" />
                        <h3 className="font-semibold">Recent Open Tickets</h3>
                        <span className="px-2 py-0.5 bg-[var(--os-bg)] text-[var(--os-text-muted)] text-xs font-medium rounded-full">
                            {tickets.length}
                        </span>
                    </div>
                    <div className="divide-y divide-[var(--os-border)]">
                        {tickets.slice(0, 10).map((ticket) => (
                            <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-[var(--os-bg)]/50">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-mono text-neuro">#{ticket.id}</span>
                                        <span className={`w-2 h-2 rounded-full ${ticket.priority === 4 ? 'bg-red-500' : ticket.priority === 3 ? 'bg-amber-500' : ticket.priority === 2 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                    </div>
                                    <h4 className="font-medium text-[var(--os-text)] text-sm">{ticket.subject}</h4>
                                    <p className="text-xs text-[var(--os-text-muted)] mt-1">
                                        {ticket.requester?.name || 'Unknown'} • {new Date(ticket.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-xs text-[var(--os-text-muted)]">
                                    {ticket.type || 'General'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
