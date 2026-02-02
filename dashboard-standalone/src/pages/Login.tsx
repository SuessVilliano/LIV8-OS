import React, { useState } from 'react';
import { Shield, Mail, Lock, Sparkles, ChevronRight, Fingerprint, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { config } = useTheme();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            // Store auth token and user info
            localStorage.setItem('os_token', data.token);
            localStorage.setItem('os_user', JSON.stringify(data.user));
            if (data.locations?.length > 0) {
                localStorage.setItem('os_loc_id', data.locations[0].ghl_location_id);
            }

            onLogin();
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Failed to connect. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FBFF] flex items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-500">
            {/* Visual Depth Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1068EB]/10 blur-[150px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#1068EB]/5 blur-[150px] rounded-full animate-pulse [animation-delay:2s]"></div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10 space-y-4">
                    <div className="h-16 w-16 bg-[#1068EB] rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-blue-500/30">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                            {config?.platformName?.split(' ')[0] || 'LIV8'} <span className="text-[#1068EB]">{config?.platformName?.split(' ')[1] || 'OS'}</span>
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">OS Command Link v2.5</p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl shadow-blue-900/10 border border-white">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#1068EB]">
                            <Fingerprint className="h-4 w-4" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight italic uppercase">Access OS Core</h2>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Agency Access Node</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-[#1068EB] transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#1068EB] focus:ring-1 focus:ring-[#1068EB] outline-none transition-all placeholder:text-slate-200"
                                    placeholder="Agency Admin Email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Key Authorization</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-[#1068EB] transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#1068EB] focus:ring-1 focus:ring-[#1068EB] outline-none transition-all placeholder:text-slate-200"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded-lg border-slate-200 text-[#1068EB] focus:ring-[#1068EB]" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-[#1068EB] transition-colors">Trust Node</span>
                            </label>
                            <button type="button" className="text-[10px] font-black uppercase text-[#1068EB] tracking-widest hover:underline">Reset Trace</button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Force visible blue button */}
                        <Button type="submit" disabled={isLoading} className="w-full h-14 bg-[#1068EB] hover:bg-[#004CC2] text-white rounded-2xl border-none font-black text-xs tracking-[0.2em] shadow-xl shadow-blue-500/30 uppercase transition-all flex items-center justify-center gap-2 group">
                            {isLoading ? 'Syncing...' : (
                                <>Initiate Handshake <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </Button>
                    </form>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Shield className="h-3 w-3" /> Encrypted by LIV8 OS-Link Security
                    </p>
                </div>
            </div>
        </div>
    );
};

const Button = ({ children, className, ...props }: any) => (
    <button className={`flex items-center justify-center transition-all active:scale-95 ${className}`} {...props}>
        {children}
    </button>
);

export default Login;
