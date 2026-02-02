
import { useState, useRef } from 'react';
import {
    MessageSquare,
    Users,
    Send,
    Mic,
    Sparkles,
    Settings as SettingsIcon,
    Cpu,
    User,
    MoreVertical,
    BookOpen,
    Zap,
    Search,
    Filter,
    Clock,
    UserCheck,
    Bot,
    Plus
} from 'lucide-react';

const Staff = () => {
    const [subTab, setSubTab] = useState<'ai' | 'human' | 'contacts'>('ai');
    const [selectedChat, setSelectedChat] = useState('1');

    const aiStaff = [
        { id: '1', name: 'AI Receptionist', role: 'Inbound Specialist', status: 'Online', color: 'neuro', lastMsg: 'Handled call for Sarah Chen' },
        { id: '2', name: 'Appointment Setter', role: 'Calendar Orchestrator', status: 'Syncing', color: 'blue-500', lastMsg: 'Booking confirmed for Tue 2PM' },
        { id: '3', name: 'Recovery Agent', role: 'Lead Reactivation', status: 'Online', color: 'emerald-500', lastMsg: 'SMS sequence 3/5 active' },
    ];

    const humanStaff = [
        { id: 'h1', name: 'Jamaur Johnson', role: 'OS Admin', status: 'Online', color: 'slate-900', lastMsg: 'Neural override applied' },
        { id: 'h2', name: 'Support Lead', role: 'Escalation Specialist', status: 'Away', color: 'slate-400', lastMsg: 'Reviewing Phase 15 logs' },
    ];

    const contacts = [
        { id: 'c1', name: 'Sarah Chen', role: 'Hot Lead', status: 'Active', color: 'emerald-500', lastMsg: 'When is the next opening?' },
        { id: 'c2', name: 'James Wilson', role: 'Client', status: 'Inactive', color: 'slate-300', lastMsg: 'Thanks for the update' },
    ];

    const messages = [
        { id: '1', role: 'agent', name: 'AI Receptionist', text: 'Lead #482 Sarah Chen has been qualified and moved to "Hot" opportunities.', time: '12:42 PM' },
        { id: '2', role: 'user', name: 'Admin', text: 'Great work. Appointment Setter, please monitor Sarah for calendar availability.', time: '12:43 PM' },
        { id: '3', role: 'agent', name: 'Appointment Setter', text: 'Protocol initialized. Sarah has a gap on Tuesday at 2 PM. Sending booking link now...', time: '12:44 PM' }
    ];

    const currentList = subTab === 'ai' ? aiStaff : subTab === 'human' ? humanStaff : contacts;

    return (
        <div className="min-h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-y-auto transition-colors duration-500">
            <div className="p-10 space-y-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Users className="h-3 w-3" /> Unified Neural Hub
                        </p>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Staff <span className="text-neuro">& Contacts</span>
                        </h1>
                    </div>
                </header>

                <div className="flex-1 min-h-0 flex gap-6 animate-in fade-in zoom-in-95 duration-500">
                    {/* Left Panel: Navigation & Contacts */}
                    <div className="w-96 flex flex-col space-y-4">
                        <div className="os-card p-1.5 flex bg-[var(--os-surface)] border border-[var(--os-border)]">
                            <button
                                onClick={() => setSubTab('ai')}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${subTab === 'ai' ? 'bg-neuro text-white shadow-lg shadow-neuro/20' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <Bot className="h-3.5 w-3.5" /> AI
                            </button>
                            <button
                                onClick={() => setSubTab('human')}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${subTab === 'human' ? 'bg-neuro text-white shadow-lg shadow-neuro/20' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <UserCheck className="h-3.5 w-3.5" /> Staff
                            </button>
                            <button
                                onClick={() => setSubTab('contacts')}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${subTab === 'contacts' ? 'bg-neuro text-white shadow-lg shadow-neuro/20' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <User className="h-3.5 w-3.5" /> Leads
                            </button>
                        </div>

                        <div className="os-card flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
                            <div className="flex items-center gap-2 px-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--os-text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Search pool..."
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold focus:border-neuro outline-none"
                                    />
                                </div>
                                <button className="p-2 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro">
                                    <Filter className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <span className="text-[8px] font-black uppercase text-[var(--os-text-muted)] tracking-widest flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" /> Most Recent
                                    </span>
                                </div>
                                {currentList.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedChat(item.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${selectedChat === item.id ? 'bg-neuro/10 border border-neuro/20' : 'hover:bg-[var(--os-surface)]'}`}
                                    >
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm text-${item.color}`}>
                                            {subTab === 'ai' ? <Cpu className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${selectedChat === item.id ? 'text-neuro' : ''}`}>{item.name}</h4>
                                                <span className="text-[7px] font-bold text-[var(--os-text-muted)]">12:44 PM</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-[var(--os-text-muted)] truncate mt-0.5">{item.lastMsg}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Sleek Conversation Hub */}
                    <div className="flex-1 os-card flex flex-col bg-[var(--os-glass-bg)] relative overflow-hidden shadow-2xl rounded-[3rem]">
                        <div className="p-8 border-b border-[var(--os-border)] flex items-center justify-between bg-white/50 backdrop-blur-md relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-neuro rounded-2xl flex items-center justify-center text-white shadow-lg shadow-neuro/20">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic italic leading-none">{subTab === 'ai' ? 'Neural' : subTab === 'human' ? 'Staff' : 'Lead'} <span className="text-neuro">Sync</span></h3>
                                    <p className="text-[10px] font-black text-[var(--os-text-muted)] uppercase tracking-widest mt-1 italic">Real-time GHL Stream Active</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="p-3 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro transition-all">
                                    <Zap className="h-5 w-5" />
                                </button>
                                <button className="p-3 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro transition-all">
                                    <SettingsIcon className="h-5 w-5" />
                                </button>
                                <button className="p-3 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro transition-all">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar relative z-10">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        {msg.role === 'agent' && <div className="h-6 w-6 rounded-lg bg-neuro/10 flex items-center justify-center text-neuro"><Cpu className="h-3.5 w-3.5" /></div>}
                                        <span className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">{msg.name}</span>
                                        {msg.role === 'user' && <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><User className="h-3.5 w-3.5" /></div>}
                                    </div>
                                    <div className={`p-6 rounded-[2.5rem] text-sm font-semibold max-w-[70%] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-neuro text-white rounded-tr-none shadow-neuro/10' : 'bg-white text-slate-900 rounded-tl-none border border-slate-100 shadow-slate-100/50'
                                        }`}>
                                        {msg.text}
                                        <div className={`text-[8px] mt-3 font-bold uppercase opacity-40 ${msg.role === 'user' ? 'text-white text-right' : 'text-slate-500'}`}>
                                            {msg.time} • Handshake Verified
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-white/50 backdrop-blur-md relative z-10">
                            <form className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                    <button type="button" className="p-2 text-[var(--os-text-muted)] hover:text-neuro transition-colors"><Mic className="h-5 w-5" /></button>
                                </div>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-slate-100 rounded-[2rem] pl-16 pr-24 py-5 text-sm font-bold text-slate-900 focus:border-neuro outline-none transition-all shadow-inner placeholder:text-slate-300"
                                    placeholder="Execute neural command..."
                                />
                                <button className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-neuro text-white rounded-2xl flex items-center justify-center shadow-lg shadow-neuro/20 hover:scale-105 active:scale-95 transition-all">
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Sub-Actions (Agent Management Overlay if needed) */}
                <div className="flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-700">
                    <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-900/10">
                        <Sparkles className="h-4 w-4 text-neuro" /> Provision Intelligence
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-100 text-slate-900 text-[9px] font-black uppercase tracking-widest hover:border-neuro transition-all shadow-sm">
                        <BookOpen className="h-4 w-4 text-neuro" /> Knowledgebase Scan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Staff;
