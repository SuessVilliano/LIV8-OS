import React, { useState, useEffect } from 'react';
import {
    Zap,
    Globe,
    Sparkles,
    ArrowLeft,
    ChevronRight,
    CheckCircle2,
    Brain,
    FileText,
    Layout,
    Rocket,
    Building2,
    Target,
    Heart,
    MessageSquare,
    Users,
    Headphones,
    TrendingUp,
    Shield,
    Bot
} from 'lucide-react';

interface GhlOnboardingProps {
    onComplete: (data: any) => void;
}

type Step = 'crm' | 'brand' | 'goals' | 'staff' | 'deploy';

const GhlOnboarding: React.FC<GhlOnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState<Step>('crm');

    // CRM Selection
    const [selectedCrm, setSelectedCrm] = useState<'ghl' | 'liv8' | null>(null);

    // Brand States
    const [businessName, setBusinessName] = useState('');
    const [domain, setDomain] = useState('');
    const [industry, setIndustry] = useState('');
    const [brandVoice, setBrandVoice] = useState('');

    // Goals & Pain Points
    const [whyStatement, setWhyStatement] = useState('');
    const [painPoints, setPainPoints] = useState('');
    const [goals, setGoals] = useState('');

    // Staff States
    const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

    const steps: Step[] = ['crm', 'brand', 'goals', 'staff', 'deploy'];
    const stepLabels = {
        crm: 'Platform',
        brand: 'Brand',
        goals: 'Goals',
        staff: 'Staff',
        deploy: 'Deploy'
    };

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
        onComplete({
            crm: selectedCrm,
            businessName,
            domain,
            industry,
            brandVoice,
            whyStatement,
            painPoints,
            goals,
            selectedStaff
        });
    };

    const canProceed = () => {
        switch (step) {
            case 'crm': return selectedCrm !== null;
            case 'brand': return businessName.trim() !== '';
            case 'goals': return true;
            case 'staff': return selectedStaff.length > 0;
            default: return true;
        }
    };

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
                            <h2 className="text-xl font-bold tracking-tight">Get Started</h2>
                            <p className="text-sm text-[var(--os-text-muted)]">Let's set up your AI operating system</p>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-3">
                        {steps.map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    step === s
                                        ? 'bg-neuro text-white shadow-lg shadow-neuro/30'
                                        : steps.indexOf(step) > i
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[var(--os-surface)] border border-[var(--os-border)] text-[var(--os-text-muted)]'
                                }`}>
                                    {steps.indexOf(step) > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={`text-xs font-medium hidden md:block ${step === s ? 'text-[var(--os-text)]' : 'text-[var(--os-text-muted)]'}`}>
                                    {stepLabels[s]}
                                </span>
                                {i < steps.length - 1 && <div className="w-6 h-px bg-[var(--os-border)] hidden md:block" />}
                            </div>
                        ))}
                    </div>
                </header>

                {/* Step Content */}
                <div className="min-h-[500px]">
                    {/* CRM Selection Step */}
                    {step === 'crm' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Choose Your Platform</h3>
                                <p className="text-[var(--os-text-muted)]">Select your CRM to connect LIV8 OS with your business tools.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* GHL Option */}
                                <div
                                    onClick={() => setSelectedCrm('ghl')}
                                    className={`p-8 rounded-2xl border-2 cursor-pointer transition-all ${
                                        selectedCrm === 'ghl'
                                            ? 'border-neuro bg-neuro/5 shadow-lg shadow-neuro/10'
                                            : 'border-[var(--os-border)] hover:border-neuro/50 bg-[var(--os-surface)]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                                            selectedCrm === 'ghl' ? 'bg-neuro text-white' : 'bg-[var(--os-bg)] text-[var(--os-text-muted)]'
                                        }`}>
                                            <Building2 className="h-7 w-7" />
                                        </div>
                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                                            selectedCrm === 'ghl' ? 'border-neuro bg-neuro text-white' : 'border-[var(--os-border)]'
                                        }`}>
                                            {selectedCrm === 'ghl' && <CheckCircle2 className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold mb-2">Connect GoHighLevel</h4>
                                    <p className="text-sm text-[var(--os-text-muted)]">
                                        Already have a GHL account? Connect your existing sub-account to supercharge it with AI.
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--os-text-muted)]">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        <span>Full GHL integration</span>
                                    </div>
                                </div>

                                {/* LIV8 CRM Option */}
                                <div
                                    onClick={() => setSelectedCrm('liv8')}
                                    className={`p-8 rounded-2xl border-2 cursor-pointer transition-all ${
                                        selectedCrm === 'liv8'
                                            ? 'border-neuro bg-neuro/5 shadow-lg shadow-neuro/10'
                                            : 'border-[var(--os-border)] hover:border-neuro/50 bg-[var(--os-surface)]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                                            selectedCrm === 'liv8' ? 'bg-neuro text-white' : 'bg-[var(--os-bg)] text-[var(--os-text-muted)]'
                                        }`}>
                                            <Sparkles className="h-7 w-7" />
                                        </div>
                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                                            selectedCrm === 'liv8' ? 'border-neuro bg-neuro text-white' : 'border-[var(--os-border)]'
                                        }`}>
                                            {selectedCrm === 'liv8' && <CheckCircle2 className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold mb-2">LIV8 CRM <span className="text-xs font-normal text-emerald-500 ml-2">Included</span></h4>
                                    <p className="text-sm text-[var(--os-text-muted)]">
                                        Don't have a CRM? Get our full-featured CRM included with your subscription at no extra cost.
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--os-text-muted)]">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        <span>crm.liv8.co</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Brand Discovery Step */}
                    {step === 'brand' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Tell Us About Your Brand</h3>
                                <p className="text-[var(--os-text-muted)]">Help us understand your business so we can train your AI staff perfectly.</p>
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--os-text-muted)]">Industry / Niche</label>
                                    <input
                                        type="text"
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                        className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                                        placeholder="e.g., Solar Installation, Real Estate, Healthcare"
                                    />
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
                                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                                                isSelected
                                                    ? 'border-neuro bg-neuro/5'
                                                    : 'border-[var(--os-border)] hover:border-neuro/30 bg-[var(--os-surface)]'
                                            }`}
                                        >
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                isSelected ? 'bg-neuro text-white' : `bg-[var(--os-bg)] ${role.color}`
                                            }`}>
                                                <role.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm">{role.title}</h4>
                                                <p className="text-xs text-[var(--os-text-muted)] mt-1">{role.desc}</p>
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                isSelected ? 'border-neuro bg-neuro text-white' : 'border-[var(--os-border)]'
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
                            selectedCrm={selectedCrm}
                        />
                    )}
                </div>

                {/* Navigation Footer */}
                {step !== 'deploy' && (
                    <div className="flex items-center justify-between pt-6 border-t border-[var(--os-border)]">
                        {step !== 'crm' ? (
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
                            className={`px-8 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                                canProceed()
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
    selectedCrm
}: {
    onDone: () => void;
    selectedStaff: string[];
    businessName: string;
    domain: string;
    industry: string;
    brandVoice: string;
    goals: string;
    painPoints: string;
    selectedCrm: 'ghl' | 'liv8' | null;
}) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [apiResults, setApiResults] = useState<any>(null);

    const builderSteps = [
        { label: 'Creating Business Twin', detail: `Initializing digital DNA for ${businessName || 'your business'}` },
        { label: 'Scanning Website', detail: domain ? `Extracting verified facts from ${domain}` : 'Skipping website scan' },
        { label: 'Setting Brand Voice', detail: 'Configuring tone, personality, and communication style' },
        { label: 'Deploying AI Staff', detail: `Training ${selectedStaff.length} team members with SOPs and constraints` },
        { label: 'Final Verification', detail: 'Ensuring zero-hallucination guardrails are active' }
    ];

    useEffect(() => {
        const deployTwin = async () => {
            const API_URL = import.meta.env.VITE_API_URL || 'https://liv8-backend.onrender.com';
            const token = localStorage.getItem('token');

            // Generate a location ID (in production this would come from GHL/LIV8 CRM)
            const locationId = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            try {
                // Step 1: Creating Business Twin
                setStepIndex(0);
                setProgress(10);
                await new Promise(r => setTimeout(r, 500));

                // Step 2: API Call
                setStepIndex(1);
                setProgress(30);

                const response = await fetch(`${API_URL}/api/twin/onboard`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        locationId,
                        crmType: selectedCrm || 'liv8',
                        identity: {
                            businessName,
                            domain: domain || undefined,
                            industry: industry || undefined
                        },
                        brandVoice: brandVoice ? {
                            tone: brandVoice,
                            personality: ['Professional', 'Helpful'],
                            vocabulary: { preferred: [], avoided: [] },
                            writingStyle: brandVoice
                        } : undefined,
                        domain: domain || undefined,
                        selectedRoles: selectedStaff,
                        goals: goals || undefined,
                        painPoints: painPoints || undefined
                    })
                });

                setProgress(60);
                setStepIndex(2);
                await new Promise(r => setTimeout(r, 500));

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create Business Twin');
                }

                const result = await response.json();
                setApiResults(result);

                // Step 3: Brand Voice
                setProgress(75);
                setStepIndex(3);
                await new Promise(r => setTimeout(r, 500));

                // Step 4: AI Staff
                setProgress(90);
                setStepIndex(4);
                await new Promise(r => setTimeout(r, 500));

                // Complete
                setProgress(100);
                setIsComplete(true);

                // Store the location ID for future use
                localStorage.setItem('locationId', locationId);

            } catch (err: any) {
                console.error('Onboarding error:', err);
                setError(err.message || 'Something went wrong during setup');
            }
        };

        deployTwin();
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-10 animate-in fade-in duration-500">
                <div className="h-32 w-32 rounded-3xl bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/30">
                    <span className="text-white text-5xl">!</span>
                </div>
                <div className="text-center space-y-2 max-w-md">
                    <h3 className="text-2xl font-bold text-red-500">Setup Error</h3>
                    <p className="text-[var(--os-text-muted)]">{error}</p>
                </div>
                <button
                    onClick={onDone}
                    className="px-10 py-4 bg-[var(--os-surface)] border border-[var(--os-border)] text-[var(--os-text)] rounded-xl font-semibold hover:bg-[var(--os-bg)] transition-all"
                >
                    Continue Anyway
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-10 animate-in fade-in duration-500">
            <div className="relative">
                <div className={`h-32 w-32 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
                    isComplete ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-neuro shadow-neuro/30'
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
                            className="h-full bg-neuro rounded-full transition-all duration-200"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--os-text-muted)]">
                        <span>Step {stepIndex + 1} of {builderSteps.length}</span>
                        <span>{progress}%</span>
                    </div>
                </div>
            )}

            {isComplete && apiResults && (
                <div className="text-center space-y-3 text-sm text-[var(--os-text-muted)]">
                    <div className="flex flex-wrap justify-center gap-4">
                        {apiResults.steps?.filter((s: any) => s.success).map((s: any, i: number) => (
                            <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-medium">
                                {s.step.replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {isComplete && (
                <button
                    onClick={onDone}
                    className="px-10 py-4 bg-neuro text-white rounded-xl font-semibold shadow-lg shadow-neuro/20 hover:bg-neuro-dark transition-all flex items-center gap-2"
                >
                    Enter Dashboard <ChevronRight className="h-5 w-5" />
                </button>
            )}
        </div>
    );
};

export default GhlOnboarding;
