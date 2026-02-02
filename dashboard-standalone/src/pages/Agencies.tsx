import { useState, useRef, useEffect } from 'react';
import {
    Users,
    Search,
    Plus,
    MoreVertical,
    Globe,
    Eye,
    Trash2,
    ExternalLink,
    Building2,
    MapPin,
    Bot,
    Activity,
    X,
    Mail,
    Phone,
    RefreshCw,
    Pause,
    Play,
    LayoutGrid,
    List
} from 'lucide-react';

interface Agency {
    id: string;
    name: string;
    locations: number;
    status: 'Active' | 'Provisioning' | 'Paused';
    health: number;
    region: string;
    email: string;
    phone: string;
    aiStaffCount: number;
    createdAt: string;
}

const Agencies = () => {
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [agencies, setAgencies] = useState<Agency[]>([
        { id: '1', name: 'Solar Pro Systems', locations: 8, status: 'Active', health: 98, region: 'Global', email: 'admin@solarpro.com', phone: '+1 555-0201', aiStaffCount: 4, createdAt: '2025-11-15' },
        { id: '2', name: 'LIV8 Real Estate', locations: 14, status: 'Active', health: 92, region: 'North America', email: 'ops@liv8re.com', phone: '+1 555-0202', aiStaffCount: 6, createdAt: '2025-10-20' },
        { id: '3', name: 'Dental Growth Lab', locations: 5, status: 'Provisioning', health: 0, region: 'Europe', email: 'team@dentalgrowth.com', phone: '+44 20 1234 5678', aiStaffCount: 2, createdAt: '2026-01-28' },
        { id: '4', name: 'Elite HVAC Ops', locations: 12, status: 'Active', health: 95, region: 'Global', email: 'support@elitehvac.com', phone: '+1 555-0204', aiStaffCount: 5, createdAt: '2025-09-05' },
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

    const filteredAgencies = agencies.filter(agency => {
        const matchesFilter = statusFilter === 'All' || agency.status === statusFilter;
        const matchesSearch = agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agency.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleAction = (action: string, agency: Agency) => {
        setActiveMenu(null);
        setSelectedAgency(agency);

        switch (action) {
            case 'view':
                setShowDetailModal(true);
                break;
            case 'ghl':
                window.open(`https://app.gohighlevel.com/location/${agency.id}`, '_blank');
                break;
            case 'pause':
                setAgencies(prev => prev.map(a =>
                    a.id === agency.id ? { ...a, status: a.status === 'Paused' ? 'Active' : 'Paused' } : a
                ));
                break;
            case 'refresh':
                // Refresh agency health
                setIsLoading(true);
                setTimeout(() => {
                    setAgencies(prev => prev.map(a =>
                        a.id === agency.id ? { ...a, health: Math.min(100, a.health + 5) } : a
                    ));
                    setIsLoading(false);
                }, 1000);
                break;
            case 'delete':
                if (confirm(`Are you sure you want to remove ${agency.name}?`)) {
                    setAgencies(prev => prev.filter(a => a.id !== agency.id));
                }
                break;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-emerald-500/10 text-emerald-500';
            case 'Provisioning': return 'bg-amber-500/10 text-amber-500';
            case 'Paused': return 'bg-slate-500/10 text-slate-500';
            default: return 'bg-slate-500/10 text-slate-500';
        }
    };

    // Action Menu Component
    const ActionMenu = ({ agency }: { agency: Agency }) => (
        <div className="relative" ref={activeMenu === agency.id ? menuRef : null}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === agency.id ? null : agency.id);
                }}
                className="p-3 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro/30 transition-all"
            >
                <MoreVertical className="h-5 w-5" />
            </button>

            {activeMenu === agency.id && (
                <div className="absolute right-0 top-12 w-56 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                        <button
                            onClick={() => handleAction('view', agency)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-neuro/10 hover:text-neuro transition-all"
                        >
                            <Eye className="h-4 w-4" /> View Details
                        </button>
                        <button
                            onClick={() => handleAction('ghl', agency)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-neuro/10 hover:text-neuro transition-all"
                        >
                            <ExternalLink className="h-4 w-4" /> Open in GHL
                        </button>
                        <button
                            onClick={() => handleAction('refresh', agency)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Health
                        </button>
                        <div className="border-t border-[var(--os-border)] my-2"></div>
                        <button
                            onClick={() => handleAction('pause', agency)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-amber-500/10 hover:text-amber-500 transition-all"
                        >
                            {agency.status === 'Paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                            {agency.status === 'Paused' ? 'Resume Agency' : 'Pause Agency'}
                        </button>
                        <button
                            onClick={() => handleAction('delete', agency)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-red-500/10 hover:text-red-500 transition-all"
                        >
                            <Trash2 className="h-4 w-4" /> Remove Agency
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
                            <Users className="h-3 w-3" /> Network Orchestration
                        </p>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Agency <span className="text-neuro">Fidelity</span>
                        </h1>
                        <p className="text-[var(--os-text-muted)] text-xs font-bold mt-4">Manage multi-location sub-accounts and AI staff allocation.</p>
                    </div>
                    <button
                        onClick={() => setShowOnboardModal(true)}
                        className="h-14 px-8 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-neuro/20 flex items-center gap-3 hover:scale-105 transition-transform"
                    >
                        <Plus className="h-4 w-4" /> Onboard Agency
                    </button>
                </header>

                <div className="flex items-center justify-between gap-6">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl pl-14 pr-6 py-3.5 text-sm font-bold focus:border-neuro outline-none transition-all"
                            placeholder="Search network nodes..."
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-[var(--os-surface)] p-1 rounded-xl border border-[var(--os-border)]">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex bg-[var(--os-surface)] p-1.5 rounded-2xl border border-[var(--os-border)]">
                            {['All', 'Active', 'Provisioning'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setStatusFilter(cat)}
                                    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === cat ? 'bg-neuro text-white shadow-lg' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredAgencies.map((agency) => (
                            <div
                                key={agency.id}
                                onClick={() => { setSelectedAgency(agency); setShowDetailModal(true); }}
                                className="os-card p-6 flex items-center justify-between hover:border-neuro/30 group transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="h-14 w-14 rounded-2xl bg-neuro/10 flex items-center justify-center text-neuro group-hover:bg-neuro group-hover:text-white transition-all">
                                        <Globe className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase italic">{agency.name}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">
                                            <span>{agency.locations} Locations Linked</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>{agency.region}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden md:block">
                                        <div className="text-[9px] font-black text-[var(--os-text-muted)] uppercase tracking-widest mb-1">Health</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-1.5 bg-[var(--os-bg)] rounded-full border border-[var(--os-border)] overflow-hidden">
                                                <div className={`h-full ${agency.health > 80 ? 'bg-emerald-500' : agency.health > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${agency.health}%` }}></div>
                                            </div>
                                            <span className={`text-xs font-black ${agency.health > 80 ? 'text-emerald-500' : agency.health > 50 ? 'text-amber-500' : 'text-red-500'}`}>{agency.health}%</span>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${getStatusColor(agency.status)}`}>
                                        {agency.status}
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <ActionMenu agency={agency} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAgencies.map((agency) => (
                            <div
                                key={agency.id}
                                onClick={() => { setSelectedAgency(agency); setShowDetailModal(true); }}
                                className="os-card p-6 hover:border-neuro/30 group transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-12 w-12 rounded-2xl bg-neuro/10 flex items-center justify-center text-neuro group-hover:bg-neuro group-hover:text-white transition-all">
                                        <Globe className="h-6 w-6" />
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <ActionMenu agency={agency} />
                                    </div>
                                </div>
                                <h3 className="text-lg font-black uppercase">{agency.name}</h3>
                                <p className="text-[10px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-1">{agency.region}</p>

                                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--os-border)]">
                                    <div>
                                        <div className="text-[9px] font-black text-[var(--os-text-muted)] uppercase">Locations</div>
                                        <div className="text-lg font-black">{agency.locations}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-[var(--os-text-muted)] uppercase">AI Staff</div>
                                        <div className="text-lg font-black text-neuro">{agency.aiStaffCount}</div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-[var(--os-border)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-black text-[var(--os-text-muted)] uppercase">Health</span>
                                        <span className={`text-xs font-black ${agency.health > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{agency.health}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[var(--os-bg)] rounded-full border border-[var(--os-border)] overflow-hidden">
                                        <div className={`h-full ${agency.health > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${agency.health}%` }}></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${getStatusColor(agency.status)}`}>
                                        {agency.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredAgencies.length === 0 && (
                    <div className="text-center py-20">
                        <Building2 className="h-16 w-16 text-[var(--os-text-muted)] mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-bold text-[var(--os-text-muted)]">No agencies found</p>
                        <p className="text-sm text-[var(--os-text-muted)] mt-2">Try adjusting your filters or search query</p>
                    </div>
                )}
            </div>

            {/* Agency Detail Modal */}
            {showDetailModal && selectedAgency && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-[var(--os-surface)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between bg-[var(--os-bg)]">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro">
                                    <Globe className="h-7 w-7" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase">{selectedAgency.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${getStatusColor(selectedAgency.status)}`}>
                                            {selectedAgency.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-[var(--os-text-muted)]">{selectedAgency.region}</span>
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
                            <div className="grid grid-cols-3 gap-4">
                                <div className="os-card p-4 text-center">
                                    <MapPin className="h-5 w-5 text-neuro mx-auto mb-2" />
                                    <div className="text-2xl font-black text-neuro">{selectedAgency.locations}</div>
                                    <div className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">Locations</div>
                                </div>
                                <div className="os-card p-4 text-center">
                                    <Bot className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                                    <div className="text-2xl font-black text-emerald-500">{selectedAgency.aiStaffCount}</div>
                                    <div className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">AI Staff</div>
                                </div>
                                <div className="os-card p-4 text-center">
                                    <Activity className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                                    <div className="text-2xl font-black text-amber-500">{selectedAgency.health}%</div>
                                    <div className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">Health</div>
                                </div>
                            </div>

                            <div className="os-card p-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-neuro mb-3">Contact Information</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-[var(--os-text-muted)]" />
                                        <span className="text-sm">{selectedAgency.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-[var(--os-text-muted)]" />
                                        <span className="text-sm">{selectedAgency.phone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--os-border)]">
                                <button
                                    onClick={() => { setShowDetailModal(false); handleAction('ghl', selectedAgency); }}
                                    className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-neuro/10 text-neuro hover:bg-neuro hover:text-white transition-all font-bold text-xs uppercase"
                                >
                                    <ExternalLink className="h-4 w-4" /> Open in GHL
                                </button>
                                <button
                                    onClick={() => { setShowDetailModal(false); handleAction('pause', selectedAgency); }}
                                    className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all font-bold text-xs uppercase"
                                >
                                    {selectedAgency.status === 'Paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                    {selectedAgency.status === 'Paused' ? 'Resume' : 'Pause'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Onboard Agency Modal */}
            {showOnboardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[var(--os-surface)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Plus className="h-5 w-5 text-neuro" />
                                <h3 className="text-lg font-black uppercase">Onboard New Agency</h3>
                            </div>
                            <button onClick={() => setShowOnboardModal(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target as HTMLFormElement);
                                const newAgency: Agency = {
                                    id: String(Date.now()),
                                    name: formData.get('name') as string,
                                    email: formData.get('email') as string,
                                    phone: formData.get('phone') as string,
                                    region: formData.get('region') as string,
                                    locations: 0,
                                    status: 'Provisioning',
                                    health: 0,
                                    aiStaffCount: 0,
                                    createdAt: new Date().toISOString().split('T')[0]
                                };
                                setAgencies(prev => [newAgency, ...prev]);
                                setShowOnboardModal(false);
                            }}
                            className="p-6 space-y-4"
                        >
                            <div>
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Agency Name</label>
                                <input
                                    name="name"
                                    required
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                    placeholder="e.g. Elite Marketing Co"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Email</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                        placeholder="admin@agency.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Phone</label>
                                    <input
                                        name="phone"
                                        required
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                        placeholder="+1 555-0000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Region</label>
                                <select
                                    name="region"
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                >
                                    <option>North America</option>
                                    <option>Europe</option>
                                    <option>Asia Pacific</option>
                                    <option>Global</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full h-12 bg-neuro text-white rounded-xl font-black text-xs uppercase tracking-widest mt-4 hover:scale-[1.02] transition-transform"
                            >
                                Start Provisioning
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Agencies;
