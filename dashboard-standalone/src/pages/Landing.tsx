import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Check, ArrowRight, Zap, Brain, Users, BarChart3,
  MessageSquare, Calendar, Shield, Clock, TrendingUp, Bot,
  Workflow, Target, Rocket, Star
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

// Extend window for PushLap affiliate tracking
declare global {
  interface Window {
    affiliateId?: string;
    affiliateRef?: string;
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
      description: 'Perfect for getting started with AI automation',
      priceMonthly: 47,
      priceYearly: 470,
      features: [
        '1 GHL Sub-Account',
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
        '5 GHL Sub-Accounts',
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
      description: 'Complete solution for growing businesses',
      priceMonthly: 197,
      priceYearly: 1970,
      features: [
        '15 GHL Sub-Accounts',
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
        '25 GHL Sub-Accounts',
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
        '50 GHL Sub-Accounts',
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
        'Unlimited Sub-Accounts',
        'Unlimited AI Credits',
        'Custom AI Training',
        'SLA Guarantee',
        'On-premise Options',
        '24/7 Priority Support'
      ]
    }
  ]
};

const Landing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<{ individual: Plan[]; agency: Plan[] }>(FALLBACK_PLANS);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [_loading, _setLoading] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

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
      title: "Connect Your GHL Account",
      description: "One-click integration with your GoHighLevel account. We sync your contacts, pipelines, and workflows instantly.",
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

  const features = [
    { icon: Brain, title: 'AI-Powered Automation', description: 'Let AI handle repetitive tasks while you focus on growth and strategy' },
    { icon: Users, title: 'Virtual AI Staff', description: 'Deploy AI agents that work 24/7 on your business without breaks' },
    { icon: MessageSquare, title: 'Smart Conversations', description: 'AI-driven customer engagement across all channels simultaneously' },
    { icon: Calendar, title: 'Content Scheduling', description: 'Plan and automate your entire social media presence effortlessly' },
    { icon: BarChart3, title: 'Deep Analytics', description: 'Real-time insights into your business performance and AI effectiveness' },
    { icon: Zap, title: 'GHL Integration', description: 'Seamlessly connects with your GoHighLevel account in one click' },
    { icon: Shield, title: 'Enterprise Security', description: 'Bank-level encryption and SOC2 compliant data protection' },
    { icon: Target, title: 'Lead Scoring', description: 'AI automatically scores and prioritizes your hottest leads' },
  ];

  const testimonials = [
    {
      quote: "LIV8 OS transformed how we run our agency. We've 3x'd our client capacity without adding staff.",
      author: "Sarah M.",
      role: "Agency Owner",
      rating: 5
    },
    {
      quote: "The AI staff feature alone saves us 20+ hours per week. It's like having a team that never sleeps.",
      author: "Mike R.",
      role: "Marketing Director",
      rating: 5
    },
    {
      quote: "Finally, an AI tool that actually integrates with GHL properly. Game changer for our workflows.",
      author: "Jessica T.",
      role: "Operations Manager",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">LIV8<span className="text-blue-400">OS</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#why" className="text-slate-400 hover:text-white transition-colors">Why LIV8</a>
          <a href="#how" className="text-slate-400 hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</a>
        </nav>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-all"
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-400 text-sm font-semibold mb-8 border border-blue-500/30">
            <Sparkles className="h-4 w-4" />
            AI-Powered Business Operating System for GHL
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Stop Working <span className="text-slate-500">IN</span> Your Business.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Let AI Work FOR You.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto">
            Deploy AI staff that handles lead follow-up, content creation, and customer support 24/7.
            Built specifically for GoHighLevel agencies who want to scale without the headcount.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => handleGetStarted()}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              Start Free 14-Day Trial <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition-all border border-white/10"
            >
              See How It Works
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
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
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-white/10 bg-white/5 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
            <div>
              <div className="text-3xl font-black text-white">500+</div>
              <div className="text-sm text-slate-400">Agencies Powered</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">2M+</div>
              <div className="text-sm text-slate-400">AI Tasks Completed</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">50K+</div>
              <div className="text-sm text-slate-400">Hours Saved Monthly</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">4.9/5</div>
              <div className="text-sm text-slate-400">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Section - Problem/Solution */}
      <section id="why" className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Sound Familiar?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Most GHL agencies hit the same walls. Here's how LIV8 OS breaks through them.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {problemSolutions.map((item, idx) => (
            <div key={idx} className="p-6 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <item.icon className="h-6 w-6 text-red-400 group-hover:text-green-400 transition-colors" />
                </div>
                <div>
                  <p className="text-red-400 font-semibold mb-2 group-hover:text-slate-500 transition-colors line-through decoration-slate-600">{item.problem}</p>
                  <p className="text-green-400 font-medium">{item.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How LIV8 OS Works</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Get up and running in minutes, not weeks. Our streamlined process gets AI working for you fast.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {howItWorks.map((item, idx) => (
            <div key={idx} className="relative p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="absolute -top-4 -left-4 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-black text-lg">
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
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Scale</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A complete AI operating system designed specifically for GoHighLevel power users.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all">
              <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by GHL Agencies</h2>
          <p className="text-slate-400">See what our customers are saying</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10">
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
      <section id="pricing" className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 mb-8">Start free, scale as you grow. No hidden fees.</p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 rounded-xl border border-white/10">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                interval === 'monthly' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                interval === 'yearly' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
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
          <>
            {/* Individual Plans */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-center mb-8">For Individuals & Small Teams</h3>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.individual.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative p-8 rounded-2xl border transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/10 border-blue-500/50 scale-105 shadow-xl shadow-blue-500/10'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-sm font-bold">
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
            </div>

            {/* Agency Plans */}
            <div>
              <h3 className="text-2xl font-bold text-center mb-8">For Agencies</h3>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.agency.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative p-8 rounded-2xl border transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-b from-purple-500/20 to-pink-500/10 border-purple-500/50 scale-105 shadow-xl shadow-purple-500/10'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-sm font-bold">
                        Best Value
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
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white'
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
            </div>
          </>
        )}
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="font-bold mb-2">Do I need a GoHighLevel account?</h3>
              <p className="text-slate-400">Yes, LIV8 OS is built specifically for GoHighLevel. You'll need an active GHL account to connect and use all features.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="font-bold mb-2">How long does setup take?</h3>
              <p className="text-slate-400">Most users are up and running within 5-10 minutes. Just connect your GHL account, configure your AI agents, and you're ready to go.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="font-bold mb-2">What are AI Credits?</h3>
              <p className="text-slate-400">AI Credits power your AI staff actions - things like generating content, responding to leads, and running automations. Each plan includes a monthly allocation that resets.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="font-bold mb-2">Can I white-label LIV8 OS for my clients?</h3>
              <p className="text-slate-400">Yes! Our Agency Growth and Enterprise plans include full white-label capabilities so you can offer LIV8 OS under your own brand.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center p-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl border border-white/10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Put Your Business on Autopilot?</h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            Join 500+ agencies already using LIV8 OS to scale their operations.
            Start your free trial today - no credit card required.
          </p>
          <button
            onClick={() => handleGetStarted()}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-blue-500/25"
          >
            Start Your Free 14-Day Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-white/10">
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
    </div>
  );
};

export default Landing;
