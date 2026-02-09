import React, { useState } from 'react';
import {
    Shield,
    Key,
    HelpCircle,
    ChevronRight,
    Layout,
    Fingerprint,
    CheckCircle2
} from 'lucide-react';

interface GhlConnectProps {
    onConnect: (locationId: string, apiKey: string) => void;
}

const GhlConnect: React.FC<GhlConnectProps> = ({ onConnect }) => {
    const [locId, setLocId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        // Handshake Simulation
        setTimeout(() => {
            onConnect(locId, apiKey);
            setIsVerifying(false);
        }, 1500);
    };

    return (
        <div className="min-h-full bg-[var(--os-bg)] font-sans text-[var(--os-text)] relative overflow-y-auto transition-colors duration-500">
            {/* Visual Depth Orbs */}
            <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-neuro/5 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>

            <div className="min-h-full flex items-center justify-center p-4 py-8 md:p-10 relative z-10">
                <div className="w-full max-w-xl space-y-6 md:space-y-12">
                    <header className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neuro-light/50 border border-neuro-light text-neuro text-[9px] font-black uppercase tracking-widest">
                            <Shield className="h-3 w-3" /> Step 1: Secure Handshake
                        </div>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Connect <span className="text-neuro">GHL Network</span>
                        </h1>
                        <p className="text-[var(--os-text-muted)] text-sm font-bold max-w-sm mx-auto">
                            Establish a neural link with your GoHighLevel location to begin autonomous orchestration.
                        </p>
                    </header>

                    <form onSubmit={handleSubmit} className="os-card p-10 space-y-8 shadow-2xl shadow-blue-900/10 backdrop-blur-xl">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Location Identifier</label>
                                <div className="relative group">
                                    <Layout className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-neuro transition-colors" />
                                    <input
                                        type="text"
                                        value={locId}
                                        onChange={(e) => setLocId(e.target.value)}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:border-neuro outline-none transition-all"
                                        placeholder="Paste GHL Location ID"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Private Integration Token</label>
                                <div className="relative group">
                                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)] group-focus-within:text-neuro transition-colors" />
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:border-neuro outline-none transition-all"
                                        placeholder="••••••••••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-neuro/5 rounded-2xl border border-neuro-light/20">
                            <div className="flex items-center gap-3">
                                <Fingerprint className="h-4 w-4 text-neuro" />
                                <span className="text-[9px] font-black uppercase text-neuro tracking-widest">TLS 1.3 Encryption Active</span>
                            </div>
                            <HelpCircle className="h-4 w-4 text-[var(--os-text-muted)] hover:text-neuro cursor-pointer transition-colors" />
                        </div>

                        <button
                            disabled={isVerifying}
                            className="w-full h-16 bg-neuro hover:bg-neuro-dark text-white rounded-2xl border-none font-black text-xs tracking-[0.2em] shadow-xl shadow-neuro/30 uppercase transition-all flex items-center justify-center gap-2 group"
                        >
                            {isVerifying ? 'Establishing Link...' : (
                                <>Initiate Handshake <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <CheckCircle2 className="h-4 w-4" /> HIPAA Compliant
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <CheckCircle2 className="h-4 w-4" /> SOC2 Standard
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GhlConnect;
