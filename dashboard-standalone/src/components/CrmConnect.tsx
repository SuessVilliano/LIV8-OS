import React, { useState } from 'react';
import {
    Shield,
    Key,
    HelpCircle,
    ChevronRight,
    Layout,
    Fingerprint,
    CheckCircle2,
    ArrowLeft,
    Zap,
    Building2,
    Mail,
    Lock,
    ExternalLink
} from 'lucide-react';

type CrmType = 'select' | 'ghl' | 'liv8';

interface CrmConnectProps {
    onConnect: (crmType: string, credentials: { locationId?: string; apiKey?: string; email?: string; password?: string }) => void;
    onSkip?: () => void;
}

const CrmConnect: React.FC<CrmConnectProps> = ({ onConnect, onSkip }) => {
    const [step, setStep] = useState<CrmType>('select');

    // GHL state
    const [locId, setLocId] = useState('');
    const [apiKey, setApiKey] = useState('');

    // LIV8 CRM (Vbout) state
    const [vboutEmail, setVboutEmail] = useState('');
    const [vboutPassword, setVboutPassword] = useState('');

    const [isVerifying, setIsVerifying] = useState(false);

    const handleGhlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setTimeout(() => {
            onConnect('ghl', { locationId: locId, apiKey });
            setIsVerifying(false);
        }, 1500);
    };

    const handleVboutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setTimeout(() => {
            onConnect('liv8', { email: vboutEmail, password: vboutPassword });
            setIsVerifying(false);
        }, 1500);
    };

    const openVboutCrm = () => {
        window.open('https://crm.liv8.co', '_blank');
    };

    // CRM Selection Screen
    if (step === 'select') {
        return (
            <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-hidden transition-colors duration-500">
                {/* Visual Depth Orbs */}
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse"></div>

                <div className="flex-1 flex items-center justify-center p-10 relative z-10">
                    <div className="w-full max-w-2xl space-y-12">
                        <header className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                                <Zap className="h-3 w-3" /> Connect Your CRM
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none">
                                Choose Your <span className="text-blue-400">CRM Platform</span>
                            </h1>
                            <p className="text-[var(--os-text-muted)] text-sm font-medium max-w-md mx-auto">
                                Select the CRM you're currently using. Don't have one? Start fresh with LIV8 CRM - our built-in solution.
                            </p>
                        </header>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* GoHighLevel Option */}
                            <button
                                onClick={() => setStep('ghl')}
                                className="group p-8 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-3xl hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] text-left"
                            >
                                <div className="h-16 w-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Layout className="h-8 w-8 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--os-text)] mb-2">GoHighLevel</h3>
                                <p className="text-sm text-[var(--os-text-muted)] mb-4">
                                    Connect your existing GHL account using your Location ID and Private Integration Token.
                                </p>
                                <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
                                    Connect GHL <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            {/* LIV8 CRM (Vbout) Option */}
                            <button
                                onClick={() => setStep('liv8')}
                                className="group p-8 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-3xl hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] text-left"
                            >
                                <div className="h-16 w-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Building2 className="h-8 w-8 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--os-text)] mb-2">LIV8 CRM</h3>
                                <p className="text-sm text-[var(--os-text-muted)] mb-4">
                                    Use our built-in CRM solution at crm.liv8.co. Perfect if you're starting fresh or want an all-in-one platform.
                                </p>
                                <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold">
                                    Connect LIV8 CRM <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        </div>

                        {onSkip && (
                            <div className="text-center">
                                <button
                                    onClick={onSkip}
                                    className="text-sm text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors"
                                >
                                    Skip for now - I'll connect later
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-8 opacity-50">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--os-text-muted)]">
                                <CheckCircle2 className="h-4 w-4" /> HIPAA Compliant
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--os-text-muted)]">
                                <CheckCircle2 className="h-4 w-4" /> SOC2 Standard
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // GoHighLevel Connection Form
    if (step === 'ghl') {
        return (
            <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-hidden transition-colors duration-500">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse"></div>

                <div className="flex-1 flex items-center justify-center p-10 relative z-10">
                    <div className="w-full max-w-xl space-y-8">
                        {/* Back Button */}
                        <button
                            onClick={() => setStep('select')}
                            className="flex items-center gap-2 text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to CRM Selection
                        </button>

                        <header className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                                <Shield className="h-3 w-3" /> Secure Handshake
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none">
                                Connect <span className="text-blue-400">GoHighLevel</span>
                            </h1>
                            <p className="text-[var(--os-text-muted)] text-sm font-medium max-w-sm mx-auto">
                                Establish a secure link with your GoHighLevel location to sync contacts, pipelines, and workflows.
                            </p>
                        </header>

                        <form onSubmit={handleGhlSubmit} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-3xl p-8 space-y-6 shadow-2xl shadow-blue-900/5">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Location Identifier</label>
                                    <div className="relative group">
                                        <Layout className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={locId}
                                            onChange={(e) => setLocId(e.target.value)}
                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Paste GHL Location ID"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Private Integration Token</label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="••••••••••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                                <div className="flex items-center gap-3">
                                    <Fingerprint className="h-4 w-4 text-blue-400" />
                                    <span className="text-[10px] font-bold uppercase text-blue-400 tracking-widest">TLS 1.3 Encryption Active</span>
                                </div>
                                <HelpCircle className="h-4 w-4 text-[var(--os-text-muted)] hover:text-blue-400 cursor-pointer transition-colors" />
                            </div>

                            <button
                                disabled={isVerifying}
                                className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {isVerifying ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Establishing Link...
                                    </div>
                                ) : (
                                    <>Connect GoHighLevel <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </form>

                        <div className="flex items-center justify-center gap-8 opacity-50">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--os-text-muted)]">
                                <CheckCircle2 className="h-4 w-4" /> HIPAA Compliant
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--os-text-muted)]">
                                <CheckCircle2 className="h-4 w-4" /> SOC2 Standard
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIV8 CRM (Vbout) Connection Form
    if (step === 'liv8') {
        return (
            <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-hidden transition-colors duration-500">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse"></div>

                <div className="flex-1 flex items-center justify-center p-10 relative z-10">
                    <div className="w-full max-w-xl space-y-8">
                        {/* Back Button */}
                        <button
                            onClick={() => setStep('select')}
                            className="flex items-center gap-2 text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to CRM Selection
                        </button>

                        <header className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-widest">
                                <Building2 className="h-3 w-3" /> LIV8 CRM
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none">
                                Connect <span className="text-purple-400">LIV8 CRM</span>
                            </h1>
                            <p className="text-[var(--os-text-muted)] text-sm font-medium max-w-sm mx-auto">
                                Sign in with your LIV8 CRM credentials or create a new account at crm.liv8.co
                            </p>
                        </header>

                        <form onSubmit={handleVboutSubmit} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-3xl p-8 space-y-6 shadow-2xl shadow-purple-900/5">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="email"
                                            value={vboutEmail}
                                            onChange={(e) => setVboutEmail(e.target.value)}
                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                            placeholder="you@yourbusiness.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="password"
                                            value={vboutPassword}
                                            onChange={(e) => setVboutPassword(e.target.value)}
                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                            placeholder="••••••••••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                                <div className="flex items-center gap-3">
                                    <Fingerprint className="h-4 w-4 text-purple-400" />
                                    <span className="text-[10px] font-bold uppercase text-purple-400 tracking-widest">Secure Connection</span>
                                </div>
                                <HelpCircle className="h-4 w-4 text-[var(--os-text-muted)] hover:text-purple-400 cursor-pointer transition-colors" />
                            </div>

                            <button
                                disabled={isVerifying}
                                className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {isVerifying ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Connecting...
                                    </div>
                                ) : (
                                    <>Connect LIV8 CRM <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={openVboutCrm}
                                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-2"
                                >
                                    Don't have an account? Sign up at crm.liv8.co
                                    <ExternalLink className="h-3 w-3" />
                                </button>
                            </div>
                        </form>

                        <div className="flex items-center justify-center gap-8 opacity-50">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--os-text-muted)]">
                                <CheckCircle2 className="h-4 w-4" /> HIPAA Compliant
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--os-text-muted)]">
                                <CheckCircle2 className="h-4 w-4" /> SOC2 Standard
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default CrmConnect;
