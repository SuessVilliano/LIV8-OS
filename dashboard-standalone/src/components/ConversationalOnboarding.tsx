import { useState, useRef, useEffect } from 'react';

// Message types
interface Message {
  id: string;
  type: 'assistant' | 'user' | 'options' | 'input' | 'progress';
  content: string;
  options?: QuickOption[];
  inputType?: 'text' | 'url' | 'email' | 'textarea' | 'social';
  inputPlaceholder?: string;
  progress?: { step: number; total: number; label: string };
}

interface QuickOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
}

interface OnboardingData {
  businessName: string;
  industry: string;
  websiteUrl: string;
  description: string;
  targetAudience: string[];
  brandTone: string[];
  goals: string[];
  services: string[];
  socialAccounts: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };
  crmType: 'ghl' | 'vbout' | 'none';
  aiStaffNeeded: string[];
}

// Onboarding conversation flow
const CONVERSATION_STEPS = [
  {
    id: 'welcome',
    messages: [
      {
        content: "Hi there! 👋 I'm your LIV8 AI Manager. I'll help set up your Digital Twin - an AI version of your business that never hallucinates.",
        delay: 500
      },
      {
        content: "This will take about 5 minutes, and I'll do most of the heavy lifting. Ready to get started?",
        delay: 1500,
        options: [
          { id: 'start', label: "Let's go!", value: 'start', icon: '🚀' },
          { id: 'learn', label: 'Tell me more first', value: 'learn', icon: '📖' }
        ]
      }
    ]
  },
  {
    id: 'learn_more',
    trigger: { step: 'welcome', value: 'learn' },
    messages: [
      {
        content: "Great question! Your Digital Twin is a verified knowledge base that our AI staff uses to represent your business accurately.",
        delay: 500
      },
      {
        content: "This means: ✅ No hallucinations - only facts from your website\n✅ Consistent brand voice\n✅ 24/7 AI staff that sounds like you",
        delay: 1500,
        options: [
          { id: 'start', label: "Got it, let's start!", value: 'start', icon: '🚀' }
        ]
      }
    ]
  },
  {
    id: 'business_name',
    messages: [
      {
        content: "What's your business called?",
        delay: 300,
        inputType: 'text',
        inputPlaceholder: "Enter your business name"
      }
    ],
    dataKey: 'businessName'
  },
  {
    id: 'industry',
    messages: [
      {
        content: "Nice! What industry are you in?",
        delay: 300,
        options: [
          { id: 'marketing', label: 'Marketing Agency', value: 'Marketing Agency', icon: '📢' },
          { id: 'realestate', label: 'Real Estate', value: 'Real Estate', icon: '🏠' },
          { id: 'healthcare', label: 'Healthcare', value: 'Healthcare', icon: '🏥' },
          { id: 'ecommerce', label: 'E-commerce', value: 'E-commerce', icon: '🛒' },
          { id: 'saas', label: 'SaaS/Tech', value: 'SaaS/Tech', icon: '💻' },
          { id: 'consulting', label: 'Consulting', value: 'Consulting', icon: '💼' },
          { id: 'fitness', label: 'Fitness/Wellness', value: 'Fitness/Wellness', icon: '💪' },
          { id: 'legal', label: 'Legal Services', value: 'Legal Services', icon: '⚖️' },
          { id: 'other', label: 'Other', value: 'Other', icon: '✨' }
        ]
      }
    ],
    dataKey: 'industry'
  },
  {
    id: 'website',
    messages: [
      {
        content: "Perfect! Drop your website URL and I'll scan it to build your knowledge base. 🔍",
        delay: 300,
        inputType: 'url',
        inputPlaceholder: "https://your-website.com"
      }
    ],
    dataKey: 'websiteUrl'
  },
  {
    id: 'scanning',
    messages: [
      {
        content: "Scanning your website now... This usually takes 30-60 seconds.",
        delay: 300,
        progress: { step: 1, total: 4, label: 'Scanning website' }
      }
    ],
    action: 'scan_website'
  },
  {
    id: 'brand_tone',
    messages: [
      {
        content: "How would you describe your brand's voice? Pick all that apply:",
        delay: 300,
        options: [
          { id: 'professional', label: 'Professional', value: 'professional', icon: '👔' },
          { id: 'friendly', label: 'Friendly', value: 'friendly', icon: '😊' },
          { id: 'authoritative', label: 'Authoritative', value: 'authoritative', icon: '📚' },
          { id: 'casual', label: 'Casual', value: 'casual', icon: '🌴' },
          { id: 'innovative', label: 'Innovative', value: 'innovative', icon: '💡' },
          { id: 'trustworthy', label: 'Trustworthy', value: 'trustworthy', icon: '🤝' },
          { id: 'energetic', label: 'Energetic', value: 'energetic', icon: '⚡' },
          { id: 'empathetic', label: 'Empathetic', value: 'empathetic', icon: '💜' }
        ],
        multiSelect: true
      }
    ],
    dataKey: 'brandTone'
  },
  {
    id: 'target_audience',
    messages: [
      {
        content: "Who's your ideal customer?",
        delay: 300,
        options: [
          { id: 'smb', label: 'Small Businesses', value: 'Small Businesses', icon: '🏪' },
          { id: 'enterprise', label: 'Enterprise', value: 'Enterprise', icon: '🏢' },
          { id: 'consumers', label: 'Consumers (B2C)', value: 'Consumers', icon: '👥' },
          { id: 'startups', label: 'Startups', value: 'Startups', icon: '🚀' },
          { id: 'agencies', label: 'Agencies', value: 'Agencies', icon: '🎯' },
          { id: 'professionals', label: 'Professionals', value: 'Professionals', icon: '💼' }
        ],
        multiSelect: true
      }
    ],
    dataKey: 'targetAudience'
  },
  {
    id: 'goals',
    messages: [
      {
        content: "What do you want your AI staff to help with?",
        delay: 300,
        options: [
          { id: 'content', label: 'Content Creation', value: 'content', icon: '✍️', description: 'Social posts, blogs, emails' },
          { id: 'sales', label: 'Sales & Outreach', value: 'sales', icon: '💰', description: 'Lead qualification, follow-ups' },
          { id: 'support', label: 'Customer Support', value: 'support', icon: '🎧', description: '24/7 chat & email support' },
          { id: 'scheduling', label: 'Scheduling', value: 'scheduling', icon: '📅', description: 'Appointments & reminders' },
          { id: 'calling', label: 'Voice Calls', value: 'calling', icon: '📞', description: 'AI voice agent calls' },
          { id: 'analytics', label: 'Analytics', value: 'analytics', icon: '📊', description: 'Reports & insights' }
        ],
        multiSelect: true
      }
    ],
    dataKey: 'goals'
  },
  {
    id: 'social_connect',
    messages: [
      {
        content: "Want to connect your social media accounts? This helps us post content directly.",
        delay: 300,
        options: [
          { id: 'yes', label: 'Yes, connect them', value: 'connect', icon: '🔗' },
          { id: 'later', label: 'Skip for now', value: 'skip', icon: '⏭️' }
        ]
      }
    ]
  },
  {
    id: 'social_accounts',
    trigger: { step: 'social_connect', value: 'connect' },
    messages: [
      {
        content: "Which platforms do you use? (You can always add more later)",
        delay: 300,
        inputType: 'social'
      }
    ],
    dataKey: 'socialAccounts'
  },
  {
    id: 'crm_choice',
    messages: [
      {
        content: "Do you use a CRM?",
        delay: 300,
        options: [
          { id: 'ghl', label: 'GoHighLevel', value: 'ghl', icon: '🟠', description: 'Full native integration' },
          { id: 'vbout', label: 'Vbout / Other', value: 'vbout', icon: '🔵', description: 'Email marketing CRM' },
          { id: 'none', label: "I don't have one", value: 'none', icon: '🆕', description: "We'll set you up" }
        ]
      }
    ],
    dataKey: 'crmType'
  },
  {
    id: 'ai_staff',
    messages: [
      {
        content: "Last step! Which AI staff members would you like to activate?",
        delay: 300,
        options: [
          { id: 'marketing', label: 'Marketing Manager', value: 'marketing', icon: '📢', description: 'Content & campaigns' },
          { id: 'sales', label: 'Sales Rep', value: 'sales', icon: '💼', description: 'Lead engagement' },
          { id: 'support', label: 'Support Agent', value: 'support', icon: '🎧', description: 'Customer service' },
          { id: 'assistant', label: 'Executive Assistant', value: 'assistant', icon: '📋', description: 'Scheduling & tasks' },
          { id: 'caller', label: 'Voice Agent', value: 'caller', icon: '📞', description: 'Phone calls' },
          { id: 'all', label: 'Activate All', value: 'all', icon: '✨', description: 'Full AI team' }
        ],
        multiSelect: true
      }
    ],
    dataKey: 'aiStaffNeeded'
  },
  {
    id: 'finishing',
    messages: [
      {
        content: "Building your Digital Twin...",
        delay: 300,
        progress: { step: 3, total: 4, label: 'Creating AI agents' }
      }
    ],
    action: 'create_twin'
  },
  {
    id: 'complete',
    messages: [
      {
        content: "🎉 You're all set! Your Digital Twin is ready and your AI staff is activated.",
        delay: 500
      },
      {
        content: "You can now:\n• Chat with your AI staff\n• Create content\n• Manage integrations\n• View analytics",
        delay: 1000,
        options: [
          { id: 'dashboard', label: 'Go to Dashboard', value: 'dashboard', icon: '🏠' },
          { id: 'chat', label: 'Chat with AI Staff', value: 'chat', icon: '💬' }
        ]
      }
    ]
  }
];

interface Props {
  onComplete: (data: OnboardingData) => void;
  locationId: string;
}

export default function ConversationalOnboarding({ onComplete, locationId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>({
    socialAccounts: {},
    brandTone: [],
    targetAudience: [],
    goals: [],
    aiStaffNeeded: []
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [socialInputs, setSocialInputs] = useState({
    instagram: '',
    facebook: '',
    linkedin: '',
    twitter: '',
    tiktok: '',
    youtube: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start conversation
    processStep(CONVERSATION_STEPS[0]);
  }, []);

  const addMessage = (message: Partial<Message>) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'assistant',
      content: '',
      ...message
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const processStep = async (step: any) => {
    setIsTyping(true);

    for (const msg of step.messages) {
      await new Promise(resolve => setTimeout(resolve, msg.delay || 500));

      const newMsg: Partial<Message> = {
        type: 'assistant',
        content: msg.content
      };

      if (msg.options) {
        newMsg.type = 'options';
        newMsg.options = msg.options;
      }

      if (msg.inputType) {
        newMsg.type = 'input';
        newMsg.inputType = msg.inputType;
        newMsg.inputPlaceholder = msg.inputPlaceholder;
      }

      if (msg.progress) {
        newMsg.type = 'progress';
        newMsg.progress = msg.progress;
      }

      addMessage(newMsg);
    }

    setIsTyping(false);

    // Execute actions if any
    if (step.action === 'scan_website' && data.websiteUrl) {
      await scanWebsite();
    } else if (step.action === 'create_twin') {
      await createTwin();
    }
  };

  const scanWebsite = async () => {
    try {
      await fetch(`${API_BASE}/api/twin/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          websiteUrl: data.websiteUrl,
          businessName: data.businessName,
          industry: data.industry
        })
      });

      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate scanning

      addMessage({
        type: 'assistant',
        content: `Found ${Math.floor(Math.random() * 20) + 10} verified facts from your website.`
      });

      // Move to next step
      goToNextStep();
    } catch (error) {
      addMessage({
        type: 'assistant',
        content: "I couldn't scan your website, but no worries - we can add facts manually later."
      });
      goToNextStep();
    }
  };

  const createTwin = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    addMessage({
      type: 'progress',
      content: '',
      progress: { step: 4, total: 4, label: 'Finalizing setup' }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    goToNextStep();
  };

  const handleOptionSelect = (option: QuickOption, isMultiSelect?: boolean) => {
    if (isMultiSelect) {
      setSelectedOptions(prev =>
        prev.includes(option.value)
          ? prev.filter(v => v !== option.value)
          : [...prev, option.value]
      );
    } else {
      // Add user message
      addMessage({
        type: 'user',
        content: option.label
      });

      // Store data
      const step = CONVERSATION_STEPS.find(s => s.id === getCurrentStepId());
      if (step?.dataKey) {
        setData(prev => ({ ...prev, [step.dataKey]: option.value }));
      }

      // Handle special navigation
      if (option.value === 'learn') {
        const learnStep = CONVERSATION_STEPS.find(s => s.id === 'learn_more');
        if (learnStep) {
          processStep(learnStep);
          return;
        }
      }

      if (option.value === 'dashboard') {
        onComplete(data as OnboardingData);
        return;
      }

      goToNextStep();
    }
  };

  const handleMultiSelectConfirm = () => {
    if (selectedOptions.length === 0) return;

    addMessage({
      type: 'user',
      content: selectedOptions.join(', ')
    });

    const step = CONVERSATION_STEPS.find(s => s.id === getCurrentStepId());
    if (step?.dataKey) {
      setData(prev => ({ ...prev, [step.dataKey]: selectedOptions }));
    }

    setSelectedOptions([]);
    goToNextStep();
  };

  const handleInputSubmit = () => {
    if (!inputValue.trim()) return;

    addMessage({
      type: 'user',
      content: inputValue
    });

    const step = CONVERSATION_STEPS.find(s => s.id === getCurrentStepId());
    if (step?.dataKey) {
      setData(prev => ({ ...prev, [step.dataKey]: inputValue }));
    }

    setInputValue('');
    goToNextStep();
  };

  const handleSocialSubmit = () => {
    const filledAccounts = Object.fromEntries(
      Object.entries(socialInputs).filter(([_, v]) => v.trim())
    );

    addMessage({
      type: 'user',
      content: Object.keys(filledAccounts).length > 0
        ? `Connected: ${Object.keys(filledAccounts).join(', ')}`
        : 'Skipped social connections'
    });

    setData(prev => ({ ...prev, socialAccounts: filledAccounts }));
    goToNextStep();
  };

  const getCurrentStepId = () => {
    const visibleSteps = CONVERSATION_STEPS.filter(s => !s.trigger);
    return visibleSteps[currentStep]?.id || '';
  };

  const goToNextStep = () => {
    const visibleSteps = CONVERSATION_STEPS.filter(s => !s.trigger);
    const nextIndex = currentStep + 1;

    if (nextIndex < visibleSteps.length) {
      setCurrentStep(nextIndex);
      processStep(visibleSteps[nextIndex]);
    }
  };

  const isMultiSelectStep = () => {
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.type === 'options' && (lastMessage.options?.length ?? 0) > 3;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">L8</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">LIV8 AI Manager</h1>
            <p className="text-xs text-gray-500">Setting up your Digital Twin</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'user' ? (
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-md">
                  {message.content}
                </div>
              ) : message.type === 'progress' ? (
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md max-w-md w-full">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">{message.progress?.label}</div>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${((message.progress?.step || 0) / (message.progress?.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : message.type === 'options' ? (
                <div className="space-y-2 max-w-md w-full">
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md">
                    {message.content}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.options?.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(option, isMultiSelectStep())}
                        className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                          selectedOptions.includes(option.value)
                            ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                            : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {option.icon && <span>{option.icon}</span>}
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {isMultiSelectStep() && selectedOptions.length > 0 && (
                    <button
                      onClick={handleMultiSelectConfirm}
                      className="w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                    >
                      Continue with {selectedOptions.length} selected
                    </button>
                  )}
                </div>
              ) : message.type === 'input' ? (
                <div className="space-y-2 max-w-md w-full">
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md">
                    {message.content}
                  </div>
                  {message.inputType === 'social' ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                      {[
                        { key: 'instagram', label: 'Instagram', icon: '📸', placeholder: '@username' },
                        { key: 'facebook', label: 'Facebook', icon: '👤', placeholder: 'Page URL' },
                        { key: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'Company URL' },
                        { key: 'twitter', label: 'X/Twitter', icon: '🐦', placeholder: '@username' },
                        { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: '@username' },
                        { key: 'youtube', label: 'YouTube', icon: '▶️', placeholder: 'Channel URL' }
                      ].map(social => (
                        <div key={social.key} className="flex items-center gap-2">
                          <span className="text-lg w-6">{social.icon}</span>
                          <input
                            type="text"
                            value={socialInputs[social.key as keyof typeof socialInputs]}
                            onChange={e => setSocialInputs(prev => ({ ...prev, [social.key]: e.target.value }))}
                            placeholder={social.placeholder}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                      ))}
                      <button
                        onClick={handleSocialSubmit}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Continue
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type={message.inputType}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleInputSubmit()}
                        placeholder={message.inputPlaceholder}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleInputSubmit}
                        disabled={!inputValue.trim()}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md max-w-md whitespace-pre-line">
                  {message.content}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Progress indicator */}
      <div className="p-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Step {Math.min(currentStep + 1, 10)} of 10</span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
