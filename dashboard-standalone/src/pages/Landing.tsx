import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Check, ArrowRight, Zap, Brain, Users, BarChart3,
  MessageSquare, Calendar, Shield, Clock, TrendingUp, Bot,
  Workflow, Target, Rocket, Star, Play, Phone, ChevronDown,
  DollarSign, UserCheck, Repeat
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

// Extend window for PushLap affiliate tracking and MakeForm
declare global {
  interface Window {
    affiliateId?: string;
    affiliateRef?: string;
    makeforms?: {
      Embed: new (config: { sourceId: string; root: string }) => { build: () => void };
    };
  }
}

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  popular?: boolean;
}

// Fallback pricing plans when backend is unavailable
const FALLBACK_PLANS = {
  individual: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for solopreneurs getting started',
      priceMonthly: 47,
      priceYearly: 470,
      features: [
        '1 Business Workspace',
        '500 AI Credits/month',
        'Basic AI Staff (2 agents)',
        'Content Scheduling',
        'Email Support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For professionals ready to scale',
      priceMonthly: 97,
      priceYearly: 970,
      features: [
        '5 Business Workspaces',
        '2,000 AI Credits/month',
        'Full AI Staff Suite (5 agents)',
        'Advanced Analytics',
        'Social Media Automation',
        'Priority Support'
      ],
      popular: true
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Complete solution for growing teams',
      priceMonthly: 197,
      priceYearly: 1970,
      features: [
        '15 Business Workspaces',
        '5,000 AI Credits/month',
        'Unlimited AI Staff',
        'White-label Options',
        'API Access',
        'Dedicated Support'
      ]
    }
  ],
  agency: [
    {
      id: 'agency-starter',
      name: 'Agency Starter',
      description: 'Launch your AI-powered agency',
      priceMonthly: 297,
      priceYearly: 2970,
      features: [
        '25 Client Workspaces',
        '10,000 AI Credits/month',
        'Full AI Staff Suite',
        'Client Dashboard',
        'Basic White-labeling',
        'Agency Training'
      ]
    },
    {
      id: 'agency-growth',
      name: 'Agency Growth',
      description: 'Scale your agency to new heights',
      priceMonthly: 497,
      priceYearly: 4970,
      features: [
        '50 Client Workspaces',
        '25,000 AI Credits/month',
        'Unlimited AI Staff',
        'Full White-label Suite',
        'Custom Integrations',
        'Dedicated Account Manager'
      ],
      popular: true
    },
    {
      id: 'agency-enterprise',
      name: 'Enterprise',
      description: 'For large-scale operations',
      priceMonthly: 997,
      priceYearly: 9970,
      features: [
        'Unlimited Workspaces',
        'Unlimited AI Credits',
        'Custom AI Training',
        'SLA Guarantee',
        'On-premise Options',
        '24/7 Priority Support'
      ]
    }
  ]
};

// Intersection Observer Hook for scroll animations
const useInView = (options = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
};

// Animated Counter Component
const AnimatedCounter = ({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const Landing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<{ individual: Plan[]; agency: Plan[] }>(FALLBACK_PLANS);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [_loading, _setLoading] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'agency'>('individual');

  // Animation refs
  const heroRef = useInView();
  const problemRef = useInView();
  const howRef = useInView();
  const valueRef = useInView();
  const bookingRef = useInView();

  useEffect(() => {
    fetchPlans();

    // Capture affiliate ID from PushLap Growth
    const captureAffiliateId = () => {
      if (window.affiliateId) {
        setAffiliateId(window.affiliateId);
        localStorage.setItem('pushlap_affiliate_id', window.affiliateId);
      }
    };

    captureAffiliateId();

    const handleAffiliateReady = () => captureAffiliateId();
    window.addEventListener('affiliate_id_ready', handleAffiliateReady);

    const checkInterval = window.setInterval(() => {
      if (window.affiliateId && !affiliateId) {
        captureAffiliateId();
      }
    }, 500);

    setTimeout(() => clearInterval(checkInterval), 5000);

    return () => {
      window.removeEventListener('affiliate_id_ready', handleAffiliateReady);
      clearInterval(checkInterval);
    };
  }, []);

  // Initialize MakeForm booking embed
  useEffect(() => {
    const initMakeForm = () => {
      const container = document.getElementById('makeform-booking');
      if (container && window.makeforms && !container.hasChildNodes()) {
        new window.makeforms.Embed({
          sourceId: "697e5b928a27e519fecb6c47",
          root: "makeform-booking"
        }).build();
      }
    };

    // Try immediately
    initMakeForm();

    // Also try after a delay in case script is still loading
    const timer = setTimeout(initMakeForm, 1000);
    const timer2 = setTimeout(initMakeForm, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/billing/plans`);
      const data = await res.json();
      if (data.success && data.plans) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.log('Using fallback pricing plans');
    }
  };

  const handleGetStarted = (planId?: string) => {
    if (planId) {
      localStorage.setItem('selectedPlan', planId);
      localStorage.setItem('selectedInterval', interval);
    }
    const currentAffiliateId = affiliateId || window.affiliateId || localStorage.getItem('pushlap_affiliate_id');
    if (currentAffiliateId) {
      localStorage.setItem('pushlap_affiliate_id', currentAffiliateId);
    }
    navigate('/login');
  };

  const scrollToBooking = () => {
    document.getElementById('book-call')?.scrollIntoView({ behavior: 'smooth' });
  };

  const problemSolutions = [
    {
      problem: "Spending hours on repetitive tasks?",
      solution: "AI Staff handles lead follow-up, content creation, and customer support 24/7",
      icon: Clock
    },
    {
      problem: "Missing leads due to slow response times?",
      solution: "Instant AI-powered responses that nurture leads while you sleep",
      icon: Zap
    },
    {
      problem: "Struggling to create consistent content?",
      solution: "Auto-generate on-brand posts, emails, and campaigns in minutes",
      icon: MessageSquare
    },
    {
      problem: "Can't scale without hiring more staff?",
      solution: "Deploy unlimited AI agents that work for a fraction of the cost",
      icon: TrendingUp
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Connect Your Tools",
      description: "Integrate with your CRM, email, social media, and other tools. One-click setup syncs your data instantly.",
      icon: Zap
    },
    {
      step: "2",
      title: "Deploy Your AI Staff",
      description: "Choose from pre-trained AI agents or customize your own. Each agent specializes in specific business functions.",
      icon: Bot
    },
    {
      step: "3",
      title: "Automate Your Workflows",
      description: "Set up intelligent automation rules. Your AI staff handles tasks based on triggers you define.",
      icon: Workflow
    },
    {
      step: "4",
      title: "Scale Your Business",
      description: "Watch your business grow while AI handles the heavy lifting. Review analytics and optimize for results.",
      icon: Rocket
    }
  ];

  const valueProps = [
    {
      icon: DollarSign,
      title: "Save $50K+/Year",
      description: "Replace expensive hires with AI that works 24/7. One AI agent costs less than one day of a virtual assistant.",
      stat: "$50K+",
      statLabel: "Annual Savings"
    },
    {
      icon: Clock,
      title: "Get 40+ Hours Back",
      description: "Stop doing repetitive tasks. AI handles follow-ups, content, scheduling, and customer support automatically.",
      stat: "40+",
      statLabel: "Hours Saved Weekly"
    },
    {
      icon: UserCheck,
      title: "Never Miss a Lead",
      description: "Instant response times. AI engages every lead within seconds, qualifying and nurturing them on autopilot.",
      stat: "5x",
      statLabel: "More Conversions"
    },
    {
      icon: Repeat,
      title: "Scale Infinitely",
      description: "Add unlimited AI agents as you grow. No hiring, training, or management overhead.",
      stat: "∞",
      statLabel: "Scalability"
    }
  ];

  const features = [
    { icon: Brain, title: 'AI-Powered Automation', description: 'Let AI handle repetitive tasks while you focus on growth and strategy' },
    { icon: Users, title: 'Virtual AI Staff', description: 'Deploy AI agents that work 24/7 on your business without breaks' },
    { icon: MessageSquare, title: 'Smart Conversations', description: 'AI-driven customer engagement across all channels simultaneously' },
    { icon: Calendar, title: 'Content Scheduling', description: 'Plan and automate your entire social media presence effortlessly' },
    { icon: BarChart3, title: 'Deep Analytics', description: 'Real-time insights into your business performance and AI effectiveness' },
    { icon: Zap, title: 'CRM Integration', description: 'Connect with GoHighLevel, Vbout, HubSpot, and more in one click' },
    { icon: Shield, title: 'Enterprise Security', description: 'Bank-level encryption and SOC2 compliant data protection' },
    { icon: Target, title: 'Lead Scoring', description: 'AI automatically scores and prioritizes your hottest leads' },
  ];

  const testimonials = [
    {
      quote: "LIV8 OS transformed my real estate business. I close 3x more deals while spending less time on follow-ups.",
      author: "Marcus J.",
      role: "Real Estate Agent",
      rating: 5
    },
    {
      quote: "The AI staff handles all my client onboarding and content creation. It's like having a full team for a fraction of the cost.",
      author: "Sarah M.",
      role: "Business Coach",
      rating: 5
    },
    {
      quote: "As an insurance agent, follow-up is everything. LIV8's AI never misses a lead. My conversion rate doubled.",
      author: "David K.",
      role: "Insurance Agent",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-pink-500/5 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">LIV8<span className="text-blue-400">OS</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#why" className="text-slate-400 hover:text-white transition-colors">Why LIV8</a>
          <a href="#how" className="text-slate-400 hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</a>
          <button
            onClick={scrollToBooking}
            className="text-blue-400 hover:text-blue-300 transition-colors font-semibold"
          >
            Book a Call
          </button>
        </nav>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-all hover:scale-105"
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section
        ref={heroRef.ref}
        className={`container mx-auto px-6 py-16 md:py-24 text-center relative z-10 transition-all duration-1000 ${
          heroRef.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-400 text-sm font-semibold mb-8 border border-blue-500/30 animate-bounce">
            <Sparkles className="h-4 w-4" />
            AI-Powered Business Operating System
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="inline-block animate-fade-in">Stop Trading</span>{' '}
            <span className="inline-block text-red-400 animate-fade-in" style={{ animationDelay: '0.2s' }}>Time</span>{' '}
            <span className="inline-block animate-fade-in" style={{ animationDelay: '0.4s' }}>for</span>{' '}
            <span className="inline-block text-green-400 animate-fade-in" style={{ animationDelay: '0.6s' }}>Money.</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              Let AI Multiply Both.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.8s' }}>
            Deploy AI staff that handles lead follow-up, content creation, and customer support 24/7.
            Built for entrepreneurs, agents, coaches, and business owners ready to scale without the overhead.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={scrollToBooking}
              className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 animate-pulse-slow"
            >
              <Phone className="h-5 w-5" />
              Book a Free Strategy Call
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => handleGetStarted()}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition-all border border-white/10 hover:scale-105"
            >
              Start Free Trial
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400 mb-12">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              Setup in 5 minutes
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              Cancel anytime
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce">
            <ChevronDown className="h-8 w-8 text-slate-500 mx-auto" />
          </div>
        </div>
      </section>

      {/* Social Proof Bar - Animated */}
      <section className="border-y border-white/10 bg-white/5 py-8 relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
            <div className="group hover:scale-110 transition-transform">
              <div className="text-3xl font-black text-white">
                <AnimatedCounter end={500} suffix="+" />
              </div>
              <div className="text-sm text-slate-400">Businesses Powered</div>
            </div>
            <div className="group hover:scale-110 transition-transform">
              <div className="text-3xl font-black text-white">
                <AnimatedCounter end={2} suffix="M+" />
              </div>
              <div className="text-sm text-slate-400">AI Tasks Completed</div>
            </div>
            <div className="group hover:scale-110 transition-transform">
              <div className="text-3xl font-black text-white">
                <AnimatedCounter end={50} suffix="K+" />
              </div>
              <div className="text-sm text-slate-400">Hours Saved Monthly</div>
            </div>
            <div className="group hover:scale-110 transition-transform">
              <div className="text-3xl font-black text-white">4.9/5</div>
              <div className="text-sm text-slate-400">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section - SCROLL STOPPING */}
      <section
        ref={valueRef.ref}
        className="container mx-auto px-6 py-20 relative z-10"
      >
        <div className={`text-center mb-16 transition-all duration-700 ${valueRef.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-green-400 text-sm font-semibold mb-4 border border-green-500/30">
            <DollarSign className="h-4 w-4" />
            The Numbers Don't Lie
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            What If You Could <span className="text-green-400">10x Your Output</span>
            <br />Without Hiring Anyone?
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            LIV8 OS isn't just another tool. It's your unfair advantage.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {valueProps.map((item, idx) => (
            <div
              key={idx}
              className={`group p-6 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-500 hover:scale-105 hover:-translate-y-2 ${
                valueRef.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${idx * 150}ms` }}
            >
              <div className="h-14 w-14 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <item.icon className="h-7 w-7 text-green-400" />
              </div>
              <div className="text-4xl font-black text-green-400 mb-1">{item.stat}</div>
              <div className="text-sm text-slate-500 mb-3">{item.statLabel}</div>
              <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
              <p className="text-slate-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Section - Problem/Solution */}
      <section
        id="why"
        ref={problemRef.ref}
        className="container mx-auto px-6 py-20 border-t border-white/10 relative z-10"
      >
        <div className={`text-center mb-16 transition-all duration-700 ${problemRef.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Sound Familiar?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Every growing business hits these walls. Here's how LIV8 OS breaks through them.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {problemSolutions.map((item, idx) => (
            <div
              key={idx}
              className={`p-6 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all group hover:scale-[1.02] duration-500 ${
                problemRef.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 ' + (idx % 2 === 0 ? '-translate-x-10' : 'translate-x-10')
              }`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors duration-500">
                  <item.icon className="h-6 w-6 text-red-400 group-hover:text-green-400 transition-colors duration-500" />
                </div>
                <div>
                  <p className="text-red-400 font-semibold mb-2 group-hover:text-slate-500 transition-colors line-through decoration-slate-600">{item.problem}</p>
                  <p className="text-green-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500">{item.solution}</p>
                  <p className="text-green-400 font-medium group-hover:opacity-0 transition-opacity duration-500 absolute">{item.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOOK A CALL SECTION - MakeForm Embed */}
      <section id="book-call" ref={bookingRef.ref} className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-700 ${bookingRef.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full text-purple-400 text-sm font-semibold mb-6 border border-purple-500/30 animate-pulse">
              <Phone className="h-4 w-4" />
              Limited Spots Available
            </div>

            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Ready to <span className="text-purple-400">Transform</span> Your Business?
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
              Book a free 30-minute strategy call. We'll show you exactly how AI can automate
              your biggest time-wasters and help you scale faster.
            </p>

            {/* MakeForm Booking Embed */}
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl border border-purple-500/30 p-4 md:p-8">
              <div className="bg-slate-800/80 rounded-2xl p-4 md:p-8 backdrop-blur-xl border border-white/10 overflow-hidden">
                <div id="makeform-booking" className="min-h-[500px] w-full"></div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                No obligation
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                100% free
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                Custom strategy for your business
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how"
        ref={howRef.ref}
        className="container mx-auto px-6 py-20 border-t border-white/10 relative z-10"
      >
        <div className={`text-center mb-16 transition-all duration-700 ${howRef.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How LIV8 OS Works</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Get up and running in minutes, not weeks. Our streamlined process gets AI working for you fast.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {howItWorks.map((item, idx) => (
            <div
              key={idx}
              className={`relative p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all hover:scale-105 duration-500 ${
                howRef.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${idx * 150}ms` }}
            >
              <div className="absolute -top-4 -left-4 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/30">
                {item.step}
              </div>
              <div className="pt-4">
                <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Scale</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A complete AI operating system built for modern businesses ready to automate and grow.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all hover:scale-105 duration-300 group">
              <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Business Owners</h2>
          <p className="text-slate-400">See what entrepreneurs and professionals are saying</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:scale-105 transition-all duration-300">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 mb-4">"{testimonial.quote}"</p>
              <div>
                <div className="font-semibold">{testimonial.author}</div>
                <div className="text-sm text-slate-400">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-20 border-t border-white/10 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 mb-8">Start free, scale as you grow. No hidden fees.</p>

          {/* Plan Type Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 rounded-xl border border-white/10 mb-6">
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === 'individual' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setActiveTab('agency')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === 'agency' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Agency
            </button>
          </div>

          {/* Interval Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 rounded-xl border border-white/10">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                interval === 'monthly' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                interval === 'yearly' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {_loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans[activeTab].map((plan) => (
              <div
                key={plan.id}
                className={`relative p-8 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/10 border-blue-500/50 scale-105 shadow-xl shadow-blue-500/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-sm font-bold animate-pulse">
                    Most Popular
                  </div>
                )}
                <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black">
                    ${interval === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.priceMonthly}
                  </span>
                  <span className="text-slate-400">/mo</span>
                  {interval === 'yearly' && (
                    <div className="text-sm text-green-400 mt-1">Billed annually (${plan.priceYearly}/yr)</div>
                  )}
                </div>
                <button
                  onClick={() => handleGetStarted(plan.id)}
                  className={`w-full py-3 rounded-xl font-bold mb-6 transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Start Free Trial
                </button>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <h3 className="font-bold mb-2">What CRMs and tools does LIV8 OS integrate with?</h3>
              <p className="text-slate-400">LIV8 OS integrates with popular CRMs like GoHighLevel, Vbout, HubSpot, and more. We also connect with social media platforms, email providers, and calendar tools.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <h3 className="font-bold mb-2">How long does setup take?</h3>
              <p className="text-slate-400">Most users are up and running within 5-10 minutes. Connect your tools, configure your AI agents, and you're ready to automate.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <h3 className="font-bold mb-2">What are AI Credits?</h3>
              <p className="text-slate-400">AI Credits power your AI staff actions - things like generating content, responding to leads, and running automations. Each plan includes a monthly allocation that resets.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
              <h3 className="font-bold mb-2">What types of businesses use LIV8 OS?</h3>
              <p className="text-slate-400">LIV8 OS is used by real estate agents, insurance agents, coaches, consultants, marketing agencies, e-commerce brands, and any business looking to automate operations with AI.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-6 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center p-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Put Your Business on Autopilot?</h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              Join 500+ businesses already using LIV8 OS to scale their operations.
              Start your free trial today - no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={scrollToBooking}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Book a Free Call
              </button>
              <button
                onClick={() => handleGetStarted()}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-blue-500/25"
              >
                Start Your Free 14-Day Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-white/10 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">LIV8 OS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <span>© 2024 LIV8 AI. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default Landing;
