import { useState, useEffect } from 'react';
import {
    Bot,
    MessageSquareCode,
    Phone,
    Play,
    RefreshCw,
    ChevronRight,
    Loader2,
    Zap,
    Brain,
    Settings,
    Plus,
    Eye,
    Send,
    Activity,
    Globe,
    Wrench,
    BarChart3,
    Network,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    MessageCircle
} from 'lucide-react';
import { apiCall } from '../services/api';

type AgentTab = 'overview' | 'studio' | 'conversation' | 'voice' | 'ask-ai' | 'mcp';

interface AgentStudioAgent {
    id: string;
    name: string;
    status: string;
    description?: string;
    lifecycleStage?: string;
    toolNodes?: any[];
    variables?: any[];
    createdAt?: string;
}

interface ConversationAIAgent {
    id: string;
    name: string;
    status: string;
    type?: string;
    channels?: string[];
    actions?: any[];
}

interface VoiceAIAgent {
    id: string;
    name: string;
    status?: string;
    voiceId?: string;
    language?: string;
}

interface AgentMapping {
    id: string;
    agentId: string;
    agentName: string;
    description: string;
    capabilities: string[];
    variables: any[];
}

interface ExecutionResult {
    success: boolean;
    result: any;
    executionId?: string;
    agentName?: string;
    status?: string;
}

const AgentStudio = () => {
    const [activeTab, setActiveTab] = useState<AgentTab>('overview');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Overview state
    const [overviewData, setOverviewData] = useState<any>(null);

    // Agent Studio state
    const [studioAgents, setStudioAgents] = useState<AgentStudioAgent[]>([]);
    const [selectedStudioAgent, setSelectedStudioAgent] = useState<AgentStudioAgent | null>(null);
    const [executeInput, setExecuteInput] = useState('');
    const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
    const [executionId, setExecutionId] = useState<string | undefined>();
    const [executing, setExecuting] = useState(false);

    // Conversation AI state
    const [conversationAgents, setConversationAgents] = useState<ConversationAIAgent[]>([]);
    const [generations, setGenerations] = useState<any[]>([]);

    // Voice AI state
    const [voiceAgents, setVoiceAgents] = useState<VoiceAIAgent[]>([]);
    const [callLogs, setCallLogs] = useState<any[]>([]);

    // Ask AI state
    const [askAiQuery, setAskAiQuery] = useState('');
    const [askAiResult, setAskAiResult] = useState<any>(null);
    const [askAiLoading, setAskAiLoading] = useState(false);
    const [agentMappings, setAgentMappings] = useState<AgentMapping[]>([]);

    // MCP state
    const [mcpTools, setMcpTools] = useState<any[]>([]);

    const getHeaders = () => {
        const ghlToken = localStorage.getItem('os_api_key') || '';
        const locationId = localStorage.getItem('os_loc_id') || '';
        return {
            'x-ghl-token': ghlToken,
            'x-location-id': locationId
        };
    };

    // Load overview on mount
    useEffect(() => {
        loadOverview();
    }, []);

    useEffect(() => {
        switch (activeTab) {
            case 'studio': loadStudioAgents(); break;
            case 'conversation': loadConversationAgents(); break;
            case 'voice': loadVoiceAgents(); break;
            case 'ask-ai': loadAgentMappings(); break;
            case 'mcp': loadMCPTools(); break;
        }
    }, [activeTab]);

    async function loadOverview() {
        setLoading(true);
        setError(null);
        try {
            const data = await apiCall('/api/agent-studio/overview', { headers: getHeaders() });
            setOverviewData(data.overview);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadStudioAgents() {
        setLoading(true);
        try {
            const data = await apiCall('/api/agent-studio/agents', { headers: getHeaders() });
            setStudioAgents(data.agents || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadConversationAgents() {
        setLoading(true);
        try {
            const [agentsData, gensData] = await Promise.allSettled([
                apiCall('/api/agent-studio/conversation-ai/agents', { headers: getHeaders() }),
                apiCall('/api/agent-studio/conversation-ai/generations?limit=20', { headers: getHeaders() })
            ]);
            if (agentsData.status === 'fulfilled') setConversationAgents(agentsData.value.agents || []);
            if (gensData.status === 'fulfilled') setGenerations(gensData.value.generations || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadVoiceAgents() {
        setLoading(true);
        try {
            const [agentsData, callsData] = await Promise.allSettled([
                apiCall('/api/agent-studio/voice-ai/agents', { headers: getHeaders() }),
                apiCall('/api/agent-studio/voice-ai/calls?limit=20', { headers: getHeaders() })
            ]);
            if (agentsData.status === 'fulfilled') setVoiceAgents(agentsData.value.agents || []);
            if (callsData.status === 'fulfilled') setCallLogs(callsData.value.calls || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadAgentMappings() {
        try {
            const data = await apiCall('/api/ask-ai/mappings', { headers: getHeaders() });
            setAgentMappings(data.mappings || []);
        } catch (e: any) {
            console.error('Load mappings error:', e);
        }
    }

    async function loadMCPTools() {
        setLoading(true);
        try {
            const data = await apiCall('/api/agent-studio/mcp/tools', { headers: getHeaders() });
            setMcpTools(data.tools || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function executeAgent() {
        if (!selectedStudioAgent || !executeInput.trim()) return;
        setExecuting(true);
        setExecutionResult(null);
        try {
            const data = await apiCall(`/api/agent-studio/agents/${selectedStudioAgent.id}/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ input: executeInput, executionId })
            });
            setExecutionResult(data);
            setExecutionId(data.executionId);
        } catch (e: any) {
            setExecutionResult({ success: false, result: e.message });
        } finally {
            setExecuting(false);
        }
    }

    async function askAI() {
        if (!askAiQuery.trim()) return;
        setAskAiLoading(true);
        setAskAiResult(null);
        try {
            const data = await apiCall('/api/ask-ai/query', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ query: askAiQuery })
            });
            setAskAiResult(data);
        } catch (e: any) {
            setAskAiResult({ success: false, error: e.message });
        } finally {
            setAskAiLoading(false);
        }
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Network },
        { id: 'studio', label: 'Agent Studio', icon: Bot },
        { id: 'conversation', label: 'Conversation AI', icon: MessageSquareCode },
        { id: 'voice', label: 'Voice AI', icon: Phone },
        { id: 'ask-ai', label: 'Ask AI', icon: Sparkles },
        { id: 'mcp', label: 'MCP Bridge', icon: Globe }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--os-text)]">
                        GHL Agent Studio
                    </h1>
                    <p className="text-sm text-[var(--os-text-muted)] mt-1">
                        Manage AI agents, execute workflows, and bridge with GHL's native MCP server
                    </p>
                </div>
                <button
                    onClick={loadOverview}
                    className="flex items-center gap-2 px-4 py-2 bg-neuro text-white rounded-xl font-bold text-xs hover:scale-105 transition-all"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-[var(--os-surface)] rounded-xl overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AgentTab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-neuro text-white shadow-lg shadow-neuro/20'
                                : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-glass-bg)]'
                        }`}
                    >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 text-xs">Dismiss</button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-neuro" />
                </div>
            )}

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && !loading && overviewData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Agent Studio Card */}
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <Bot className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-[var(--os-text)]">Agent Studio</h3>
                                <p className="text-xs text-[var(--os-text-muted)]">{(overviewData.agentStudio?.agents || []).length} agents</p>
                            </div>
                        </div>
                        {overviewData.agentStudio?.agents?.slice(0, 3).map((a: any) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-[var(--os-text-muted)]">
                                <CheckCircle2 className="h-3 w-3 text-green-400" />
                                {a.name}
                            </div>
                        ))}
                        <button onClick={() => setActiveTab('studio')} className="text-xs text-neuro font-bold flex items-center gap-1 hover:underline">
                            View All <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>

                    {/* Conversation AI Card */}
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <MessageSquareCode className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-[var(--os-text)]">Conversation AI</h3>
                                <p className="text-xs text-[var(--os-text-muted)]">{(overviewData.conversationAI?.agents || []).length} agents</p>
                            </div>
                        </div>
                        {overviewData.conversationAI?.agents?.slice(0, 3).map((a: any) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-[var(--os-text-muted)]">
                                <MessageCircle className="h-3 w-3 text-blue-400" />
                                {a.name}
                            </div>
                        ))}
                        <button onClick={() => setActiveTab('conversation')} className="text-xs text-neuro font-bold flex items-center gap-1 hover:underline">
                            View All <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>

                    {/* Voice AI Card */}
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <Phone className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-[var(--os-text)]">Voice AI</h3>
                                <p className="text-xs text-[var(--os-text-muted)]">{(overviewData.voiceAI?.agents || []).length} agents</p>
                            </div>
                        </div>
                        {overviewData.voiceAI?.agents?.slice(0, 3).map((a: any) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-[var(--os-text-muted)]">
                                <Phone className="h-3 w-3 text-green-400" />
                                {a.name}
                            </div>
                        ))}
                        <button onClick={() => setActiveTab('voice')} className="text-xs text-neuro font-bold flex items-center gap-1 hover:underline">
                            View All <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* AGENT STUDIO TAB */}
            {activeTab === 'studio' && !loading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Agent List */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-sm text-[var(--os-text)]">Production Agents</h3>
                        {studioAgents.length === 0 && (
                            <p className="text-xs text-[var(--os-text-muted)] py-4">No agents found. Create agents in GHL Agent Studio and promote to Production.</p>
                        )}
                        {studioAgents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => { setSelectedStudioAgent(agent); setExecutionResult(null); setExecutionId(undefined); }}
                                className={`w-full text-left bg-[var(--os-surface)] border rounded-xl p-4 transition-all hover:border-neuro ${
                                    selectedStudioAgent?.id === agent.id ? 'border-neuro shadow-lg shadow-neuro/10' : 'border-[var(--os-border)]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-[var(--os-text)] truncate">{agent.name}</p>
                                        <p className="text-xs text-[var(--os-text-muted)]">
                                            {agent.status} {agent.lifecycleStage ? `- ${agent.lifecycleStage}` : ''}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-[var(--os-text-muted)]" />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Execute Panel */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-sm text-[var(--os-text)]">Execute Agent</h3>
                        {selectedStudioAgent ? (
                            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Brain className="h-5 w-5 text-neuro" />
                                    <span className="font-bold text-sm text-[var(--os-text)]">{selectedStudioAgent.name}</span>
                                </div>

                                <div className="relative">
                                    <textarea
                                        value={executeInput}
                                        onChange={(e) => setExecuteInput(e.target.value)}
                                        placeholder="Enter your input for the agent..."
                                        rows={4}
                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-3 text-sm text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:border-neuro focus:ring-1 focus:ring-neuro outline-none resize-none"
                                    />
                                </div>

                                {executionId && (
                                    <p className="text-xs text-[var(--os-text-muted)]">
                                        Conversation thread: <code className="text-neuro">{executionId.slice(0, 12)}...</code>
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={executeAgent}
                                        disabled={executing || !executeInput.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neuro text-white rounded-xl font-bold text-xs hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                        {executing ? 'Running...' : 'Execute'}
                                    </button>
                                    {executionId && (
                                        <button
                                            onClick={() => { setExecutionId(undefined); setExecutionResult(null); setExecuteInput(''); }}
                                            className="px-4 py-2.5 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl font-bold text-xs text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
                                        >
                                            New Thread
                                        </button>
                                    )}
                                </div>

                                {/* Result */}
                                {executionResult && (
                                    <div className={`rounded-xl p-4 text-sm ${executionResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                        <p className="font-bold text-xs mb-2 text-[var(--os-text)]">
                                            {executionResult.success ? 'Agent Output' : 'Error'}
                                        </p>
                                        <pre className="text-xs text-[var(--os-text-muted)] whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                                            {typeof executionResult.result === 'string'
                                                ? executionResult.result
                                                : JSON.stringify(executionResult.result, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-8 text-center">
                                <Bot className="h-12 w-12 text-[var(--os-text-muted)] mx-auto mb-3 opacity-30" />
                                <p className="text-sm text-[var(--os-text-muted)]">Select an agent to execute</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CONVERSATION AI TAB */}
            {activeTab === 'conversation' && !loading && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {conversationAgents.map(agent => (
                            <div key={agent.id} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <MessageSquareCode className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-[var(--os-text)] truncate">{agent.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-block w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                            <span className="text-xs text-[var(--os-text-muted)]">{agent.status}</span>
                                        </div>
                                    </div>
                                </div>
                                {agent.channels && (
                                    <div className="flex flex-wrap gap-1">
                                        {agent.channels.map(ch => (
                                            <span key={ch} className="px-2 py-0.5 text-[10px] font-bold bg-neuro/10 text-neuro rounded-full">{ch}</span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg text-xs font-bold text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro transition-all">
                                        <Eye className="h-3 w-3" /> View
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg text-xs font-bold text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro transition-all">
                                        <Settings className="h-3 w-3" /> Actions
                                    </button>
                                </div>
                            </div>
                        ))}
                        {conversationAgents.length === 0 && (
                            <div className="col-span-full text-center py-8 text-sm text-[var(--os-text-muted)]">
                                No Conversation AI agents found. Create them in GHL Conversation AI settings.
                            </div>
                        )}
                    </div>

                    {/* Generations */}
                    {generations.length > 0 && (
                        <div>
                            <h3 className="font-bold text-sm text-[var(--os-text)] mb-3 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-neuro" /> Recent AI Generations
                            </h3>
                            <div className="space-y-2">
                                {generations.slice(0, 5).map((gen: any, i: number) => (
                                    <div key={i} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-3 flex items-center gap-3">
                                        <Activity className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-[var(--os-text)] truncate">{gen.response || gen.message || 'Generation'}</p>
                                            <p className="text-[10px] text-[var(--os-text-muted)]">{gen.agentName || gen.agentId} - {gen.createdAt || ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VOICE AI TAB */}
            {activeTab === 'voice' && !loading && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {voiceAgents.map(agent => (
                            <div key={agent.id} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 bg-green-500/20 rounded-xl flex items-center justify-center">
                                        <Phone className="h-4 w-4 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-[var(--os-text)]">{agent.name}</p>
                                        <p className="text-xs text-[var(--os-text-muted)]">{agent.language || 'en-US'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {voiceAgents.length === 0 && (
                            <div className="col-span-full text-center py-8 text-sm text-[var(--os-text-muted)]">
                                No GHL Voice AI agents found. Create them in GHL Voice AI settings.
                            </div>
                        )}
                    </div>

                    {/* Call Logs */}
                    {callLogs.length > 0 && (
                        <div>
                            <h3 className="font-bold text-sm text-[var(--os-text)] mb-3 flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-400" /> Recent Call Logs
                            </h3>
                            <div className="space-y-2">
                                {callLogs.slice(0, 10).map((call: any, i: number) => (
                                    <div key={i} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-3 flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-green-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-[var(--os-text)]">{call.agentName || call.agentId} - {call.callType || 'call'}</p>
                                            <p className="text-[10px] text-[var(--os-text-muted)]">
                                                {call.duration ? `${Math.round(call.duration / 60)}min` : ''} {call.createdAt || ''}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                            call.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {call.status || 'unknown'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ASK AI TAB */}
            {activeTab === 'ask-ai' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Ask AI Chat */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-neuro" />
                                <h3 className="font-bold text-sm text-[var(--os-text)]">Ask AI</h3>
                                <span className="text-xs text-[var(--os-text-muted)]">Routes to the best matching agent automatically</span>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={askAiQuery}
                                    onChange={(e) => setAskAiQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(); } }}
                                    placeholder="Ask anything... e.g. 'Create ad copy for summer sale' or 'Generate a follow-up email'"
                                    rows={3}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-3 pr-12 text-sm text-[var(--os-text)] placeholder-[var(--os-text-muted)] focus:border-neuro focus:ring-1 focus:ring-neuro outline-none resize-none"
                                />
                                <button
                                    onClick={askAI}
                                    disabled={askAiLoading || !askAiQuery.trim()}
                                    className="absolute bottom-3 right-3 h-8 w-8 bg-neuro rounded-lg flex items-center justify-center text-white hover:scale-110 transition-all disabled:opacity-50"
                                >
                                    {askAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Ask AI Result */}
                            {askAiResult && (
                                <div className={`rounded-xl p-4 ${askAiResult.success ? 'bg-[var(--os-bg)] border border-[var(--os-border)]' : 'bg-red-500/10 border border-red-500/20'}`}>
                                    {askAiResult.agentName && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="h-3.5 w-3.5 text-neuro" />
                                            <span className="text-xs font-bold text-neuro">
                                                {askAiResult.status === 'needs_input' ? 'Needs Input' : `Ran: ${askAiResult.agentName}`}
                                            </span>
                                        </div>
                                    )}
                                    {askAiResult.status === 'needs_input' && askAiResult.missingVariables && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-[var(--os-text-muted)]">The agent needs more information:</p>
                                            {askAiResult.missingVariables.map((v: any) => (
                                                <div key={v.name} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-[var(--os-text)]">{v.name}:</span>
                                                    <span className="text-xs text-[var(--os-text-muted)]">{v.description || v.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {askAiResult.result && (
                                        <pre className="text-xs text-[var(--os-text-muted)] whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                                            {typeof askAiResult.result === 'string'
                                                ? askAiResult.result
                                                : JSON.stringify(askAiResult.result, null, 2)}
                                        </pre>
                                    )}
                                    {askAiResult.error && (
                                        <p className="text-xs text-red-400">{askAiResult.error}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agent Mappings */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-[var(--os-text)]">Mapped Agents</h3>
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-neuro/10 text-neuro rounded-lg text-xs font-bold hover:bg-neuro/20 transition-all">
                                <Plus className="h-3 w-3" /> Map Agent
                            </button>
                        </div>
                        {agentMappings.map(mapping => (
                            <div key={mapping.id} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-3 space-y-2">
                                <p className="font-bold text-xs text-[var(--os-text)]">{mapping.agentName}</p>
                                <p className="text-[10px] text-[var(--os-text-muted)]">{mapping.description}</p>
                                <div className="flex flex-wrap gap-1">
                                    {mapping.capabilities.map(cap => (
                                        <span key={cap} className="px-1.5 py-0.5 text-[9px] font-bold bg-neuro/10 text-neuro rounded-full">{cap}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {agentMappings.length === 0 && (
                            <p className="text-xs text-[var(--os-text-muted)] py-4 text-center">
                                No agents mapped yet. Map Agent Studio agents to enable intelligent routing.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* MCP BRIDGE TAB */}
            {activeTab === 'mcp' && !loading && (
                <div className="space-y-4">
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <Globe className="h-5 w-5 text-neuro" />
                            <div>
                                <h3 className="font-bold text-sm text-[var(--os-text)]">GHL Native MCP Server Bridge</h3>
                                <p className="text-xs text-[var(--os-text-muted)]">
                                    Connect AI assistants directly to your GHL data via the Model Context Protocol
                                </p>
                            </div>
                        </div>
                        <div className="bg-[var(--os-bg)] rounded-xl p-3 text-xs font-mono text-[var(--os-text-muted)]">
                            Endpoint: https://services.leadconnectorhq.com/mcp/
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mcpTools.map((tool: any, i: number) => (
                            <div key={i} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-3 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Wrench className="h-3.5 w-3.5 text-neuro" />
                                    <p className="font-bold text-xs text-[var(--os-text)] truncate">{tool.name}</p>
                                </div>
                                <p className="text-[10px] text-[var(--os-text-muted)] line-clamp-2">{tool.description || 'MCP Tool'}</p>
                            </div>
                        ))}
                        {mcpTools.length === 0 && (
                            <div className="col-span-full text-center py-8 text-sm text-[var(--os-text-muted)]">
                                Connect your GHL credentials to discover available MCP tools.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentStudio;
