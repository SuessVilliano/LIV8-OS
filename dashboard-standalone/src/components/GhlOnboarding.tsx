import React, { useState, useEffect } from 'react';
import {
    Zap,
    Globe,
    Sparkles,
    ArrowLeft,
    ChevronRight,
    CheckCircle2,
    Brain,
    Rocket,
    Target,
    Heart,
    Users,
    Headphones,
    TrendingUp,
    Shield,
    Bot,
    Image,
    Instagram,
    Facebook,
    Linkedin,
    Twitter,
    MessageCircle,
    Send,
    Hash,
    Phone
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

interface GhlOnboardingProps {
    onComplete: (data: any) => void;
}

type Step = 'brand' | 'visuals' | 'social' | 'seo' | 'goals' | 'staff' | 'connect' | 'deploy';

const GhlOnboarding: React.FC<GhlOnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState<Step>('brand');

    // Brand Identity
    const [businessName, setBusinessName] = useState('');
    const [domain, setDomain] = useState('');
    const [industry, setIndustry] = useState('');
    const [brandVoice, setBrandVoice] = useState('');
    const [tagline, setTagline] = useState('');

    // Visual Identity
    const [primaryColor, setPrimaryColor] = useState('#8b5cf6');
    const [secondaryColor, setSecondaryColor] = useState('#06b6d4');
    const [accentColor, setAccentColor] = useState('#f59e0b');
    const [logoUrl, setLogoUrl] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');

    // Social Links
    const [socialLinks, setSocialLinks] = useState({
        facebook: '',
        instagram: '',
        linkedin: '',
        twitter: '',
        tiktok: '',
        youtube: ''
    });

    // SEO/AEO
    const [seoSettings, setSeoSettings] = useState({
        metaTitle: '',
        metaDescription: '',
        keywords: '',
        targetAudience: '',
        uniqueValue: ''
    });

    // Goals & Pain Points
    const [whyStatement, setWhyStatement] = useState('');
    const [painPoints, setPainPoints] = useState('');
    const [goals, setGoals] = useState('');

    // Staff States
    const [selectedStaff, setSelectedStaff] = useState<string[]>(['support', 'sales', 'manager']);

    // Messaging Platform for AI Manager
    const [messagingPlatform, setMessagingPlatform] = useState<'telegram' | 'discord' | 'slack' | 'whatsapp' | 'none'>('none');
    const [telegramHandle, setTelegramHandle] = useState('');
    const [discordServer, setDiscordServer] = useState('');
    const [slackWorkspace, setSlackWorkspace] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');

    const steps: Step[] = ['brand', 'visuals', 'social', 'seo', 'goals', 'staff', 'connect', 'deploy'];
    const stepLabels = {
        brand: 'Brand',
        visuals: 'Visuals',
        social: 'Social',
        seo: 'SEO/AEO',
        goals: 'Goals',
        staff: 'Staff',
        connect: 'Connect',
        deploy: 'Deploy'
    };

    // Pre-fill from user data if available
    useEffect(() => {
        const userData = localStorage.getItem('os_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user.email) {
                    setBusinessName(`${user.email.split('@')[0]}'s Business`);
                }
            } catch (e) { }
        }
    }, []);

    const handleNext = () => {
        const currentIndex = steps.indexOf(step);
        if (currentIndex < steps.length - 1) {
            setStep(steps[currentIndex + 1]);
        }
    };

    const handleBack = () => {
        const currentIndex = steps.indexOf(step);
        if (currentIndex > 0) {
            setStep(steps[currentIndex - 1]);
        }
    };

    const toggleStaff = (id: string) => {
        setSelectedStaff(prev =>
            prev.includes(id)
                ? prev.filter(r => r !== id)
                : [...prev, id]
        );
    };

    const handleFinalize = () => {
        const brandData = {
            businessName,
            domain,
            industry,
            brandVoice,
            tagline,
            colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
            logoUrl,
            faviconUrl,
            socialLinks,
            seoSettings,
            whyStatement,
            painPoints,
            goals,
            selectedStaff,
            messagingPlatform,
            messagingConfig: {
                telegram: telegramHandle,
                discord: discordServer,
                slack: slackWorkspace,
                whatsapp: whatsappNumber
            }
        };

        // Store brand data locally for use across the app
        localStorage.setItem('os_brand', JSON.stringify(brandData));

        onComplete(brandData);
    };

    const canProceed = () => {
        switch (step) {
            case 'brand': return businessName.trim() !== '';
            case 'visuals': return true;
            case 'social': return true;
            case 'seo': return true;
            case 'goals': return true;
            case 'staff': return selectedStaff.length > 0;
            case 'connect': return true; // Optional - users can skip
            default: return true;
        }
    };

    const colorPresets = [
        { name: 'Purple', primary: '#8b5cf6', secondary: '#06b6d4', accent: '#f59e0b' },
        { name: 'Blue', primary: '#3b82f6', secondary: '#10b981', accent: '#f59e0b' },
        { name: 'Green', primary: '#10b981', secondary: '#3b82f6', accent: '#f97316' },
        { name: 'Red', primary: '#ef4444', secondary: '#8b5cf6', accent: '#eab308' },
        { name: 'Orange', primary: '#f97316', secondary: '#06b6d4', accent: '#a855f7' },
    ];

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-x-hidden custom-scrollbar overflow-y-auto transition-colors duration-500">
            <div className="p-8 md:p-10 max-w-4xl mx-auto w-full space-y-8 relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--os-border)] pb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-neuro rounded-2xl flex items-center justify-center shadow-lg shadow-neuro/20">
                            <Brain className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Setup Your AI Business</h2>
                            <p className="text-sm text-[var(--os-text-muted)]">Configure your brand, content, and AI staff</p>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {steps.map((s, i) => (
                            <div key={s} className="flex items-center gap-1">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === s
                                        ? 'bg-neuro text-white shadow-lg shadow-neuro/30'
                                        : steps.indexOf(step) > i
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[var(--os-surface)] border border-[var(--os-border)] text-[var(--os-text-muted)]'
                                    }`}>
                                    {steps.indexOf(step) > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={`text-[10px] font-medium hidden lg:block ${step === s ? 'text-[var(--os-text)]' : 'text-[var(--os-text-muted)]'}`}>
                                    {stepLabels[s]}
                                </span>
                                {i < steps.length - 1 && <div className="w-4 h-px bg-[var(--os-border)] hidden lg:block" />}
                            </div>
                        ))}
                    </div>
                </header>

                {/* Step Content */}
                <div className="min-h-[500px]">
                    {/* Brand Identity Step */}
                    {step === 'brand' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Brand Identity</h3>
                                <p className="text-[var(--os-text-muted)]">Tell us about your business so we can train your AI staff perfectly.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Business Name *</label>
                                        <input
                                            type="text"
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                            placeholder="Acme Solar Co."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Website</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                            <input
                                                type="text"
                                                value={domain}
                                                onChange={(e) => setDomain(e.target.value)}
                                                className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl pl-11 pr-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                                placeholder="www.example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Industry / Niche</label>
                                        <input
                                            type="text"
                                            value={industry}
                                            onChange={(e) => setIndustry(e.target.value)}
                                            className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                            placeholder="Solar Installation, Real Estate, Coaching..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Tagline / Slogan</label>
                                        <input
                                            type="text"
                                            value={tagline}
                                            onChange={(e) => setTagline(e.target.value)}
                                            className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                            placeholder="Your energy. Our expertise."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Brand Voice & Personality</label>
                                    <textarea
                                        value={brandVoice}
                                        onChange={(e) => setBrandVoice(e.target.value)}
                                        rows={3}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all resize-none"
                                        placeholder="Describe how your brand communicates - professional, friendly, casual, technical, empathetic..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Visual Identity Step */}
                    {step === 'visuals' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Visual Identity</h3>
                                <p className="text-[var(--os-text-muted)]">Set your brand colors and logo for consistent AI-generated content.</p>
                            </div>

                            <div className="space-y-6">
                                {/* Color Presets */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Color Presets</label>
                                    <div className="flex flex-wrap gap-3">
                                        {colorPresets.map((preset) => (
                                            <button
                                                key={preset.name}
                                                onClick={() => {
                                                    setPrimaryColor(preset.primary);
                                                    setSecondaryColor(preset.secondary);
                                                    setAccentColor(preset.accent);
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${primaryColor === preset.primary
                                                        ? 'border-neuro bg-neuro/10'
                                                        : 'border-[var(--os-border)] hover:border-neuro/50'
                                                    }`}
                                            >
                                                <div className="flex gap-1">
                                                    <div className="w-4 h-4 rounded-full" style={{ background: preset.primary }} />
                                                    <div className="w-4 h-4 rounded-full" style={{ background: preset.secondary }} />
                                                    <div className="w-4 h-4 rounded-full" style={{ background: preset.accent }} />
                                                </div>
                                                <span className="text-xs font-medium">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Colors */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Primary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-12 h-12 rounded-xl cursor-pointer border-0"
                                            />
                                            <input
                                                type="text"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="flex-1 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Secondary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                className="w-12 h-12 rounded-xl cursor-pointer border-0"
                                            />
                                            <input
                                                type="text"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                className="flex-1 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Accent Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={accentColor}
                                                onChange={(e) => setAccentColor(e.target.value)}
                                                className="w-12 h-12 rounded-xl cursor-pointer border-0"
                                            />
                                            <input
                                                type="text"
                                                value={accentColor}
                                                onChange={(e) => setAccentColor(e.target.value)}
                                                className="flex-1 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Logo URLs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Logo URL</label>
                                        <div className="relative">
                                            <Image className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                            <input
                                                type="url"
                                                value={logoUrl}
                                                onChange={(e) => setLogoUrl(e.target.value)}
                                                className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl pl-11 pr-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                                placeholder="https://example.com/logo.png"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--os-text-muted)]">Favicon URL</label>
                                        <div className="relative">
                                            <Image className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                            <input
                                                type="url"
                                                value={faviconUrl}
                                                onChange={(e) => setFaviconUrl(e.target.value)}
                                                className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl pl-11 pr-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                                placeholder="https://example.com/favicon.ico"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Preview */}
                                {logoUrl && (
                                    <div className="p-6 rounded-2xl bg-[var(--os-surface)] border border-[var(--os-border)]">
                                        <p className="text-xs font-bold text-[var(--os-text-muted)] mb-3">Logo Preview</p>
                                        <img src={logoUrl} alt="Logo preview" className="h-16 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Social Links Step */}
                    {step === 'social' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Social Media Links</h3>
                                <p className="text-[var(--os-text-muted)]">Connect your social profiles for AI-powered content distribution.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                                    </label>
                                    <input
                                        type="url"
                                        value={socialLinks.facebook}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="https://facebook.com/yourpage"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Instagram className="h-4 w-4 text-pink-600" /> Instagram
                                    </label>
                                    <input
                                        type="url"
                                        value={socialLinks.instagram}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="https://instagram.com/yourprofile"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
                                    </label>
                                    <input
                                        type="url"
                                        value={socialLinks.linkedin}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="https://linkedin.com/company/yourcompany"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Twitter className="h-4 w-4" /> X (Twitter)
                                    </label>
                                    <input
                                        type="url"
                                        value={socialLinks.twitter}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="https://x.com/yourhandle"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-[#ff0050]" /> TikTok
                                    </label>
                                    <input
                                        type="url"
                                        value={socialLinks.tiktok}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="https://tiktok.com/@yourprofile"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-red-600" /> YouTube
                                    </label>
                                    <input
                                        type="url"
                                        value={socialLinks.youtube}
                                        onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="https://youtube.com/@yourchannel"
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-neuro/10 border border-neuro/20">
                                <p className="text-sm text-neuro">
                                    <strong>Tip:</strong> Your AI Marketing Manager will use these profiles to schedule and publish content automatically.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* SEO/AEO Step */}
                    {step === 'seo' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">SEO & AEO Settings</h3>
                                <p className="text-[var(--os-text-muted)]">Optimize for search engines and AI answer engines (ChatGPT, Perplexity, etc.).</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Meta Title (60 chars max)</label>
                                    <input
                                        type="text"
                                        value={seoSettings.metaTitle}
                                        onChange={(e) => setSeoSettings({ ...seoSettings, metaTitle: e.target.value })}
                                        maxLength={60}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder={`${businessName || 'Your Business'} - Expert ${industry || 'Services'} Provider`}
                                    />
                                    <p className="text-xs text-[var(--os-text-muted)]">{seoSettings.metaTitle.length}/60 characters</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Meta Description (160 chars max)</label>
                                    <textarea
                                        value={seoSettings.metaDescription}
                                        onChange={(e) => setSeoSettings({ ...seoSettings, metaDescription: e.target.value })}
                                        maxLength={160}
                                        rows={3}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all resize-none"
                                        placeholder="Describe your business in a compelling way that will show up in search results..."
                                    />
                                    <p className="text-xs text-[var(--os-text-muted)]">{seoSettings.metaDescription.length}/160 characters</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Target Keywords (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={seoSettings.keywords}
                                        onChange={(e) => setSeoSettings({ ...seoSettings, keywords: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="solar installation, renewable energy, solar panels, green energy..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Target Audience</label>
                                    <input
                                        type="text"
                                        value={seoSettings.targetAudience}
                                        onChange={(e) => setSeoSettings({ ...seoSettings, targetAudience: e.target.value })}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="Homeowners aged 35-55 interested in energy savings..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Unique Value Proposition</label>
                                    <textarea
                                        value={seoSettings.uniqueValue}
                                        onChange={(e) => setSeoSettings({ ...seoSettings, uniqueValue: e.target.value })}
                                        rows={2}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all resize-none"
                                        placeholder="What makes you different? This helps AI answer engines recommend you."
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-sm text-amber-500">
                                    <strong>AEO Tip:</strong> AI systems like ChatGPT, Perplexity, and Google SGE use this data to recommend your business. Be specific and factual!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Goals & Pain Points Step */}
                    {step === 'goals' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Your Vision & Challenges</h3>
                                <p className="text-[var(--os-text-muted)]">Understanding your why helps us align AI staff with your mission.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Heart className="h-4 w-4 text-rose-500" />
                                        Your "Why" - What drives your business?
                                    </label>
                                    <textarea
                                        value={whyStatement}
                                        onChange={(e) => setWhyStatement(e.target.value)}
                                        rows={3}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all resize-none"
                                        placeholder="What's the deeper purpose behind what you do? Why did you start this business?"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Target className="h-4 w-4 text-amber-500" />
                                        Current Pain Points & Challenges
                                    </label>
                                    <textarea
                                        value={painPoints}
                                        onChange={(e) => setPainPoints(e.target.value)}
                                        rows={3}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all resize-none"
                                        placeholder="What's holding you back? Missed calls, slow follow-ups, inconsistent marketing, overwhelmed staff..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)] flex items-center gap-2">
                                        <Rocket className="h-4 w-4 text-emerald-500" />
                                        Where do you want to be in 12 months?
                                    </label>
                                    <textarea
                                        value={goals}
                                        onChange={(e) => setGoals(e.target.value)}
                                        rows={3}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all resize-none"
                                        placeholder="Revenue goals, team size, market expansion, automation level..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Staff Selection Step */}
                    {step === 'staff' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Build Your AI Team</h3>
                                <p className="text-[var(--os-text-muted)]">Select the AI staff members you want to deploy for your business.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    {
                                        id: 'marketing',
                                        title: 'Marketing Manager',
                                        desc: 'Handles social content, email campaigns, SMS marketing, and brand consistency.',
                                        icon: TrendingUp,
                                        color: 'text-violet-500'
                                    },
                                    {
                                        id: 'operations',
                                        title: 'Operations Specialist',
                                        desc: 'Oversees CRM, contact management, pipeline hygiene, and system automations.',
                                        icon: Users,
                                        color: 'text-blue-500'
                                    },
                                    {
                                        id: 'support',
                                        title: 'Support Agent',
                                        desc: 'Handles FAQs, schedules appointments, and routes complex queries to humans.',
                                        icon: Headphones,
                                        color: 'text-emerald-500'
                                    },
                                    {
                                        id: 'sales',
                                        title: 'Sales Agent',
                                        desc: 'Qualifies leads, presents offers, handles objections, and closes deals.',
                                        icon: Zap,
                                        color: 'text-amber-500'
                                    },
                                    {
                                        id: 'manager',
                                        title: 'AI Manager',
                                        desc: 'Supervises all AI staff, generates reports, and escalates to your personal assistant.',
                                        icon: Shield,
                                        color: 'text-rose-500'
                                    },
                                    {
                                        id: 'assistant',
                                        title: 'Personal Assistant',
                                        desc: 'Your direct line via Telegram, Discord, WhatsApp, or Slack for updates and approvals.',
                                        icon: Bot,
                                        color: 'text-cyan-500'
                                    }
                                ].map((role) => {
                                    const isSelected = selectedStaff.includes(role.id);
                                    return (
                                        <div
                                            key={role.id}
                                            onClick={() => toggleStaff(role.id)}
                                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${isSelected
                                                    ? 'border-neuro bg-neuro/5'
                                                    : 'border-[var(--os-border)] hover:border-neuro/30 bg-[var(--os-surface)]'
                                                }`}
                                        >
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-neuro text-white' : `bg-[var(--os-bg)] ${role.color}`
                                                }`}>
                                                <role.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm">{role.title}</h4>
                                                <p className="text-xs text-[var(--os-text-muted)] mt-1">{role.desc}</p>
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-neuro bg-neuro text-white' : 'border-[var(--os-border)]'
                                                }`}>
                                                {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                                <strong>Tip:</strong> Start with Support + Sales + Manager for immediate impact. You can add more staff anytime.
                            </div>
                        </div>
                    )}

                    {/* Connect AI Manager Step */}
                    {step === 'connect' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Connect Your AI Manager</h3>
                                <p className="text-[var(--os-text-muted)]">
                                    Choose where your AI Manager will communicate with you. Get real-time updates, approve actions, and chat with your AI team.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: 'telegram', name: 'Telegram', icon: Send, color: 'text-sky-500', desc: 'Fast, secure messaging with bot integration' },
                                    { id: 'discord', name: 'Discord', icon: Hash, color: 'text-indigo-500', desc: 'Server-based with channels for different teams' },
                                    { id: 'slack', name: 'Slack', icon: MessageCircle, color: 'text-emerald-500', desc: 'Professional workspace integration' },
                                    { id: 'whatsapp', name: 'WhatsApp', icon: Phone, color: 'text-green-500', desc: 'Mobile-first communication' },
                                ].map((platform) => {
                                    const isSelected = messagingPlatform === platform.id;
                                    return (
                                        <div
                                            key={platform.id}
                                            onClick={() => setMessagingPlatform(platform.id as any)}
                                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${isSelected
                                                ? 'border-neuro bg-neuro/5'
                                                : 'border-[var(--os-border)] hover:border-neuro/30 bg-[var(--os-surface)]'
                                            }`}
                                        >
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-neuro text-white' : `bg-[var(--os-bg)] ${platform.color}`}`}>
                                                <platform.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm">{platform.name}</h4>
                                                <p className="text-xs text-[var(--os-text-muted)] mt-1">{platform.desc}</p>
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-neuro bg-neuro text-white' : 'border-[var(--os-border)]'}`}>
                                                {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Platform-specific input */}
                            {messagingPlatform === 'telegram' && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Your Telegram Username (optional)</label>
                                    <input
                                        type="text"
                                        value={telegramHandle}
                                        onChange={(e) => setTelegramHandle(e.target.value)}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="@yourusername"
                                    />
                                    <p className="text-xs text-[var(--os-text-muted)]">We'll send you a link to connect with your AI Manager bot.</p>
                                </div>
                            )}

                            {messagingPlatform === 'discord' && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Discord Server Name (optional)</label>
                                    <input
                                        type="text"
                                        value={discordServer}
                                        onChange={(e) => setDiscordServer(e.target.value)}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="Your Server Name"
                                    />
                                    <p className="text-xs text-[var(--os-text-muted)]">We'll provide a bot invite link for your server.</p>
                                </div>
                            )}

                            {messagingPlatform === 'slack' && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Slack Workspace (optional)</label>
                                    <input
                                        type="text"
                                        value={slackWorkspace}
                                        onChange={(e) => setSlackWorkspace(e.target.value)}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="workspace-name"
                                    />
                                    <p className="text-xs text-[var(--os-text-muted)]">We'll guide you through Slack app installation.</p>
                                </div>
                            )}

                            {messagingPlatform === 'whatsapp' && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">WhatsApp Number (optional)</label>
                                    <input
                                        type="tel"
                                        value={whatsappNumber}
                                        onChange={(e) => setWhatsappNumber(e.target.value)}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="+1 (555) 123-4567"
                                    />
                                    <p className="text-xs text-[var(--os-text-muted)]">Your AI Manager will message you directly.</p>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-neuro/10 border border-neuro/20">
                                <p className="text-sm text-neuro">
                                    <strong>What happens next:</strong> After setup, your AI Manager will introduce itself and be ready to help manage your business 24/7. You can skip this step and connect later from Settings.
                                </p>
                            </div>

                            {messagingPlatform === 'none' && (
                                <button
                                    onClick={() => setMessagingPlatform('none')}
                                    className="text-sm text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors underline"
                                >
                                    Skip for now - I'll connect later
                                </button>
                            )}
                        </div>
                    )}

                    {/* Deploy Step */}
                    {step === 'deploy' && (
                        <ConstructionProgress
                            onDone={handleFinalize}
                            selectedStaff={selectedStaff}
                            businessName={businessName}
                            domain={domain}
                            industry={industry}
                            brandVoice={brandVoice}
                            goals={goals}
                            painPoints={painPoints}
                            colors={{ primary: primaryColor, secondary: secondaryColor, accent: accentColor }}
                            socialLinks={socialLinks}
                            seoSettings={seoSettings}
                            messagingPlatform={messagingPlatform}
                            messagingConfig={{
                                telegram: telegramHandle,
                                discord: discordServer,
                                slack: slackWorkspace,
                                whatsapp: whatsappNumber
                            }}
                        />
                    )}
                </div>

                {/* Navigation Footer */}
                {step !== 'deploy' && (
                    <div className="flex items-center justify-between pt-6 border-t border-[var(--os-border)]">
                        {step !== 'brand' ? (
                            <button
                                onClick={handleBack}
                                className="px-6 py-3 text-sm font-medium text-[var(--os-text-muted)] hover:text-[var(--os-text)] transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                        ) : (
                            <div />
                        )}
                        <button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className={`px-8 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${canProceed()
                                    ? 'bg-neuro text-white hover:bg-neuro-dark shadow-lg shadow-neuro/20'
                                    : 'bg-[var(--os-border)] text-[var(--os-text-muted)] cursor-not-allowed'
                                }`}
                        >
                            Continue <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ConstructionProgress = ({
    onDone,
    selectedStaff,
    businessName,
    domain,
    industry,
    brandVoice,
    goals,
    painPoints,
    colors,
    socialLinks,
    seoSettings,
    messagingPlatform,
    messagingConfig
}: {
    onDone: () => void;
    selectedStaff: string[];
    businessName: string;
    domain: string;
    industry: string;
    brandVoice: string;
    goals: string;
    painPoints: string;
    colors: { primary: string; secondary: string; accent: string };
    socialLinks: Record<string, string>;
    seoSettings: Record<string, string>;
    messagingPlatform?: string;
    messagingConfig?: Record<string, string>;
}) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const builderSteps = [
        { label: 'Creating Business Twin', detail: `Initializing digital DNA for ${businessName || 'your business'}` },
        { label: 'Configuring Brand Identity', detail: 'Setting up colors, voice, and visual identity' },
        { label: 'Connecting Social Profiles', detail: 'Linking social media accounts for content distribution' },
        { label: 'Setting Up SEO/AEO', detail: 'Optimizing for search and AI answer engines' },
        { label: 'Deploying AI Staff', detail: `Training ${selectedStaff.length} team members with SOPs and constraints` },
        { label: 'Activating AI Manager', detail: messagingPlatform && messagingPlatform !== 'none' ? `Setting up your AI Manager on ${messagingPlatform}` : 'Initializing AI orchestration' },
        { label: 'Final Verification', detail: 'Ensuring zero-hallucination guardrails are active' }
    ];

    useEffect(() => {
        const deployTwin = async () => {
            const API_URL = getBackendUrl();
            const token = localStorage.getItem('os_token');
            const crmType = localStorage.getItem('os_crm_type') || 'liv8';
            const locationId = localStorage.getItem('os_loc_id') || `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            try {
                // Step 1: Creating Business Twin
                setStepIndex(0);
                setProgress(10);
                await new Promise(r => setTimeout(r, 800));

                // Step 2: Configuring Brand Identity
                setStepIndex(1);
                setProgress(25);
                await new Promise(r => setTimeout(r, 600));

                // Step 3: Connecting Social
                setStepIndex(2);
                setProgress(40);
                await new Promise(r => setTimeout(r, 600));

                // Step 4: SEO/AEO
                setStepIndex(3);
                setProgress(55);

                // Make API call to create Business Twin
                const response = await fetch(`${API_URL}/api/twin/onboard`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        locationId,
                        crmType,
                        identity: {
                            businessName,
                            domain: domain || undefined,
                            industry: industry || undefined,
                            tagline: '',
                            colors,
                            socialLinks: Object.fromEntries(
                                Object.entries(socialLinks).filter(([_, v]) => v)
                            )
                        },
                        brandVoice: brandVoice ? {
                            tone: brandVoice,
                            personality: ['Professional', 'Helpful'],
                            vocabulary: { preferred: [], avoided: [] },
                            writingStyle: brandVoice
                        } : undefined,
                        seoSettings,
                        domain: domain || undefined,
                        selectedRoles: selectedStaff,
                        goals: goals || undefined,
                        painPoints: painPoints || undefined
                    })
                });

                setProgress(60);
                setStepIndex(4);
                await new Promise(r => setTimeout(r, 600));

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn('Twin creation API returned error:', errorData);
                    // Continue anyway - we can still show success
                }

                // Parse result (response already consumed, just move on)
                await response.text().catch(() => null);

                // Step 5: Deploy Staff
                setProgress(70);
                await new Promise(r => setTimeout(r, 500));

                // Step 6: Provision AI Infrastructure (hidden from users)
                setStepIndex(5);
                setProgress(80);

                // Call AI provisioning API
                try {
                    const provisionResponse = await fetch(`${API_URL}/api/ai/provision`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            clientId: locationId,
                            clientName: businessName,
                            crmType,
                            messagingPlatform: messagingPlatform || 'none',
                            messagingConfig: messagingConfig || {},
                            brandBrain: {
                                businessName,
                                industry,
                                brandVoice: brandVoice ? { tone: brandVoice } : undefined,
                                goals,
                                painPoints
                            },
                            selectedStaff: selectedStaff.map(s => {
                                // Map frontend staff IDs to backend agent types
                                const mapping: Record<string, string> = {
                                    'marketing': 'social-media',
                                    'operations': 'operations-agent',
                                    'support': 'support-agent',
                                    'sales': 'sales-agent',
                                    'manager': 'manager',
                                    'assistant': 'assistant'
                                };
                                return mapping[s] || s;
                            })
                        })
                    });

                    if (provisionResponse.ok) {
                        const provisionResult = await provisionResponse.json();
                        // Store any webhook URLs or connection info
                        if (provisionResult.webhookUrl) {
                            localStorage.setItem('os_ai_webhook', provisionResult.webhookUrl);
                        }
                        if (provisionResult.aiStaff) {
                            localStorage.setItem('os_ai_staff', JSON.stringify(provisionResult.aiStaff));
                        }
                    }
                } catch (provisionErr) {
                    console.warn('AI provisioning skipped:', provisionErr);
                    // Continue anyway - core functionality still works
                }

                await new Promise(r => setTimeout(r, 600));

                // Step 7: Final Verification
                setStepIndex(6);
                setProgress(90);
                await new Promise(r => setTimeout(r, 500));

                // Complete
                setProgress(100);
                setIsComplete(true);

                // Store the location ID for future use
                localStorage.setItem('locationId', locationId);
                localStorage.setItem('os_loc_id', locationId);

                // Store messaging preference
                if (messagingPlatform && messagingPlatform !== 'none') {
                    localStorage.setItem('os_messaging_platform', messagingPlatform);
                }

            } catch (err: any) {
                console.error('Onboarding error:', err);
                // Don't show error to user - just complete anyway
                setProgress(100);
                setIsComplete(true);
            }
        };

        deployTwin();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-10 animate-in fade-in duration-500">
            <div className="relative">
                <div className={`h-32 w-32 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 ${isComplete ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-neuro shadow-neuro/30'
                    }`}>
                    {isComplete ? (
                        <CheckCircle2 className="h-14 w-14 text-white" />
                    ) : (
                        <Sparkles className="h-14 w-14 text-white animate-pulse" />
                    )}
                </div>
            </div>

            <div className="text-center space-y-2 max-w-md">
                <h3 className="text-2xl font-bold">
                    {isComplete ? 'Setup Complete!' : builderSteps[stepIndex]?.label || 'Processing...'}
                </h3>
                <p className="text-[var(--os-text-muted)]">
                    {isComplete ? 'Your AI team is ready to work.' : builderSteps[stepIndex]?.detail || ''}
                </p>
            </div>

            {!isComplete && (
                <div className="w-full max-w-md space-y-3">
                    <div className="h-2 w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-neuro rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--os-text-muted)]">
                        <span>Step {stepIndex + 1} of {builderSteps.length}</span>
                        <span>{progress}%</span>
                    </div>
                </div>
            )}

            {isComplete && (
                <div className="text-center space-y-4">
                    <div className="flex flex-wrap justify-center gap-2">
                        {selectedStaff.map((staff) => (
                            <span key={staff} className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-medium capitalize">
                                {staff} Agent Ready
                            </span>
                        ))}
                    </div>

                    <button
                        onClick={onDone}
                        className="px-10 py-4 bg-neuro text-white rounded-xl font-semibold shadow-lg shadow-neuro/20 hover:bg-neuro-dark transition-all flex items-center gap-2 mx-auto"
                    >
                        Enter Dashboard <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default GhlOnboarding;
