import React, { useState, useEffect } from 'react';
import { Shield, Mail, Lock, Sparkles, ChevronRight, Fingerprint, AlertCircle, ArrowLeft, Eye, EyeOff, Building2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { config } = useTheme();
    const navigate = useNavigate();

    // Check if coming from pricing page with selected plan
    const selectedPlan = localStorage.getItem('selectedPlan');

    useEffect(() => {
        // If user has a selected plan, default to signup mode
        if (selectedPlan) {
            setMode('signup');
        }
    }, [selectedPlan]);

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

            // If there's a selected plan, redirect to checkout
            if (selectedPlan) {
                navigate('/checkout', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to connect. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        // Validate password strength
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    agencyName: agencyName || `${email.split('@')[0]}'s Business`
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Store auth token and user info
            localStorage.setItem('os_token', data.token);
            localStorage.setItem('os_user', JSON.stringify(data.user));

            setSuccess('Account created successfully!');

            // Brief delay then redirect
            setTimeout(() => {
                onLogin();
                // If there's a selected plan, redirect to checkout
                if (selectedPlan) {
                    navigate('/checkout', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Visual Depth Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse [animation-delay:2s]"></div>

            {/* Back to Home */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
            </button>

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10 space-y-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black text-white tracking-tighter leading-none">
                            {config?.platformName?.split(' ')[0] || 'LIV8'}<span className="text-blue-400">{config?.platformName?.split(' ')[1] || 'OS'}</span>
                        </h1>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.3em] mt-3">
                            {selectedPlan ? 'Start Your Free Trial' : 'Command Center Access'}
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/10">
                    {/* Mode Toggle */}
                    <div className="flex mb-8 p-1 bg-slate-900/50 rounded-xl">
                        <button
                            type="button"
                            onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                                mode === 'signin'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                                mode === 'signup'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <div className="mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Fingerprint className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                {mode === 'signin' ? 'Access your OS dashboard' : 'Start your 14-day free trial'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={mode === 'signin' ? handleLogin : handleSignup} className="space-y-5">
                        {/* Agency Name (signup only) */}
                        {mode === 'signup' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Business Name</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        value={agencyName}
                                        onChange={(e) => setAgencyName(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-11 py-3.5 text-sm font-medium text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Your Business Name"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-11 py-3.5 text-sm font-medium text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="you@yourbusiness.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-11 py-3.5 pr-12 text-sm font-medium text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password (signup only) */}
                        {mode === 'signup' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-11 py-3.5 pr-12 text-sm font-medium text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Confirm your password"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'signin' && (
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" />
                                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                                </label>
                                <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</button>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                                </div>
                            ) : (
                                <>{mode === 'signin' ? 'Sign In' : 'Start Free Trial'} <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    {mode === 'signup' && (
                        <p className="mt-4 text-xs text-center text-slate-500">
                            By signing up, you agree to our{' '}
                            <a href="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</a>
                            {' '}and{' '}
                            <a href="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>
                        </p>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Shield className="h-3 w-3" /> Protected by LIV8 Security
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
