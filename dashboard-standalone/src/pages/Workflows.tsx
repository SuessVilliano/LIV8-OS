import { useState, useEffect } from 'react';
import {
    Workflow,
    Play,
    ExternalLink,
    Zap,
    Plus,
    X,
    Shield,
    Sparkles,
    ChevronRight,
    Activity,
    LayoutGrid,
    List,
    Table,
    Pause,
    MoreVertical,
    Copy,
    Trash2,
    Download,
    RefreshCw,
    Search,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface WorkflowItem {
    id: string;
    name: string;
    trigger: string;
    status: 'active' | 'paused' | 'draft';
    executions: number;
    latency: string;
    efficiency: number;
    type: string;
    source: 'ghl' | 'vbout' | 'template' | 'custom';
    lastRun: string;
    description?: string;
}

// Workflow templates for quick setup
const workflowTemplates = [
    { id: 't1', name: 'Lead Reactivation', description: 'Re-engage cold leads with automated sequences', trigger: 'Contact Inactive > 30d', type: 'Revenue' },
    { id: 't2', name: 'Appointment Reminder', description: 'Automated reminders before appointments', trigger: 'Appointment Scheduled', type: 'Engagement' },
    { id: 't3', name: 'Review Request', description: 'Request reviews after successful interactions', trigger: 'Opportunity Won', type: 'Reputation' },
    { id: 't4', name: 'Welcome Sequence', description: 'Onboard new contacts with email drip', trigger: 'Contact Created', type: 'Onboarding' },
    { id: 't5', name: 'Missed Call Recovery', description: 'Follow up on missed calls automatically', trigger: 'Call Missed', type: 'Recovery' },
    { id: 't6', name: 'Birthday Campaign', description: 'Send birthday wishes and offers', trigger: 'Contact Birthday', type: 'Engagement' },
];

const Workflows = () => {
    const [isArchitectOpen, setIsArchitectOpen] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'list' | 'table'>('cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [naturalPrompt, setNaturalPrompt] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const crmType = localStorage.getItem('os_crm_type') || 'liv8';

    // Generate natural language prompt for GHL AI Builder
    const generateGHLPrompt = async () => {
        if (!naturalPrompt.trim()) return;

        setIsGenerating(true);
        try {
            // Call AI to generate optimized GHL workflow prompt
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/ai/generate-workflow-prompt`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: naturalPrompt, crmType })
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedPrompt(data.ghlPrompt || generateLocalPrompt(naturalPrompt));
            } else {
                // Fallback to local generation
                setGeneratedPrompt(generateLocalPrompt(naturalPrompt));
            }
        } catch (error) {
            // Fallback to local generation
            setGeneratedPrompt(generateLocalPrompt(naturalPrompt));
        } finally {
            setIsGenerating(false);
        }
    };

    // Local prompt generation fallback
    const generateLocalPrompt = (input: string) => {
        const lowerInput = input.toLowerCase();
        let prompt = `Create an automation workflow that `;

        if (lowerInput.includes('follow up') || lowerInput.includes('followup')) {
            prompt += `automatically follows up with contacts. When a contact is added or updated, wait 24 hours then send a personalized SMS asking if they have any questions. If no response after 2 days, send an email with helpful resources. Add the contact to a follow-up pipeline stage.`;
        } else if (lowerInput.includes('appointment') || lowerInput.includes('booking')) {
            prompt += `manages appointment bookings. When an appointment is scheduled, immediately send a confirmation SMS and email with the appointment details. 24 hours before the appointment, send a reminder SMS. 1 hour before, send a final reminder. If the appointment is missed, trigger a rebooking sequence.`;
        } else if (lowerInput.includes('lead') || lowerInput.includes('new contact')) {
            prompt += `nurtures new leads. When a new contact is created, immediately send a welcome SMS introducing yourself. Wait 1 hour, then send an email with your services overview. Tag the contact as "New Lead" and assign to the appropriate pipeline. After 3 days, if no engagement, send a follow-up offer.`;
        } else if (lowerInput.includes('review') || lowerInput.includes('testimonial')) {
            prompt += `requests reviews from satisfied customers. When an opportunity is marked as Won, wait 7 days then send a thank you SMS with a review request link. If no review after 3 days, send a gentle email reminder. Award loyalty points when a review is submitted.`;
        } else if (lowerInput.includes('reactivation') || lowerInput.includes('inactive')) {
            prompt += `reactivates dormant contacts. Find contacts who haven't engaged in 30+ days and send them a "We miss you" SMS with a special offer. If they engage, move them to the active pipeline. If no response after 7 days, send a final win-back email before marking as cold.`;
        } else if (lowerInput.includes('birthday') || lowerInput.includes('anniversary')) {
            prompt += `sends birthday/anniversary wishes. On the contact's birthday, send a personalized SMS with birthday wishes and a special discount code. Follow up with an email containing an exclusive birthday offer valid for 7 days.`;
        } else {
            prompt += `${input}. Include appropriate triggers, delays, conditions, and actions. Send relevant SMS and email notifications. Update contact tags and pipeline stages as needed. Add any necessary wait steps and conditional branches.`;
        }

        return prompt;
    };

    // Copy prompt to clipboard
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const [flows, setFlows] = useState<WorkflowItem[]>([
        { id: '1', name: '7-Day Reactivation', trigger: 'Customer Inactive > 30d', status: 'active', executions: 420, latency: '0.1s', efficiency: 99.8, type: 'Revenue', source: crmType === 'ghl' ? 'ghl' : 'vbout', lastRun: '2h ago' },
        { id: '2', name: 'SEO Authority Builder', trigger: 'Blog Post Published', status: 'active', executions: 12, latency: '2.4s', efficiency: 99.8, type: 'Visibility', source: crmType === 'ghl' ? 'ghl' : 'vbout', lastRun: '1d ago' },
        { id: '3', name: 'A2P Lead Capture', trigger: 'Inbound SMS', status: 'active', executions: 1200, latency: '0.4s', efficiency: 99.8, type: 'System', source: crmType === 'ghl' ? 'ghl' : 'vbout', lastRun: '5m ago' },
        { id: '4', name: 'Review Solicitation', trigger: 'Opportunity Won', status: 'active', executions: 482, latency: '1.1s', efficiency: 99.8, type: 'Reputation', source: crmType === 'ghl' ? 'ghl' : 'vbout', lastRun: '30m ago' },
        { id: '5', name: 'Missed Call Recovery', trigger: 'Call Status: No Answer', status: 'paused', executions: 8400, latency: '0.2s', efficiency: 98.5, type: 'Recovery', source: crmType === 'ghl' ? 'ghl' : 'vbout', lastRun: '3d ago' },
    ]);

    // Fetch real workflows from backend
    useEffect(() => {
        const fetchWorkflows = async () => {
            try {
                const token = localStorage.getItem('os_token');
                const locationId = localStorage.getItem('os_loc_id');

                if (!token || !locationId) {
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);
                const response = await fetch(`${API_BASE}/api/dashboard/workflows?crm=${crmType}&locationId=${locationId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data?.workflows && Array.isArray(data.workflows) && data.workflows.length > 0) {
                        // Ensure all workflow items have required properties
                        const validWorkflows = data.workflows.filter((w: any) => w && w.id && w.name);
                        if (validWorkflows.length > 0) {
                            setFlows(validWorkflows);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch workflows:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorkflows();
    }, [crmType]);

    const filteredFlows = flows.filter(flow => {
        const matchesSearch = flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            flow.trigger.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' ||
            (statusFilter === 'Active' && flow.status === 'active') ||
            (statusFilter === 'Paused' && flow.status === 'paused');
        return matchesSearch && matchesStatus;
    });

    const handleCreateWorkflow = (newFlow: Partial<WorkflowItem>) => {
        const workflow: WorkflowItem = {
            id: String(Date.now()),
            name: newFlow.name || 'New Workflow',
            trigger: newFlow.trigger || 'Manual Trigger',
            status: 'active',
            executions: 0,
            latency: '0.1s',
            efficiency: 100,
            type: newFlow.type || 'Custom',
            source: 'custom',
            lastRun: 'Never'
        };
        setFlows([workflow, ...flows]);
        setIsArchitectOpen(false);
    };

    const handleTemplateSelect = (template: typeof workflowTemplates[0]) => {
        handleCreateWorkflow({
            name: template.name,
            trigger: template.trigger,
            type: template.type
        });
        setShowTemplates(false);
    };

    const handleAction = (action: string, flow: WorkflowItem) => {
        setActiveMenu(null);

        switch (action) {
            case 'toggle':
                setFlows(prev => prev.map(f =>
                    f.id === flow.id ? { ...f, status: f.status === 'active' ? 'paused' : 'active' } : f
                ));
                break;
            case 'duplicate':
                const duplicate: WorkflowItem = {
                    ...flow,
                    id: String(Date.now()),
                    name: `${flow.name} (Copy)`,
                    executions: 0,
                    lastRun: 'Never'
                };
                setFlows(prev => [duplicate, ...prev]);
                break;
            case 'delete':
                if (window.confirm(`Delete "${flow.name}"?`)) {
                    setFlows(prev => prev.filter(f => f.id !== flow.id));
                }
                break;
            case 'ghl':
                if (flow.source === 'ghl') {
                    window.open(`https://app.gohighlevel.com/location/current_location/workflows/automation/${flow.id}/edit`, '_blank');
                } else if (flow.source === 'vbout') {
                    window.open(`https://app.vbout.com/automation/${flow.id}`, '_blank');
                }
                break;
            case 'test':
                alert(`Testing workflow: ${flow.name}`);
                break;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500';
            case 'paused': return 'bg-amber-500/10 text-amber-500';
            case 'draft': return 'bg-slate-500/10 text-slate-500';
            default: return 'bg-slate-500/10 text-slate-500';
        }
    };

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'ghl': return { label: 'GHL', color: 'bg-blue-500/10 text-blue-500' };
            case 'vbout': return { label: 'Vbout', color: 'bg-purple-500/10 text-purple-500' };
            case 'template': return { label: 'Template', color: 'bg-neuro/10 text-neuro' };
            default: return { label: 'Custom', color: 'bg-slate-500/10 text-slate-500' };
        }
    };

    return (
        <div className="min-h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-y-auto custom-scrollbar transition-colors duration-500">
            <div className="p-10 space-y-8 relative z-10">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Workflow className="h-3 w-3" /> Logic Orchestration
                        </p>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Neural <span className="text-neuro">Flows</span>
                        </h1>
                        <p className="text-[var(--os-text-muted)] text-xs font-bold mt-4">
                            Monitor and trigger {crmType === 'ghl' ? 'GHL' : 'Vbout'} automations across your network.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowTemplates(true)}
                            className="h-14 px-6 bg-[var(--os-surface)] border border-[var(--os-border)] text-[var(--os-text)] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:border-neuro hover:text-neuro transition-all"
                        >
                            <Download className="h-4 w-4" /> Templates
                        </button>
                        <button
                            onClick={() => setIsArchitectOpen(true)}
                            className="h-14 px-8 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-neuro/20 flex items-center gap-3 hover:scale-105 transition-transform"
                        >
                            <Plus className="h-4 w-4" /> Workflow Architect
                        </button>
                    </div>
                </header>

                {/* Filters & View Toggle */}
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl pl-12 pr-6 py-3 text-sm font-bold focus:border-neuro outline-none transition-all"
                                placeholder="Search workflows..."
                            />
                        </div>
                        <div className="flex bg-[var(--os-surface)] p-1.5 rounded-xl border border-[var(--os-border)]">
                            {['All', 'Active', 'Paused'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="p-3 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro transition-all"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="flex bg-[var(--os-surface)] p-1 rounded-xl border border-[var(--os-border)]">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <Table className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cards View */}
                {viewMode === 'cards' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredFlows.map((flow) => (
                            <div key={flow.id} className="os-card p-6 hover:border-neuro/30 group transition-all relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 ${flow.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-[var(--os-bg)] flex items-center justify-center text-[var(--os-text-muted)] group-hover:text-neuro group-hover:scale-110 transition-all">
                                            <Zap className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black uppercase">{flow.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getSourceBadge(flow.source).color}`}>
                                                    {getSourceBadge(flow.source).label}
                                                </span>
                                                <span className="text-[9px] font-bold text-[var(--os-text-muted)]">Trigger: {flow.trigger}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${flow.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setActiveMenu(activeMenu === flow.id ? null : flow.id)}
                                                className="p-2 hover:bg-[var(--os-bg)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                            {activeMenu === flow.id && (
                                                <div className="absolute right-0 top-10 w-48 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in">
                                                    <div className="p-1">
                                                        <button onClick={() => handleAction('toggle', flow)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-neuro/10 hover:text-neuro">
                                                            {flow.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                                            {flow.status === 'active' ? 'Pause' : 'Activate'}
                                                        </button>
                                                        <button onClick={() => handleAction('test', flow)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-neuro/10 hover:text-neuro">
                                                            <Play className="h-3.5 w-3.5" /> Test Run
                                                        </button>
                                                        <button onClick={() => handleAction('duplicate', flow)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-neuro/10 hover:text-neuro">
                                                            <Copy className="h-3.5 w-3.5" /> Duplicate
                                                        </button>
                                                        <button onClick={() => handleAction('ghl', flow)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-neuro/10 hover:text-neuro">
                                                            <ExternalLink className="h-3.5 w-3.5" /> Open in {flow.source === 'ghl' ? 'GHL' : 'Vbout'}
                                                        </button>
                                                        <div className="border-t border-[var(--os-border)] my-1"></div>
                                                        <button onClick={() => handleAction('delete', flow)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-red-500/10 hover:text-red-500">
                                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="bg-[var(--os-bg)] p-3 rounded-xl border border-[var(--os-border)]">
                                        <div className="text-[8px] font-black text-[var(--os-text-muted)] uppercase">Executions</div>
                                        <div className="text-lg font-black">{flow.executions.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-[var(--os-bg)] p-3 rounded-xl border border-[var(--os-border)]">
                                        <div className="text-[8px] font-black text-[var(--os-text-muted)] uppercase">Latency</div>
                                        <div className="text-lg font-black">{flow.latency}</div>
                                    </div>
                                    <div className="bg-[var(--os-bg)] p-3 rounded-xl border border-[var(--os-border)]">
                                        <div className="text-[8px] font-black text-[var(--os-text-muted)] uppercase">Efficiency</div>
                                        <div className="text-lg font-black text-emerald-500">{flow.efficiency}%</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-[var(--os-text-muted)] mb-4">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last run: {flow.lastRun}</span>
                                    <span className={`px-2 py-1 rounded ${getStatusBadge(flow.status)} font-black uppercase`}>{flow.status}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleAction('test', flow)}
                                        className="flex-1 h-10 bg-neuro text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neuro-dark transition-all"
                                    >
                                        <Play className="h-3 w-3" /> Test
                                    </button>
                                    <button
                                        onClick={() => handleAction('ghl', flow)}
                                        className="px-4 h-10 bg-[var(--os-surface)] border border-[var(--os-border)] text-[var(--os-text-muted)] rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-neuro transition-all flex items-center gap-2"
                                    >
                                        <ExternalLink className="h-3 w-3" /> {flow.source === 'ghl' ? 'GHL' : 'Edit'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="space-y-3">
                        {filteredFlows.map((flow) => (
                            <div key={flow.id} className="os-card p-5 flex items-center justify-between hover:border-neuro/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${flow.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">{flow.name}</h4>
                                        <p className="text-[9px] text-[var(--os-text-muted)]">{flow.trigger}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden md:block">
                                        <div className="text-sm font-black">{flow.executions.toLocaleString()}</div>
                                        <div className="text-[9px] text-[var(--os-text-muted)]">Executions</div>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="text-sm font-black text-emerald-500">{flow.efficiency}%</div>
                                        <div className="text-[9px] text-[var(--os-text-muted)]">Efficiency</div>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${getStatusBadge(flow.status)}`}>
                                        {flow.status}
                                    </span>
                                    <button
                                        onClick={() => handleAction('ghl', flow)}
                                        className="p-2.5 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                    <div className="os-card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[var(--os-bg)] border-b border-[var(--os-border)]">
                                <tr>
                                    <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">Workflow</th>
                                    <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">Trigger</th>
                                    <th className="text-center p-4 text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">Source</th>
                                    <th className="text-center p-4 text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">Executions</th>
                                    <th className="text-center p-4 text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">Efficiency</th>
                                    <th className="text-center p-4 text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">Status</th>
                                    <th className="text-center p-4 text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFlows.map((flow) => (
                                    <tr key={flow.id} className="border-b border-[var(--os-border)] hover:bg-[var(--os-surface)]/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Zap className="h-4 w-4 text-neuro" />
                                                <span className="font-bold text-sm">{flow.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--os-text-muted)]">{flow.trigger}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${getSourceBadge(flow.source).color}`}>
                                                {getSourceBadge(flow.source).label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-bold">{flow.executions.toLocaleString()}</td>
                                        <td className="p-4 text-center font-bold text-emerald-500">{flow.efficiency}%</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${getStatusBadge(flow.status)}`}>
                                                {flow.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleAction('toggle', flow)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro">
                                                    {flow.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                                </button>
                                                <button onClick={() => handleAction('ghl', flow)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro">
                                                    <ExternalLink className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredFlows.length === 0 && (
                    <div className="text-center py-20">
                        <Workflow className="h-16 w-16 text-[var(--os-text-muted)] mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-bold text-[var(--os-text-muted)]">No workflows found</p>
                        <p className="text-sm text-[var(--os-text-muted)] mt-2">Create your first workflow or import from templates</p>
                    </div>
                )}
            </div>

            {/* Templates Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-2xl bg-[var(--os-surface)] rounded-[2rem] border border-[var(--os-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Download className="h-5 w-5 text-neuro" />
                                <h3 className="text-lg font-black uppercase">Workflow Templates</h3>
                            </div>
                            <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                            {workflowTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => handleTemplateSelect(template)}
                                    className="p-5 rounded-2xl bg-[var(--os-bg)] border border-[var(--os-border)] hover:border-neuro/50 text-left transition-all group"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-10 w-10 rounded-xl bg-neuro/10 flex items-center justify-center text-neuro group-hover:bg-neuro group-hover:text-white transition-all">
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">{template.name}</h4>
                                            <span className="text-[9px] font-black text-neuro uppercase">{template.type}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--os-text-muted)] mb-2">{template.description}</p>
                                    <p className="text-[9px] text-[var(--os-text-muted)]">Trigger: {template.trigger}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Architect Modal */}
            {isArchitectOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-[var(--os-surface)] rounded-[2rem] border border-[var(--os-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-6">
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro">
                                        <Sparkles className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase">Workflow <span className="text-neuro">Architect</span></h2>
                                        <p className="text-[10px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-1">AI-Powered Automation Builder</p>
                                    </div>
                                </div>
                                <button onClick={() => { setIsArchitectOpen(false); setNaturalPrompt(''); setGeneratedPrompt(''); }} className="p-2 text-[var(--os-text-muted)] hover:text-red-500 transition-colors">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Natural Language Prompt Section */}
                            <div className="p-5 bg-gradient-to-br from-neuro/10 to-purple-500/10 rounded-2xl border border-neuro/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4 text-neuro" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neuro">AI Workflow Generator</span>
                                    <span className="text-[9px] font-bold text-[var(--os-text-muted)] ml-auto">Compatible with GHL's "Build with AI"</span>
                                </div>
                                <p className="text-xs text-[var(--os-text-muted)] mb-4">
                                    Describe what you want your workflow to do in plain English. We'll generate an optimized prompt you can paste directly into GHL's AI Workflow Builder.
                                </p>
                                <textarea
                                    value={naturalPrompt}
                                    onChange={(e) => setNaturalPrompt(e.target.value)}
                                    placeholder="e.g., I want to automatically follow up with leads who haven't responded in 3 days, send them an SMS, then an email if they still don't respond..."
                                    className="w-full h-24 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 text-sm resize-none focus:border-neuro outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={generateGHLPrompt}
                                    disabled={!naturalPrompt.trim() || isGenerating}
                                    className="mt-3 h-10 px-5 bg-neuro text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-all"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3.5 w-3.5" /> Generate GHL Prompt
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Generated Prompt Display */}
                            {generatedPrompt && (
                                <div className="p-5 bg-[var(--os-bg)] rounded-2xl border border-[var(--os-border)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Ready for GHL</span>
                                        </div>
                                        <button
                                            onClick={copyToClipboard}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                                copied
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-neuro/10 text-neuro hover:bg-neuro hover:text-white'
                                            }`}
                                        >
                                            {copied ? (
                                                <>
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5" /> Copy Prompt
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="p-4 bg-[var(--os-surface)] rounded-xl border border-[var(--os-border)] max-h-40 overflow-y-auto">
                                        <p className="text-sm text-[var(--os-text)] leading-relaxed whitespace-pre-wrap">{generatedPrompt}</p>
                                    </div>
                                    <p className="text-[9px] text-[var(--os-text-muted)] mt-3">
                                        <strong>How to use:</strong> Copy this prompt and paste it into GHL's Workflow Builder → Click "Build with AI" → Paste and generate your workflow automatically.
                                    </p>
                                </div>
                            )}

                            <div className="border-t border-[var(--os-border)] pt-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-4">Or create manually:</p>
                                <form className="space-y-5" onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.target as HTMLFormElement);
                                    handleCreateWorkflow({
                                        name: formData.get('flowName') as string,
                                        trigger: formData.get('trigger') as string,
                                        type: formData.get('type') as string
                                    });
                                }}>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Workflow Name</label>
                                        <input
                                            name="flowName"
                                            type="text"
                                            required
                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-5 py-3 text-sm font-bold focus:border-neuro outline-none transition-all"
                                            placeholder="e.g. AI Appointment Confirmation"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Event Trigger</label>
                                            <select
                                                name="trigger"
                                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-5 py-3 text-sm font-bold focus:border-neuro outline-none"
                                            >
                                                <option>Contact Tag Added</option>
                                                <option>Form Submitted</option>
                                                <option>Inbound Call</option>
                                                <option>Opportunity Changed</option>
                                                <option>Appointment Scheduled</option>
                                                <option>Contact Created</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest mb-2 block">Category</label>
                                            <select
                                                name="type"
                                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-5 py-3 text-sm font-bold focus:border-neuro outline-none"
                                            >
                                                <option>Revenue</option>
                                                <option>Engagement</option>
                                                <option>Reputation</option>
                                                <option>Recovery</option>
                                                <option>System</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-neuro/5 rounded-xl border border-neuro/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Shield className="h-5 w-5 text-neuro" />
                                            <div className="text-[10px] font-black uppercase tracking-widest">
                                                {crmType === 'ghl' ? 'GHL Sync Ready' : 'Vbout Integration Active'}
                                            </div>
                                        </div>
                                        <Activity className="h-4 w-4 text-neuro animate-pulse" />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full h-12 bg-neuro text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-neuro/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                                    >
                                        Save to Dashboard <ChevronRight className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Workflows;
