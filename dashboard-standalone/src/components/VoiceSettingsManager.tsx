import { useState, useEffect } from 'react';
import {
    Phone,
    Shield,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Trash2,
    Plus,
    X,
    Key,
    ExternalLink
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface VoiceCredentials {
    provider: 'twilio' | 'telnyx' | null;
    phoneNumbers: string[];
    isValid?: boolean;
    lastTested?: string;
    accountSid?: string;
    apiKey?: string;
}

const VoiceSettingsManager = () => {
    const [credentials, setCredentials] = useState<VoiceCredentials | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [provider, setProvider] = useState<'twilio' | 'telnyx'>('twilio');
    const [accountSid, setAccountSid] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [profileId, setProfileId] = useState('');
    const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);

    useEffect(() => {
        fetchCredentials();
    }, []);

    const fetchCredentials = async () => {
        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id') || 'default';

            const response = await fetch(`${API_BASE}/api/voice-credentials`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Location-Id': locationId
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.hasCredentials) {
                    setCredentials(data.credentials);
                }
            }
        } catch (err) {
            console.error('Failed to fetch credentials:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const saveCredentials = async () => {
        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id') || 'default';

            const body: any = {
                provider,
                phoneNumbers: phoneNumbers.filter(p => p.trim())
            };

            if (provider === 'twilio') {
                body.accountSid = accountSid;
                body.authToken = authToken;
            } else {
                body.apiKey = apiKey;
                body.profileId = profileId;
            }

            const response = await fetch(`${API_BASE}/api/voice-credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Location-Id': locationId
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setSuccess('Credentials saved successfully');
                setShowForm(false);
                fetchCredentials();
                // Clear form
                setAccountSid('');
                setAuthToken('');
                setApiKey('');
                setProfileId('');
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to save credentials');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save credentials');
        } finally {
            setIsSaving(false);
        }
    };

    const testCredentials = async () => {
        setIsTesting(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id') || 'default';

            const response = await fetch(`${API_BASE}/api/voice-credentials/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Location-Id': locationId
                }
            });

            const data = await response.json();

            if (data.isValid) {
                setSuccess(data.message);
                fetchCredentials();
            } else {
                setError(data.message || 'Credentials validation failed');
            }
        } catch (err: any) {
            setError(err.message || 'Test failed');
        } finally {
            setIsTesting(false);
        }
    };

    const deleteCredentials = async () => {
        if (!confirm('Are you sure you want to delete your voice credentials?')) return;

        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id') || 'default';

            await fetch(`${API_BASE}/api/voice-credentials`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Location-Id': locationId
                }
            });

            setCredentials(null);
            setSuccess('Credentials deleted');
        } catch (err: any) {
            setError(err.message || 'Failed to delete');
        }
    };

    const addPhoneNumber = () => {
        setPhoneNumbers([...phoneNumbers, '']);
    };

    const updatePhoneNumber = (index: number, value: string) => {
        const updated = [...phoneNumbers];
        updated[index] = value;
        setPhoneNumbers(updated);
    };

    const removePhoneNumber = (index: number) => {
        setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neuro" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                    <Phone className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase italic">Voice Credentials</h3>
                    <p className="text-xs text-[var(--os-text-muted)]">Connect Twilio or Telnyx for VAPI calling</p>
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <p className="text-sm text-emerald-500">{success}</p>
                </div>
            )}

            {/* Current Credentials */}
            {credentials && !showForm && (
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                credentials.provider === 'twilio' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                            }`}>
                                <Shield className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-bold capitalize">{credentials.provider}</p>
                                <p className="text-xs text-[var(--os-text-muted)]">
                                    {credentials.isValid === true && '✅ Verified'}
                                    {credentials.isValid === false && '❌ Invalid'}
                                    {credentials.isValid === undefined && '⚪ Not tested'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={testCredentials}
                                disabled={isTesting}
                                className="px-3 py-2 text-xs font-bold border border-[var(--os-border)] rounded-lg hover:border-neuro hover:text-neuro transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Test
                            </button>
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-3 py-2 text-xs font-bold bg-neuro text-white rounded-lg hover:bg-neuro/90 transition-all"
                            >
                                Update
                            </button>
                            <button
                                onClick={deleteCredentials}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Phone Numbers */}
                    {credentials.phoneNumbers && credentials.phoneNumbers.length > 0 && (
                        <div className="pt-4 border-t border-[var(--os-border)]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-text-muted)] mb-2">Phone Numbers</p>
                            <div className="flex flex-wrap gap-2">
                                {credentials.phoneNumbers.map((phone, i) => (
                                    <span key={i} className="px-3 py-1 bg-violet-500/10 text-violet-500 rounded-full text-xs font-bold">
                                        {phone}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {credentials.lastTested && (
                        <p className="text-[10px] text-[var(--os-text-muted)]">
                            Last tested: {new Date(credentials.lastTested).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {/* Add/Edit Form */}
            {(showForm || !credentials) && (
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 space-y-6">
                    {/* Provider Selection */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-3 block">
                            Provider
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['twilio', 'telnyx'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setProvider(p)}
                                    className={`p-4 rounded-xl border text-left transition-all ${
                                        provider === p
                                            ? 'border-neuro bg-neuro/5'
                                            : 'border-[var(--os-border)] hover:border-neuro/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                            p === 'twilio' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                                        }`}>
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold capitalize">{p}</p>
                                            <p className="text-[10px] text-[var(--os-text-muted)]">
                                                {p === 'twilio' ? 'Most popular' : 'Better rates'}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Twilio Fields */}
                    {provider === 'twilio' && (
                        <>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    Account SID
                                </label>
                                <input
                                    type="text"
                                    value={accountSid}
                                    onChange={(e) => setAccountSid(e.target.value)}
                                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    Auth Token
                                </label>
                                <input
                                    type="password"
                                    value={authToken}
                                    onChange={(e) => setAuthToken(e.target.value)}
                                    placeholder="••••••••••••••••••••••••••••••••"
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                />
                            </div>
                            <a
                                href="https://console.twilio.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs text-neuro hover:underline"
                            >
                                <Key className="h-3 w-3" />
                                Get your credentials from Twilio Console
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </>
                    )}

                    {/* Telnyx Fields */}
                    {provider === 'telnyx' && (
                        <>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="KEY_xxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    Profile ID (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={profileId}
                                    onChange={(e) => setProfileId(e.target.value)}
                                    placeholder="Optional - for messaging profiles"
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                />
                            </div>
                            <a
                                href="https://portal.telnyx.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs text-neuro hover:underline"
                            >
                                <Key className="h-3 w-3" />
                                Get your API key from Telnyx Portal
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </>
                    )}

                    {/* Phone Numbers */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                            Phone Numbers
                        </label>
                        <div className="space-y-2">
                            {phoneNumbers.map((phone, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => updatePhoneNumber(i, e.target.value)}
                                        placeholder="+1234567890"
                                        className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                    />
                                    {phoneNumbers.length > 1 && (
                                        <button
                                            onClick={() => removePhoneNumber(i)}
                                            className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={addPhoneNumber}
                                className="flex items-center gap-2 text-xs font-bold text-neuro hover:underline"
                            >
                                <Plus className="h-3 w-3" />
                                Add another number
                            </button>
                        </div>
                        <p className="text-[10px] text-[var(--os-text-muted)] mt-2">
                            Add phone numbers from your {provider} account to use for outbound calling
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-[var(--os-border)]">
                        {credentials && (
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 border border-[var(--os-border)] rounded-xl font-bold text-sm hover:border-neuro transition-all"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={saveCredentials}
                            disabled={isSaving || (provider === 'twilio' ? !accountSid || !authToken : !apiKey)}
                            className="flex-1 py-3 bg-neuro text-white rounded-xl font-bold text-sm hover:bg-neuro/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Shield className="h-4 w-4" />
                            )}
                            Save Credentials
                        </button>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                <p className="text-xs text-violet-400">
                    <strong>Why add voice credentials?</strong><br />
                    Connect your Twilio or Telnyx account to enable AI voice calls through VAPI.
                    Your credentials are encrypted and stored securely.
                </p>
            </div>
        </div>
    );
};

export default VoiceSettingsManager;
