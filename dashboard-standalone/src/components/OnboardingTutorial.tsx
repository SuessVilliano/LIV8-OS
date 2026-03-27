import React, { useState, useEffect } from 'react';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    MessageSquare,
    Zap,
    BarChart3,
    Bot,
    CheckCircle2
} from 'lucide-react';

interface TutorialStep {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    target?: string; // CSS selector for highlighting
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const tutorialSteps: TutorialStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to LIV8 OS!',
        description: 'Let me give you a quick tour of your new AI-powered business operating system. This will only take a minute.',
        icon: Sparkles,
        position: 'center'
    },
    {
        id: 'dashboard',
        title: 'Your Command Center',
        description: 'This is your dashboard - the central hub where you can see everything happening in your business at a glance. Real-time metrics, AI activity, and quick actions.',
        icon: BarChart3,
        target: '.dashboard-metrics',
        position: 'top-right'
    },
    {
        id: 'agents',
        title: 'Your AI Team',
        description: 'Meet your AI agents! They work 24/7 handling content, follow-ups, and automation. Click here to see what they\'re doing and customize their behavior.',
        icon: Bot,
        target: '[href="/staff"]',
        position: 'top-left'
    },
    {
        id: 'workflows',
        title: 'Automated Workflows',
        description: 'Set up powerful automations that run on autopilot. From speed-to-lead responses to nurture sequences, your AI handles it all.',
        icon: Zap,
        target: '[href="/workflows"]',
        position: 'top-left'
    },
    {
        id: 'messaging',
        title: 'Telegram Connection',
        description: 'Connect Telegram to receive daily briefings, approve content, and manage your business from your phone. Your AI Manager will message you proactively!',
        icon: MessageSquare,
        target: '[href="/settings"]',
        position: 'top-left'
    },
    {
        id: 'complete',
        title: 'You\'re All Set!',
        description: 'That\'s the basics! Explore the dashboard, and remember - your AI team is already working for you. Check your Telegram for your first briefing tomorrow morning.',
        icon: CheckCircle2,
        position: 'center'
    }
];

interface OnboardingTutorialProps {
    onComplete: () => void;
    onSkip: () => void;
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const step = tutorialSteps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === tutorialSteps.length - 1;

    useEffect(() => {
        // Highlight target element if specified
        if (step.target) {
            const element = document.querySelector(step.target);
            if (element) {
                element.classList.add('tutorial-highlight');
                return () => element.classList.remove('tutorial-highlight');
            }
        }
    }, [currentStep, step.target]);

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirstStep) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('os_tutorial_complete', 'true');
        setIsVisible(false);
        onComplete();
    };

    const handleSkip = () => {
        localStorage.setItem('os_tutorial_complete', 'true');
        setIsVisible(false);
        onSkip();
    };

    if (!isVisible) return null;

    const getPositionClasses = () => {
        switch (step.position) {
            case 'top-left':
                return 'top-24 left-80';
            case 'top-right':
                return 'top-24 right-8';
            case 'bottom-left':
                return 'bottom-24 left-80';
            case 'bottom-right':
                return 'bottom-24 right-8';
            default:
                return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />

            {/* Tutorial Card */}
            <div className={`fixed ${getPositionClasses()} z-[101] w-full max-w-md animate-in fade-in zoom-in-95 duration-300`}>
                <div className="bg-[#0F1219] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-0 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <step.icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-cyan-400 font-medium">Step {currentStep + 1} of {tutorialSteps.length}</p>
                                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                            </div>
                        </div>
                        <button
                            onClick={handleSkip}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <p className="text-gray-300 leading-relaxed">{step.description}</p>
                    </div>

                    {/* Progress */}
                    <div className="px-6 pb-2">
                        <div className="flex gap-1">
                            {tutorialSteps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-cyan-500' : 'bg-white/10'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 pt-4 flex items-center justify-between border-t border-white/5">
                        <button
                            onClick={handleSkip}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Skip tutorial
                        </button>
                        <div className="flex items-center gap-2">
                            {!isFirstStep && (
                                <button
                                    onClick={handlePrev}
                                    className="px-4 py-2 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors flex items-center gap-1"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                            >
                                {isLastStep ? 'Get Started' : 'Next'}
                                {!isLastStep && <ChevronRight className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Styles for highlighting */}
            <style>{`
                .tutorial-highlight {
                    position: relative;
                    z-index: 102;
                    box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
                    border-radius: 12px;
                    animation: pulse-highlight 2s infinite;
                }

                @keyframes pulse-highlight {
                    0%, 100% {
                        box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
                    }
                    50% {
                        box-shadow: 0 0 0 8px rgba(6, 182, 212, 0.3), 0 0 30px rgba(6, 182, 212, 0.5);
                    }
                }
            `}</style>
        </>
    );
};

export default OnboardingTutorial;
