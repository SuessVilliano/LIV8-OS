import { useState, useEffect } from 'react';
import {
    Key,
    Eye,
    EyeOff,
    Check,
    X,
    Loader2,
    Trash2,
    Shield,
    Sparkles,
    Brain,
    Cpu,
    AlertCircle,
    Copy,
    RefreshCw,
    Link,
    ExternalLink
} from 'lucide-react';
import { settingsService, AIProvider, UserSettings, WebhookInfo } from '../services/settingsService';

interface ProviderConfig {
    id: AIProvider;
    name: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    placeholder: string;
    helpUrl: string;
}

const PROVIDERS: ProviderConfig[] = [
    {
        id: 'gemini',
        name: 'Google Gemini',
        icon: <Sparkles className="h-5 w-5" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        placeholder: 'AIza...',
        helpUrl: 'https://aistudio.google.com/app/apikey'
    },
    {
        id: 'openai',
        name: 'OpenAI',
        icon: <Brain className="h-5 w-5" />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        placeholder: 'sk-...',
        helpUrl: 'https://platform.openai.com/api-keys'
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        icon: <Cpu className="h-5 w-5" />,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        placeholder: 'sk-ant-...',
        helpUrl: 'https://console.anthropic.com/settings/keys'
    }
];

const APIKeyManager = () => {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // API Key Form States
    const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
    const [newApiKey, setNewApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Webhook States
    const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
    const [generatingSecret, setGeneratingSecret] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const [settingsData, webhookData] = await Promise.all([
                settingsService.getSettings(),
                settingsService.getWebhookInfo()
            ]);
            setSettings(settingsData);
            setWebhookInfo(webhookData);
        } catch (err: any) {
            setError(err.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleValidateKey = async () => {
        if (!editingProvider || !newApiKey) return;

        setValidating(true);
        setValidationError(null);

        try {
            const result = await settingsService.validateApiKey(editingProvider, newApiKey);
            if (!result.valid) {
                setValidationError(result.error || 'Invalid API key');
            }
        } catch (err: any) {
            setValidationError(err.message);
        } finally {
            setValidating(false);
        }
    };

    const handleSaveKey = async () => {
        if (!editingProvider || !newApiKey) return;

        setSaving(true);
        setValidationError(null);

        try {
            await settingsService.saveApiKey(editingProvider, newApiKey, true);
            await loadSettings();
            setEditingProvider(null);
            setNewApiKey('');
        } catch (err: any) {
            setValidationError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteKey = async (provider: AIProvider) => {
        if (!confirm(`Are you sure you want to remove your ${provider} API key?`)) return;

        try {
            await settingsService.deleteApiKey(provider);
            await loadSettings();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSetActiveProvider = async (provider: AIProvider) => {
        try {
            await settingsService.setAIProvider(provider);
            await loadSettings();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleGenerateWebhookSecret = async () => {
        setGeneratingSecret(true);
        try {
            const result = await settingsService.generateWebhookSecret();
            setWebhookSecret(result.webhookSecret);
            await loadSettings();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGeneratingSecret(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const hasKey = (provider: AIProvider): boolean => {
        if (!settings) return false;
        switch (provider) {
            case 'gemini': return settings.hasGeminiKey;
            case 'openai': return settings.hasOpenaiKey;
            case 'anthropic': return settings.hasAnthropicKey;
            default: return false;
        }
    };

    const getMaskedKey = (provider: AIProvider): string | undefined => {
        if (!settings) return undefined;
        switch (provider) {
            case 'gemini': return settings.geminiApiKey;
            case 'openai': return settings.openaiApiKey;
            case 'anthropic': return settings.anthropicApiKey;
            default: return undefined;
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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            {/* AI API Keys Section */}
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h3 className="text-3xl font-black uppercase italic leading-none">
                            AI <span className="text-neuro">Neural Keys</span>
                        </h3>
                        <p className="text-sm text-[var(--os-text-muted)] font-bold">
                            Connect your AI providers to power content generation. Your keys are encrypted and never exposed.
                        </p>
                    </div>
                    <div className="h-14 w-14 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro shadow-lg shadow-neuro/10">
                        <Key className="h-7 w-7" />
                    </div>
                </div>

                <div className="grid gap-4">
                    {PROVIDERS.map((provider) => (
                        <div
                            key={provider.id}
                            className={`os-card p-6 transition-all ${
                                settings?.aiProvider === provider.id
                                    ? 'border-2 border-neuro shadow-lg shadow-neuro/10'
                                    : ''
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 ${provider.bgColor} rounded-xl flex items-center justify-center ${provider.color}`}>
                                        {provider.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black uppercase text-sm">{provider.name}</h4>
                                            {settings?.aiProvider === provider.id && (
                                                <span className="px-2 py-0.5 bg-neuro text-white text-[8px] font-black uppercase rounded-full">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        {hasKey(provider.id) ? (
                                            <p className="text-xs text-[var(--os-text-muted)] font-mono">
                                                {getMaskedKey(provider.id)}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-[var(--os-text-muted)]">Not configured</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasKey(provider.id) && settings?.aiProvider !== provider.id && (
                                        <button
                                            onClick={() => handleSetActiveProvider(provider.id)}
                                            className="px-4 py-2 bg-neuro/10 text-neuro text-[10px] font-black uppercase rounded-lg hover:bg-neuro hover:text-white transition-all"
                                        >
                                            Set Active
                                        </button>
                                    )}
                                    {hasKey(provider.id) && (
                                        <button
                                            onClick={() => handleDeleteKey(provider.id)}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setEditingProvider(provider.id);
                                            setNewApiKey('');
                                            setValidationError(null);
                                        }}
                                        className="px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] text-[10px] font-black uppercase rounded-lg hover:border-neuro transition-all"
                                    >
                                        {hasKey(provider.id) ? 'Update' : 'Add Key'}
                                    </button>
                                </div>
                            </div>

                            {/* Inline Edit Form */}
                            {editingProvider === provider.id && (
                                <div className="mt-6 pt-6 border-t border-[var(--os-border)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type={showKey ? 'text' : 'password'}
                                                value={newApiKey}
                                                onChange={(e) => setNewApiKey(e.target.value)}
                                                placeholder={provider.placeholder}
                                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-mono focus:border-neuro outline-none pr-12"
                                            />
                                            <button
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)] hover:text-[var(--os-text)]"
                                            >
                                                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleValidateKey}
                                            disabled={!newApiKey || validating}
                                            className="px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] text-[10px] font-black uppercase rounded-lg hover:border-neuro transition-all disabled:opacity-50"
                                        >
                                            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                                        </button>
                                        <button
                                            onClick={handleSaveKey}
                                            disabled={!newApiKey || saving}
                                            className="px-6 py-2 bg-neuro text-white text-[10px] font-black uppercase rounded-lg hover:bg-neuro-dark transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingProvider(null);
                                                setNewApiKey('');
                                                setValidationError(null);
                                            }}
                                            className="p-2 text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-all"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {validationError && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                                            <AlertCircle className="h-4 w-4" />
                                            {validationError}
                                        </div>
                                    )}

                                    <a
                                        href={provider.helpUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs text-neuro font-bold hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Get your {provider.name} API key
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Webhook Secret Section */}
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h3 className="text-3xl font-black uppercase italic leading-none">
                            Webhook <span className="text-neuro">Security</span>
                        </h3>
                        <p className="text-sm text-[var(--os-text-muted)] font-bold">
                            Secure your GHL workflow integrations with a webhook secret. Use this in your workflow HTTP actions.
                        </p>
                    </div>
                    <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
                        <Shield className="h-7 w-7" />
                    </div>
                </div>

                <div className="os-card p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                <Link className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-black uppercase text-sm">Webhook Secret</h4>
                                {settings?.hasWebhookSecret ? (
                                    <p className="text-xs text-[var(--os-text-muted)] font-mono">
                                        {settings.webhookSecret}
                                    </p>
                                ) : (
                                    <p className="text-xs text-orange-500 font-bold">Not generated - Create one to secure your webhooks</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleGenerateWebhookSecret}
                            disabled={generatingSecret}
                            className="px-6 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {generatingSecret ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            {settings?.hasWebhookSecret ? 'Regenerate' : 'Generate'}
                        </button>
                    </div>

                    {webhookSecret && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-emerald-500">Your New Webhook Secret (Save this now!)</span>
                                <button
                                    onClick={() => handleCopy(webhookSecret, 'secret')}
                                    className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-2"
                                >
                                    {copied === 'secret' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied === 'secret' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <code className="block text-xs font-mono text-emerald-400 break-all">
                                {webhookSecret}
                            </code>
                            <p className="text-[10px] text-[var(--os-text-muted)]">
                                Add this as <code className="bg-[var(--os-bg)] px-1 rounded">x-api-key</code> header in your GHL workflow HTTP actions.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Webhook Endpoints Reference */}
            {webhookInfo && (
                <div className="space-y-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black uppercase italic leading-none">
                                GHL <span className="text-neuro">Endpoints</span>
                            </h3>
                            <p className="text-sm text-[var(--os-text-muted)] font-bold">
                                Use these endpoints in your GHL workflows to trigger AI content generation.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {Object.entries(webhookInfo.webhookEndpoints).map(([key, endpoint]) => (
                            <div key={key} className="os-card p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-black uppercase text-sm">{endpoint.description}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-neuro/10 text-neuro text-[10px] font-black rounded">
                                                {endpoint.method}
                                            </span>
                                            <code className="text-xs font-mono text-[var(--os-text-muted)]">
                                                {endpoint.url}
                                            </code>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(endpoint.url, key)}
                                        className="p-2 bg-[var(--os-surface)] rounded-lg hover:bg-neuro/10 transition-all"
                                    >
                                        {copied === key ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>

                                <details className="text-xs">
                                    <summary className="cursor-pointer font-bold text-[var(--os-text-muted)] hover:text-neuro">
                                        View Example Body
                                    </summary>
                                    <pre className="mt-2 p-4 bg-[var(--os-bg)] rounded-xl overflow-x-auto font-mono text-[10px]">
                                        {JSON.stringify(endpoint.exampleBody, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-neuro/5 rounded-2xl border border-neuro/20">
                        <h4 className="font-black uppercase text-sm mb-3">Required Headers</h4>
                        <div className="space-y-2 font-mono text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--os-text-muted)]">Content-Type:</span>
                                <code className="bg-[var(--os-bg)] px-2 py-1 rounded">application/json</code>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--os-text-muted)]">x-api-key:</span>
                                <code className="bg-[var(--os-bg)] px-2 py-1 rounded">
                                    {webhookInfo.hasWebhookSecret ? 'Your webhook secret' : '(Generate a secret first)'}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default APIKeyManager;
