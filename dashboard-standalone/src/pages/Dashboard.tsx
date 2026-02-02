import { useState } from 'react';
import {
    Activity,
    Users,
    ArrowUpRight,
    Brain,
    Zap,
    ShieldCheck,
    Layout,
    ExternalLink,
    Gauge,
    Bell,
    MessageSquare,
    Workflow,
    Clock,
    Bot,
    CheckCircle2,
    Circle,
    Plus,
    Phone,
    Calendar,
    Target,
    TrendingUp,
    Settings,
    MoreVertical,
    GripVertical,
    Cpu
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AIStaffChat from '../components/AIStaffChat';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { config } = useTheme();
    const [showChat, setShowChat] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'kanban'>('overview');
    const locationId = localStorage.getItem('locationId') || 'demo_location';
    const navigate = useNavigate();

    const stats = [
        { label: 'Total Revenue', value: '$84,290', icon: Activity, change: '+12% this month', color: 'emerald' },
        { label: 'Active Leads', value: '142', icon: Users, change: '+14 today', color: 'neuro' },
        { label: 'AI Conversations', value: '1,204', icon: MessageSquare, change: '98% Resolution', color: 'neuro' },
        { label: 'Workflows Active', value: '28', icon: Workflow, change: 'Optimal', color: 'emerald' },
    ];

    const neuralLog = [
        { id: 1, action: 'AI Setter booked appointment', target: 'Sarah Chen', time: '2m ago', type: 'success', source: 'SMS' },
        { id: 2, action: 'Workflow Triggered: Reactivation', target: '+1 702-555-0199', time: '14m ago', type: 'info', source: 'Campaign' },
        { id: 3, action: 'SEO Audit Completed', target: 'solarpro.com', time: '1h ago', type: 'success', source: 'AEO Agent' },
        { id: 4, action: 'Missed Call Text Sent', target: '+1 310-555-0822', time: '2h ago', type: 'info', source: 'Auto-Pilot' },
        { id: 5, action: 'Negative Sentiment Detected', target: 'John Doe', time: '3h ago', type: 'warning', source: 'Analysis' }
    ];

    const assets = [
        { name: '7-Day Reactivation', type: 'Campaign', id: 'wf_react_01', status: 'Running', performance: '42% Conv.' },
        { name: 'AI Receptionist V2', type: 'Voice Agent', id: 'va_core_02', status: 'Active', performance: '12 Calls' },
        { name: 'SEO Authority Builder', type: 'Workflow', id: 'wf_seo_01', status: 'Scanning', performance: '92/100' },
    ];

    // AI Staff deployed on the account
    const aiStaff = [
        { id: '1', name: 'AI Receptionist', role: 'Inbound Specialist', status: 'Online', tasks: 12, calls: 48, icon: Phone, color: 'emerald' },
        { id: '2', name: 'Appointment Setter', role: 'Calendar Orchestrator', status: 'Online', tasks: 8, calls: 24, icon: Calendar, color: 'neuro' },
        { id: '3', name: 'Content Strategist', role: 'Social Media AI', status: 'Drafting', tasks: 5, calls: 0, icon: Brain, color: 'purple' },
        { id: '4', name: 'Recovery Agent', role: 'Lead Reactivation', status: 'Online', tasks: 15, calls: 32, icon: Target, color: 'amber' },
    ];

    // Today's tasks
    const todaysTasks = [
        { id: 't1', title: 'Follow up with Sarah Chen', agent: 'Appointment Setter', priority: 'high', status: 'pending', dueTime: '10:00 AM' },
        { id: 't2', title: 'Send reactivation SMS to cold leads', agent: 'Recovery Agent', priority: 'medium', status: 'in_progress', dueTime: '11:30 AM' },
        { id: 't3', title: 'Post Instagram content', agent: 'Content Strategist', priority: 'low', status: 'completed', dueTime: '2:00 PM' },
        { id: 't4', title: 'Respond to voicemail queue', agent: 'AI Receptionist', priority: 'high', status: 'pending', dueTime: '3:00 PM' },
        { id: 't5', title: 'Send proposal to qualified leads', agent: 'Appointment Setter', priority: 'high', status: 'pending', dueTime: '4:30 PM' },
    ];

    // Kanban columns
    const kanbanColumns = [
        { id: 'new', title: 'New Leads', color: 'neuro', items: [
            { id: 'k1', name: 'Michael Brown', value: '$2,400', source: 'Facebook Ads', time: '10m ago' },
            { id: 'k2', name: 'Lisa Anderson', value: '$1,800', source: 'Website Form', time: '25m ago' },
            { id: 'k3', name: 'David Wilson', value: '$3,200', source: 'Referral', time: '1h ago' },
        ]},
        { id: 'contacted', title: 'Contacted', color: 'amber', items: [
            { id: 'k4', name: 'Sarah Chen', value: '$4,500', source: 'Google Ads', time: '2h ago' },
            { id: 'k5', name: 'James Miller', value: '$2,100', source: 'Cold Outreach', time: '3h ago' },
        ]},
        { id: 'qualified', title: 'Qualified', color: 'purple', items: [
            { id: 'k6', name: 'Emma Davis', value: '$5,800', source: 'LinkedIn', time: '1d ago' },
        ]},
        { id: 'proposal', title: 'Proposal Sent', color: 'blue', items: [
            { id: 'k7', name: 'Robert Taylor', value: '$8,200', source: 'Webinar', time: '2d ago' },
            { id: 'k8', name: 'Jennifer White', value: '$6,500', source: 'Email Campaign', time: '3d ago' },
        ]},
        { id: 'won', title: 'Won', color: 'emerald', items: [
            { id: 'k9', name: 'Chris Johnson', value: '$12,000', source: 'Referral', time: '1w ago' },
        ]},
    ];

    const handleOpenGHL = (id: string) => {
        const url = `https://app.gohighlevel.com/location/current_location/workflows/automation/${id}/edit`;
        window.open(url, '_blank');
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'low': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'in_progress': return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
            default: return <Circle className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-x-hidden custom-scrollbar overflow-y-auto transition-colors duration-500">
            {/* Dynamic Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neuro/5 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-neuro/10 blur-[100px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none"></div>

            <div className="p-10 space-y-8 relative z-10">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Layout className="h-3 w-3" /> Command Center v2.5
                        </p>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            {config.platformName?.split(' ')[0] || 'LIV8'} <span className="text-neuro">{config.platformName?.split(' ')[1] || 'OS'}</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Neural Link Active</span>
                            </div>
                            <span className="text-[var(--os-text-muted)] text-xs font-bold">Real-time intelligence and agency orchestration.</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Tab Navigation */}
                        <div className="flex bg-[var(--os-surface)] p-1.5 rounded-2xl border border-[var(--os-border)]">
                            {[
                                { id: 'overview', label: 'Overview' },
                                { id: 'tasks', label: 'Tasks' },
                                { id: 'kanban', label: 'Pipeline' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-neuro text-white shadow-lg shadow-neuro/20' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="h-12 px-6 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl flex items-center justify-center text-[var(--os-text-muted)] text-[10px] font-black uppercase tracking-widest">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <button className="h-12 w-12 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl flex items-center justify-center text-[var(--os-text-muted)] hover:text-neuro hover:bg-neuro/5 transition-all relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-3 right-3 w-2 h-2 bg-neuro rounded-full animate-pulse"></span>
                        </button>
                    </div>
                </header>

                {/* Stats Grid - Always visible */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <div key={stat.label} className="group p-6 rounded-[2rem] bg-[var(--os-glass-bg)] backdrop-blur-lg border border-[var(--os-border)] shadow-xl shadow-neuro/5 hover:bg-neuro transition-all duration-500 hover:scale-[1.02] cursor-pointer">
                            <div className="h-12 w-12 rounded-xl bg-[var(--os-bg)] flex items-center justify-center text-neuro mb-4 transition-all duration-500 group-hover:bg-white group-hover:scale-110">
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="text-[10px] font-black text-[var(--os-text-muted)] uppercase tracking-widest group-hover:text-white/60 transition-colors">{stat.label}</div>
                            <div className="text-3xl font-black text-[var(--os-text)] mt-2 tracking-tighter group-hover:text-white transition-colors italic">{stat.value}</div>
                            <div className="flex items-center gap-2 mt-3">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${stat.change.includes('+') || stat.change.includes('Optimal') ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-zinc-400'} group-hover:bg-white/20 group-hover:text-white transition-colors`}>
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Staff Hub Section - Always visible */}
                <div className="os-card p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro">
                                <Cpu className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic">AI <span className="text-neuro">Staff Hub</span></h3>
                                <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-1">Deployed Neural Agents</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/staff')}
                            className="text-[10px] font-black text-neuro flex items-center gap-2 hover:translate-x-1 transition-all uppercase tracking-widest"
                        >
                            Manage Staff <ArrowUpRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {aiStaff.map((staff) => (
                            <div key={staff.id} className="group p-5 rounded-2xl bg-[var(--os-surface)] border border-[var(--os-border)] hover:border-neuro/30 transition-all cursor-pointer">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`h-10 w-10 rounded-xl bg-${staff.color}-500/10 flex items-center justify-center text-${staff.color}-500`}>
                                        <staff.icon className="h-5 w-5" />
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                        staff.status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${staff.status === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                                        {staff.status}
                                    </div>
                                </div>
                                <h4 className="text-sm font-black uppercase tracking-tight">{staff.name}</h4>
                                <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-1">{staff.role}</p>
                                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--os-border)]">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-neuro" />
                                        <span className="text-[10px] font-bold">{staff.tasks} tasks</span>
                                    </div>
                                    {staff.calls > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="text-[10px] font-bold">{staff.calls} calls</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Overview Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10 animate-in fade-in duration-500">
                    <div className="lg:col-span-2 space-y-8">
                        {/* AEO Intelligence Module */}
                        <div className="rounded-[2.5rem] bg-zinc-900 p-8 shadow-2xl text-white relative overflow-hidden">
                            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-neuro/20 blur-[80px] rounded-full"></div>
                            <div className="flex items-center justify-between mb-10 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black uppercase italic">Neural Execution Log</h3>
                                    <p className="text-[9px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">Real-time Agency Operations</p>
                                </div>
                                <div className="flex items-center gap-2 bg-neuro text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg shadow-neuro/20 animate-pulse">
                                    Live Stream Active
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {neuralLog.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${log.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                                                log.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                                                    'bg-neuro/20 text-neuro'
                                                }`}>
                                                <Zap className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white group-hover:text-neuro transition-colors">{log.action}</div>
                                                <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">{log.target} • {log.source}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" /> {log.time}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Workflows */}
                        <div className="os-card p-10 shadow-2xl shadow-zinc-900/5 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--os-text)] uppercase italic">Active Campaigns</h3>
                                    <p className="text-[9px] font-bold text-[var(--os-text-muted)] mt-1 uppercase tracking-widest">High-Performance Neural Workflows</p>
                                </div>
                                <button className="text-[10px] font-black text-neuro flex items-center gap-2 hover:translate-x-1 transition-all uppercase tracking-widest">
                                    View All <ArrowUpRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {assets.map((asset, i) => (
                                    <div key={i} className="flex items-center justify-between p-6 rounded-[2rem] bg-[var(--os-glass-bg)] border border-[var(--os-border)] hover:border-neuro/30 transition-all group shadow-sm hover:shadow-lg hover:shadow-neuro/5">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 rounded-2xl bg-neuro/10 flex items-center justify-center text-neuro group-hover:bg-neuro group-hover:text-white transition-all duration-500">
                                                <Workflow className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--os-text)] text-base">{asset.name} <span className="text-[9px] ml-2 font-black text-[var(--os-text-muted)] uppercase tracking-widest">{asset.type}</span></div>
                                                <div className="text-xs text-[var(--os-text-muted)] font-medium flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    {asset.status} • <span className="text-emerald-500 font-bold">{asset.performance}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenGHL(asset.id)}
                                            className="px-4 py-2 bg-[var(--os-bg)] text-[var(--os-text-muted)] group-hover:bg-neuro group-hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--os-border)] transition-all flex items-center gap-2"
                                        >
                                            Launch <ExternalLink className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="os-card p-10 shadow-2xl shadow-zinc-900/5 backdrop-blur-xl">
                            <div className="mb-10">
                                <h3 className="text-xl font-black text-[var(--os-text)] uppercase italic">Core Pulse</h3>
                                <p className="text-[9px] font-bold text-[var(--os-text-muted)] mt-1 uppercase tracking-widest">Nodes Connectivity</p>
                            </div>
                            <div className="space-y-8">
                                {[
                                    { label: 'GHL API Gateway', status: 'Optimal', icon: Zap },
                                    { label: 'Gemini 1.5 Flash', status: 'Streaming', icon: Brain },
                                    { label: 'Vercel Postgres', status: 'Optimizing', statusColor: 'amber', icon: Activity },
                                    { label: 'TaskMagic MCP', status: 'Linked', icon: ShieldCheck },
                                ].map((service) => (
                                    <div key={service.label} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--os-bg)] flex items-center justify-center text-[var(--os-text-muted)] group-hover:text-neuro transition-colors">
                                                <service.icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-[var(--os-text)] text-[11px] font-bold uppercase tracking-tight">{service.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className={`h-1.5 w-1.5 rounded-full ${service.statusColor === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${service.statusColor === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {service.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 p-6 rounded-[2rem] bg-neuro/5 border border-neuro-light/30">
                                <div className="text-[9px] font-black text-neuro uppercase tracking-[0.2em] mb-2">Neural Load</div>
                                <div className="w-full h-2 bg-[var(--os-bg)] rounded-full overflow-hidden border border-[var(--os-border)] shadow-inner">
                                    <div className="bg-neuro h-full w-[65%] shadow-[0_0_15px_rgba(0,180,255,0.4)] animate-pulse"></div>
                                </div>
                                <div className="mt-3 text-[9px] font-bold text-[var(--os-text-muted)]">Memory: 12.4GB / 32GB Syncing</div>
                            </div>
                        </div>

                        {/* Website Health Module */}
                        <div className="os-card p-10 shadow-2xl shadow-zinc-900/5 backdrop-blur-xl">
                            <h3 className="text-xl font-black text-[var(--os-text)] uppercase italic mb-8">Vital Signs</h3>
                            <div className="space-y-6">
                                {[
                                    { label: 'Performance', score: 98, color: 'text-emerald-500' },
                                    { label: 'Accessibility', score: 100, color: 'text-emerald-500' },
                                    { label: 'SEO Density', score: 85, color: 'text-neuro' }
                                ].map(vital => (
                                    <div key={vital.label} className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">
                                            <span>{vital.label}</span>
                                            <span className={vital.color}>{vital.score}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[var(--os-bg)] rounded-full border border-[var(--os-border)] overflow-hidden">
                                            <div className={`h-full ${vital.color === 'text-emerald-500' ? 'bg-emerald-500' : 'bg-neuro'} transition-all`} style={{ width: `${vital.score}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-10 pt-8 border-t border-[var(--os-border)] flex items-center gap-4">
                                <Gauge className="h-6 w-6 text-neuro" />
                                <div>
                                    <div className="text-[10px] font-black uppercase text-[var(--os-text)]">Health Optimal</div>
                                    <div className="text-[9px] font-bold text-[var(--os-text-muted)]">Next Audit in 14h</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* Tasks Tab Content */}
                {activeTab === 'tasks' && (
                    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase italic">Today's <span className="text-neuro">Tasks</span></h3>
                                    <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-1">AI Staff Task Queue</p>
                                </div>
                            </div>
                            <button className="h-12 px-6 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-neuro/20 flex items-center gap-2 hover:scale-105 transition-transform">
                                <Plus className="h-4 w-4" /> Add Task
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Task List */}
                            <div className="lg:col-span-2 os-card p-6 space-y-4">
                                {todaysTasks.map((task) => (
                                    <div key={task.id} className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group ${
                                        task.status === 'completed'
                                            ? 'bg-emerald-500/5 border-emerald-500/20'
                                            : 'bg-[var(--os-surface)] border-[var(--os-border)] hover:border-neuro/30'
                                    }`}>
                                        <button className="flex-shrink-0">
                                            {getStatusIcon(task.status)}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <h4 className={`text-sm font-bold ${task.status === 'completed' ? 'line-through text-[var(--os-text-muted)]' : ''}`}>
                                                    {task.title}
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-[var(--os-text-muted)] mt-1 flex items-center gap-2">
                                                <Cpu className="h-3 w-3" /> {task.agent} <span className="text-[var(--os-border)]">•</span> Due {task.dueTime}
                                            </p>
                                        </div>
                                        <button className="p-2 text-[var(--os-text-muted)] hover:text-neuro opacity-0 group-hover:opacity-100 transition-all">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Task Stats Sidebar */}
                            <div className="space-y-6">
                                <div className="os-card p-6">
                                    <h4 className="text-sm font-black uppercase tracking-tight mb-4">Task Summary</h4>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Pending', count: todaysTasks.filter(t => t.status === 'pending').length, color: 'text-amber-500' },
                                            { label: 'In Progress', count: todaysTasks.filter(t => t.status === 'in_progress').length, color: 'text-neuro' },
                                            { label: 'Completed', count: todaysTasks.filter(t => t.status === 'completed').length, color: 'text-emerald-500' },
                                        ].map((stat) => (
                                            <div key={stat.label} className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">{stat.label}</span>
                                                <span className={`text-xl font-black ${stat.color}`}>{stat.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="os-card p-6 bg-neuro text-white">
                                    <div className="flex items-center gap-3 mb-4">
                                        <TrendingUp className="h-5 w-5" />
                                        <h4 className="text-sm font-black uppercase tracking-tight">Productivity</h4>
                                    </div>
                                    <div className="text-4xl font-black italic">87%</div>
                                    <p className="text-[10px] font-bold text-white/60 mt-2 uppercase tracking-widest">+12% from yesterday</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Kanban Tab Content */}
                {activeTab === 'kanban' && (
                    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro">
                                    <Target className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase italic">Sales <span className="text-neuro">Pipeline</span></h3>
                                    <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-1">Opportunity Kanban Board</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="h-10 px-4 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl font-black text-[10px] uppercase tracking-widest text-[var(--os-text-muted)] hover:text-neuro transition-all flex items-center gap-2">
                                    <Settings className="h-3.5 w-3.5" /> Configure
                                </button>
                                <button className="h-10 px-5 bg-neuro text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-neuro/20 flex items-center gap-2 hover:scale-105 transition-transform">
                                    <Plus className="h-3.5 w-3.5" /> Add Lead
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {kanbanColumns.map((column) => (
                                <div key={column.id} className="flex-shrink-0 w-72">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full bg-${column.color}-500`}></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{column.title}</span>
                                            <span className="text-[10px] font-bold text-[var(--os-text-muted)] bg-[var(--os-surface)] px-2 py-0.5 rounded-lg">{column.items.length}</span>
                                        </div>
                                        <button className="text-[var(--os-text-muted)] hover:text-neuro">
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {column.items.map((item) => (
                                            <div key={item.id} className="os-card p-4 cursor-grab hover:shadow-lg hover:border-neuro/30 transition-all group">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <GripVertical className="h-4 w-4 text-[var(--os-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="h-8 w-8 bg-neuro/10 rounded-lg flex items-center justify-center text-neuro text-[10px] font-black">
                                                        {item.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold truncate">{item.name}</h4>
                                                        <p className="text-[9px] text-[var(--os-text-muted)]">{item.source}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-black text-neuro">{item.value}</span>
                                                    <span className="text-[8px] font-bold text-[var(--os-text-muted)] uppercase">{item.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pipeline Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Pipeline', value: '$47,200', icon: Target, change: '+$8,200 this week' },
                                { label: 'Qualified Value', value: '$5,800', icon: CheckCircle2, change: '1 opportunity' },
                                { label: 'Avg Deal Size', value: '$4,700', icon: TrendingUp, change: '+12% vs last month' },
                                { label: 'Win Rate', value: '32%', icon: Activity, change: '8 deals closed' },
                            ].map((stat) => (
                                <div key={stat.label} className="os-card p-5 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-neuro/10 flex items-center justify-center text-neuro">
                                        <stat.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-[var(--os-text-muted)] uppercase tracking-widest">{stat.label}</div>
                                        <div className="text-lg font-black">{stat.value}</div>
                                        <div className="text-[9px] font-bold text-emerald-500">{stat.change}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating AI Staff Chat Button */}
            <button
                onClick={() => setShowChat(true)}
                className="fixed bottom-6 right-6 h-14 w-14 bg-neuro text-white rounded-2xl flex items-center justify-center shadow-lg shadow-neuro/30 hover:scale-110 transition-all z-50 group"
            >
                <Bot className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full animate-pulse" />
            </button>

            {/* AI Staff Chat Modal */}
            {showChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-2xl h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                        <AIStaffChat
                            locationId={locationId}
                            onClose={() => setShowChat(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
