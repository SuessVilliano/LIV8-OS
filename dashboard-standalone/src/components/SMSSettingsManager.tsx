/**
 * SMS Settings Manager
 * Unified SMS provider configuration for Twilio, Telnyx, TextLink
 */

import { useState, useEffect } from 'react';
import {
    MessageSquare,
    Eye,
    EyeOff,
    Check,
    X,
    Loader2,
    Trash2,
    AlertCircle,
    ExternalLink,
    Smartphone,
    Zap,
    DollarSign,
    Globe,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface SMSProvider {
    id: string;
    name: string;
    description: string;
    configured: boolean;
    isDefault: boolean;
    isValid?: boolean;
    pricing: string;
    features: string[];
}

interface SMSConfig {
    defaultProvider: string;
    twilio?: { accountSid: string; authToken: string; fromNumber: string; isValid?: boolean };
    telnyx?: { apiKey: string; fromNumber: string; messagingProfileId?: string; isValid?: boolean };
    textlink?: { apiKey: string; simId?: string; isValid?: boolean };
}

const SMSSettingsManager = () => {
    const [providers, setProviders] = useState<SMSProvider[]>([]);
    const [config, setConfig] = useState<SMSConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    // Form states for each provider
    const [twilioForm, setTwilioForm] = useState({ accountSid: '', authToken: '', fromNumber: '' });
    const [telnyxForm, setTelnyxForm] = useState({ apiKey: '', fromNumber: '', messagingProfileId: '' });
    const [textlinkForm, setTextlinkForm] = useState({ apiKey: '', simId: '', webhookSecret: '' });

    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);

    const token = localStorage.getItem('os_token');
    const locationId = localStorage.getItem('os_loc_id') || 'default';

    useEffect(() => {
        loadConfig();
    }, []);

    const getHeaders = () => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-location-id': locationId
    });

    const loadConfig = async () => {
        try {
            setLoading(true);
            setError(null);

            const [providersRes, configRes] = await Promise.all([
                fetch(`${API_BASE}/api/sms/providers`, { headers: getHeaders() }),
                fetch(`${API_BASE}/api/sms/config`, { headers: getHeaders() })
            ]);

            const providersData = await providersRes.json();
            const configData = await configRes.json();

            if (providersData.success) {
                setProviders(providersData.providers);
            }

            if (configData.success && configData.hasConfig) {
                setConfig(configData.config);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load SMS config');
        } finally {
            setLoading(false);
        }
    };

    const saveTwilio = async () => {
        if (!twilioForm.accountSid || !twilioForm.authToken || !twilioForm.fromNumber) {
            setError('All Twilio fields are required');
            return;
        }

        setSaving('twilio');
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/sms/config/twilio`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(twilioForm)
            });

            const data = await response.json();

            if (data.success) {
                setTwilioForm({ accountSid: '', authToken: '', fromNumber: '' });
                setExpandedProvider(null);
                await loadConfig();
            } else {
                setError(data.error || 'Failed to save Twilio config');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(null);
        }
    };

    const saveTelnyx = async () => {
        if (!telnyxForm.apiKey || !telnyxForm.fromNumber) {
            setError('API key and phone number are required');
            return;
        }

        setSaving('telnyx');
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/sms/config/telnyx`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(telnyxForm)
            });

            const data = await response.json();

            if (data.success) {
                setTelnyxForm({ apiKey: '', fromNumber: '', messagingProfileId: '' });
                setExpandedProvider(null);
                await loadConfig();
            } else {
                setError(data.error || 'Failed to save Telnyx config');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(null);
        }
    };

    const saveTextLink = async () => {
        if (!textlinkForm.apiKey) {
            setError('API key is required');
            return;
        }

        setSaving('textlink');
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/textlink/credentials`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(textlinkForm)
            });

            const data = await response.json();

            if (data.success) {
                setTextlinkForm({ apiKey: '', simId: '', webhookSecret: '' });
                setExpandedProvider(null);
                await loadConfig();
            } else {
                setError(data.error || 'Failed to save TextLink config');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(null);
        }
    };

    const setDefaultProvider = async (providerId: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/sms/config/default`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ provider: providerId })
            });

            const data = await response.json();

            if (data.success) {
                await loadConfig();
            } else {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const deleteProvider = async (providerId: string) => {
        if (!confirm(`Are you sure you want to remove ${providerId} configuration?`)) return;

        try {
            const endpoint = providerId === 'textlink'
                ? `${API_BASE}/api/textlink/credentials`
                : `${API_BASE}/api/sms/config/${providerId}`;

            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: getHeaders()
            });

            const data = await response.json();

            if (data.success) {
                await loadConfig();
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const testProvider = async (providerId: string) => {
        setTesting(providerId);

        try {
            const endpoint = providerId === 'textlink'
                ? `${API_BASE}/api/textlink/test`
                : `${API_BASE}/api/sms/test/${providerId}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: getHeaders()
            });

            const data = await response.json();

            if (data.success) {
                await loadConfig();
            } else {
                setError(data.error || `Failed to test ${providerId}`);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setTesting(null);
        }
    };

    const getProviderIcon = (providerId: string) => {
        switch (providerId) {
            case 'ghl': return <Globe className="h-5 w-5" />;
            case 'twilio': return <Zap className="h-5 w-5" />;
            case 'telnyx': return <DollarSign className="h-5 w-5" />;
            case 'textlink': return <Smartphone className="h-5 w-5" />;
            default: return <MessageSquare className="h-5 w-5" />;
        }
    };

    const getProviderColor = (providerId: string) => {
        switch (providerId) {
            case 'ghl': return 'text-blue-500 bg-blue-500/10';
            case 'twilio': return 'text-red-500 bg-red-500/10';
            case 'telnyx': return 'text-green-500 bg-green-500/10';
            case 'textlink': return 'text-purple-500 bg-purple-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

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
                        SMS <span className="text-emerald-500">Providers</span>
                    </h3>
                    <p className="text-sm text-[var(--os-text-muted)] font-bold">
                        Configure your SMS providers. Choose the best option for your needs.
                    </p>
                </div>
                <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
                    <MessageSquare className="h-7 w-7" />
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

            {/* Providers Grid */}
            <div className="space-y-4">
                {providers.map((provider) => {
                    const isExpanded = expandedProvider === provider.id;
                    const colorClass = getProviderColor(provider.id);

                    return (
                        <div key={provider.id} className="os-card overflow-hidden">
                            {/* Provider Header */}
                            <div
                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--os-surface-hover)] transition-all"
                                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                                        {getProviderIcon(provider.id)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black uppercase text-sm">{provider.name}</h4>
                                            {provider.isDefault && (
                                                <span className="px-2 py-0.5 bg-neuro/10 text-neuro text-[8px] font-black uppercase rounded-full">
                                                    Default
                                                </span>
                                            )}
                                            {provider.configured && provider.isValid && (
                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded-full">
                                                    Connected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--os-text-muted)]">{provider.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-[var(--os-text-muted)] font-mono">{provider.pricing}</span>
                                    {isExpanded ? (
                                        <ChevronDown className="h-5 w-5 text-[var(--os-text-muted)]" />
                                    ) : (
                                        <ChevronRight className="h-5 w-5 text-[var(--os-text-muted)]" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-[var(--os-border)] pt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2">
                                        {provider.features.map((feature, i) => (
                                            <span key={i} className="px-2 py-1 bg-[var(--os-bg)] text-[10px] font-bold rounded">
                                                {feature}
                                            </span>
                                        ))}
                                    </div>

                                    {/* GHL - Always available */}
                                    {provider.id === 'ghl' && (
                                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                            <p className="text-xs text-[var(--os-text-muted)]">
                                                GHL SMS is automatically available when your CRM is connected.
                                                Messages are sent through GHL's carrier integration.
                                            </p>
                                            {!provider.isDefault && provider.configured && (
                                                <button
                                                    onClick={() => setDefaultProvider('ghl')}
                                                    className="mt-3 px-4 py-2 bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg"
                                                >
                                                    Set as Default
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Twilio Configuration */}
                                    {provider.id === 'twilio' && (
                                        <div className="space-y-4">
                                            {provider.configured ? (
                                                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold">Account SID: {config?.twilio?.accountSid}</span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => testProvider('twilio')}
                                                                disabled={testing === 'twilio'}
                                                                className="px-3 py-1.5 bg-[var(--os-bg)] text-[10px] font-bold rounded-lg"
                                                            >
                                                                {testing === 'twilio' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                                                            </button>
                                                            {!provider.isDefault && (
                                                                <button
                                                                    onClick={() => setDefaultProvider('twilio')}
                                                                    className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg"
                                                                >
                                                                    Set Default
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => deleteProvider('twilio')}
                                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-[var(--os-text-muted)]">
                                                        From: {config?.twilio?.fromNumber}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={twilioForm.accountSid}
                                                        onChange={(e) => setTwilioForm({ ...twilioForm, accountSid: e.target.value })}
                                                        placeholder="Account SID (AC...)"
                                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono"
                                                    />
                                                    <div className="relative">
                                                        <input
                                                            type={showSecrets.twilio ? 'text' : 'password'}
                                                            value={twilioForm.authToken}
                                                            onChange={(e) => setTwilioForm({ ...twilioForm, authToken: e.target.value })}
                                                            placeholder="Auth Token"
                                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono pr-12"
                                                        />
                                                        <button
                                                            onClick={() => setShowSecrets({ ...showSecrets, twilio: !showSecrets.twilio })}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)]"
                                                        >
                                                            {showSecrets.twilio ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={twilioForm.fromNumber}
                                                        onChange={(e) => setTwilioForm({ ...twilioForm, fromNumber: e.target.value })}
                                                        placeholder="From Number (+1234567890)"
                                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono"
                                                    />
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={saveTwilio}
                                                            disabled={saving === 'twilio'}
                                                            className="flex-1 py-3 bg-red-500 text-white text-[10px] font-black uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {saving === 'twilio' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            Connect Twilio
                                                        </button>
                                                        <a
                                                            href="https://console.twilio.com"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-3 bg-[var(--os-bg)] border border-[var(--os-border)] text-[10px] font-bold rounded-xl flex items-center gap-2"
                                                        >
                                                            <ExternalLink className="h-3 w-3" /> Console
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Telnyx Configuration */}
                                    {provider.id === 'telnyx' && (
                                        <div className="space-y-4">
                                            {provider.configured ? (
                                                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold">From: {config?.telnyx?.fromNumber}</span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => testProvider('telnyx')}
                                                                disabled={testing === 'telnyx'}
                                                                className="px-3 py-1.5 bg-[var(--os-bg)] text-[10px] font-bold rounded-lg"
                                                            >
                                                                {testing === 'telnyx' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                                                            </button>
                                                            {!provider.isDefault && (
                                                                <button
                                                                    onClick={() => setDefaultProvider('telnyx')}
                                                                    className="px-3 py-1.5 bg-green-500 text-white text-[10px] font-bold rounded-lg"
                                                                >
                                                                    Set Default
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => deleteProvider('telnyx')}
                                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <input
                                                            type={showSecrets.telnyx ? 'text' : 'password'}
                                                            value={telnyxForm.apiKey}
                                                            onChange={(e) => setTelnyxForm({ ...telnyxForm, apiKey: e.target.value })}
                                                            placeholder="API Key (KEY...)"
                                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono pr-12"
                                                        />
                                                        <button
                                                            onClick={() => setShowSecrets({ ...showSecrets, telnyx: !showSecrets.telnyx })}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)]"
                                                        >
                                                            {showSecrets.telnyx ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={telnyxForm.fromNumber}
                                                        onChange={(e) => setTelnyxForm({ ...telnyxForm, fromNumber: e.target.value })}
                                                        placeholder="From Number (+1234567890)"
                                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={telnyxForm.messagingProfileId}
                                                        onChange={(e) => setTelnyxForm({ ...telnyxForm, messagingProfileId: e.target.value })}
                                                        placeholder="Messaging Profile ID (optional)"
                                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono"
                                                    />
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={saveTelnyx}
                                                            disabled={saving === 'telnyx'}
                                                            className="flex-1 py-3 bg-green-500 text-white text-[10px] font-black uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {saving === 'telnyx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            Connect Telnyx
                                                        </button>
                                                        <a
                                                            href="https://portal.telnyx.com"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-3 bg-[var(--os-bg)] border border-[var(--os-border)] text-[10px] font-bold rounded-xl flex items-center gap-2"
                                                        >
                                                            <ExternalLink className="h-3 w-3" /> Portal
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TextLink Configuration */}
                                    {provider.id === 'textlink' && (
                                        <div className="space-y-4">
                                            {provider.configured ? (
                                                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold">TextLink Connected</span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => testProvider('textlink')}
                                                                disabled={testing === 'textlink'}
                                                                className="px-3 py-1.5 bg-[var(--os-bg)] text-[10px] font-bold rounded-lg"
                                                            >
                                                                {testing === 'textlink' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                                                            </button>
                                                            {!provider.isDefault && (
                                                                <button
                                                                    onClick={() => setDefaultProvider('textlink')}
                                                                    className="px-3 py-1.5 bg-purple-500 text-white text-[10px] font-bold rounded-lg"
                                                                >
                                                                    Set Default
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => deleteProvider('textlink')}
                                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-[var(--os-text-muted)]">
                                                        SMS sent via your Android device. Make sure the TextLink app is running.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <input
                                                            type={showSecrets.textlink ? 'text' : 'password'}
                                                            value={textlinkForm.apiKey}
                                                            onChange={(e) => setTextlinkForm({ ...textlinkForm, apiKey: e.target.value })}
                                                            placeholder="TextLink API Key"
                                                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono pr-12"
                                                        />
                                                        <button
                                                            onClick={() => setShowSecrets({ ...showSecrets, textlink: !showSecrets.textlink })}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)]"
                                                        >
                                                            {showSecrets.textlink ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={textlinkForm.simId}
                                                        onChange={(e) => setTextlinkForm({ ...textlinkForm, simId: e.target.value })}
                                                        placeholder="SIM Card ID (optional)"
                                                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono"
                                                    />
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={saveTextLink}
                                                            disabled={saving === 'textlink'}
                                                            className="flex-1 py-3 bg-purple-500 text-white text-[10px] font-black uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {saving === 'textlink' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            Connect TextLink
                                                        </button>
                                                        <a
                                                            href="https://textlinksms.com/dashboard"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-3 bg-[var(--os-bg)] border border-[var(--os-border)] text-[10px] font-bold rounded-xl flex items-center gap-2"
                                                        >
                                                            <ExternalLink className="h-3 w-3" /> Dashboard
                                                        </a>
                                                    </div>
                                                    <div className="p-3 bg-purple-500/5 rounded-xl">
                                                        <p className="text-[10px] text-[var(--os-text-muted)]">
                                                            <strong>Requires:</strong> Android device with TextLink app + SIM card with SMS plan
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Info Box */}
            <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-3">
                <h4 className="font-black uppercase text-sm text-emerald-500">Multi-Provider SMS</h4>
                <p className="text-xs text-[var(--os-text-muted)]">
                    LIV8 supports multiple SMS providers. Choose the best option for your needs:
                </p>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div className="p-2 bg-[var(--os-bg)] rounded-lg">
                        <strong className="text-blue-500">GHL:</strong> Included with CRM
                    </div>
                    <div className="p-2 bg-[var(--os-bg)] rounded-lg">
                        <strong className="text-red-500">Twilio:</strong> Enterprise scale
                    </div>
                    <div className="p-2 bg-[var(--os-bg)] rounded-lg">
                        <strong className="text-green-500">Telnyx:</strong> Best value
                    </div>
                    <div className="p-2 bg-[var(--os-bg)] rounded-lg">
                        <strong className="text-purple-500">TextLink:</strong> Your phone plan
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SMSSettingsManager;
