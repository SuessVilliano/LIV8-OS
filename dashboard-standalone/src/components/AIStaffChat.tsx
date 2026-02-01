import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    Bot,
    User,
    TrendingUp,
    Users,
    Headphones,
    Zap,
    Shield,
    Sparkles,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronDown
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
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
    { id: 'marketing', name: 'Marketing Manager', icon: TrendingUp, color: 'violet', description: 'Content, campaigns, SEO' },
    { id: 'sales', name: 'Sales Agent', icon: Zap, color: 'amber', description: 'Leads, objections, closing' },
    { id: 'support', name: 'Support Agent', icon: Headphones, color: 'emerald', description: 'FAQs, tickets, routing' },
    { id: 'operations', name: 'Operations', icon: Users, color: 'blue', description: 'CRM, automations, data' },
    { id: 'manager', name: 'AI Manager', icon: Shield, color: 'rose', description: 'Reports, escalations' },
    { id: 'assistant', name: 'Personal Assistant', icon: Bot, color: 'cyan', description: 'Tasks, reminders, updates' }
];

interface AIStaffChatProps {
    locationId: string;
    onClose?: () => void;
    initialRole?: string;
}

const AIStaffChat: React.FC<AIStaffChatProps> = ({ locationId, onClose, initialRole }) => {
    const [selectedRole, setSelectedRole] = useState<StaffRole | null>(
        initialRole ? staffRoles.find(r => r.id === initialRole) || null : null
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showRoleSelector, setShowRoleSelector] = useState(!initialRole);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'https://liv8-backend.onrender.com';

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (selectedRole) {
            startSession(selectedRole.id);
        }
    }, [selectedRole]);

    const startSession = async (role: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/staff/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ locationId, agentRole: role })
            });

            if (response.ok) {
                const data = await response.json();
                setSessionId(data.session.id);
                setMessages([{
                    role: 'assistant',
                    content: data.greeting,
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Failed to start session:', error);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || !selectedRole || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

        // Add user message immediately
        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        }]);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/staff/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    locationId,
                    agentRole: selectedRole.id,
                    message: userMessage,
                    sessionId
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date(),
                    metadata: {
                        sourcedFacts: data.metadata?.sourcedFacts?.length || 0,
                        requiresApproval: data.metadata?.requiresApproval,
                        sopExecuted: data.metadata?.sopExecuted
                    }
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'I apologize, but I encountered an error. Please try again.',
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Connection error. Please check your internet and try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const selectRole = (role: StaffRole) => {
        setSelectedRole(role);
        setShowRoleSelector(false);
        setMessages([]);
        setSessionId(null);
    };

    const getRoleColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            violet: { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500' },
            amber: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500' },
            emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500' },
            blue: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
            rose: { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500' },
            cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500' }
        };
        return colors[color] || colors.violet;
    };

    return (
        <div className="flex flex-col h-full bg-[var(--os-bg)] rounded-2xl border border-[var(--os-border)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--os-border)] bg-[var(--os-surface)]">
                {selectedRole ? (
                    <button
                        onClick={() => setShowRoleSelector(true)}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                        <div className={`h-10 w-10 rounded-xl ${getRoleColorClasses(selectedRole.color).bg} flex items-center justify-center`}>
                            <selectedRole.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-sm">{selectedRole.name}</h3>
                            <p className="text-xs text-[var(--os-text-muted)]">{selectedRole.description}</p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-[var(--os-text-muted)]" />
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-neuro flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">AI Staff</h3>
                            <p className="text-xs text-[var(--os-text-muted)]">Select a team member</p>
                        </div>
                    </div>
                )}

                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--os-bg)] rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-[var(--os-text-muted)]" />
                    </button>
                )}
            </div>

            {/* Role Selector */}
            {showRoleSelector && (
                <div className="p-4 border-b border-[var(--os-border)] bg-[var(--os-surface)]">
                    <p className="text-sm text-[var(--os-text-muted)] mb-3">Choose who to talk to:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {staffRoles.map((role) => {
                            const colors = getRoleColorClasses(role.color);
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => selectRole(role)}
                                    className={`p-3 rounded-xl border transition-all text-left hover:border-neuro ${
                                        selectedRole?.id === role.id
                                            ? `${colors.border} bg-opacity-10`
                                            : 'border-[var(--os-border)] hover:bg-[var(--os-bg)]'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <role.icon className={`h-4 w-4 ${colors.text}`} />
                                        <span className="font-medium text-xs">{role.name}</span>
                                    </div>
                                    <p className="text-xs text-[var(--os-text-muted)]">{role.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            message.role === 'user'
                                ? 'bg-neuro'
                                : selectedRole
                                    ? getRoleColorClasses(selectedRole.color).bg
                                    : 'bg-[var(--os-surface)]'
                        }`}>
                            {message.role === 'user' ? (
                                <User className="h-4 w-4 text-white" />
                            ) : (
                                selectedRole ? (
                                    <selectedRole.icon className="h-4 w-4 text-white" />
                                ) : (
                                    <Bot className="h-4 w-4 text-[var(--os-text-muted)]" />
                                )
                            )}
                        </div>

                        <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`rounded-2xl px-4 py-3 ${
                                message.role === 'user'
                                    ? 'bg-neuro text-white rounded-tr-none'
                                    : 'bg-[var(--os-surface)] border border-[var(--os-border)] rounded-tl-none'
                            }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>

                            {/* Metadata badges */}
                            {message.role === 'assistant' && message.metadata && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {message.metadata.sourcedFacts && message.metadata.sourcedFacts > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {message.metadata.sourcedFacts} verified facts
                                        </span>
                                    )}
                                    {message.metadata.sopExecuted && (
                                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                            Following: {message.metadata.sopExecuted}
                                        </span>
                                    )}
                                    {message.metadata.requiresApproval && (
                                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                            <AlertCircle className="h-3 w-3" />
                                            Needs approval
                                        </span>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-[var(--os-text-muted)] mt-1">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            selectedRole ? getRoleColorClasses(selectedRole.color).bg : 'bg-[var(--os-surface)]'
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

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--os-border)] bg-[var(--os-surface)]">
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={selectedRole ? `Message ${selectedRole.name}...` : 'Select a team member first'}
                        disabled={!selectedRole || isLoading}
                        className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!selectedRole || !inputValue.trim() || isLoading}
                        className="h-12 w-12 bg-neuro text-white rounded-xl flex items-center justify-center hover:bg-neuro-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>

                <p className="text-xs text-[var(--os-text-muted)] mt-2 text-center">
                    All responses are grounded in your verified knowledge base
                </p>
            </div>
        </div>
    );
};

export default AIStaffChat;
