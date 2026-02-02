import { useState } from 'react';
import {
    Palette,
    Type,
    Image as ImageIcon,
    Save,
    ShieldCheck,
    Smartphone,
    Monitor,
    Layout,
    Check
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import WebhookManager from '../components/WebhookManager';
import APIKeyManager from '../components/APIKeyManager';
import VoiceSettingsManager from '../components/VoiceSettingsManager';

const Settings = () => {
    const { config, updateConfig, isDark, toggleTheme } = useTheme();
    const [localConfig, setLocalConfig] = useState(config);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        updateConfig(localConfig);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-x-hidden custom-scrollbar overflow-y-auto transition-colors duration-500">
            <div className="p-10 space-y-12 relative z-10 max-w-4xl">
                <header>
                    <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                        <Layout className="h-3 w-3" /> System Configuration
                    </p>
                    <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                        Whitelabel <span className="text-neuro">Control</span>
                    </h1>
                    <p className="text-[var(--os-text-muted)] text-xs font-bold mt-4 max-w-md">
                        Configure how your clients perceive the platform. Changes update in real-time across all nodes.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Branding Section */}
                    <div className="os-card p-8 space-y-8 shadow-xl shadow-blue-900/5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                <Type className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic">Branding Core</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Platform Name</label>
                                <input
                                    type="text"
                                    value={localConfig.platformName}
                                    onChange={(e) => setLocalConfig({ ...localConfig, platformName: e.target.value })}
                                    className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-neuro outline-none transition-all"
                                    placeholder="e.g. My Agency OS"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Custom Logo URL</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                        <input
                                            type="text"
                                            value={localConfig.logoUrl || ''}
                                            onChange={(e) => setLocalConfig({ ...localConfig, logoUrl: e.target.value })}
                                            className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold focus:border-neuro outline-none transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="h-12 w-12 rounded-2xl bg-[var(--os-surface)] border border-[var(--os-border)] flex items-center justify-center overflow-hidden">
                                        {localConfig.logoUrl ? <img src={localConfig.logoUrl} className="h-6 w-6 object-contain" /> : <ImageIcon className="h-5 w-5 text-[var(--os-text-muted)]" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual Interface Section */}
                    <div className="os-card p-8 space-y-8 shadow-xl shadow-blue-900/5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                <Palette className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic">Visual DNA</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest ml-1">Primary Acccent Color</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={localConfig.primaryColor || '#1068EB'}
                                        onChange={(e) => setLocalConfig({ ...localConfig, primaryColor: e.target.value })}
                                        className="h-12 w-20 bg-transparent rounded-xl cursor-pointer"
                                    />
                                    <div className="text-xs font-mono font-bold">{localConfig.primaryColor || '#1068EB'}</div>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between p-4 rounded-2xl bg-[var(--os-surface)] border border-[var(--os-border)]">
                                <div className="flex items-center gap-3">
                                    {isDark ? <Monitor className="h-4 w-4 text-neuro" /> : <Smartphone className="h-4 w-4 text-neuro" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{isDark ? 'Midnight Mode Active' : 'Light Mode Active'}</span>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className="px-4 py-2 bg-neuro/10 text-neuro text-[10px] font-black uppercase rounded-lg hover:bg-neuro hover:text-white transition-all"
                                >
                                    Toggle View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI & Webhook Configuration */}
                <div className="border-t border-[var(--os-border)] pt-12">
                    <APIKeyManager />
                </div>

                {/* Voice Credentials */}
                <div className="border-t border-[var(--os-border)] pt-12">
                    <VoiceSettingsManager />
                </div>

                {/* Mobile Webhook Integration */}
                <div className="border-t border-[var(--os-border)] pt-12">
                    <WebhookManager />
                </div>

                {/* Save Logic */}
                <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-full bg-neuro/10 blur-[50px] group-hover:bg-neuro/20 transition-all"></div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-neuro">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase italic leading-none">Apply Neural Override</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Standardize platform DNA across all subsystems.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className={`relative z-10 px-10 h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${saved ? 'bg-emerald-500' : 'bg-neuro hover:bg-neuro-dark'} shadow-xl`}
                    >
                        {saved ? <><Check className="h-4 w-4" /> Config Synced</> : <><Save className="h-4 w-4" /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
