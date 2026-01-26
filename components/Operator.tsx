
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ChatMessage, ActionPlan, AuditLogEntry } from '../types';
import { generateActionPlan } from '../services/geminiService';
import { useError } from '../contexts/ErrorContext';

const CONTEXTS = [
  { id: 'global', label: 'Global (Agency)', icon: '🌐' },
  { id: 'contact', label: 'Contact: John Doe', icon: '👤' },
  { id: 'opportunity', label: 'Opp: HVAC Install', icon: '💰' },
];

const Operator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeContext, setActiveContext] = useState(CONTEXTS[0]);
  const [activeTab, setActiveTab] = useState<'chat' | 'audit'>('chat');
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'LIV8 Operator online. Click the microphone to speak.', timestamp: Date.now() }
  ]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { addToast } = useError();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event);
        setIsListening(false);
        addToast("Voice Error", "Could not hear audio. Please check microphone.", "warning");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [addToast]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      addToast("Not Supported", "Your browser does not support voice recognition.", "error");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput(''); 
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: input, 
      timestamp: Date.now() 
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    const thinkId = 'think_' + Date.now();
    setMessages(prev => [...prev, { id: thinkId, role: 'assistant', status: 'thinking', timestamp: Date.now() }]);

    try {
      const plan = await generateActionPlan(userMsg.content || '', { 
        type: activeContext.id, 
        name: activeContext.id === 'contact' ? 'John Doe' : undefined,
        id: activeContext.id === 'contact' ? 'contact_123' : undefined
      });
      
      setMessages(prev => {
        const clean = prev.filter(m => m.id !== thinkId);
        return [...clean, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          plan: plan,
          status: 'waiting_confirmation',
          timestamp: Date.now()
        }];
      });
      
      speak(`I have generated a plan: ${plan.summary}`);

    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== thinkId));
    } finally {
      setIsProcessing(false);
    }
  };

  const executePlan = (msgId: string, plan: ActionPlan) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'executing' } : m));
    speak("Executing plan now.");

    let delay = 0;
    plan.steps.forEach((step, idx) => {
      delay += 1000;
      setTimeout(() => {
        const logEntry: AuditLogEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          action: `Execute Step ${idx + 1}`,
          tool: step.tool,
          status: 'success',
          details: JSON.stringify(step.input)
        };
        setAuditLog(prev => [logEntry, ...prev]);
        
        if (idx === plan.steps.length - 1) {
           setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'success' } : m));
           speak("All actions completed successfully.");
        }
      }, delay);
    });
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 rounded-full text-white shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all z-[90] hover:scale-105 active:scale-95"
      >
        <span className="text-xl">🤖</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 h-full md:w-[420px] bg-white shadow-2xl border-l border-slate-200 z-[100] flex flex-col font-sans transition-all duration-300">
      
      {/* 1. Header with Context Switcher */}
      <div className="bg-slate-900 text-white p-4 shrink-0 safe-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="font-bold text-sm tracking-wide">LIV8 OPERATOR</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2">✕</button>
        </div>

        <div className="bg-slate-800 rounded-lg p-1 flex items-center justify-between">
           <button 
             className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-slate-700 rounded-md w-full text-left transition-colors"
             onClick={() => {
                const nextIdx = (CONTEXTS.findIndex(c => c.id === activeContext.id) + 1) % CONTEXTS.length;
                setActiveContext(CONTEXTS[nextIdx]);
             }}
           >
             <span>{activeContext.icon}</span>
             <span className="font-medium truncate">{activeContext.label}</span>
             <span className="ml-auto text-slate-500 text-[10px]">CHANGE</span>
           </button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
        >
          Chat & Plan
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider ${activeTab === 'audit' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
        >
          Audit Log ({auditLog.length})
        </button>
      </div>

      {/* 3. Main Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 relative">
        {activeTab === 'chat' ? (
          <div className="space-y-4 pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                  
                  {msg.content && (
                    <div className={`p-3 rounded-xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                      {msg.content}
                    </div>
                  )}

                  {msg.plan && 'type' in msg.plan && msg.plan.type === 'action_plan' && (
                    <div className="mt-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-100">
                      <div className={`px-4 py-2 border-b border-slate-100 flex justify-between items-center ${msg.plan.riskLevel === 'high' ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Action Plan</span>
                        {msg.plan.riskLevel === 'high' && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">HIGH RISK</span>}
                      </div>
                      
                      <div className="p-4 space-y-3">
                         <div className="text-sm font-medium text-slate-900 leading-snug">{msg.plan.summary}</div>
                         <div className="space-y-2">
                           {msg.plan.steps.map((step, i) => (
                             <div key={i} className="flex gap-2 text-xs">
                               <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-slate-500 shrink-0">{i+1}</div>
                               <div className="flex-1 min-w-0">
                                 <div className="font-mono text-blue-600 truncate">{step.tool}</div>
                                 <div className="text-slate-400 truncate">{JSON.stringify(step.input)}</div>
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>

                      {msg.status === 'waiting_confirmation' && (
                        <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                           <Button variant="outline" className="h-8 text-xs" onClick={() => { /* Cancel */ }}>Reject</Button>
                           <Button className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => executePlan(msg.id, msg.plan as ActionPlan)}>Confirm & Run</Button>
                        </div>
                      )}
                      {msg.status === 'executing' && (
                        <div className="p-3 bg-blue-50 border-t border-blue-100 text-center text-xs text-blue-700 font-medium">
                          Processing Actions...
                        </div>
                      )}
                      {msg.status === 'success' && (
                        <div className="p-2 bg-green-50 border-t border-green-100 text-center text-xs text-green-700 font-medium flex items-center justify-center gap-1">
                          <span>✓</span> Actions Completed
                        </div>
                      )}
                    </div>
                  )}

                  {msg.status === 'thinking' && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-2 ml-1">
                      <span className="animate-spin">⟳</span> Analyzing request...
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="space-y-3">
             {auditLog.length === 0 && <div className="text-center text-slate-400 text-sm mt-10">No actions executed yet.</div>}
             {auditLog.map((entry) => (
               <div key={entry.id} className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                 <div className="flex justify-between mb-1">
                   <span className="font-mono font-semibold text-slate-700">{entry.tool}</span>
                   <span className="text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                 </div>
                 <div className="text-slate-600 mb-2">{entry.action}</div>
                 <div className="bg-slate-50 p-2 rounded font-mono text-[10px] text-slate-500 overflow-x-auto">
                    {entry.details}
                 </div>
                 <div className="mt-2 text-green-600 font-medium flex items-center gap-1">
                    ✓ Success
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* 4. Input Area */}
      {activeTab === 'chat' && (
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 safe-bottom">
          <form onSubmit={handleSend} className="relative">
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
              placeholder={isListening ? "Listening..." : "Type or click mic..."}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button
                type="button"
                className={`p-2 rounded-full transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'text-slate-400 hover:text-slate-900'
                }`}
                onClick={toggleVoice}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          </form>
          <div className="text-center mt-2 text-[10px] text-slate-400">
             LIV8 OS v1.0 • Context: <span className="font-medium text-slate-600">{activeContext.label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operator;
