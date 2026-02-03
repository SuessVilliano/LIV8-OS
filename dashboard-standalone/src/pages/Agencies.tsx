import { useState, useRef, useEffect, useCallback } from 'react';
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
    List,
    Shield,
    CheckCircle,
    AlertCircle,
    Settings,
    Brain
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface AgencyPermissions {
    canAccessAnalytics: boolean;
    canManageStaff: boolean;
    canEditBrandBrain: boolean;
    canAccessStudio: boolean;
    canManageOpportunities: boolean;
    canAccessWorkflows: boolean;
    maxLocations: number;
    maxAiStaff: number;
}

interface Agency {
    id: string;
    name: string;
    locations: number;
    status: 'Active' | 'Provisioning' | 'Paused' | 'Error';
    health: number;
    region: string;
    email: string;
    phone: string;
    aiStaffCount: number;
    createdAt: string;
    ghlLocationId?: string;
    vboutAccountId?: string;
    permissions?: AgencyPermissions;
    brandBrainId?: string;
}

const DEFAULT_PERMISSIONS: AgencyPermissions = {
    canAccessAnalytics: true,
    canManageStaff: true,
    canEditBrandBrain: true,
    canAccessStudio: true,
    canManageOpportunities: true,
    canAccessWorkflows: true,
    maxLocations: 10,
    maxAiStaff: 5
};

const Agencies = () => {
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provisioningStatus, setProvisioningStatus] = useState<{ task: string; success: boolean; message?: string }[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const [agencies, setAgencies] = useState<Agency[]>([]);

    // Fetch agencies from API
    const fetchAgencies = useCallback(async () => {
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/agency/list`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAgencies(data.agencies);
                }
            }
        } catch (error) {
            console.error('Failed to fetch agencies:', error);
            // Use demo data on error
            setAgencies([
                { id: '1', name: 'Solar Pro Systems', locations: 8, status: 'Active', health: 98, region: 'Global', email: 'admin@solarpro.com', phone: '+1 555-0201', aiStaffCount: 4, createdAt: '2025-11-15', permissions: DEFAULT_PERMISSIONS },
                { id: '2', name: 'LIV8 Real Estate', locations: 14, status: 'Active', health: 92, region: 'North America', email: 'ops@liv8re.com', phone: '+1 555-0202', aiStaffCount: 6, createdAt: '2025-10-20', permissions: DEFAULT_PERMISSIONS },
                { id: '3', name: 'Dental Growth Lab', locations: 5, status: 'Provisioning', health: 0, region: 'Europe', email: 'team@dentalgrowth.com', phone: '+44 20 1234 5678', aiStaffCount: 2, createdAt: '2026-01-28', permissions: DEFAULT_PERMISSIONS },
                { id: '4', name: 'Elite HVAC Ops', locations: 12, status: 'Active', health: 95, region: 'Global', email: 'support@elitehvac.com', phone: '+1 555-0204', aiStaffCount: 5, createdAt: '2025-09-05', permissions: DEFAULT_PERMISSIONS },
            ]);
        } finally {
            setIsFetching(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchAgencies();
    }, [fetchAgencies]);

    // Provision new agency
    const provisionAgency = async (agencyData: {
        name: string;
        email: string;
        phone: string;
        region: string;
        ghlLocationId?: string;
        syncBrandBrain?: boolean;
    }) => {
        setIsProvisioning(true);
        setProvisioningStatus([]);

        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/agency/provision`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...agencyData,
                    permissions: DEFAULT_PERMISSIONS
                })
            });

            const data = await response.json();

            if (data.success) {
                setProvisioningStatus(data.provisioning?.tasks || []);

                // Add to local list
                const newAgency: Agency = {
                    id: data.agency.id,
                    name: data.agency.name,
                    email: data.agency.email,
                    phone: data.agency.phone || '',
                    region: data.agency.region,
                    locations: 0,
                    status: data.agency.status,
                    health: data.agency.health,
                    aiStaffCount: 0,
                    createdAt: new Date().toISOString().split('T')[0],
                    permissions: data.agency.permissions || DEFAULT_PERMISSIONS
                };

                setAgencies(prev => [newAgency, ...prev]);

                // Close modal after short delay to show success
                setTimeout(() => {
                    setShowOnboardModal(false);
                    setProvisioningStatus([]);
                }, 2000);
            } else {
                setProvisioningStatus([{ task: 'provisioning', success: false, message: data.error }]);
            }
        } catch (error: any) {
            setProvisioningStatus([{ task: 'provisioning', success: false, message: error.message }]);
        } finally {
            setIsProvisioning(false);
        }
    };

    // Update agency permissions
    const updatePermissions = async (agencyId: string, permissions: AgencyPermissions) => {
        try {
            const token = localStorage.getItem('os_token');
            await fetch(`${API_BASE}/api/agency/${agencyId}/permissions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ permissions })
            });

            // Update local state
            setAgencies(prev => prev.map(a =>
                a.id === agencyId ? { ...a, permissions } : a
            ));

            setShowPermissionsModal(false);
        } catch (error) {
            console.error('Failed to update permissions:', error);
        }
    };

    // Sync Brand Brain to agency
    const syncBrandBrain = async (agencyId: string) => {
        try {
            const token = localStorage.getItem('os_token');
            await fetch(`${API_BASE}/api/agency/${agencyId}/sync-brand-brain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Show success feedback
            alert('Brand Brain synced to agency successfully!');
        } catch (error) {
            console.error('Failed to sync Brand Brain:', error);
        }
    };

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

    const handleAction = async (action: string, agency: Agency) => {
        setActiveMenu(null);
        setSelectedAgency(agency);

        const token = localStorage.getItem('os_token');

        switch (action) {
            case 'view':
                setShowDetailModal(true);
                break;
            case 'ghl':
                window.open(`https://app.gohighlevel.com/location/${agency.ghlLocationId || agency.id}`, '_blank');
                break;
            case 'permissions':
                setShowPermissionsModal(true);
                break;
            case 'sync-brain':
                await syncBrandBrain(agency.id);
                break;
            case 'pause':
                const newStatus = agency.status === 'Paused' ? 'Active' : 'Paused';
                try {
                    await fetch(`${API_BASE}/api/agency/${agency.id}/status`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: newStatus })
                    });
                } catch (e) {
                    console.error('Failed to update status:', e);
                }
                setAgencies(prev => prev.map(a =>
                    a.id === agency.id ? { ...a, status: newStatus as Agency['status'] } : a
                ));
                break;
            case 'refresh':
                // Refresh agency health
                setIsLoading(true);
                try {
                    const response = await fetch(`${API_BASE}/api/agency/${agency.id}/health`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        setAgencies(prev => prev.map(a =>
                            a.id === agency.id ? { ...a, health: data.health.overallHealth } : a
                        ));
                    }
                } catch (e) {
                    // Fallback to simulated health increase
                    setAgencies(prev => prev.map(a =>
                        a.id === agency.id ? { ...a, health: Math.min(100, a.health + 5) } : a
                    ));
                }
                setIsLoading(false);
                break;
            case 'delete':
                if (confirm(`Are you sure you want to remove ${agency.name}?`)) {
                    try {
                        await fetch(`${API_BASE}/api/agency/${agency.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    } catch (e) {
                        console.error('Failed to delete agency:', e);
                    }
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
                            onClick={() => handleAction('permissions', agency)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-violet-500/10 hover:text-violet-500 transition-all"
                        >
                            <Shield className="h-4 w-4" /> Manage Permissions
                        </button>
                        <button
                            onClick={() => handleAction('sync-brain', agency)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-cyan-500/10 hover:text-cyan-500 transition-all"
                        >
                            <Brain className="h-4 w-4" /> Sync Brand Brain
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
                            <button onClick={() => { setShowOnboardModal(false); setProvisioningStatus([]); }} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target as HTMLFormElement);
                                provisionAgency({
                                    name: formData.get('name') as string,
                                    email: formData.get('email') as string,
                                    phone: formData.get('phone') as string,
                                    region: formData.get('region') as string,
                                    ghlLocationId: formData.get('ghlLocationId') as string || undefined,
                                    syncBrandBrain: formData.get('syncBrandBrain') === 'on'
                                });
                            }}
                            className="p-6 space-y-4"
                        >
                            <div>
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Agency Name *</label>
                                <input
                                    name="name"
                                    required
                                    disabled={isProvisioning}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none disabled:opacity-50"
                                    placeholder="e.g. Elite Marketing Co"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Email *</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        disabled={isProvisioning}
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none disabled:opacity-50"
                                        placeholder="admin@agency.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Phone</label>
                                    <input
                                        name="phone"
                                        disabled={isProvisioning}
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none disabled:opacity-50"
                                        placeholder="+1 555-0000"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Region</label>
                                    <select
                                        name="region"
                                        disabled={isProvisioning}
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none disabled:opacity-50"
                                    >
                                        <option>North America</option>
                                        <option>Europe</option>
                                        <option>Asia Pacific</option>
                                        <option>Global</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">GHL Location ID</label>
                                    <input
                                        name="ghlLocationId"
                                        disabled={isProvisioning}
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none disabled:opacity-50"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)]">
                                <input
                                    type="checkbox"
                                    name="syncBrandBrain"
                                    id="syncBrandBrain"
                                    defaultChecked
                                    disabled={isProvisioning}
                                    className="w-4 h-4 rounded border-[var(--os-border)] text-neuro focus:ring-neuro"
                                />
                                <label htmlFor="syncBrandBrain" className="flex-1">
                                    <span className="text-sm font-bold">Sync Brand Brain</span>
                                    <span className="text-[10px] text-[var(--os-text-muted)] block">Clone your brand context to this agency</span>
                                </label>
                                <Brain className="h-5 w-5 text-neuro" />
                            </div>

                            {/* Provisioning Status */}
                            {provisioningStatus.length > 0 && (
                                <div className="space-y-2 p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)]">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-3">Provisioning Status</div>
                                    {provisioningStatus.map((status, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            {status.success ? (
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className={status.success ? 'text-emerald-500' : 'text-red-500'}>
                                                {status.task}: {status.success ? 'Success' : status.message || 'Failed'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isProvisioning}
                                className="w-full h-12 bg-neuro text-white rounded-xl font-black text-xs uppercase tracking-widest mt-4 hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProvisioning ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" /> Provisioning...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" /> Start Provisioning
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {showPermissionsModal && selectedAgency && (
                <PermissionsModal
                    agency={selectedAgency}
                    onClose={() => setShowPermissionsModal(false)}
                    onSave={(permissions) => updatePermissions(selectedAgency.id, permissions)}
                />
            )}
        </div>
    );
};

// Permissions Modal Component
const PermissionsModal = ({
    agency,
    onClose,
    onSave
}: {
    agency: Agency;
    onClose: () => void;
    onSave: (permissions: AgencyPermissions) => void;
}) => {
    const [permissions, setPermissions] = useState<AgencyPermissions>(
        agency.permissions || DEFAULT_PERMISSIONS
    );

    const togglePermission = (key: keyof AgencyPermissions) => {
        if (typeof permissions[key] === 'boolean') {
            setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-[var(--os-surface)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between bg-[var(--os-bg)]">
                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-violet-500" />
                        <div>
                            <h3 className="text-lg font-black uppercase">Manage Permissions</h3>
                            <p className="text-[10px] text-[var(--os-text-muted)]">{agency.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--os-surface)] rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        {[
                            { key: 'canAccessAnalytics', label: 'Access Analytics', desc: 'View performance metrics and reports' },
                            { key: 'canManageStaff', label: 'Manage AI Staff', desc: 'Create and configure AI agents' },
                            { key: 'canEditBrandBrain', label: 'Edit Brand Brain', desc: 'Modify brand context and knowledge' },
                            { key: 'canAccessStudio', label: 'Access Studio', desc: 'Use content creation tools' },
                            { key: 'canManageOpportunities', label: 'Manage Opportunities', desc: 'View and edit pipeline' },
                            { key: 'canAccessWorkflows', label: 'Access Workflows', desc: 'Create and run automations' },
                        ].map(({ key, label, desc }) => (
                            <div
                                key={key}
                                onClick={() => togglePermission(key as keyof AgencyPermissions)}
                                className="flex items-center gap-4 p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)] cursor-pointer hover:border-violet-500/30 transition-all"
                            >
                                <div className={`w-10 h-6 rounded-full transition-colors ${
                                    permissions[key as keyof AgencyPermissions] ? 'bg-violet-500' : 'bg-[var(--os-border)]'
                                }`}>
                                    <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${
                                        permissions[key as keyof AgencyPermissions] ? 'translate-x-[18px]' : 'translate-x-0.5'
                                    }`} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold">{label}</div>
                                    <div className="text-[10px] text-[var(--os-text-muted)]">{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--os-border)]">
                        <div>
                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Max Locations</label>
                            <input
                                type="number"
                                value={permissions.maxLocations}
                                onChange={(e) => setPermissions(prev => ({ ...prev, maxLocations: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-violet-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Max AI Staff</label>
                            <input
                                type="number"
                                value={permissions.maxAiStaff}
                                onChange={(e) => setPermissions(prev => ({ ...prev, maxAiStaff: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-violet-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="h-10 px-6 border border-[var(--os-border)] rounded-xl font-bold text-xs uppercase tracking-widest hover:border-violet-500 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave(permissions)}
                            className="h-10 px-6 bg-violet-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <CheckCircle className="h-4 w-4" /> Save Permissions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Agencies;
