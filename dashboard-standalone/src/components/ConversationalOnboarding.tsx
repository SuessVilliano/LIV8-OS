import { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    Send,
    Upload,
    FileText,
    Instagram,
    Facebook,
    Linkedin,
    Twitter,
    Loader2,
    CheckCircle2,
    Brain,
    Users,
    Zap,
    X,
    Plus,
    Bot,
    Target,
    TrendingUp
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

interface Message {
    id: string;
    type: 'assistant' | 'user' | 'options' | 'input' | 'progress' | 'multi-input' | 'social' | 'upload' | 'colors' | 'training' | 'complete';
    content: string;
    options?: QuickOption[];
    inputType?: 'text' | 'url' | 'email' | 'textarea';
    inputPlaceholder?: string;
    field?: string;
    progress?: { step: number; total: number; label: string };
    multiSelect?: boolean;
}

interface QuickOption {
    id: string;
    label: string;
    value: string;
    icon?: any;
    description?: string;
}

interface OnboardingData {
    businessName: string;
    industry: string;
    websiteUrl: string;
    description: string;
    targetAudience: string;
    brandVoice: string;
    uniqueValue: string;
    goals: string;
    painPoints: string;
    competitors: string[];
    topInIndustry: string[];
    socialAccounts: Record<string, string>;
    colors: { primary: string; secondary: string; accent: string };
    documents: File[];
    aiStaffNeeded: string[];
}

interface Props {
    onComplete: (data: OnboardingData) => void;
    locationId?: string;
}

export default function ConversationalOnboarding({ onComplete, locationId }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [multiItems, setMultiItems] = useState<string[]>([]);
    const [isTraining, setIsTraining] = useState(false);
    const [trainingStep, setTrainingStep] = useState(0);
    const [trainingProgress, setTrainingProgress] = useState(0);

    const [data, setData] = useState<OnboardingData>({
        businessName: '',
        industry: '',
        websiteUrl: '',
        description: '',
        targetAudience: '',
        brandVoice: '',
        uniqueValue: '',
        goals: '',
        painPoints: '',
        competitors: [],
        topInIndustry: [],
        socialAccounts: {},
        colors: { primary: '#6366F1', secondary: '#10B981', accent: '#F59E0B' },
        documents: [],
        aiStaffNeeded: ['support', 'sales', 'manager']
    });

    const [socialInputs, setSocialInputs] = useState({
        instagram: '',
        facebook: '',
        linkedin: '',
        twitter: '',
        tiktok: '',
        youtube: ''
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const API_BASE = getBackendUrl();

    const userName = (() => {
        const userData = localStorage.getItem('os_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.name || user.email?.split('@')[0] || 'there';
            } catch { }
        }
        return 'there';
    })();

    // Conversation flow
    const conversationFlow = [
        {
            type: 'assistant',
            content: `Hey ${userName}! I'm your LIV8 AI setup assistant.\n\nI'll help you build your brand profile so your AI team knows exactly how to represent your business. This takes about 5 minutes.\n\nLet's start with the basics - what's your business name?`,
            inputType: 'text',
            inputPlaceholder: 'Enter your business name...',
            field: 'businessName'
        },
        {
            type: 'assistant',
            content: `Great! And what industry or niche are you in?`,
            inputType: 'text',
            inputPlaceholder: 'e.g. Solar Installation, Real Estate, Marketing Agency...',
            field: 'industry'
        },
        {
            type: 'assistant',
            content: `Do you have a website? I can scan it to learn about your business automatically.`,
            inputType: 'url',
            inputPlaceholder: 'https://yourwebsite.com (or type "skip")',
            field: 'websiteUrl'
        },
        {
            type: 'assistant',
            content: `Now, who are your main competitors? This helps me understand your market positioning.\n\n(Add each one and press Enter, then click Continue when done)`,
            multiInput: true,
            inputPlaceholder: 'Add a competitor...',
            field: 'competitors'
        },
        {
            type: 'assistant',
            content: `Who are the top players in your industry that you aspire to be like?`,
            multiInput: true,
            inputPlaceholder: 'Add a top brand...',
            field: 'topInIndustry'
        },
        {
            type: 'assistant',
            content: `Let's connect your social media. Which platforms are you active on?\n\n(Add your profile URLs - you can skip any platform)`,
            social: true,
            field: 'socialAccounts'
        },
        {
            type: 'assistant',
            content: `How would you describe your brand voice?`,
            options: [
                { id: 'professional', label: 'Professional & Formal', value: 'professional' },
                { id: 'friendly', label: 'Friendly & Approachable', value: 'friendly' },
                { id: 'casual', label: 'Casual & Fun', value: 'casual' },
                { id: 'technical', label: 'Technical & Expert', value: 'technical' },
                { id: 'empathetic', label: 'Empathetic & Caring', value: 'empathetic' },
                { id: 'bold', label: 'Bold & Confident', value: 'bold' },
            ],
            field: 'brandVoice'
        },
        {
            type: 'assistant',
            content: `Who is your ideal customer? Describe your target audience.`,
            inputType: 'textarea',
            inputPlaceholder: 'e.g. Homeowners aged 35-55 looking to reduce energy costs...',
            field: 'targetAudience'
        },
        {
            type: 'assistant',
            content: `What makes you different from competitors? What's your unique selling point?`,
            inputType: 'textarea',
            inputPlaceholder: 'What sets you apart from the competition...',
            field: 'uniqueValue'
        },
        {
            type: 'assistant',
            content: `What are your main business goals for the next 12 months?`,
            inputType: 'textarea',
            inputPlaceholder: 'Revenue targets, growth plans, expansion goals...',
            field: 'goals'
        },
        {
            type: 'assistant',
            content: `What challenges are you currently facing that you want AI to help solve?`,
            inputType: 'textarea',
            inputPlaceholder: 'Missed calls, slow follow-ups, inconsistent marketing...',
            field: 'painPoints'
        },
        {
            type: 'assistant',
            content: `Choose your brand colors. These will be used across all AI-generated content.`,
            colors: true,
            field: 'colors'
        },
        {
            type: 'assistant',
            content: `Now let's train your AI team! Upload any documents that will help them understand your business - SOPs, product guides, FAQs, scripts, etc.`,
            upload: true,
            field: 'documents'
        },
        {
            type: 'assistant',
            content: `Which AI staff members do you want to activate?`,
            options: [
                { id: 'marketing', label: 'Marketing Manager', value: 'marketing', icon: TrendingUp },
                { id: 'operations', label: 'Operations Specialist', value: 'operations', icon: Users },
                { id: 'support', label: 'Support Agent', value: 'support', icon: Bot },
                { id: 'sales', label: 'Sales Agent', value: 'sales', icon: Target },
                { id: 'manager', label: 'AI Manager', value: 'manager', icon: Brain },
            ],
            multiSelect: true,
            field: 'aiStaffNeeded'
        },
        {
            type: 'training',
            content: 'Training your AI team...'
        }
    ];

    const trainingSteps = [
        { label: 'Analyzing your brand identity', duration: 800 },
        { label: 'Processing business information', duration: 600 },
        { label: 'Learning your industry context', duration: 700 },
        { label: 'Studying your competitors', duration: 600 },
        { label: 'Processing uploaded documents', duration: 900 },
        { label: 'Configuring AI personalities', duration: 700 },
        { label: 'Setting up communication protocols', duration: 500 },
        { label: 'Training neural pathways', duration: 800 },
        { label: 'Running final diagnostics', duration: 600 },
        { label: 'Activating AI staff', duration: 500 },
    ];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Start conversation
        setTimeout(() => {
            addAssistantMessage(conversationFlow[0]);
        }, 500);
    }, []);

    const addAssistantMessage = async (step: any) => {
        setIsTyping(true);
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        setIsTyping(false);

        const msg: Message = {
            id: `msg_${Date.now()}`,
            type: step.type || 'assistant',
            content: step.content,
            field: step.field
        };

        if (step.options) {
            msg.type = 'options';
            msg.options = step.options;
            msg.multiSelect = step.multiSelect;
        }
        if (step.inputType) {
            msg.type = 'input';
            msg.inputType = step.inputType;
            msg.inputPlaceholder = step.inputPlaceholder;
        }
        if (step.multiInput) {
            msg.type = 'multi-input';
            msg.inputPlaceholder = step.inputPlaceholder;
        }
        if (step.social) {
            msg.type = 'social';
        }
        if (step.colors) {
            msg.type = 'colors';
        }
        if (step.upload) {
            msg.type = 'upload';
        }
        if (step.type === 'training') {
            msg.type = 'training';
            startTraining();
        }

        setMessages(prev => [...prev, msg]);
    };

    const addUserMessage = (content: string) => {
        setMessages(prev => [...prev, {
            id: `user_${Date.now()}`,
            type: 'user',
            content
        }]);
    };

    const goToNextStep = async () => {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);

        if (nextStep < conversationFlow.length) {
            await addAssistantMessage(conversationFlow[nextStep]);
        }
    };

    const handleInputSubmit = async () => {
        if (!inputValue.trim()) return;

        const current = conversationFlow[currentStep];
        addUserMessage(inputValue);

        if (current.field) {
            setData(prev => ({ ...prev, [current.field!]: inputValue }));
        }

        setInputValue('');
        await goToNextStep();
    };

    const handleOptionSelect = async (option: QuickOption) => {
        const current = conversationFlow[currentStep];

        if (current.multiSelect) {
            // Toggle selection for multi-select
            setSelectedOptions(prev =>
                prev.includes(option.value)
                    ? prev.filter(v => v !== option.value)
                    : [...prev, option.value]
            );
        } else {
            // Single select - immediately proceed
            addUserMessage(option.label);
            if (current.field) {
                setData(prev => ({ ...prev, [current.field!]: option.value }));
            }
            await goToNextStep();
        }
    };

    const handleMultiSelectConfirm = async () => {
        const current = conversationFlow[currentStep];
        const labels = selectedOptions.map(v => {
            const opt = current.options?.find(o => o.value === v);
            return opt?.label || v;
        });

        addUserMessage(labels.join(', '));

        if (current.field) {
            setData(prev => ({ ...prev, [current.field!]: selectedOptions }));
        }

        setSelectedOptions([]);
        await goToNextStep();
    };

    const handleMultiItemAdd = () => {
        if (!inputValue.trim()) return;
        setMultiItems(prev => [...prev, inputValue]);
        setInputValue('');
    };

    const handleMultiItemRemove = (index: number) => {
        setMultiItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleMultiInputConfirm = async () => {
        const current = conversationFlow[currentStep];
        addUserMessage(multiItems.length > 0 ? multiItems.join(', ') : 'None specified');

        if (current.field) {
            setData(prev => ({ ...prev, [current.field!]: multiItems }));
        }

        setMultiItems([]);
        await goToNextStep();
    };

    const handleSocialSubmit = async () => {
        const filled = Object.entries(socialInputs).filter(([_, v]) => v.trim());
        addUserMessage(filled.length > 0 ? `Connected: ${filled.map(([k]) => k).join(', ')}` : 'Skipped social connections');

        setData(prev => ({
            ...prev,
            socialAccounts: Object.fromEntries(filled)
        }));

        await goToNextStep();
    };

    const handleColorChange = (type: 'primary' | 'secondary' | 'accent', value: string) => {
        setData(prev => ({
            ...prev,
            colors: { ...prev.colors, [type]: value }
        }));
    };

    const handleColorsConfirm = async () => {
        addUserMessage(`Colors: ${data.colors.primary}, ${data.colors.secondary}, ${data.colors.accent}`);
        await goToNextStep();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setData(prev => ({
            ...prev,
            documents: [...prev.documents, ...Array.from(files)]
        }));
    };

    const handleRemoveFile = (index: number) => {
        setData(prev => ({
            ...prev,
            documents: prev.documents.filter((_, i) => i !== index)
        }));
    };

    const handleUploadConfirm = async () => {
        addUserMessage(data.documents.length > 0 ? `Uploaded ${data.documents.length} document(s)` : 'No documents uploaded');
        await goToNextStep();
    };

    const startTraining = async () => {
        setIsTraining(true);

        for (let i = 0; i < trainingSteps.length; i++) {
            setTrainingStep(i);
            setTrainingProgress(Math.round((i / trainingSteps.length) * 100));
            await new Promise(r => setTimeout(r, trainingSteps[i].duration));
        }

        setTrainingProgress(100);

        // Save to backend
        const locId = locationId || localStorage.getItem('os_loc_id') || `loc_${Date.now()}`;
        const token = localStorage.getItem('os_token');

        try {
            await fetch(`${API_BASE}/api/twin/onboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    locationId: locId,
                    identity: {
                        businessName: data.businessName,
                        domain: data.websiteUrl,
                        industry: data.industry,
                        colors: data.colors,
                        socialLinks: data.socialAccounts
                    },
                    brandVoice: { tone: data.brandVoice },
                    competitors: data.competitors,
                    topInIndustry: data.topInIndustry,
                    targetAudience: data.targetAudience,
                    uniqueValue: data.uniqueValue,
                    goals: data.goals,
                    painPoints: data.painPoints,
                    selectedRoles: data.aiStaffNeeded
                })
            });

            localStorage.setItem('locationId', locId);
            localStorage.setItem('os_loc_id', locId);
        } catch (err) {
            console.error('Training save error:', err);
        }

        await new Promise(r => setTimeout(r, 500));
        setIsTraining(false);

        // Add completion message
        setMessages(prev => [...prev, {
            id: 'complete',
            type: 'complete',
            content: `Your AI team is trained and ready!\n\nI've learned everything about ${data.businessName || 'your business'}:\n\n• Industry: ${data.industry || 'Not specified'}\n• Competitors Analyzed: ${data.competitors.length}\n• Documents Processed: ${data.documents.length}\n• AI Staff Activated: ${data.aiStaffNeeded.length}\n\nYour AI team is now ready to work 24/7!`
        }]);
    };

    const handleComplete = () => {
        localStorage.setItem('os_brand', JSON.stringify(data));
        onComplete(data);
    };

    const currentMsg = messages[messages.length - 1];

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleFileUpload}
            />

            {/* Header */}
            <div className="p-6 border-b border-[var(--os-border)] bg-[var(--os-surface)]">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <div className="h-12 w-12 bg-neuro rounded-2xl flex items-center justify-center shadow-lg shadow-neuro/20">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Hi {userName}</h2>
                        <p className="text-sm text-[var(--os-text-muted)]">Where should we start?</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-2xl mx-auto space-y-6">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            {message.type !== 'user' && message.type !== 'training' && message.type !== 'complete' && (
                                <div className="h-8 w-8 rounded-full bg-neuro/10 flex items-center justify-center mr-3 flex-shrink-0">
                                    <Sparkles className="h-4 w-4 text-neuro" />
                                </div>
                            )}
                            <div className={`max-w-[85%] ${message.type === 'user'
                                    ? 'bg-neuro text-white rounded-2xl rounded-tr-none px-5 py-3'
                                    : message.type === 'training' || message.type === 'complete'
                                        ? 'w-full'
                                        : 'bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl rounded-tl-none px-5 py-4'
                                }`}>

                                {/* Training UI */}
                                {message.type === 'training' && isTraining && (
                                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-8 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 bg-neuro rounded-2xl flex items-center justify-center">
                                                <Brain className="h-8 w-8 text-white animate-pulse" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">Training Your AI Team</h3>
                                                <p className="text-sm text-[var(--os-text-muted)]">{trainingSteps[trainingStep]?.label}...</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-[var(--os-bg)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-neuro rounded-full transition-all duration-500"
                                                    style={{ width: `${trainingProgress}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-[var(--os-text-muted)]">
                                                <span>Step {trainingStep + 1} of {trainingSteps.length}</span>
                                                <span>{trainingProgress}%</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {trainingSteps.map((step, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-center gap-2 text-xs ${i <= trainingStep ? 'text-neuro' : 'text-[var(--os-text-muted)]'
                                                        }`}
                                                >
                                                    {i < trainingStep ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : i === trainingStep ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <div className="h-4 w-4 rounded-full border border-current" />
                                                    )}
                                                    <span>{step.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Completion UI */}
                                {message.type === 'complete' && (
                                    <div className="bg-[var(--os-surface)] border border-emerald-500/30 rounded-2xl p-8 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                <CheckCircle2 className="h-8 w-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-emerald-600">Setup Complete!</h3>
                                                <p className="text-sm text-[var(--os-text-muted)]">Your AI team is ready to work</p>
                                            </div>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {data.aiStaffNeeded.map(staff => (
                                                <span key={staff} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-medium capitalize">
                                                    {staff} Ready
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleComplete}
                                            className="w-full h-14 bg-neuro text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-neuro/20"
                                        >
                                            <Zap className="h-5 w-5" />
                                            Enter Your Dashboard
                                        </button>
                                    </div>
                                )}

                                {/* Regular text message */}
                                {message.type !== 'training' && message.type !== 'complete' && (
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-neuro/10 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-neuro" />
                            </div>
                            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl rounded-tl-none px-5 py-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-neuro/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-neuro/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-neuro/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            {!isTraining && currentMsg?.type !== 'complete' && (
                <div className="p-6 border-t border-[var(--os-border)] bg-[var(--os-surface)]">
                    <div className="max-w-2xl mx-auto">

                        {/* Text Input */}
                        {currentMsg?.type === 'input' && (
                            <form onSubmit={(e) => { e.preventDefault(); handleInputSubmit(); }} className="flex gap-3">
                                {currentMsg.inputType === 'textarea' ? (
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={currentMsg.inputPlaceholder}
                                        rows={3}
                                        className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none resize-none"
                                        autoFocus
                                    />
                                ) : (
                                    <input
                                        type={currentMsg.inputType === 'url' ? 'url' : 'text'}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={currentMsg.inputPlaceholder}
                                        className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                        autoFocus
                                    />
                                )}
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim()}
                                    className="h-12 w-12 bg-neuro text-white rounded-xl flex items-center justify-center shadow-lg shadow-neuro/20 hover:scale-105 transition-all disabled:opacity-50"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        )}

                        {/* Multi-Input */}
                        {currentMsg?.type === 'multi-input' && (
                            <div className="space-y-4">
                                {multiItems.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {multiItems.map((item, i) => (
                                            <div key={i} className="px-3 py-1.5 bg-neuro/10 text-neuro rounded-lg text-sm font-medium flex items-center gap-2">
                                                {item}
                                                <button onClick={() => handleMultiItemRemove(i)} className="hover:text-red-500">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleMultiItemAdd())}
                                        placeholder={currentMsg.inputPlaceholder}
                                        className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                    />
                                    <button
                                        onClick={handleMultiItemAdd}
                                        disabled={!inputValue.trim()}
                                        className="h-12 w-12 bg-[var(--os-bg)] border border-[var(--os-border)] text-neuro rounded-xl flex items-center justify-center hover:border-neuro disabled:opacity-50"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={handleMultiInputConfirm}
                                        className="h-12 px-6 bg-neuro text-white rounded-xl font-medium text-sm hover:scale-105 transition-all"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Options */}
                        {currentMsg?.type === 'options' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-3">
                                    {currentMsg.options?.map((option) => {
                                        const isSelected = currentMsg.multiSelect
                                            ? selectedOptions.includes(option.value)
                                            : false;
                                        const Icon = option.icon;
                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => handleOptionSelect(option)}
                                                className={`px-5 py-3 rounded-xl border-2 text-sm font-medium flex items-center gap-2 transition-all ${isSelected
                                                        ? 'bg-neuro/10 border-neuro text-neuro'
                                                        : 'bg-[var(--os-bg)] border-[var(--os-border)] hover:border-neuro/50'
                                                    }`}
                                            >
                                                {Icon && <Icon className="h-4 w-4" />}
                                                {option.label}
                                                {isSelected && <CheckCircle2 className="h-4 w-4 ml-1" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                {currentMsg.multiSelect && selectedOptions.length > 0 && (
                                    <button
                                        onClick={handleMultiSelectConfirm}
                                        className="w-full h-12 bg-neuro text-white rounded-xl font-medium text-sm hover:scale-[1.02] transition-all"
                                    >
                                        Continue with {selectedOptions.length} selected
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Social Inputs */}
                        {currentMsg?.type === 'social' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: 'instagram', icon: Instagram, label: 'Instagram', placeholder: '@username' },
                                        { key: 'facebook', icon: Facebook, label: 'Facebook', placeholder: 'Page URL' },
                                        { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', placeholder: 'Profile URL' },
                                        { key: 'twitter', icon: Twitter, label: 'X/Twitter', placeholder: '@username' },
                                    ].map(social => (
                                        <div key={social.key} className="flex items-center gap-2">
                                            <social.icon className="h-4 w-4 text-[var(--os-text-muted)] flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={socialInputs[social.key as keyof typeof socialInputs]}
                                                onChange={(e) => setSocialInputs(prev => ({ ...prev, [social.key]: e.target.value }))}
                                                placeholder={social.placeholder}
                                                className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-sm focus:border-neuro outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleSocialSubmit}
                                    className="w-full h-12 bg-neuro text-white rounded-xl font-medium text-sm hover:scale-[1.02] transition-all"
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* Colors */}
                        {currentMsg?.type === 'colors' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    {(['primary', 'secondary', 'accent'] as const).map((type) => (
                                        <div key={type} className="space-y-2">
                                            <label className="text-xs font-medium text-[var(--os-text-muted)] capitalize">{type}</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={data.colors[type]}
                                                    onChange={(e) => handleColorChange(type, e.target.value)}
                                                    className="h-10 w-14 rounded-lg cursor-pointer border border-[var(--os-border)]"
                                                />
                                                <input
                                                    type="text"
                                                    value={data.colors[type]}
                                                    onChange={(e) => handleColorChange(type, e.target.value)}
                                                    className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-2 py-2 text-xs font-mono"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleColorsConfirm}
                                    className="w-full h-12 bg-neuro text-white rounded-xl font-medium text-sm hover:scale-[1.02] transition-all"
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* Upload */}
                        {currentMsg?.type === 'upload' && (
                            <div className="space-y-4">
                                {data.documents.length > 0 && (
                                    <div className="space-y-2">
                                        {data.documents.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-[var(--os-bg)] rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-4 w-4 text-neuro" />
                                                    <span className="text-sm font-medium">{file.name}</span>
                                                    <span className="text-xs text-[var(--os-text-muted)]">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                                                </div>
                                                <button onClick={() => handleRemoveFile(i)} className="p-1 hover:text-red-500">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 h-12 bg-[var(--os-bg)] border-2 border-dashed border-[var(--os-border)] rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:border-neuro transition-all"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload Documents
                                    </button>
                                    <button
                                        onClick={handleUploadConfirm}
                                        className="h-12 px-6 bg-neuro text-white rounded-xl font-medium text-sm hover:scale-105 transition-all"
                                    >
                                        {data.documents.length > 0 ? 'Continue' : 'Skip'}
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--os-text-muted)] text-center">Supported: PDF, DOC, DOCX, TXT, MD</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Progress */}
            {!isTraining && currentMsg?.type !== 'complete' && (
                <div className="px-6 pb-4 bg-[var(--os-surface)]">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center gap-3 text-xs text-[var(--os-text-muted)]">
                            <span>Step {Math.min(currentStep + 1, conversationFlow.length - 1)} of {conversationFlow.length - 1}</span>
                            <div className="flex-1 h-1 bg-[var(--os-border)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-neuro rounded-full transition-all duration-300"
                                    style={{ width: `${(currentStep / (conversationFlow.length - 2)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
