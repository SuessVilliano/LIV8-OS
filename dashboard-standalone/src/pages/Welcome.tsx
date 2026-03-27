import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles,
    Bot,
    ArrowRight,
    Loader2,
    Send
} from 'lucide-react';

interface WelcomeProps {
    userData?: {
        businessName: string;
        contactName: string;
        email: string;
    };
    onComplete: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ userData, onComplete }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [_telegramCode] = useState('');
    const [_isConnecting] = useState(false);

    const firstName = userData?.contactName?.split(' ')[0] || 'there';

    // Simulate AI agent introduction sequence
    useEffect(() => {
        const timers = [
            setTimeout(() => setStep(1), 1000),
            setTimeout(() => setStep(2), 2500),
            setTimeout(() => setStep(3), 4000),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    const handleContinue = () => {
        onComplete();
        navigate('/connect');
    };

    const messages = [
        {
            delay: 0,
            content: `Hey ${firstName}! 👋 I'm Juno, your AI Manager from LIV8 OS.`
        },
        {
            delay: 1,
            content: `I just created your account and I'm already analyzing ${userData?.businessName || 'your business'} to understand how I can help you most.`
        },
        {
            delay: 2,
            content: `Let's connect on Telegram so I can send you daily briefings, content suggestions, and help you manage everything from your phone!`
        }
    ];

    return (
        <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[150px]" />

            <div className="w-full max-w-2xl relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl mb-6 animate-bounce">
                        <Bot className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">Welcome to LIV8 OS</h1>
                    <p className="text-gray-400">Your AI team is getting ready...</p>
                </div>

                {/* Chat Interface */}
                <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold">Juno</p>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Your AI Manager
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 min-h-[200px]">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`transition-all duration-500 ${step > i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                            >
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Bot className="h-4 w-4 text-cyan-400" />
                                    </div>
                                    <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {step >= 3 && step < 4 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl">
                                    <p className="text-sm font-medium mb-4">Connect with Juno on Telegram:</p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <a
                                            href="https://t.me/liv8_juno_bot"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 px-4 py-3 bg-[#0088cc] rounded-xl text-center font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                        >
                                            <Send className="h-4 w-4" />
                                            Open Telegram
                                        </a>
                                        <button
                                            onClick={() => setStep(4)}
                                            className="px-4 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
                                        >
                                            Skip for now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step >= 4 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Bot className="h-4 w-4 text-cyan-400" />
                                    </div>
                                    <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
                                        <p className="text-sm leading-relaxed">
                                            Perfect! Now let's connect your CRM and finish setting up your workspace. This only takes a minute! 🚀
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress & Continue */}
                {step >= 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4].map((s) => (
                                    <div
                                        key={s}
                                        className={`h-2 rounded-full transition-all ${s <= 1 ? 'w-8 bg-cyan-500' : 'w-2 bg-white/20'}`}
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-gray-400">Step 1 of 4</p>
                        </div>

                        <button
                            onClick={handleContinue}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3"
                        >
                            Continue Setup
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {step < 3 && (
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Juno is typing...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Welcome;
