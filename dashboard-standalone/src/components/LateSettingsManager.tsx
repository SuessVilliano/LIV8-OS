/**
 * Late Social Media Settings Manager
 * Manages Late API key and connected social accounts for 13 platforms
 */

import { useState, useEffect } from 'react';
import {
    Share2,
    Key,
    Eye,
    EyeOff,
    Check,
    X,
    Loader2,
    Trash2,
    AlertCircle,
    ExternalLink,
    RefreshCw,
    Plus,
    Twitter,
    Instagram,
    Facebook,
    Linkedin,
    Youtube
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface LateAccount {
    id: string;
    platform: string;
    username: string;
    connected: boolean;
}

interface LateCredentials {
    hasCredentials: boolean;
    credentials?: {
        apiKey: string;
        profileId?: string;
        isValid?: boolean;
        lastTested?: string;
    };
}

// Platform configuration
const PLATFORMS = [
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-600/10' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-700/10' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'tiktok', name: 'TikTok', icon: Share2, color: 'text-gray-900 dark:text-white', bg: 'bg-gray-500/10' },
    { id: 'threads', name: 'Threads', icon: Share2, color: 'text-gray-900 dark:text-white', bg: 'bg-gray-500/10' },
    { id: 'bluesky', name: 'Bluesky', icon: Share2, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { id: 'reddit', name: 'Reddit', icon: Share2, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'pinterest', name: 'Pinterest', icon: Share2, color: 'text-red-600', bg: 'bg-red-600/10' },
    { id: 'googlebusiness', name: 'Google Business', icon: Share2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 'telegram', name: 'Telegram', icon: Share2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'snapchat', name: 'Snapchat', icon: Share2, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
];

const LateSettingsManager = () => {
    const [credentials, setCredentials] = useState<LateCredentials | null>(null);
    const [accounts, setAccounts] = useState<LateAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [isEditing, setIsEditing] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Connection states
    const [connecting, setConnecting] = useState<string | null>(null);

    const token = localStorage.getItem('os_token');
    const locationId = localStorage.getItem('os_loc_id') || 'default';

    useEffect(() => {
        loadCredentials();
    }, []);

    const getHeaders = () => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-location-id': locationId
    });

    const loadCredentials = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE}/api/late/credentials`, {
                headers: getHeaders()
            });
            const data = await response.json();

            if (data.success) {
                setCredentials(data);

                // If credentials exist and are valid, load accounts
                if (data.hasCredentials && data.credentials?.isValid) {
                    await loadAccounts();
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load Late credentials');
        } finally {
            setLoading(false);
        }
    };

    const loadAccounts = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/late/accounts`, {
                headers: getHeaders()
            });
            const data = await response.json();

            if (data.success) {
                setAccounts(data.accounts || []);
            }
        } catch (err) {
            console.error('Failed to load Late accounts:', err);
        }
    };

    const handleSaveKey = async () => {
        if (!apiKey.trim()) return;

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/late/credentials`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ apiKey })
            });
            const data = await response.json();

            if (data.success) {
                setIsEditing(false);
                setApiKey('');
                await loadCredentials();
            } else {
                setError(data.error || 'Failed to save API key');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTestKey = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const response = await fetch(`${API_BASE}/api/late/test`, {
                method: 'POST',
                headers: getHeaders()
            });
            const data = await response.json();

            setTestResult({
                success: data.isValid,
                message: data.message
            });

            if (data.isValid) {
                await loadAccounts();
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message
            });
        } finally {
            setTesting(false);
        }
    };

    const handleDeleteKey = async () => {
        if (!confirm('Are you sure you want to remove your Late API key? This will disconnect all social accounts.')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/late/credentials`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            const data = await response.json();

            if (data.success) {
                setCredentials(null);
                setAccounts([]);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleConnectPlatform = async (platform: string) => {
        setConnecting(platform);

        try {
            const response = await fetch(`${API_BASE}/api/late/connect/${platform}?headless=true`, {
                headers: getHeaders()
            });
            const data = await response.json();

            if (data.success && data.url) {
                // Open OAuth popup
                const popup = window.open(data.url, 'late_oauth', 'width=600,height=700');

                // Poll for completion
                const pollInterval = setInterval(async () => {
                    if (popup?.closed) {
                        clearInterval(pollInterval);
                        setConnecting(null);
                        await loadAccounts();
                    }
                }, 1000);

                // Stop polling after 2 minutes
                setTimeout(() => {
                    clearInterval(pollInterval);
                    setConnecting(null);
                }, 120000);
            } else {
                setError(data.error || 'Failed to get connect URL');
                setConnecting(null);
            }
        } catch (err: any) {
            setError(err.message);
            setConnecting(null);
        }
    };

    const getPlatformIcon = (platformId: string) => {
        const platform = PLATFORMS.find(p => p.id === platformId);
        if (!platform) return Share2;
        return platform.icon;
    };

    const getPlatformStyle = (platformId: string) => {
        const platform = PLATFORMS.find(p => p.id === platformId);
        return {
            color: platform?.color || 'text-gray-500',
            bg: platform?.bg || 'bg-gray-500/10'
        };
    };

    const connectedPlatformIds = accounts.map(a => a.platform);
    const unconnectedPlatforms = PLATFORMS.filter(p => !connectedPlatformIds.includes(p.id));

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-neuro" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase italic leading-none">
                        Late <span className="text-purple-500">Social</span>
                    </h3>
                    <p className="text-sm text-[var(--os-text-muted)] font-bold">
                        Post to 13 social platforms with one API. Twitter, Instagram, TikTok, LinkedIn, Threads, and more.
                    </p>
                </div>
                <div className="h-14 w-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 shadow-lg shadow-purple-500/10">
                    <Share2 className="h-7 w-7" />
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-bold">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* API Key Configuration */}
            <div className="os-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                            <Key className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-black uppercase text-sm">Late API Key</h4>
                            {credentials?.hasCredentials ? (
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-[var(--os-text-muted)] font-mono">
                                        {credentials.credentials?.apiKey}
                                    </p>
                                    {credentials.credentials?.isValid && (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded-full">
                                            Valid
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-orange-500 font-bold">Not configured</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {credentials?.hasCredentials && (
                            <>
                                <button
                                    onClick={handleTestKey}
                                    disabled={testing}
                                    className="px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] text-[10px] font-black uppercase rounded-lg hover:border-purple-500 transition-all disabled:opacity-50"
                                >
                                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                                </button>
                                <button
                                    onClick={handleDeleteKey}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => {
                                setIsEditing(true);
                                setApiKey('');
                                setTestResult(null);
                            }}
                            className="px-4 py-2 bg-purple-500 text-white text-[10px] font-black uppercase rounded-lg hover:bg-purple-600 transition-all"
                        >
                            {credentials?.hasCredentials ? 'Update' : 'Add Key'}
                        </button>
                    </div>
                </div>

                {/* Test Result */}
                {testResult && (
                    <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
                        testResult.success
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-red-500/10 text-red-500'
                    }`}>
                        {testResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {testResult.message}
                    </div>
                )}

                {/* Inline Edit Form */}
                {isEditing && (
                    <div className="pt-4 border-t border-[var(--os-border)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="late_api_..."
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono focus:border-purple-500 outline-none pr-12"
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <button
                                onClick={handleSaveKey}
                                disabled={!apiKey || saving}
                                className="px-6 py-2 bg-purple-500 text-white text-[10px] font-black uppercase rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setApiKey('');
                                }}
                                className="p-2 text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <a
                            href="https://getlate.dev/dashboard/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-purple-500 font-bold hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Get your Late API key
                        </a>
                    </div>
                )}
            </div>

            {/* Connected Accounts */}
            {credentials?.hasCredentials && credentials?.credentials?.isValid && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-black uppercase">Connected Accounts</h4>
                        <button
                            onClick={loadAccounts}
                            className="p-2 text-[var(--os-text-muted)] hover:text-purple-500 transition-all"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Connected */}
                    {accounts.length > 0 && (
                        <div className="grid gap-3">
                            {accounts.map(account => {
                                const Icon = getPlatformIcon(account.platform);
                                const style = getPlatformStyle(account.platform);
                                return (
                                    <div
                                        key={account.id}
                                        className="os-card p-4 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 ${style.bg} rounded-xl flex items-center justify-center ${style.color}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm capitalize">{account.platform}</div>
                                                <div className="text-xs text-[var(--os-text-muted)]">@{account.username}</div>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase">
                                            Connected
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Available to Connect */}
                    {unconnectedPlatforms.length > 0 && (
                        <div className="space-y-3">
                            <h5 className="text-xs font-bold text-[var(--os-text-muted)] uppercase">
                                Connect More Platforms
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {unconnectedPlatforms.map(platform => {
                                    const Icon = platform.icon;
                                    const isConnecting = connecting === platform.id;
                                    return (
                                        <button
                                            key={platform.id}
                                            onClick={() => handleConnectPlatform(platform.id)}
                                            disabled={isConnecting}
                                            className="flex flex-col items-center gap-2 p-4 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl hover:border-purple-500/50 transition-all disabled:opacity-50"
                                        >
                                            <div className={`h-10 w-10 ${platform.bg} rounded-xl flex items-center justify-center ${platform.color}`}>
                                                {isConnecting ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Icon className="h-5 w-5" />
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold">{platform.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {accounts.length === 0 && (
                        <div className="os-card p-8 text-center space-y-4">
                            <div className="h-16 w-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mx-auto">
                                <Plus className="h-8 w-8" />
                            </div>
                            <div>
                                <h4 className="font-black uppercase">No Accounts Connected</h4>
                                <p className="text-sm text-[var(--os-text-muted)]">
                                    Connect your social media accounts to start posting
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Info Box */}
            <div className="p-6 bg-purple-500/5 rounded-2xl border border-purple-500/20 space-y-3">
                <h4 className="font-black uppercase text-sm text-purple-500">Powered by Late</h4>
                <p className="text-xs text-[var(--os-text-muted)]">
                    Late provides unified social media posting across 13 platforms with 99.97% uptime SLA.
                    No need to manage individual platform APIs - Late handles OAuth, token refresh, and
                    platform-specific formatting automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                    {['Twitter/X', 'Instagram', 'TikTok', 'LinkedIn', 'Threads', 'Bluesky', 'Reddit', '+6 more'].map(p => (
                        <span key={p} className="px-2 py-1 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded">
                            {p}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LateSettingsManager;
