import { useState, useRef, useEffect } from 'react';
import {
    Target,
    Search,
    MessageCircle,
    MoreVertical,
    Sparkles,
    Phone,
    Mail,
    MessageSquare,
    Calendar,
    User,
    DollarSign,
    Clock,
    ArrowRight,
    X,
    GripVertical,
    Plus,
    ChevronDown,
    Send,
    Edit3,
    Trash2,
    Eye,
    ExternalLink,
    LayoutGrid,
    List
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface Opportunity {
    id: string;
    name: string;
    email: string;
    phone: string;
    value: number;
    sentiment: string;
    status: 'Hot' | 'Warm' | 'Cold' | 'Won' | 'Lost';
    lastAction: string;
    lastActionTime: string;
    source: string;
    notes: string;
    tags: string[];
}

const Opportunities = () => {
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showQuickSMS, setShowQuickSMS] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Sample opportunities data
    const [opportunities, setOpportunities] = useState<Opportunity[]>([
        { id: '1', name: 'James Wilson', email: 'james@example.com', phone: '+1 555-0101', value: 2400, sentiment: 'Highly Interested', status: 'Hot', lastAction: 'AI Receptionist Handled Call', lastActionTime: '2h ago', source: 'Website Form', notes: 'Ready to close, needs pricing sheet', tags: ['priority', 'enterprise'] },
        { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', phone: '+1 555-0102', value: 4800, sentiment: 'Questioning Pricing', status: 'Warm', lastAction: 'Recovery Agent Sent SMS', lastActionTime: '4h ago', source: 'Referral', notes: 'Follow up with case study', tags: ['follow-up'] },
        { id: '3', name: 'Mike Ross', email: 'mike@example.com', phone: '+1 555-0103', value: 1200, sentiment: 'Ready to Book', status: 'Hot', lastAction: 'Appointment Setter Mapping Calendar', lastActionTime: '1h ago', source: 'LinkedIn', notes: 'Prefers afternoon calls', tags: ['priority'] },
        { id: '4', name: 'Elena Rodriguez', email: 'elena@example.com', phone: '+1 555-0104', value: 3500, sentiment: 'Busy / Follow-up', status: 'Cold', lastAction: 'System Monitoring Active', lastActionTime: '1d ago', source: 'Cold Outreach', notes: 'CEO, decision maker', tags: ['executive'] },
        { id: '5', name: 'David Kim', email: 'david@example.com', phone: '+1 555-0105', value: 6200, sentiment: 'Negotiating', status: 'Warm', lastAction: 'Proposal Sent', lastActionTime: '3h ago', source: 'Trade Show', notes: 'Wants custom package', tags: ['enterprise', 'custom'] },
        { id: '6', name: 'Lisa Park', email: 'lisa@example.com', phone: '+1 555-0106', value: 8500, sentiment: 'Contract Review', status: 'Hot', lastAction: 'Contract Uploaded', lastActionTime: '30m ago', source: 'Partner Referral', notes: 'Legal review in progress', tags: ['closing', 'enterprise'] },
    ]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter opportunities
    const filteredOpportunities = opportunities.filter(opp => {
        const matchesFilter = filter === 'All' || opp.status === filter;
        const matchesSearch = opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opp.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Group by status for kanban
    const kanbanColumns = [
        { id: 'Cold', title: 'Cold', color: 'blue', items: filteredOpportunities.filter(o => o.status === 'Cold') },
        { id: 'Warm', title: 'Warm', color: 'amber', items: filteredOpportunities.filter(o => o.status === 'Warm') },
        { id: 'Hot', title: 'Hot', color: 'emerald', items: filteredOpportunities.filter(o => o.status === 'Hot') },
        { id: 'Won', title: 'Won', color: 'green', items: filteredOpportunities.filter(o => o.status === 'Won') },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Hot': return 'bg-emerald-500 text-white';
            case 'Warm': return 'bg-amber-500 text-white';
            case 'Cold': return 'bg-blue-500 text-white';
            case 'Won': return 'bg-green-600 text-white';
            case 'Lost': return 'bg-red-500 text-white';
            default: return 'bg-slate-500 text-white';
        }
    };

    const openOpportunityDetail = (opp: Opportunity) => {
        setSelectedOpp(opp);
        setShowDetailModal(true);
        setActiveMenu(null);
    };

    const handleQuickAction = (action: string, opp: Opportunity) => {
        setSelectedOpp(opp);
        setActiveMenu(null);

        switch (action) {
            case 'sms':
                setShowQuickSMS(true);
                break;
            case 'call':
                window.open(`tel:${opp.phone}`, '_self');
                break;
            case 'email':
                window.open(`mailto:${opp.email}?subject=Following up on your inquiry`, '_blank');
                break;
            case 'view':
                openOpportunityDetail(opp);
                break;
            case 'move':
                // Move to next stage
                const stages: Opportunity['status'][] = ['Cold', 'Warm', 'Hot', 'Won'];
                const currentIndex = stages.indexOf(opp.status);
                if (currentIndex < stages.length - 1) {
                    setOpportunities(prev => prev.map(o =>
                        o.id === opp.id ? { ...o, status: stages[currentIndex + 1] } : o
                    ));
                }
                break;
        }
    };

    const sendSMS = async () => {
        if (!selectedOpp || !smsMessage.trim()) return;
        setSendingMessage(true);

        try {
            // Call backend to send SMS
            const token = localStorage.getItem('os_token');
            await fetch(`${API_BASE}/api/operator/send-sms`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contactId: selectedOpp.id,
                    phone: selectedOpp.phone,
                    message: smsMessage
                })
            });

            // Update last action
            setOpportunities(prev => prev.map(o =>
                o.id === selectedOpp.id
                    ? { ...o, lastAction: 'Manual SMS Sent', lastActionTime: 'Just now' }
                    : o
            ));

            setSmsMessage('');
            setShowQuickSMS(false);
        } catch (error) {
            console.error('Failed to send SMS:', error);
        } finally {
            setSendingMessage(false);
        }
    };

    // 3-dots menu component
    const ActionMenu = ({ opp }: { opp: Opportunity }) => (
        <div className="relative" ref={activeMenu === opp.id ? menuRef : null}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === opp.id ? null : opp.id);
                }}
                className="p-3 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro/30 transition-all"
            >
                <MoreVertical className="h-5 w-5" />
            </button>

            {activeMenu === opp.id && (
                <div className="absolute right-0 top-12 w-56 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                        <button
                            onClick={() => handleQuickAction('view', opp)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-neuro/10 hover:text-neuro transition-all"
                        >
                            <Eye className="h-4 w-4" /> View Details
                        </button>
                        <button
                            onClick={() => handleQuickAction('sms', opp)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-neuro/10 hover:text-neuro transition-all"
                        >
                            <MessageSquare className="h-4 w-4" /> Send SMS
                        </button>
                        <button
                            onClick={() => handleQuickAction('call', opp)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                        >
                            <Phone className="h-4 w-4" /> Call Now
                        </button>
                        <button
                            onClick={() => handleQuickAction('email', opp)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-neuro/10 hover:text-neuro transition-all"
                        >
                            <Mail className="h-4 w-4" /> Send Email
                        </button>
                        <div className="border-t border-[var(--os-border)] my-2"></div>
                        <button
                            onClick={() => handleQuickAction('move', opp)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-amber-500/10 hover:text-amber-500 transition-all"
                        >
                            <ArrowRight className="h-4 w-4" /> Move to Next Stage
                        </button>
                        <button
                            onClick={() => window.open(`https://app.gohighlevel.com/contacts/${opp.id}`, '_blank')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-neuro/10 hover:text-neuro transition-all"
                        >
                            <ExternalLink className="h-4 w-4" /> Open in GHL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-y-auto custom-scrollbar transition-colors duration-500">
            <div className="p-10 space-y-8 relative z-10">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Target className="h-3 w-3" /> Revenue Orchestration
                        </p>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Opportunities <span className="text-neuro">Pipeline</span>
                        </h1>
                        <p className="text-[var(--os-text-muted)] text-xs font-bold mt-4">Leads categorized and nurtured via real-time neural sentiment detection.</p>
                    </div>
                    <button className="h-12 px-6 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-neuro/20 flex items-center gap-2 hover:scale-105 transition-transform">
                        <Plus className="h-4 w-4" /> Add Lead
                    </button>
                </header>

                {/* Filters & View Toggle */}
                <div className="flex items-center justify-between gap-6">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl pl-14 pr-6 py-3.5 text-sm font-bold focus:border-neuro outline-none transition-all"
                            placeholder="Search leads..."
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-[var(--os-surface)] p-1 rounded-xl border border-[var(--os-border)]">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex bg-[var(--os-surface)] p-1.5 rounded-2xl border border-[var(--os-border)]">
                            {['All', 'Hot', 'Warm', 'Cold'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === cat ? 'bg-neuro text-white shadow-lg' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Kanban View */}
                {viewMode === 'kanban' && (
                    <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                        {kanbanColumns.map((column) => (
                            <div key={column.id} className="flex-shrink-0 w-80">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full bg-${column.color}-500`}></div>
                                        <span className="text-sm font-black uppercase tracking-tight">{column.title}</span>
                                        <span className="text-[10px] font-bold text-[var(--os-text-muted)] bg-[var(--os-surface)] px-2.5 py-1 rounded-lg">
                                            {column.items.length}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black text-neuro">
                                        ${column.items.reduce((sum, o) => sum + o.value, 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {column.items.map((opp) => (
                                        <div
                                            key={opp.id}
                                            onClick={() => openOpportunityDetail(opp)}
                                            className="os-card p-5 cursor-pointer hover:shadow-lg hover:border-neuro/30 transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro text-xs font-black">
                                                        {opp.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold">{opp.name}</h4>
                                                        <p className="text-[9px] text-[var(--os-text-muted)]">{opp.source}</p>
                                                    </div>
                                                </div>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <ActionMenu opp={opp} />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-lg font-black text-neuro">${opp.value.toLocaleString()}</span>
                                                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase ${getStatusColor(opp.status)}`}>
                                                    {opp.sentiment.slice(0, 15)}...
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] text-[var(--os-text-muted)]">
                                                <Sparkles className="h-3 w-3 text-neuro" />
                                                <span className="truncate">{opp.lastAction}</span>
                                                <span className="text-[var(--os-border)]">•</span>
                                                <span>{opp.lastActionTime}</span>
                                            </div>
                                            {/* Quick Action Buttons on Hover */}
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--os-border)] opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickAction('sms', opp); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neuro/10 text-neuro text-[9px] font-bold hover:bg-neuro hover:text-white transition-all"
                                                >
                                                    <MessageSquare className="h-3 w-3" /> SMS
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickAction('call', opp); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-bold hover:bg-emerald-500 hover:text-white transition-all"
                                                >
                                                    <Phone className="h-3 w-3" /> Call
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickAction('email', opp); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/10 text-amber-500 text-[9px] font-bold hover:bg-amber-500 hover:text-white transition-all"
                                                >
                                                    <Mail className="h-3 w-3" /> Email
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {column.items.length === 0 && (
                                        <div className="p-8 text-center border-2 border-dashed border-[var(--os-border)] rounded-2xl">
                                            <p className="text-[10px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">No leads</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredOpportunities.map((opp) => (
                            <div
                                key={opp.id}
                                onClick={() => openOpportunityDetail(opp)}
                                className="os-card p-6 flex items-center justify-between hover:border-neuro/30 group transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="h-14 w-14 rounded-2xl bg-[var(--os-surface)] border border-[var(--os-border)] flex items-center justify-center text-neuro text-lg font-black group-hover:scale-110 transition-transform">
                                        {opp.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase">{opp.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-[var(--os-text-muted)] uppercase tracking-widest">${opp.value.toLocaleString()} Value</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-[10px] font-bold text-neuro">{opp.sentiment}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 relative z-10">
                                    <div className="text-right hidden md:block">
                                        <div className="text-[9px] font-black text-[var(--os-text-muted)] uppercase tracking-widest mb-1">Last AI Protocol</div>
                                        <div className="text-xs font-bold flex items-center gap-2 justify-end">
                                            <Sparkles className="h-3 w-3 text-neuro" /> {opp.lastAction}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 px-5 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${getStatusColor(opp.status)}`}>
                                            {opp.status}
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <ActionMenu opp={opp} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Opportunity Detail Modal */}
            {showDetailModal && selectedOpp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-[var(--os-surface)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between bg-[var(--os-bg)]">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro text-xl font-black">
                                    {selectedOpp.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase">{selectedOpp.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${getStatusColor(selectedOpp.status)}`}>
                                            {selectedOpp.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-[var(--os-text-muted)]">{selectedOpp.source}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-3 hover:bg-[var(--os-surface)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Contact Info */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="os-card p-4 text-center">
                                    <DollarSign className="h-5 w-5 text-neuro mx-auto mb-2" />
                                    <div className="text-2xl font-black text-neuro">${selectedOpp.value.toLocaleString()}</div>
                                    <div className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">Deal Value</div>
                                </div>
                                <div className="os-card p-4 text-center">
                                    <Phone className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                                    <div className="text-sm font-bold">{selectedOpp.phone}</div>
                                    <div className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">Phone</div>
                                </div>
                                <div className="os-card p-4 text-center">
                                    <Mail className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                                    <div className="text-sm font-bold truncate">{selectedOpp.email}</div>
                                    <div className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">Email</div>
                                </div>
                            </div>

                            {/* Sentiment & Last Action */}
                            <div className="os-card p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <Sparkles className="h-4 w-4 text-neuro" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neuro">AI Analysis</span>
                                </div>
                                <p className="text-sm font-bold mb-2">Sentiment: <span className="text-neuro">{selectedOpp.sentiment}</span></p>
                                <p className="text-xs text-[var(--os-text-muted)]">
                                    Last Action: {selectedOpp.lastAction} • {selectedOpp.lastActionTime}
                                </p>
                            </div>

                            {/* Notes */}
                            <div className="os-card p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <Edit3 className="h-4 w-4 text-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Notes</span>
                                </div>
                                <p className="text-sm">{selectedOpp.notes}</p>
                            </div>

                            {/* Tags */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {selectedOpp.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-neuro/10 text-neuro text-[9px] font-black uppercase tracking-widest">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-4 gap-3 pt-4 border-t border-[var(--os-border)]">
                                <button
                                    onClick={() => { setShowDetailModal(false); handleQuickAction('sms', selectedOpp); }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-neuro/10 text-neuro hover:bg-neuro hover:text-white transition-all"
                                >
                                    <MessageSquare className="h-5 w-5" />
                                    <span className="text-[9px] font-black uppercase">SMS</span>
                                </button>
                                <button
                                    onClick={() => handleQuickAction('call', selectedOpp)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                                >
                                    <Phone className="h-5 w-5" />
                                    <span className="text-[9px] font-black uppercase">Call</span>
                                </button>
                                <button
                                    onClick={() => handleQuickAction('email', selectedOpp)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"
                                >
                                    <Mail className="h-5 w-5" />
                                    <span className="text-[9px] font-black uppercase">Email</span>
                                </button>
                                <button
                                    onClick={() => window.open(`https://app.gohighlevel.com/contacts/${selectedOpp.id}`, '_blank')}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-500/10 text-slate-500 hover:bg-slate-500 hover:text-white transition-all"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                    <span className="text-[9px] font-black uppercase">GHL</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick SMS Modal */}
            {showQuickSMS && selectedOpp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[var(--os-surface)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-[var(--os-border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="h-5 w-5 text-neuro" />
                                <h3 className="text-sm font-black uppercase">Send SMS to {selectedOpp.name}</h3>
                            </div>
                            <button onClick={() => setShowQuickSMS(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="text-[10px] font-bold text-[var(--os-text-muted)] mb-2">To: {selectedOpp.phone}</div>
                            <textarea
                                value={smsMessage}
                                onChange={(e) => setSmsMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="w-full h-32 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 text-sm resize-none focus:border-neuro outline-none"
                            />
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-[10px] text-[var(--os-text-muted)]">{smsMessage.length}/160 characters</span>
                                <button
                                    onClick={sendSMS}
                                    disabled={!smsMessage.trim() || sendingMessage}
                                    className="h-10 px-6 bg-neuro text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-all"
                                >
                                    {sendingMessage ? 'Sending...' : <><Send className="h-4 w-4" /> Send</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Opportunities;
