import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  History,
  MessageSquare,
  Maximize2,
  X,
  Send,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  Play,
  Loader2,
  Brain,
  BarChart3,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  Target,
  Activity,
  LifeBuoy,
  MessageSquarePlus
} from 'lucide-react';
import { Button } from './ui/Button';
import {
  apiCall,
  operator,
  support
} from '../services/api';
import { ActionPlan, AIResponse } from '../types';
import { useError } from '../contexts/ErrorContext';
import { SUPPORT_URL } from '../constants';

const SUGGESTIONS = [
  "Deep scan my brand for new offers",
  "Summarize latest contact intent",
  "Generate an OS-aligned funnel",
  "Write an email using brand voice",
  "Deploy AI reception protocols"
];

interface OperatorProps {
  onNavigate?: () => void;
}

const Operator: React.FC<OperatorProps> = ({ onNavigate }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const { addToast } = useError();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<ActionPlan | null>(null);
  const [context, setContext] = useState<any>({ type: 'global' });
  const [isBrandVoice, setIsBrandVoice] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Initial Context Fetch
    chrome.storage.local.get(['currentContext']).then(res => {
      if (res.currentContext) setContext(res.currentContext);
    });

    // 2. Real-time Listener
    const handleMessage = (msg: any) => {
      if (msg.type === 'CONTEXT_UPDATE') {
        setContext(msg.context);
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOSScan = async () => {
    setIsProcessing(true);
    addToast("OS Intelligence Scan", "Analyzing page intelligence...", "info");

    setTimeout(() => {
      setIsProcessing(false);
      const insight = context.type === 'contact'
        ? `Detected ${context.contactName || 'Active Lead'} with ${context.tags?.length || 0} active tags. Recommendation: Trigger 'Phase 4' welcome sequence.`
        : "Platform scan complete. No critical sync gaps found.";

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🧠 OS Insight: ${insight}`
      }]);
    }, 1500);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput(prev => prev + (prev ? " " : "") + transcript);
      }
    };

    recognition.start();
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setCurrentPlan(null);

    try {
      const response: AIResponse = await apiCall('/api/operator/plan', {
        method: 'POST',
        body: JSON.stringify({
          input: text,
          context: context,
          brandVoice: isBrandVoice
        })
      });

      if (response.type === 'action_plan') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.summary,
          plan: response
        }]);
        setCurrentPlan(response);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Neural core online. Protocol active." }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connectivity bottleneck detected. Re-syncing..." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async (plan: ActionPlan) => {
    setIsProcessing(true);
    try {
      const result = await operator.executePlan(plan, plan.context);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Sync Complete: ${result?.summary || 'Operation completed'}`
      }]);
      setCurrentPlan(null);
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Sync Fault: ${errorMsg}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestart = async () => {
    if (confirm("Reset neural session?")) window.location.reload();
  };

  const closePanel = () => {
    if (confirm("Close LIV8 OS?")) window.close();
  };

  const handleOpenSupport = () => {
    window.open(SUPPORT_URL, 'LIV8_Support', 'width=450,height=700');
    setIsMenuOpen(false);
  };

  const handleEscalate = async () => {
    const reason = prompt("Describe the issue for escalation:");
    if (!reason) return;

    setIsProcessing(true);
    try {
      await support.sendFeedback({
        type: 'escalation',
        message: reason,
        context: context
      });
      addToast("Escalated", "Support team has been notified.", "success");
    } catch (e) {
      addToast("Sync Error", "Failed to dispatch support request.", "error");
    } finally {
      setIsMenuOpen(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans text-slate-800 selection:bg-neuro-light relative overflow-hidden">
      {/* Visual Depth */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-neuro/5 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-neuro/5 blur-[80px] rounded-full pointer-events-none"></div>

      <header className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neuro/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-neuro" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none uppercase italic">LIV8 <span className="text-neuro">OS</span></h1>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide">v2.5</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOSScan} className="p-1.5 text-neuro/60 hover:text-neuro transition" title="OS Intelligence Scan">
            <Activity className="h-5 w-5" />
          </button>
          <button onClick={handleRestart} className="p-1.5 text-slate-400 hover:text-neuro transition">
            <History className="h-5 w-5" />
          </button>
          <button onClick={closePanel} className="p-1.5 text-slate-400 hover:text-red-500 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Neural Link Status Badge */}
      {context.type !== 'global' && (
        <div className="mx-6 mt-4 p-4 rounded-[1.5rem] bg-[#F9FBFF]/60 backdrop-blur-sm border border-neuro-light/20 flex items-center justify-between animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-blue-500/5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-white shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">OS Neural Link</p>
              <p className="text-xs font-bold text-slate-900 truncate tracking-tight">
                {context.type === 'contact' ? `Lead: ${context.contactName || context.contactId}` :
                  context.type === 'conversation' ? 'Conversation Channel' :
                    context.type === 'opportunity' ? `Pipeline: ${context.pipelineStage || 'Active'}` : 'GHL Context Linked'}
              </p>
            </div>
          </div>
          <Button onClick={handleOSScan} className="h-8 px-4 text-[9px] font-black uppercase bg-white border-slate-200 text-neuro hover:bg-neuro hover:text-white hover:border-neuro shadow-sm rounded-xl transition-all duration-300">Scan</Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar relative z-10">
        {messages.length === 0 ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter uppercase italic">
                Neural commands <br /><span className="text-neuro">Optimized.</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Neural Mapping active for {context.type}. Provide command script:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, idx) => (
                <button key={idx} onClick={() => handleSend(s)} className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-neuro text-[11px] font-bold hover:bg-neuro hover:text-white hover:border-neuro hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 text-left">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {messages.map((m, i) => (
              <div key={i} className="space-y-4">
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm leading-relaxed ${m.role === 'user' ? 'bg-neuro text-white shadow-xl shadow-blue-500/20 rounded-br-none font-bold' : 'bg-[#F9FBFF] border border-slate-100 text-slate-800 rounded-bl-none shadow-sm'
                    }`}>
                    {m.content}
                  </div>
                </div>
                {m.plan && (
                  <div className="animate-in zoom-in-95 duration-500">
                    <PlanPreview plan={m.plan} onConfirm={() => handleExecute(m.plan)} isProcessing={isProcessing} />
                  </div>
                )}
              </div>
            ))}
            {isProcessing && !currentPlan && (
              <div className="flex justify-start">
                <div className="bg-[#F9FBFF]/80 backdrop-blur-sm border border-slate-50 p-5 rounded-[1.5rem] rounded-bl-none shadow-sm">
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-neuro/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-neuro/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-neuro/60 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-50 bg-white/90 backdrop-blur-xl sticky bottom-0 z-50">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Command neural core..."
            disabled={isProcessing}
            className="w-full bg-[#F9FBFF] border border-slate-100 rounded-2xl px-6 py-4 pr-24 text-sm focus:ring-1 focus:ring-neuro focus:bg-white focus:border-neuro outline-none transition-all placeholder:text-slate-300 font-medium shadow-inner disabled:opacity-50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button onClick={toggleVoice} className={`p-2 rounded-xl transition-all ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-300 hover:text-neuro'}`}>🎙️</button>
            <button disabled={!input.trim() || isProcessing} onClick={() => handleSend(input)} className="p-2 text-neuro hover:scale-110 transition-transform disabled:opacity-30">
              <Send className="h-5 w-5 rotate-45" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between px-1 relative">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isBrandVoice ? 'bg-neuro shadow-[0_0_8px_rgba(0,180,255,0.6)]' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voice:</span>
            <button onClick={() => setIsBrandVoice(!isBrandVoice)} className={`text-[10px] font-black uppercase tracking-widest hover:underline ${isBrandVoice ? 'text-neuro' : 'text-slate-300'}`}>
              {isBrandVoice ? 'Active' : 'Muted'}
            </button>
          </div>
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -mr-2 text-slate-300 hover:text-slate-900 transition-colors"><MoreHorizontal className="h-5 w-5" /></button>
            {isMenuOpen && (
              <div className="absolute bottom-full right-0 mb-3 w-56 bg-white rounded-[1.5rem] shadow-2xl shadow-blue-900/10 border border-slate-100 overflow-hidden z-[100] animate-in slide-in-from-bottom-4">
                <button onClick={() => { onNavigate?.(); setIsMenuOpen(false); }} className="w-full px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-[#F9FBFF] border-b border-slate-50 flex items-center gap-3 transition-colors">
                  <BarChart3 className="h-4 w-4 text-neuro" /> Ops Center
                </button>
                <button onClick={handleEscalate} className="w-full px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-[#F9FBFF] border-b border-slate-50 flex items-center gap-3 transition-colors">
                  <MessageSquarePlus className="h-4 w-4 text-neuro" /> Escalate Issue
                </button>
                <button onClick={handleOpenSupport} className="w-full px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-[#F9FBFF] flex items-center gap-3 transition-colors">
                  <LifeBuoy className="h-4 w-4 text-neuro" /> Live Support
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlanPreview: React.FC<{ plan: ActionPlan, onConfirm: () => void, isProcessing: boolean }> = ({ plan, onConfirm, isProcessing }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mx-2 bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-2xl shadow-blue-500/10 ring-1 ring-slate-50">
      <div className={`px-5 py-4 flex items-center justify-between cursor-pointer ${plan.riskLevel === 'high' ? 'bg-red-50/50' : 'bg-neuro/5'}`} onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-3">
          {plan.riskLevel === 'high' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Sparkles className="h-4 w-4 text-neuro" />}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Neuro Protocol</span>
        </div>
        <button className="text-[9px] font-black uppercase tracking-widest text-slate-300">{collapsed ? 'Open' : 'Fold'}</button>
      </div>
      {!collapsed && (
        <div className="p-6 space-y-6">
          <p className="text-xs font-medium text-slate-500 leading-relaxed italic border-l-2 border-neuro/20 pl-4">{plan.summary}</p>
          <div className="space-y-3">
            {plan.steps.map((step, idx) => (
              <div key={step.id} className="flex gap-4 text-[11px] items-start p-3 rounded-2xl bg-[#F9FBFF] border border-slate-50">
                <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-[10px] text-neuro border border-slate-50 shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-800 uppercase tracking-tight mb-1">{step.tool.replace('ghl.', '')}</div>
                  <div className="text-slate-400 truncate font-mono text-[9px] opacity-60">{JSON.stringify(step.input)}</div>
                </div>
              </div>
            ))}
          </div>
          <Button fullWidth onClick={onConfirm} disabled={isProcessing} className="h-12 bg-neuro hover:bg-neuro-dark text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl border-none shadow-xl shadow-blue-500/20">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-3.5 w-3.5 mr-2 fill-white" /> Execute Sync</>}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Operator;
