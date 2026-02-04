import { useState, useRef, useEffect } from 'react';
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
    Clock,
    UserCheck,
    Bot,
    Plus,
    Phone,
    Mail,
    RefreshCw,
    X,
    Play,
    Pause,
    Edit3,
    FileText,
    Package,
    Shield,
    CheckCircle,
    Upload
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface Message {
    id: string;
    role: 'agent' | 'user' | 'system';
    name: string;
    text: string;
    time: string;
    agentId?: string;
}

interface Contact {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    tags: string[];
    lastActivity: string;
}

interface AIStaffMember {
    id: string;
    name: string;
    role: string;
    status: 'Online' | 'Offline' | 'Syncing';
    capabilities: string[];
    lastAction: string;
    color: string;
}

const Staff = () => {
    const [subTab, setSubTab] = useState<'ai' | 'human' | 'contacts'>('ai');
    const [selectedChat, setSelectedChat] = useState('1');
    const [searchQuery, setSearchQuery] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showStaffConfig, setShowStaffConfig] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const crmType = localStorage.getItem('os_crm_type') || 'liv8';

    // AI Staff members
    const [aiStaff, setAiStaff] = useState<AIStaffMember[]>([
        { id: '1', name: 'AI Receptionist', role: 'Inbound Specialist', status: 'Online', capabilities: ['Answer calls', 'Qualify leads', 'Schedule appointments'], lastAction: 'Handled call for Sarah Chen', color: 'neuro' },
        { id: '2', name: 'Appointment Setter', role: 'Calendar Orchestrator', status: 'Online', capabilities: ['Book appointments', 'Send reminders', 'Manage calendar'], lastAction: 'Booking confirmed for Tue 2PM', color: 'blue-500' },
        { id: '3', name: 'Recovery Agent', role: 'Lead Reactivation', status: 'Online', capabilities: ['Re-engage cold leads', 'Send follow-ups', 'Win-back campaigns'], lastAction: 'SMS sequence 3/5 active', color: 'emerald-500' },
        { id: '4', name: 'Review Collector', role: 'Reputation Manager', status: 'Offline', capabilities: ['Request reviews', 'Monitor feedback', 'Respond to reviews'], lastAction: 'Sent 12 review requests today', color: 'amber-500' },
    ]);

    // Human staff
    const humanStaff = [
        { id: 'h1', name: 'Jamaur Johnson', role: 'OS Admin', status: 'Online', color: 'slate-900', lastMsg: 'Neural override applied' },
        { id: 'h2', name: 'Support Lead', role: 'Escalation Specialist', status: 'Away', color: 'slate-400', lastMsg: 'Reviewing Phase 15 logs' },
    ];

    // Contacts from CRM
    const [contacts, setContacts] = useState<Contact[]>([
        { id: 'c1', name: 'Sarah Chen', email: 'sarah@example.com', phone: '+1 555-0101', status: 'Hot', tags: ['priority'], lastActivity: '2h ago' },
        { id: 'c2', name: 'James Wilson', email: 'james@example.com', phone: '+1 555-0102', status: 'Warm', tags: ['follow-up'], lastActivity: '1d ago' },
        { id: 'c3', name: 'Mike Ross', email: 'mike@example.com', phone: '+1 555-0103', status: 'Active', tags: ['client'], lastActivity: '3h ago' },
    ]);

    // Chat messages
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'system', name: 'System', text: 'Neural Staff Hub initialized. AI agents are ready to assist.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: '2', role: 'agent', name: 'AI Receptionist', text: 'Lead #482 Sarah Chen has been qualified and moved to "Hot" opportunities. She expressed interest in your premium package.', time: '12:42 PM', agentId: '1' },
        { id: '3', role: 'user', name: 'Admin', text: 'Great work. Appointment Setter, please check Sarah\'s calendar availability for this week.', time: '12:43 PM' },
        { id: '4', role: 'agent', name: 'Appointment Setter', text: 'Checking Sarah\'s availability... She has a gap on Tuesday at 2 PM and Thursday at 10 AM. Would you like me to send a booking link?', time: '12:44 PM', agentId: '2' }
    ]);

    // Fetch contacts from CRM
    useEffect(() => {
        const fetchContacts = async () => {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id');
            if (!token || !locationId) return;

            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE}/api/dashboard/contacts?locationId=${locationId}&crm=${crmType}&limit=20`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.contacts && data.contacts.length > 0) {
                        setContacts(data.contacts.map((c: any) => ({
                            id: c.id,
                            name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email,
                            email: c.email || '',
                            phone: c.phone || '',
                            status: c.tags?.includes('hot') ? 'Hot' : c.tags?.includes('warm') ? 'Warm' : 'Active',
                            tags: c.tags || [],
                            lastActivity: c.dateUpdated ? new Date(c.dateUpdated).toLocaleDateString() : 'Unknown'
                        })));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch contacts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (subTab === 'contacts') {
            fetchContacts();
        }
    }, [subTab, crmType]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Sync all AI staff with CRM
    const handleSyncStaff = async () => {
        if (isSyncing) return;
        setIsSyncing(true);

        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id');

            // Sync staff data
            await fetch(`${API_BASE}/api/staff/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ locationId, crmType })
            });

            // Update UI with sync status
            setAiStaff(prev => prev.map(s => ({
                ...s,
                status: 'Syncing' as const
            })));

            // Simulate sync completion
            setTimeout(() => {
                setAiStaff(prev => prev.map(s => ({
                    ...s,
                    status: 'Online' as const,
                    lastAction: 'Synced with CRM'
                })));

                // Add system message
                setMessages(prev => [...prev, {
                    id: String(Date.now()),
                    role: 'system',
                    name: 'System',
                    text: `All AI staff synced with ${crmType.toUpperCase()}. Staff data and CRM context updated.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);

                setIsSyncing(false);
            }, 2000);

        } catch (error) {
            console.error('Sync failed:', error);
            setIsSyncing(false);
        }
    };

    // Scan knowledge base
    const handleKnowledgeBaseScan = async () => {
        setShowKnowledgeBase(true);

        // Add system message about KB scan
        setMessages(prev => [...prev, {
            id: String(Date.now()),
            role: 'system',
            name: 'System',
            text: 'Knowledge Base scan initiated. AI staff will reference updated brand context and verified facts.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    // Send message to AI Staff
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || isSending) return;

        const userMessage: Message = {
            id: String(Date.now()),
            role: 'user',
            name: 'Admin',
            text: messageInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        setMessageInput('');
        setIsSending(true);

        try {
            // Call AI to generate response
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id');

            const response = await fetch(`${API_BASE}/api/staff/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: messageInput,
                    locationId,
                    context: {
                        aiStaff: aiStaff.map(s => ({ name: s.name, role: s.role, capabilities: s.capabilities })),
                        recentContacts: contacts.slice(0, 5)
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const agentResponse: Message = {
                    id: String(Date.now() + 1),
                    role: 'agent',
                    name: data.agentName || 'AI Receptionist',
                    text: data.response || 'I understand. Let me help you with that.',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    agentId: data.agentId || '1'
                };
                setMessages(prev => [...prev, agentResponse]);
            } else {
                // Fallback response
                const fallbackResponse = generateFallbackResponse(messageInput);
                setMessages(prev => [...prev, fallbackResponse]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const fallbackResponse = generateFallbackResponse(messageInput);
            setMessages(prev => [...prev, fallbackResponse]);
        } finally {
            setIsSending(false);
        }
    };

    // Generate intelligent fallback response
    const generateFallbackResponse = (input: string): Message => {
        const lowerInput = input.toLowerCase();
        let response = '';
        let agentName = 'AI Receptionist';
        let agentId = '1';

        if (lowerInput.includes('appointment') || lowerInput.includes('calendar') || lowerInput.includes('schedule') || lowerInput.includes('book')) {
            agentName = 'Appointment Setter';
            agentId = '2';
            response = 'I can help with scheduling. Let me check the calendar for available slots. Would you like me to send a booking link to the contact, or would you prefer to set a specific time?';
        } else if (lowerInput.includes('follow up') || lowerInput.includes('reactivate') || lowerInput.includes('cold lead') || lowerInput.includes('inactive')) {
            agentName = 'Recovery Agent';
            agentId = '3';
            response = 'I\'ll start a reactivation sequence for the specified contacts. My standard approach is a 3-touch SMS sequence over 7 days, followed by an email if no response. Should I proceed with this strategy?';
        } else if (lowerInput.includes('review') || lowerInput.includes('feedback') || lowerInput.includes('testimonial')) {
            agentName = 'Review Collector';
            agentId = '4';
            response = 'I can send review request messages to recent customers. I typically wait 7 days after a successful interaction before requesting a review. Would you like me to start with your most recent completed opportunities?';
        } else if (lowerInput.includes('call') || lowerInput.includes('phone') || lowerInput.includes('contact')) {
            response = 'I can handle inbound calls or help you prepare for outbound calls. Would you like me to pull up the contact\'s history and notes before the call?';
        } else if (lowerInput.includes('sarah') || lowerInput.includes('lead')) {
            response = 'Sarah Chen is currently a Hot lead with high engagement. Her last interaction was 2 hours ago. She\'s interested in your premium package. Would you like me to schedule a follow-up call or send additional information?';
        } else {
            response = 'Understood. I\'m analyzing your request and coordinating with the appropriate AI staff member. Is there anything specific you\'d like me to prioritize?';
        }

        return {
            id: String(Date.now() + 1),
            role: 'agent',
            name: agentName,
            text: response,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            agentId
        };
    };

    // Toggle AI staff status
    const toggleStaffStatus = (staffId: string) => {
        setAiStaff(prev => prev.map(s =>
            s.id === staffId ? { ...s, status: s.status === 'Online' ? 'Offline' : 'Online' } : s
        ));
        setActiveMenu(null);
    };

    // Filter lists based on search
    const filteredAiStaff = aiStaff.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredHumanStaff = humanStaff.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const currentList = subTab === 'ai' ? filteredAiStaff : subTab === 'human' ? filteredHumanStaff : filteredContacts;

    return (
        <div className="min-h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-y-auto transition-colors duration-500">
            <div className="p-6 md:p-10 space-y-6 flex-1 flex flex-col max-w-7xl mx-auto w-full">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Users className="h-3 w-3" /> Unified Neural Hub
                        </p>
                        <h1 className="text-4xl md:text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Staff <span className="text-neuro">& Contacts</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowStaffConfig(true)}
                        className="h-12 px-6 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-neuro/20 flex items-center gap-2 hover:scale-105 transition-transform self-start md:self-auto"
                    >
                        <Plus className="h-4 w-4" /> Add AI Staff
                    </button>
                </header>

                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                    {/* Left Panel: Navigation & List */}
                    <div className="w-full lg:w-96 flex flex-col space-y-4">
                        <div className="os-card p-1.5 flex bg-[var(--os-surface)] border border-[var(--os-border)]">
                            <button
                                onClick={() => setSubTab('ai')}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${subTab === 'ai' ? 'bg-neuro text-white shadow-lg shadow-neuro/20' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                <Bot className="h-3.5 w-3.5" /> AI ({aiStaff.filter(s => s.status === 'Online').length})
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

                        <div className="os-card flex-1 flex flex-col p-4 space-y-4 overflow-hidden min-h-[300px] lg:min-h-0">
                            <div className="flex items-center gap-2 px-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--os-text-muted)]" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold focus:border-neuro outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => subTab === 'contacts' && setIsLoading(true)}
                                    className="p-2 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <span className="text-[8px] font-black uppercase text-[var(--os-text-muted)] tracking-widest flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" /> {subTab === 'ai' ? 'AI Agents' : subTab === 'human' ? 'Team Members' : 'Recent Contacts'}
                                    </span>
                                    <span className="text-[8px] font-bold text-[var(--os-text-muted)]">{currentList.length} total</span>
                                </div>

                                {/* AI Staff List */}
                                {subTab === 'ai' && filteredAiStaff.map(staff => (
                                    <div
                                        key={staff.id}
                                        onClick={() => setSelectedChat(staff.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer group ${selectedChat === staff.id ? 'bg-neuro/10 border border-neuro/20' : 'hover:bg-[var(--os-surface)]'}`}
                                    >
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${staff.status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                            <Cpu className="h-5 w-5" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${selectedChat === staff.id ? 'text-neuro' : ''}`}>{staff.name}</h4>
                                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${staff.status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                                    {staff.status}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-bold text-[var(--os-text-muted)] truncate mt-0.5">{staff.lastAction}</p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === staff.id ? null : staff.id); }}
                                                className="p-1.5 hover:bg-[var(--os-bg)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreVertical className="h-4 w-4 text-[var(--os-text-muted)]" />
                                            </button>
                                            {activeMenu === staff.id && (
                                                <div className="absolute right-0 top-8 w-40 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl shadow-2xl z-50 overflow-hidden">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleStaffStatus(staff.id); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold hover:bg-neuro/10 hover:text-neuro"
                                                    >
                                                        {staff.status === 'Online' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                                        {staff.status === 'Online' ? 'Pause' : 'Activate'}
                                                    </button>
                                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold hover:bg-neuro/10 hover:text-neuro">
                                                        <Edit3 className="h-3.5 w-3.5" /> Configure
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Human Staff List */}
                                {subTab === 'human' && filteredHumanStaff.map(staff => (
                                    <button
                                        key={staff.id}
                                        onClick={() => setSelectedChat(staff.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${selectedChat === staff.id ? 'bg-neuro/10 border border-neuro/20' : 'hover:bg-[var(--os-surface)]'}`}
                                    >
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${selectedChat === staff.id ? 'text-neuro' : ''}`}>{staff.name}</h4>
                                                <span className={`text-[7px] font-bold ${staff.status === 'Online' ? 'text-emerald-500' : 'text-slate-400'}`}>{staff.status}</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-[var(--os-text-muted)] truncate mt-0.5">{staff.lastMsg}</p>
                                        </div>
                                    </button>
                                ))}

                                {/* Contacts List */}
                                {subTab === 'contacts' && filteredContacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => setSelectedChat(contact.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer group ${selectedChat === contact.id ? 'bg-neuro/10 border border-neuro/20' : 'hover:bg-[var(--os-surface)]'}`}
                                    >
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-neuro/10 text-neuro text-xs font-black">
                                            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${selectedChat === contact.id ? 'text-neuro' : ''}`}>{contact.name}</h4>
                                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${
                                                    contact.status === 'Hot' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    contact.status === 'Warm' ? 'bg-amber-500/10 text-amber-500' :
                                                    'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                    {contact.status}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-bold text-[var(--os-text-muted)] truncate mt-0.5">{contact.email}</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); window.open(`tel:${contact.phone}`); }}
                                                className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-500"
                                            >
                                                <Phone className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); window.open(`mailto:${contact.email}`); }}
                                                className="p-1.5 hover:bg-neuro/10 rounded-lg text-neuro"
                                            >
                                                <Mail className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {currentList.length === 0 && (
                                    <div className="p-8 text-center">
                                        <p className="text-[10px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest">No results found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Conversation Hub */}
                    <div className="flex-1 os-card flex flex-col bg-[var(--os-glass-bg)] relative overflow-hidden shadow-2xl rounded-[2rem] min-h-[400px]">
                        <div className="p-6 md:p-8 border-b border-[var(--os-border)] flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-neuro rounded-2xl flex items-center justify-center text-white shadow-lg shadow-neuro/20">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-black uppercase italic leading-none">
                                        {subTab === 'ai' ? 'Neural' : subTab === 'human' ? 'Staff' : 'Lead'} <span className="text-neuro">Sync</span>
                                    </h3>
                                    <p className="text-[10px] font-black text-[var(--os-text-muted)] uppercase tracking-widest mt-1 italic">
                                        {crmType === 'ghl' ? 'GHL' : 'Vbout'} Stream Active • {aiStaff.filter(s => s.status === 'Online').length} AI Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3">
                                <button
                                    onClick={handleSyncStaff}
                                    disabled={isSyncing}
                                    className={`p-2 md:p-3 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl transition-all ${isSyncing ? 'text-neuro animate-pulse' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                                    title="Sync AI Staff with CRM"
                                >
                                    <Zap className={`h-4 md:h-5 w-4 md:w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="p-2 md:p-3 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-[var(--os-text-muted)] hover:text-neuro transition-all"
                                    title="Staff Settings"
                                >
                                    <SettingsIcon className="h-4 md:h-5 w-4 md:w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 custom-scrollbar relative z-10">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        {msg.role === 'agent' && (
                                            <div className="h-6 w-6 rounded-lg bg-neuro/10 flex items-center justify-center text-neuro">
                                                <Cpu className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                        {msg.role === 'system' && (
                                            <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Sparkles className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                        <span className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">{msg.name}</span>
                                        {msg.role === 'user' && (
                                            <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                <User className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] text-sm font-semibold max-w-[90%] md:max-w-[70%] leading-relaxed shadow-sm ${
                                        msg.role === 'user'
                                            ? 'bg-neuro text-white rounded-tr-none shadow-neuro/10'
                                            : msg.role === 'system'
                                                ? 'bg-amber-500/10 text-[var(--os-text)] border border-amber-500/20 rounded-tl-none'
                                                : 'bg-white dark:bg-slate-800 text-[var(--os-text)] rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-slate-100/50'
                                    }`}>
                                        {msg.text}
                                        <div className={`text-[8px] mt-3 font-bold uppercase opacity-40 ${msg.role === 'user' ? 'text-white text-right' : 'text-slate-500'}`}>
                                            {msg.time} • {msg.role === 'agent' ? 'Neural Response' : msg.role === 'system' ? 'System' : 'Sent'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 md:p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md relative z-10">
                            <form onSubmit={handleSendMessage} className="relative group">
                                <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 md:gap-3">
                                    <button type="button" className="p-2 text-[var(--os-text-muted)] hover:text-neuro transition-colors">
                                        <Mic className="h-4 md:h-5 w-4 md:w-5" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    disabled={isSending}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] md:rounded-[2rem] pl-14 md:pl-16 pr-16 md:pr-24 py-4 md:py-5 text-sm font-bold text-[var(--os-text)] focus:border-neuro outline-none transition-all shadow-inner placeholder:text-slate-300 dark:placeholder:text-slate-600 disabled:opacity-50"
                                    placeholder={isSending ? 'AI is thinking...' : 'Command your AI staff...'}
                                />
                                <button
                                    type="submit"
                                    disabled={!messageInput.trim() || isSending}
                                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 h-10 md:h-12 w-10 md:w-12 bg-neuro text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-neuro/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {isSending ? (
                                        <RefreshCw className="h-4 md:h-5 w-4 md:w-5 animate-spin" />
                                    ) : (
                                        <Send className="h-4 md:h-5 w-4 md:w-5" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <button
                        onClick={() => setShowStaffConfig(true)}
                        className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-900/10"
                    >
                        <Sparkles className="h-3 md:h-4 w-3 md:w-4 text-neuro" /> Provision Intelligence
                    </button>
                    <button
                        onClick={handleKnowledgeBaseScan}
                        className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[var(--os-text)] text-[9px] font-black uppercase tracking-widest hover:border-neuro transition-all shadow-sm"
                    >
                        <BookOpen className="h-3 md:h-4 w-3 md:w-4 text-neuro" /> Knowledgebase Scan
                    </button>
                </div>
            </div>

            {/* Add AI Staff Modal */}
            {showStaffConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[var(--os-surface)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bot className="h-5 w-5 text-neuro" />
                                <h3 className="text-lg font-black uppercase">Configure AI Staff</h3>
                            </div>
                            <button onClick={() => setShowStaffConfig(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-[var(--os-text-muted)]">
                                Your AI Staff are pre-configured intelligent agents that can handle specific tasks autonomously. Toggle them on/off or customize their behavior.
                            </p>
                            <div className="space-y-3">
                                {aiStaff.map(staff => (
                                    <div key={staff.id} className="p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)] flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${staff.status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                                <Cpu className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm">{staff.name}</h4>
                                                <p className="text-[9px] text-[var(--os-text-muted)]">{staff.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleStaffStatus(staff.id)}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                staff.status === 'Online'
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            {staff.status === 'Online' ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-[var(--os-border)]">
                                <button
                                    onClick={() => {
                                        setShowStaffConfig(false);
                                        setMessages(prev => [...prev, {
                                            id: String(Date.now()),
                                            role: 'system',
                                            name: 'System',
                                            text: 'Custom AI Agent creation coming soon! For now, configure existing agents through the Brand Brain setup.',
                                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        }]);
                                    }}
                                    className="w-full h-12 bg-neuro text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                                >
                                    <Plus className="h-4 w-4" /> Create Custom AI Agent
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[var(--os-surface)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <SettingsIcon className="h-5 w-5 text-neuro" />
                                <h3 className="text-lg font-black uppercase">Staff Settings</h3>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--os-text-muted)]">Response Settings</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)]">
                                        <div>
                                            <h5 className="font-bold text-sm">Auto-Response</h5>
                                            <p className="text-[10px] text-[var(--os-text-muted)]">AI responds automatically without approval</p>
                                        </div>
                                        <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase bg-emerald-500 text-white">
                                            Enabled
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)]">
                                        <div>
                                            <h5 className="font-bold text-sm">Use Brand Voice</h5>
                                            <p className="text-[10px] text-[var(--os-text-muted)]">Align responses with Brand Brain settings</p>
                                        </div>
                                        <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase bg-emerald-500 text-white">
                                            Enabled
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)]">
                                        <div>
                                            <h5 className="font-bold text-sm">CRM Sync Interval</h5>
                                            <p className="text-[10px] text-[var(--os-text-muted)]">How often to sync with your CRM</p>
                                        </div>
                                        <select className="px-3 py-2 rounded-lg text-[10px] font-bold bg-[var(--os-surface)] border border-[var(--os-border)]">
                                            <option>5 min</option>
                                            <option>15 min</option>
                                            <option>30 min</option>
                                            <option>1 hour</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[var(--os-border)]">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-full h-12 bg-neuro text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                                >
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Knowledge Base Modal */}
            {showKnowledgeBase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-[var(--os-surface)] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BookOpen className="h-5 w-5 text-neuro" />
                                <h3 className="text-lg font-black uppercase">Knowledge Base</h3>
                            </div>
                            <button onClick={() => setShowKnowledgeBase(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            <p className="text-sm text-[var(--os-text-muted)]">
                                Your AI Staff reference this knowledge base for accurate, brand-aligned responses. Add FAQs, product info, policies, and verified facts.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Search knowledge base..."
                                        className="flex-1 px-4 py-3 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-sm focus:border-neuro outline-none"
                                    />
                                    <button className="px-4 py-3 bg-neuro text-white rounded-xl font-bold text-xs uppercase">
                                        Search
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)] hover:border-neuro/50 transition-all cursor-pointer">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="h-4 w-4 text-neuro" />
                                            <span className="text-xs font-bold uppercase">FAQ</span>
                                        </div>
                                        <p className="text-[10px] text-[var(--os-text-muted)]">12 entries</p>
                                    </div>
                                    <div className="p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)] hover:border-neuro/50 transition-all cursor-pointer">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package className="h-4 w-4 text-blue-500" />
                                            <span className="text-xs font-bold uppercase">Products</span>
                                        </div>
                                        <p className="text-[10px] text-[var(--os-text-muted)]">8 entries</p>
                                    </div>
                                    <div className="p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)] hover:border-neuro/50 transition-all cursor-pointer">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="h-4 w-4 text-emerald-500" />
                                            <span className="text-xs font-bold uppercase">Policies</span>
                                        </div>
                                        <p className="text-[10px] text-[var(--os-text-muted)]">5 entries</p>
                                    </div>
                                    <div className="p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)] hover:border-neuro/50 transition-all cursor-pointer">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="h-4 w-4 text-amber-500" />
                                            <span className="text-xs font-bold uppercase">Verified Facts</span>
                                        </div>
                                        <p className="text-[10px] text-[var(--os-text-muted)]">23 entries</p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[var(--os-border)] flex gap-3">
                                <button className="flex-1 h-12 bg-[var(--os-bg)] border border-[var(--os-border)] text-[var(--os-text)] rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:border-neuro transition-all">
                                    <Upload className="h-4 w-4" /> Import Docs
                                </button>
                                <button className="flex-1 h-12 bg-neuro text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                                    <Plus className="h-4 w-4" /> Add Entry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Staff;
