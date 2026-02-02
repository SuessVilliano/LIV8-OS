
import { useState } from 'react';
import {
    Palette,
    ImageIcon,
    FileText,
    Plus,
    Calendar,
    Zap,
    MoreVertical,
    Search,
    Brain,
    Rocket,
    Instagram,
    Linkedin,
    Facebook,
    Eye,
    Sparkles,
    Share2
} from 'lucide-react';

const Brand = () => {
    const [activeTab, setActiveTab] = useState<'library' | 'planner' | 'voice'>('library');
    const [previewChannel, setPreviewChannel] = useState<'ig' | 'li' | 'fb'>('ig');

    // Voice Tuning States
    const [tone, setTone] = useState({
        professional: 85,
        empathetic: 40,
        direct: 92,
        friendly: 15
    });

    const assets = [
        { id: '1', name: 'Primary Logo', type: 'image/png', date: 'Jan 24, 2026', size: '1.2 MB' },
        { id: '2', name: 'Brand Voice Blueprint', type: 'doc/pdf', date: 'Jan 25, 2026', size: '480 KB' },
        { id: '3', name: 'Social Post Template', type: 'image/figma', date: 'Jan 26, 2026', size: '12.4 MB' },
    ];

    const scheduledPosts = [
        { id: 'p1', channel: 'Instagram', title: 'Neural Agency Alpha', date: 'Jan 28, 10:00 AM', status: 'Ready', agent: 'Content Strategist' },
        { id: 'p2', channel: 'LinkedIn', title: 'Why LIV8 OS Dominates', date: 'Jan 29, 02:30 PM', status: 'Drafting', agent: 'Content Strategist' },
    ];

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-x-hidden custom-scrollbar overflow-y-auto transition-colors duration-500">
            <div className="p-10 space-y-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Palette className="h-3 w-3" /> Brand Orchestration
                        </p>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Brand <span className="text-neuro">Identity</span>
                        </h1>
                    </div>
                    <div className="flex bg-[var(--os-surface)] p-1.5 rounded-2xl border border-[var(--os-border)]">
                        {['library', 'planner', 'voice'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-neuro text-white shadow-lg shadow-neuro/20' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                {tab === 'library' ? 'Asset Library' : tab === 'planner' ? 'Social Planner' : 'Voice Tuner'}
                            </button>
                        ))}
                    </div>
                </header>

                {activeTab === 'library' && (
                    <div className="flex-1 space-y-10 animate-in fade-in zoom-in-95 duration-500">
                        {/* Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="os-card p-8 space-y-6 bg-neuro text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer" onClick={() => setActiveTab('voice')}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] group-hover:bg-white/20 transition-all"></div>
                                <Brain className="h-8 w-8 text-white/80" />
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">Voice Protocol</h3>
                                    <p className="text-[10px] font-bold text-white/60 mt-2 uppercase tracking-widest">Active Intelligence Persona</p>
                                </div>
                                <button className="h-10 px-6 bg-white/20 hover:bg-white/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10">Tune Neural Core</button>
                            </div>
                            <div className="os-card p-8 space-y-6 hover:border-neuro/30 transition-all">
                                <ImageIcon className="h-8 w-8 text-neuro" />
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">Master Logo</h3>
                                    <p className="text-[10px] font-bold text-[var(--os-text-muted)] mt-2 uppercase tracking-widest">High-fidelity SVG Source</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {['#8b5cf6', '#000000', '#F1F5F9'].map(c => (
                                        <div key={c} className="h-8 w-8 rounded-lg border border-[var(--os-border)] shadow-sm" style={{ backgroundColor: c }}></div>
                                    ))}
                                    <span className="text-[8px] font-black text-[var(--os-text-muted)] uppercase ml-2 italic">Neural Palette Extracted</span>
                                </div>
                            </div>
                            <div className="os-card p-8 space-y-6 hover:border-neuro/30 transition-all">
                                <Share2 className="h-8 w-8 text-neuro" />
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">Social Assets</h3>
                                    <p className="text-[10px] font-bold text-[var(--os-text-muted)] mt-2 uppercase tracking-widest">Banner & Avatar Stack</p>
                                </div>
                                <button className="h-10 px-6 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-neuro transition-all">Sync To GHL</button>
                            </div>
                        </div>

                        {/* File Explorer */}
                        <div className="os-card flex flex-col p-8 space-y-8 min-h-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase italic">Neural Vault</h3>
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                        <input type="text" placeholder="Search assets..." className="bg-[var(--os-bg)] border border-[var(--os-border)] rounded-2xl pl-12 pr-6 py-2.5 text-[10px] font-bold outline-none focus:border-neuro transition-all" />
                                    </div>
                                    <button className="h-10 px-6 bg-neuro text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-neuro/10 flex items-center gap-2">
                                        <Plus className="h-4 w-4" /> Import Asset
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {assets.map(asset => (
                                    <div key={asset.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-[var(--os-surface)] transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-neuro group-hover:scale-110 transition-transform">
                                                <ImageIcon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-tight">{asset.name}</h4>
                                                <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-0.5">{asset.type} • {asset.size}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-[10px] font-black text-[var(--os-text-muted)] uppercase tracking-widest">{asset.date}</span>
                                            <button className="p-3 text-[var(--os-text-muted)] hover:text-neuro">
                                                <MoreVertical className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'planner' && (
                    <div className="flex-1 min-h-0 flex gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Scheduler Left */}
                        <div className="w-1/2 space-y-8 flex flex-col">
                            <div className="os-card p-8 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute bottom-0 right-0 w-64 h-full bg-neuro/10 blur-[60px]"></div>
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Rocket className="h-6 w-6 text-neuro" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neuro">Neural Deployment</span>
                                    </div>
                                    <h3 className="text-3xl font-black uppercase italic leading-none">Strategic <span className="text-neuro">Push</span></h3>
                                    <p className="text-xs font-bold text-slate-400 max-w-sm">Assign high-conversion social orchestration to your AI Content Strategist.</p>
                                    <button className="w-full h-14 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-neuro/30 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3">
                                        <Plus className="h-4 w-4" /> Create Social Task
                                    </button>
                                </div>
                            </div>

                            <div className="os-card p-8 space-y-8 flex-1 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-black uppercase italic">Deployment Queue</h3>
                                    </div>
                                </div>
                                <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                    {scheduledPosts.map(post => (
                                        <div key={post.id} className="p-6 rounded-[2rem] bg-[var(--os-surface)] border border-[var(--os-border)] flex items-center justify-between group hover:border-neuro/30 transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-neuro shadow-sm">
                                                    <Share2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-black uppercase italic">{post.title}</h4>
                                                    <p className="text-[8px] font-black text-[var(--os-text-muted)] uppercase mt-1 italic">{post.channel} • {post.date}</p>
                                                </div>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${post.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {post.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Preview Right */}
                        <div className="flex-1 os-card p-8 flex flex-col space-y-8 bg-slate-800/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Eye className="h-5 w-5 text-neuro" />
                                    <h3 className="text-lg font-black uppercase italic">Neural <span className="text-neuro">Preview</span></h3>
                                </div>
                                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                                    {[
                                        { id: 'ig', icon: Instagram },
                                        { id: 'li', icon: Linkedin },
                                        { id: 'fb', icon: Facebook }
                                    ].map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setPreviewChannel(c.id as any)}
                                            className={`p-2 rounded-lg transition-all ${previewChannel === c.id ? 'bg-neuro text-white shadow-md' : 'text-slate-400 hover:text-neuro'}`}
                                        >
                                            <c.icon className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center p-12">
                                <div className="w-[360px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                                    <div className="p-4 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-neuro flex items-center justify-center text-white"><Sparkles className="h-5 w-5" /></div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black uppercase italic leading-none">LIV8 Agency</div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sponsored</div>
                                        </div>
                                        <MoreVertical className="h-4 w-4 text-slate-300" />
                                    </div>
                                    <div className="aspect-square bg-slate-100 relative group overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-neuro to-indigo-600 flex flex-col items-center justify-center text-white p-10 text-center space-y-6">
                                            <Brain className="h-16 w-16 opacity-50 absolute -top-4 -right-4 rotate-12" />
                                            <h4 className="text-4xl font-black uppercase italic leading-none tracking-tighter">Neural <span className="text-white/50 underline">Growth</span></h4>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Phase 17 Optimized Protocol</p>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex gap-4">
                                            <Share2 className="h-5 w-5 text-slate-900" />
                                            <Share2 className="h-5 w-5 text-slate-900 rotate-180" />
                                        </div>
                                        <p className="text-[10px] font-normal text-slate-600 leading-relaxed">
                                            <span className="font-bold mr-2">liv8_agency</span>
                                            Automate your entire agency workflow with the new Neural Core integration. #LIV8OS #AgencyGrowth
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'voice' && (
                    <div className="flex-1 os-card p-10 flex flex-col space-y-12 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black uppercase italic leading-none">Neural <span className="text-neuro">Voice Tuner</span></h3>
                                <p className="text-sm text-[var(--os-text-muted)] font-bold italic">Module v4.2: Behavioral Alignment Loop</p>
                            </div>
                            <div className="h-16 w-16 bg-neuro/10 rounded-[2rem] flex items-center justify-center text-neuro animate-pulse">
                                <Brain className="h-8 w-8" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            <div className="space-y-10">
                                {Object.entries(tone).map(([key, val]) => (
                                    <div key={key} className="space-y-4">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-neuro italic">{key}</label>
                                            <span className="text-[10px] font-black">{val}%</span>
                                        </div>
                                        <div className="relative h-1.5 w-full bg-slate-100 rounded-full group cursor-pointer">
                                            <div
                                                className="absolute h-full bg-neuro rounded-full shadow-[0_0_15px_rgba(16,104,235,0.4)]"
                                                style={{ width: `${val}%` }}
                                            ></div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={val}
                                                onChange={(e) => setTone({ ...tone, [key]: parseInt(e.target.value) })}
                                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col space-y-8 relative overflow-hidden shadow-2xl shadow-neuro/20">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-neuro/20 blur-[80px]"></div>
                                <div className="flex items-center gap-3 text-neuro">
                                    <Zap className="h-5 w-5" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Live Simulation</span>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <p className="text-2xl font-black text-white italic leading-relaxed uppercase">
                                        "Hey there, I'm your <span className="text-neuro underline">LIV8 OS</span>. Deployment of the new Reactivation suite is <span className="text-neuro">92%</span> optimized. Standing by for instructions."
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 pt-8 border-t border-white/10">
                                    <button className="flex-1 h-14 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-neuro/30 hover:scale-[1.02] transition-all">Apply Behavioral Sync</button>
                                    <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center text-white cursor-pointer hover:bg-white/10">
                                        <Share2 className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Brand;
