import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, ArrowRight, Zap, Brain, Users, BarChart3, MessageSquare, Calendar } from 'lucide-react';
import { getBackendUrl } from '../services/api';

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  popular?: boolean;
}

const Landing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<{ individual: Plan[]; agency: Plan[] }>({ individual: [], agency: [] });
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/billing/plans`);
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = (planId?: string) => {
    if (planId) {
      localStorage.setItem('selectedPlan', planId);
      localStorage.setItem('selectedInterval', interval);
    }
    navigate('/login');
  };

  const features = [
    { icon: Brain, title: 'AI-Powered Automation', description: 'Let AI handle repetitive tasks while you focus on growth' },
    { icon: Users, title: 'Virtual AI Staff', description: 'Deploy AI agents that work 24/7 on your business' },
    { icon: MessageSquare, title: 'Smart Conversations', description: 'AI-driven customer engagement across all channels' },
    { icon: Calendar, title: 'Content Scheduling', description: 'Plan and automate your social media presence' },
    { icon: BarChart3, title: 'Deep Analytics', description: 'Real-time insights into your business performance' },
    { icon: Zap, title: 'GHL Integration', description: 'Seamlessly connects with your GoHighLevel account' },
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
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-all"
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-400 text-sm font-semibold mb-8">
            <Sparkles className="h-4 w-4" />
            AI-Powered Business Operating System
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Your Business on{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Autopilot
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Deploy AI staff, automate workflows, and scale your agency with the most advanced
            operating system built for GoHighLevel users.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleGetStarted()}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition-all"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Scale</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all">
              <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 mb-8">Start free, scale as you grow</p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 rounded-xl">
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

        {loading ? (
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
                        ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/10 border-blue-500/50 scale-105'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 rounded-full text-sm font-bold">
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
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      Get Started
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
                        ? 'bg-gradient-to-b from-purple-500/20 to-pink-500/10 border-purple-500/50 scale-105'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 rounded-full text-sm font-bold">
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
                          ? 'bg-purple-500 hover:bg-purple-600 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      Get Started
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

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center p-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl border border-white/10">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-slate-400 mb-8">Join thousands of agencies already using LIV8 OS to scale their operations.</p>
          <button
            onClick={() => handleGetStarted()}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 transition-all"
          >
            Start Your Free Trial
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
            <span>© 2024 LIV8 AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
