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
    Clock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Dashboard = () => {
    const { config } = useTheme();

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

    const handleOpenGHL = (id: string) => {
        const url = `https://app.gohighlevel.com/location/current_location/workflows/automation/${id}/edit`;
        window.open(url, '_blank');
    };

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-x-hidden custom-scrollbar overflow-y-auto transition-colors duration-500">
            {/* Dynamic Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neuro/5 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-neuro/10 blur-[100px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none"></div>

            <div className="p-10 space-y-12 relative z-10">
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
                        <div className="h-12 px-6 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl flex items-center justify-center text-[var(--os-text-muted)] text-[10px] font-black uppercase tracking-widest">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <button className="h-12 w-12 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl flex items-center justify-center text-[var(--os-text-muted)] hover:text-neuro hover:bg-neuro/5 transition-all relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-3 right-3 w-2 h-2 bg-neuro rounded-full animate-pulse"></span>
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="group p-8 rounded-[2.5rem] bg-[var(--os-glass-bg)] backdrop-blur-lg border border-[var(--os-border)] shadow-xl shadow-neuro/5 hover:bg-neuro transition-all duration-500 hover:scale-[1.02] cursor-pointer">
                            <div className="h-14 w-14 rounded-2xl bg-[var(--os-bg)] flex items-center justify-center text-neuro mb-6 transition-all duration-500 group-hover:bg-white group-hover:scale-110">
                                <stat.icon className="h-7 w-7" />
                            </div>
                            <div className="text-[10px] font-black text-[var(--os-text-muted)] uppercase tracking-widest group-hover:text-white/60 transition-colors uppercase">{stat.label}</div>
                            <div className="text-4xl font-black text-[var(--os-text)] mt-2 tracking-tighter group-hover:text-white transition-colors italic uppercase">{stat.value}</div>
                            <div className="flex items-center gap-2 mt-4">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${stat.change.includes('+') || stat.change.includes('Optimal') ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-zinc-400'} group-hover:bg-white/20 group-hover:text-white transition-colors`}>
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pb-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* AEO Intelligence Module */}
                        <div className="rounded-[3rem] bg-zinc-900 p-10 shadow-2xl text-white relative overflow-hidden">
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
            </div>
        </div>
    );
};

export default Dashboard;
