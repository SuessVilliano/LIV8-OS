import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { generateActionPlan } from '../services/geminiService';

const SidePanelChat = () => {
    const { isDark } = useTheme();
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: "I am LIV8 Neural Agent. I'm connected to this browser session. How can I assist you with your GHL workflow today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            // Use Gemini Service to get response
            // We pass a simple context for now. In real app, we'd pass page content.
            const response = await generateActionPlan(userMsg, "browser_side_panel");

            // The service returns a complex object, we just want the text or summary for chat
            // If it returns an action plan, we'll summarize it. 
            // For now, let's assume the service might return a planned text or we format it.
            // Since generateActionPlan returns JSON structure (ActionPlan), we need to parse/format it.

            let replyText = "I've processed that.";
            if (response && response.summary) {
                replyText = response.summary;
            } else if (typeof response === 'string') {
                replyText = response;
            } else {
                replyText = "Command processed. Check the dashboard for details.";
            }

            setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I encountered a neural interference. Please check your API Key in Dashboard Settings." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex flex-col h-screen ${isDark ? 'dark bg-slate-900 text-white' : 'bg-white text-slate-900'} transition-colors duration-300`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 shadow-sm bg-opacity-90 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-wider">LIV8 <span className="text-blue-500">Neural</span></h1>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">System Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-500/10'
                            : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-500 animate-spin" />
                            <span className="text-xs font-bold opacity-60">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-opacity-90 backdrop-blur-md">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask LIV8 or dictate command..."
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-4 pr-12 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex justify-center mt-3 gap-4">
                    <button onClick={() => window.open('https://os.liv8.co/dashboard', '_blank')} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                        Open Dashboard
                    </button>
                    <button onClick={() => window.open('https://os.liv8.co/onboarding', '_blank')} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                        Help & Setup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidePanelChat;
