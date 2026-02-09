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
    ExternalLink,
    AlertCircle,
    Sparkles
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

type CrmType = 'select' | 'ghl' | 'liv8';

interface CrmConnectProps {
    onConnect: (crmType: string, credentials: { locationId?: string; apiKey?: string; email?: string; password?: string }) => void;
    onSkip?: () => void;
}

const API_BASE = getBackendUrl();

const CrmConnect: React.FC<CrmConnectProps> = ({ onConnect, onSkip }) => {
    const [step, setStep] = useState<CrmType>('select');

    // GHL state
    const [locId, setLocId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isNewGhl, setIsNewGhl] = useState(false);
    const [ghlBusinessName, setGhlBusinessName] = useState('');
    const [ghlEmail, setGhlEmail] = useState('');

    // LIV8 CRM (Vbout) state
    const [vboutEmail, setVboutEmail] = useState('');
    const [vboutPassword, setVboutPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [isNewAccount, setIsNewAccount] = useState(true);

    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseJsonSafe = async (response: Response) => {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            throw new Error(`Server returned an unexpected response (${response.status}). Please ensure the backend is running.`);
        }
    };

    const handleGhlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setError(null);

        try {
            if (isNewGhl) {
                // Create new GHL sub-account
                const response = await fetch(`${API_BASE}/api/crm/create-ghl-subaccount`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        businessName: ghlBusinessName || `${ghlEmail.split('@')[0]}'s Business`,
                        email: ghlEmail
                    })
                });

                const data = await parseJsonSafe(response);

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to create GHL sub-account');
                }

                // Store the new credentials
                localStorage.setItem('os_ghl_account', JSON.stringify(data.account));

                // Success - proceed to onboarding with the new credentials
                onConnect('ghl', { locationId: data.account.locationId, apiKey: data.account.apiKey });

            } else {
                // Validate existing credentials via backend API
                const response = await fetch(`${API_BASE}/api/crm/validate-ghl`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ locationId: locId, apiKey })
                });

                const data = await parseJsonSafe(response);

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Invalid GHL credentials');
                }

                // Success - proceed to onboarding
                onConnect('ghl', { locationId: locId, apiKey });
            }

        } catch (err: any) {
            setError(err.message || 'Failed to connect to GHL. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVboutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setError(null);

        try {
            if (isNewAccount) {
                // Create new Vbout sub-account
                const response = await fetch(`${API_BASE}/api/crm/create-vbout-account`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: vboutEmail,
                        businessName: businessName || `${vboutEmail.split('@')[0]}'s Business`,
                        firstName: vboutEmail.split('@')[0]
                    })
                });

                const data = await parseJsonSafe(response);

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to create LIV8 CRM account');
                }

                // Store account info
                localStorage.setItem('os_vbout_account', JSON.stringify(data.account));

            } else {
                // Validate existing credentials
                const response = await fetch(`${API_BASE}/api/crm/validate-vbout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: vboutEmail })
                });

                const data = await parseJsonSafe(response);

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Invalid LIV8 CRM credentials');
                }
            }

            // Success - proceed to onboarding
            onConnect('liv8', { email: vboutEmail, password: vboutPassword });

        } catch (err: any) {
            setError(err.message || 'Failed to connect to LIV8 CRM');
        } finally {
            setIsVerifying(false);
        }
    };

    const openVboutCrm = () => {
        window.open('https://crm.liv8.co', '_blank');
    };

    // CRM Selection Screen
    if (step === 'select') {
        return (
            <div className="min-h-full bg-[var(--os-bg)] font-sans text-[var(--os-text)] relative overflow-y-auto transition-colors duration-500">
                {/* Visual Depth Orbs */}
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>

                <div className="min-h-full flex items-center justify-center p-4 py-8 md:p-10 relative z-10">
                    <div className="w-full max-w-2xl space-y-6 md:space-y-12">
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
                                onClick={() => { setStep('ghl'); setError(null); }}
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
                                onClick={() => { setStep('liv8'); setError(null); }}
                                className="group p-8 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-3xl hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] text-left relative overflow-hidden"
                            >
                                <div className="absolute top-4 right-4 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase rounded-full">
                                    Recommended
                                </div>
                                <div className="h-16 w-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Sparkles className="h-8 w-8 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--os-text)] mb-2">LIV8 CRM</h3>
                                <p className="text-sm text-[var(--os-text-muted)] mb-4">
                                    We'll automatically set up your CRM account at crm.liv8.co - no extra steps needed!
                                </p>
                                <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold">
                                    Get Started <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
            <div className="min-h-full bg-[var(--os-bg)] font-sans text-[var(--os-text)] relative overflow-y-auto transition-colors duration-500">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>

                <div className="min-h-full flex items-center justify-center p-4 py-8 md:p-10 md:py-16 relative z-10">
                    <div className="w-full max-w-xl space-y-6 md:space-y-8">
                        {/* Back Button */}
                        <button
                            onClick={() => { setStep('select'); setError(null); }}
                            className="flex items-center gap-2 text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to CRM Selection
                        </button>

                        <header className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                                <Shield className="h-3 w-3" /> {isNewGhl ? 'Auto-Setup' : 'Secure Handshake'}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none">
                                {isNewGhl ? 'Setup' : 'Connect'} <span className="text-blue-400">GoHighLevel</span>
                            </h1>
                            <p className="text-[var(--os-text-muted)] text-sm font-medium max-w-sm mx-auto">
                                {isNewGhl
                                    ? "We'll create your GHL sub-account automatically so you can get started right away."
                                    : "We'll validate your credentials securely with GHL's API to ensure a proper connection."
                                }
                            </p>
                        </header>

                        {/* Toggle between new/existing GHL account */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                type="button"
                                onClick={() => setIsNewGhl(false)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    !isNewGhl
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[var(--os-surface)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                                }`}
                            >
                                I Have GHL
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsNewGhl(true)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    isNewGhl
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[var(--os-surface)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                                }`}
                            >
                                New to GHL
                            </button>
                        </div>

                        <form onSubmit={handleGhlSubmit} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-3xl p-8 space-y-6 shadow-2xl shadow-blue-900/5">
                            <div className="space-y-4">
                                {isNewGhl ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Business Name</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-blue-400 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={ghlBusinessName}
                                                    onChange={(e) => setGhlBusinessName(e.target.value)}
                                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="Your Business Name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Email Address</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-blue-400 transition-colors" />
                                                <input
                                                    type="email"
                                                    value={ghlEmail}
                                                    onChange={(e) => setGhlEmail(e.target.value)}
                                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="you@yourbusiness.com"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>

                            {isNewGhl && (
                                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-semibold text-emerald-400">What we'll set up for you:</p>
                                            <ul className="mt-2 space-y-1 text-[var(--os-text-muted)]">
                                                <li>• GHL sub-account with full CRM access</li>
                                                <li>• Contact management and pipelines</li>
                                                <li>• Automation workflows ready to go</li>
                                                <li>• MCP integration for AI operations</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                                <div className="flex items-center gap-3">
                                    <Fingerprint className="h-4 w-4 text-blue-400" />
                                    <span className="text-[10px] font-bold uppercase text-blue-400 tracking-widest">Validated via GHL API</span>
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
                                        Validating with GHL...
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
            <div className="min-h-full bg-[var(--os-bg)] font-sans text-[var(--os-text)] relative overflow-y-auto transition-colors duration-500">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>

                <div className="min-h-full flex items-center justify-center p-4 py-8 md:p-10 md:py-16 relative z-10">
                    <div className="w-full max-w-xl space-y-6 md:space-y-8">
                        {/* Back Button */}
                        <button
                            onClick={() => { setStep('select'); setError(null); }}
                            className="flex items-center gap-2 text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to CRM Selection
                        </button>

                        <header className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-widest">
                                <Sparkles className="h-3 w-3" /> Auto-Setup
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none">
                                {isNewAccount ? 'Setup' : 'Connect'} <span className="text-purple-400">LIV8 CRM</span>
                            </h1>
                            <p className="text-[var(--os-text-muted)] text-sm font-medium max-w-sm mx-auto">
                                {isNewAccount
                                    ? "We'll automatically create your CRM account at crm.liv8.co with everything you need."
                                    : "Sign in with your existing LIV8 CRM credentials."
                                }
                            </p>
                        </header>

                        {/* Toggle between new/existing account */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                type="button"
                                onClick={() => setIsNewAccount(true)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    isNewAccount
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-[var(--os-surface)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                                }`}
                            >
                                Create New Account
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsNewAccount(false)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    !isNewAccount
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-[var(--os-surface)] text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                                }`}
                            >
                                I Have an Account
                            </button>
                        </div>

                        <form onSubmit={handleVboutSubmit} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-3xl p-8 space-y-6 shadow-2xl shadow-purple-900/5">
                            <div className="space-y-4">
                                {isNewAccount && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Business Name</label>
                                        <div className="relative group">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                            <input
                                                type="text"
                                                value={businessName}
                                                onChange={(e) => setBusinessName(e.target.value)}
                                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                                placeholder="Your Business Name"
                                            />
                                        </div>
                                    </div>
                                )}

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

                                {!isNewAccount && (
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
                                )}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {isNewAccount && (
                                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-semibold text-emerald-400">What we'll set up for you:</p>
                                            <ul className="mt-2 space-y-1 text-[var(--os-text-muted)]">
                                                <li>• Full CRM account at crm.liv8.co</li>
                                                <li>• Contact lists and pipelines</li>
                                                <li>• Email marketing automation</li>
                                                <li>• Social media integration</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                                <div className="flex items-center gap-3">
                                    <Fingerprint className="h-4 w-4 text-purple-400" />
                                    <span className="text-[10px] font-bold uppercase text-purple-400 tracking-widest">
                                        {isNewAccount ? 'Auto-Provisioning' : 'Secure Connection'}
                                    </span>
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
                                        {isNewAccount ? 'Creating your CRM...' : 'Connecting...'}
                                    </div>
                                ) : (
                                    <>{isNewAccount ? 'Create My CRM Account' : 'Connect LIV8 CRM'} <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>

                            {!isNewAccount && (
                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={openVboutCrm}
                                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-2"
                                    >
                                        Open crm.liv8.co
                                        <ExternalLink className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
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
