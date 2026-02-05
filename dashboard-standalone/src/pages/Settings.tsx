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
    Check,
    Key,
    Phone,
    MessageSquare,
    Globe,
    Webhook,
    Bot
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import WebhookManager from '../components/WebhookManager';
import APIKeyManager from '../components/APIKeyManager';
import VoiceSettingsManager from '../components/VoiceSettingsManager';
import LateSettingsManager from '../components/LateSettingsManager';
import SMSSettingsManager from '../components/SMSSettingsManager';
import AnyChatSettingsManager from '../components/AnyChatSettingsManager';

type SettingsTab = 'branding' | 'ai' | 'voice' | 'sms' | 'social' | 'chat' | 'webhooks';

interface TabConfig {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const TABS: TabConfig[] = [
    { id: 'branding', label: 'Branding', icon: <Palette className="h-4 w-4" />, description: 'Customize your platform appearance' },
    { id: 'ai', label: 'AI Keys', icon: <Key className="h-4 w-4" />, description: 'Configure AI provider API keys' },
    { id: 'voice', label: 'Voice', icon: <Phone className="h-4 w-4" />, description: 'Voice AI credentials' },
    { id: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" />, description: 'SMS provider settings' },
    { id: 'social', label: 'Social', icon: <Globe className="h-4 w-4" />, description: 'Social media integrations' },
    { id: 'chat', label: 'Live Chat', icon: <Bot className="h-4 w-4" />, description: 'AnyChat live chat settings' },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="h-4 w-4" />, description: 'Webhook integrations' },
];

const Settings = () => {
    const { config, updateConfig, isDark, toggleTheme } = useTheme();
    const [localConfig, setLocalConfig] = useState(config);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>('branding');

    const handleSave = () => {
        updateConfig(localConfig);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'branding':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Branding Section */}
                            <div className="os-card p-6 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                        <Type className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-base font-black uppercase">Branding Core</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Platform Name</label>
                                        <input
                                            type="text"
                                            value={localConfig.platformName}
                                            onChange={(e) => setLocalConfig({ ...localConfig, platformName: e.target.value })}
                                            className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold focus:border-neuro outline-none transition-all"
                                            placeholder="e.g. My Agency OS"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Custom Logo URL</label>
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                                <input
                                                    type="text"
                                                    value={localConfig.logoUrl || ''}
                                                    onChange={(e) => setLocalConfig({ ...localConfig, logoUrl: e.target.value })}
                                                    className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-neuro outline-none transition-all"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div className="h-12 w-12 rounded-xl bg-[var(--os-surface)] border border-[var(--os-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {localConfig.logoUrl ? <img src={localConfig.logoUrl} className="h-6 w-6 object-contain" /> : <ImageIcon className="h-5 w-5 text-[var(--os-text-muted)]" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Interface Section */}
                            <div className="os-card p-6 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                        <Palette className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-base font-black uppercase">Visual DNA</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Primary Accent Color</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="color"
                                                value={localConfig.primaryColor || '#1068EB'}
                                                onChange={(e) => setLocalConfig({ ...localConfig, primaryColor: e.target.value })}
                                                className="h-12 w-16 bg-transparent rounded-xl cursor-pointer border-0"
                                            />
                                            <div className="text-xs font-mono font-bold bg-[var(--os-surface)] px-3 py-2 rounded-lg">{localConfig.primaryColor || '#1068EB'}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--os-surface)] border border-[var(--os-border)]">
                                        <div className="flex items-center gap-3">
                                            {isDark ? <Monitor className="h-4 w-4 text-neuro" /> : <Smartphone className="h-4 w-4 text-neuro" />}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{isDark ? 'Midnight Mode' : 'Light Mode'}</span>
                                        </div>
                                        <button
                                            onClick={toggleTheme}
                                            className="px-4 py-2 bg-neuro/10 text-neuro text-[10px] font-black uppercase rounded-lg hover:bg-neuro hover:text-white transition-all"
                                        >
                                            Toggle
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-900 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-48 h-full bg-neuro/10 blur-[50px]"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-neuro">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black uppercase leading-none">Apply Changes</h4>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Sync platform DNA</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSave}
                                className={`relative z-10 px-8 h-12 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${saved ? 'bg-emerald-500' : 'bg-neuro hover:bg-neuro-dark'}`}
                            >
                                {saved ? <><Check className="h-4 w-4" /> Synced</> : <><Save className="h-4 w-4" /> Save</>}
                            </button>
                        </div>
                    </div>
                );

            case 'ai':
                return <APIKeyManager />;

            case 'voice':
                return <VoiceSettingsManager />;

            case 'sms':
                return <SMSSettingsManager />;

            case 'social':
                return <LateSettingsManager />;

            case 'chat':
                return <AnyChatSettingsManager />;

            case 'webhooks':
                return <WebhookManager />;

            default:
                return null;
        }
    };

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] overflow-hidden transition-colors duration-500">
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-56 flex-shrink-0 border-r border-[var(--os-border)] bg-[var(--os-surface)]/50 p-4 overflow-y-auto">
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.2em] mb-2 flex items-center gap-2 px-2">
                            <Layout className="h-3 w-3" /> Settings
                        </p>
                        <h1 className="text-xl font-black text-[var(--os-text)] tracking-tight leading-none uppercase px-2">
                            Control <span className="text-neuro">Panel</span>
                        </h1>
                    </div>

                    <nav className="space-y-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-neuro text-white shadow-lg shadow-neuro/20'
                                        : 'text-[var(--os-text-muted)] hover:bg-[var(--os-surface)] hover:text-neuro'
                                }`}
                            >
                                <span className={activeTab === tab.id ? 'text-white' : 'text-[var(--os-text-muted)]'}>
                                    {tab.icon}
                                </span>
                                <span className="text-xs font-bold">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="max-w-5xl">
                        {/* Tab Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                {TABS.find(t => t.id === activeTab)?.label}
                            </h2>
                            <p className="text-sm text-[var(--os-text-muted)] font-medium mt-1">
                                {TABS.find(t => t.id === activeTab)?.description}
                            </p>
                        </div>

                        {/* Tab Content */}
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
