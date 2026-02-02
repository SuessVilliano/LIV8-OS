import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Send,
    Sparkles,
    User,
    Cpu,
    MessageSquare,
    Terminal,
    Zap,
    Mic,
    Loader2,
    Users,
    Bot,
    TrendingUp,
    Headphones,
    Shield,
    ChevronDown,
    CheckCircle2,
    AlertCircle,
    Settings
} from 'lucide-react';
import { generateActionPlan } from '../services/geminiService';
import { getBackendUrl } from '../services/api';

type PanelMode = 'staff' | 'mcp' | 'group';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    agentName?: string;
    metadata?: {
        sourcedFacts?: number;
        requiresApproval?: boolean;
        sopExecuted?: string;
    };
}

interface StaffRole {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    description: string;
}

const staffRoles: StaffRole[] = [
    { id: 'marketing', name: 'Marketing', icon: TrendingUp, color: 'violet', description: 'Content & campaigns' },
    { id: 'sales', name: 'Sales', icon: Zap, color: 'amber', description: 'Leads & closing' },
    { id: 'support', name: 'Support', icon: Headphones, color: 'emerald', description: 'FAQs & tickets' },
    { id: 'operations', name: 'Operations', icon: Users, color: 'blue', description: 'CRM & automations' },
    { id: 'manager', name: 'AI Manager', icon: Shield, color: 'rose', description: 'Reports & escalations' },
    { id: 'assistant', name: 'Assistant', icon: Bot, color: 'cyan', description: 'Tasks & reminders' }
];

interface UnifiedCommandPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const UnifiedCommandPanel: React.FC<UnifiedCommandPanelProps> = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState<PanelMode>('mcp');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffRole | null>(null);
    const [showStaffSelector, setShowStaffSelector] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const API_BASE = getBackendUrl();

    // Initialize with welcome message based on mode
    useEffect(() => {
        if (mode === 'mcp') {
            setMessages([{
                id: '1',
                role: 'assistant',
                content: 'Neural Command Hub initialized. I can help you with SEO audits, content drafts, analytics, and system operations. What would you like to do?',
                timestamp: new Date(),
                agentName: 'Core OS'
            }]);
        } else if (mode === 'staff' && !selectedStaff) {
            setMessages([{
                id: '1',
                role: 'system',
                content: 'Select an AI staff member to start chatting.',
                timestamp: new Date()
            }]);
        } else if (mode === 'group') {
            setMessages([{
                id: '1',
                role: 'system',
                content: 'Group chat with all AI staff. Messages here are seen by all team members.',
                timestamp: new Date()
            }]);
        }
    }, [mode]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen, mode]);

    // Start staff session when selected
    useEffect(() => {
        if (mode === 'staff' && selectedStaff) {
            startStaffSession(selectedStaff.id);
        }
    }, [selectedStaff]);

    const startStaffSession = async (role: string) => {
        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id') || 'default';

            const response = await fetch(`${API_BASE}/api/staff/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ locationId, agentRole: role })
            });

            if (response.ok) {
                const data = await response.json();
                setSessionId(data.session?.id);
                setMessages([{
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.greeting || `Hello! I'm your ${selectedStaff?.name}. How can I help you today?`,
                    timestamp: new Date(),
                    agentName: selectedStaff?.name
                }]);
            }
        } catch (error) {
            console.error('Failed to start staff session:', error);
            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: `Hello! I'm your ${selectedStaff?.name}. How can I help you today?`,
                timestamp: new Date(),
                agentName: selectedStaff?.name
            }]);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const userMessage = input.trim();
        setInput('');
        setIsProcessing(true);

        // Add user message
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            if (mode === 'mcp') {
                // MCP mode - use Gemini for action planning
                const actionPlan = await generateActionPlan(userMessage, { source: 'command_panel' });
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: actionPlan.summary || "Command processed. Executing workflow...",
                    timestamp: new Date(),
                    agentName: 'Orchestrator'
                }]);
            } else if (mode === 'staff' && selectedStaff) {
                // Staff mode - call staff API
                const token = localStorage.getItem('os_token');
                const locationId = localStorage.getItem('os_loc_id') || 'default';

                const response = await fetch(`${API_BASE}/api/staff/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        locationId,
                        agentRole: selectedStaff.id,
                        message: userMessage,
                        sessionId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: data.response || "I've processed your request.",
                        timestamp: new Date(),
                        agentName: selectedStaff.name,
                        metadata: data.metadata
                    }]);
                } else {
                    throw new Error('Staff API error');
                }
            } else if (mode === 'group') {
                // Group mode - broadcast to all staff
                const actionPlan = await generateActionPlan(
                    `[GROUP] ${userMessage}. Respond as a team considering marketing, sales, support, and operations perspectives.`,
                    { source: 'group_chat' }
                );
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: actionPlan.summary || "Team is processing your request...",
                    timestamp: new Date(),
                    agentName: 'AI Team'
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I encountered an error. Please try again or check your connection.",
                timestamp: new Date(),
                agentName: 'System'
            }]);
        } finally {
            setIsProcessing(false);
            inputRef.current?.focus();
        }
    };

    const selectStaff = (staff: StaffRole) => {
        setSelectedStaff(staff);
        setShowStaffSelector(false);
        setMessages([]);
        setSessionId(null);
    };

    const getStaffColor = (color: string) => {
        const colors: Record<string, string> = {
            violet: 'bg-violet-500',
            amber: 'bg-amber-500',
            emerald: 'bg-emerald-500',
            blue: 'bg-blue-500',
            rose: 'bg-rose-500',
            cyan: 'bg-cyan-500'
        };
        return colors[color] || 'bg-neuro';
    };

    const getModeIcon = () => {
        switch (mode) {
            case 'staff': return selectedStaff?.icon || Bot;
            case 'mcp': return Terminal;
            case 'group': return Users;
        }
    };

    const getModeTitle = () => {
        switch (mode) {
            case 'staff': return selectedStaff?.name || 'AI Staff';
            case 'mcp': return 'Neural Command';
            case 'group': return 'Team Chat';
        }
    };

    const ModeIcon = getModeIcon();

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <aside className={`fixed top-0 right-0 h-full w-full md:w-[420px] bg-[var(--os-bg)] border-l border-[var(--os-border)] shadow-2xl z-[110] transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Mode Tabs */}
                    <div className="flex border-b border-[var(--os-border)] bg-[var(--os-surface)]">
                        {[
                            { id: 'mcp', label: 'MCP', icon: Terminal },
                            { id: 'staff', label: 'Staff', icon: Bot },
                            { id: 'group', label: 'Group', icon: Users }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setMode(tab.id as PanelMode);
                                    if (tab.id === 'staff') setShowStaffSelector(true);
                                }}
                                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all ${
                                    mode === tab.id
                                        ? 'text-neuro border-b-2 border-neuro bg-neuro/5'
                                        : 'text-[var(--os-text-muted)] hover:text-neuro'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                        <button
                            onClick={onClose}
                            className="p-3 text-[var(--os-text-muted)] hover:text-red-500 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Header */}
                    <div className="p-4 border-b border-[var(--os-border)] bg-[var(--os-surface)]/50">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                mode === 'staff' && selectedStaff
                                    ? getStaffColor(selectedStaff.color)
                                    : 'bg-neuro'
                            }`}>
                                <ModeIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-sm">{getModeTitle()}</h2>
                                <p className="text-xs text-[var(--os-text-muted)]">
                                    {mode === 'mcp' && 'OS Commands & Actions'}
                                    {mode === 'staff' && (selectedStaff?.description || 'Select a team member')}
                                    {mode === 'group' && 'Broadcast to all AI staff'}
                                </p>
                            </div>
                            {mode === 'staff' && selectedStaff && (
                                <button
                                    onClick={() => setShowStaffSelector(true)}
                                    className="p-2 hover:bg-[var(--os-bg)] rounded-lg"
                                >
                                    <ChevronDown className="h-4 w-4 text-[var(--os-text-muted)]" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Staff Selector */}
                    {mode === 'staff' && showStaffSelector && (
                        <div className="p-4 border-b border-[var(--os-border)] bg-[var(--os-surface)]/30">
                            <p className="text-xs text-[var(--os-text-muted)] mb-3">Select AI Staff:</p>
                            <div className="grid grid-cols-3 gap-2">
                                {staffRoles.map(staff => (
                                    <button
                                        key={staff.id}
                                        onClick={() => selectStaff(staff)}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            selectedStaff?.id === staff.id
                                                ? 'border-neuro bg-neuro/10'
                                                : 'border-[var(--os-border)] hover:border-neuro/50'
                                        }`}
                                    >
                                        <staff.icon className={`h-5 w-5 mx-auto mb-1 ${
                                            selectedStaff?.id === staff.id ? 'text-neuro' : 'text-[var(--os-text-muted)]'
                                        }`} />
                                        <span className="text-[10px] font-bold block">{staff.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                    msg.role === 'user'
                                        ? 'bg-neuro'
                                        : msg.role === 'system'
                                            ? 'bg-[var(--os-surface)] border border-[var(--os-border)]'
                                            : mode === 'staff' && selectedStaff
                                                ? getStaffColor(selectedStaff.color)
                                                : 'bg-neuro/80'
                                }`}>
                                    {msg.role === 'user' ? (
                                        <User className="h-4 w-4 text-white" />
                                    ) : msg.role === 'system' ? (
                                        <Settings className="h-4 w-4 text-[var(--os-text-muted)]" />
                                    ) : (
                                        <Cpu className="h-4 w-4 text-white" />
                                    )}
                                </div>

                                <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                                    {msg.agentName && msg.role === 'assistant' && (
                                        <span className="text-[10px] font-bold text-[var(--os-text-muted)] uppercase tracking-wider mb-1 block">
                                            {msg.agentName}
                                        </span>
                                    )}
                                    <div className={`rounded-2xl px-4 py-3 ${
                                        msg.role === 'user'
                                            ? 'bg-neuro text-white rounded-tr-none'
                                            : msg.role === 'system'
                                                ? 'bg-[var(--os-surface)]/50 text-[var(--os-text-muted)] text-center italic'
                                                : 'bg-[var(--os-surface)] border border-[var(--os-border)] rounded-tl-none'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>

                                    {/* Metadata badges */}
                                    {msg.metadata && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {msg.metadata.sourcedFacts && msg.metadata.sourcedFacts > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {msg.metadata.sourcedFacts} facts
                                                </span>
                                            )}
                                            {msg.metadata.requiresApproval && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Needs approval
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-[10px] text-[var(--os-text-muted)] mt-1">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isProcessing && (
                            <div className="flex gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    mode === 'staff' && selectedStaff
                                        ? getStaffColor(selectedStaff.color)
                                        : 'bg-neuro'
                                }`}>
                                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                                </div>
                                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl rounded-tl-none px-4 py-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-[var(--os-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-[var(--os-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-[var(--os-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    {mode === 'mcp' && (
                        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-[var(--os-border)]">
                            {[
                                { label: 'SEO Audit', icon: Zap },
                                { label: 'Draft Post', icon: MessageSquare },
                                { label: 'Check Vitals', icon: Sparkles }
                            ].map(action => (
                                <button
                                    key={action.label}
                                    onClick={() => setInput(action.label)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--os-surface)] border border-[var(--os-border)] text-[10px] font-bold text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro transition-all whitespace-nowrap"
                                >
                                    <action.icon className="h-3 w-3" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 bg-[var(--os-surface)]/50 border-t border-[var(--os-border)]">
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={
                                    mode === 'staff' && !selectedStaff
                                        ? 'Select a staff member first...'
                                        : mode === 'mcp'
                                            ? 'Type a command or question...'
                                            : 'Message the team...'
                                }
                                disabled={isProcessing || (mode === 'staff' && !selectedStaff)}
                                className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none transition-all disabled:opacity-50"
                            />
                            <button
                                type="button"
                                className="p-3 text-[var(--os-text-muted)] hover:text-neuro transition-colors"
                            >
                                <Mic className="h-4 w-4" />
                            </button>
                            <button
                                type="submit"
                                disabled={!input.trim() || isProcessing || (mode === 'staff' && !selectedStaff)}
                                className="h-12 w-12 bg-neuro text-white rounded-xl flex items-center justify-center hover:bg-neuro/90 transition-all disabled:opacity-50"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default UnifiedCommandPanel;
