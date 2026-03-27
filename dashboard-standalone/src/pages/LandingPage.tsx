import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles,
    Zap,
    MessageSquare,
    TrendingUp,
    Clock,
    CheckCircle2,
    ArrowRight,
    Play,
    Users,
    BarChart3,
    Bot,
    Rocket,
    Star,
    Building2,
    Mail,
    Phone,
    Globe,
    User
} from 'lucide-react';

interface LandingPageProps {
    onSignup: (data: SignupData) => void;
}

interface SignupData {
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    website: string;
    industry: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignup }) => {
    const navigate = useNavigate();
    const [_isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<SignupData>({
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        industry: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Call the intake API to trigger agent welcome
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://os.liv8ai.com'}/api/intake/prospect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_name: formData.businessName,
                    name: formData.contactName,
                    email: formData.email,
                    phone: formData.phone,
                    website: formData.website,
                    industry: formData.industry,
                    source: 'website_landing'
                })
            });

            if (response.ok) {
                onSignup(formData);
                navigate('/welcome');
            }
        } catch (error) {
            console.error('Signup error:', error);
            // Still proceed to welcome even if API fails
            onSignup(formData);
            navigate('/welcome');
        }

        setIsSubmitting(false);
    };

    const scrollToForm = () => {
        setIsFormOpen(true);
        setTimeout(() => {
            document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="min-h-screen bg-[#0A0D14] text-white overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-[#0A0D14]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tight">LIV8 <span className="text-cyan-400">OS</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#why" className="text-sm text-gray-400 hover:text-white transition-colors">Why LIV8</a>
                        <a href="#what" className="text-sm text-gray-400 hover:text-white transition-colors">What You Get</a>
                        <a href="#how" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
                        <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/login')} className="text-sm text-gray-400 hover:text-white transition-colors">
                            Sign In
                        </button>
                        <button onClick={scrollToForm} className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                            Get Started Free
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
                <div className="absolute top-40 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[150px]" />
                <div className="absolute top-60 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[150px]" />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-8">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm text-gray-300">Now with AI Agents that work 24/7</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
                        Your Business Deserves
                        <br />
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                            AI That Actually Works
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Stop drowning in tasks. LIV8 OS gives you an AI team that handles content, follow-ups,
                        scheduling, and more — so you can focus on what matters.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <button onClick={scrollToForm} className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-lg font-bold hover:opacity-90 transition-all flex items-center gap-3">
                            Start Free — No Card Required
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-lg font-medium hover:bg-white/10 transition-all flex items-center gap-3">
                            <Play className="h-5 w-5" />
                            Watch Demo
                        </button>
                    </div>

                    {/* Social Proof */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-gray-400">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-[#0A0D14] flex items-center justify-center text-xs font-bold">
                                        {String.fromCharCode(64 + i)}
                                    </div>
                                ))}
                            </div>
                            <span className="text-sm">500+ businesses automated</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="text-sm ml-2">4.9/5 from 200+ reviews</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHY Section - The Problem */}
            <section id="why" className="py-24 px-6 bg-gradient-to-b from-transparent to-white/[0.02]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-cyan-400 text-sm font-bold tracking-widest uppercase">The Problem</span>
                        <h2 className="text-4xl md:text-5xl font-black mt-4 mb-6">
                            Why Most Businesses Are <span className="text-red-400">Stuck</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            You didn't start a business to spend 80% of your time on repetitive tasks
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Clock,
                                title: "Time Drain",
                                problem: "40+ hours/week",
                                description: "Spent on follow-ups, content creation, and admin tasks that never end"
                            },
                            {
                                icon: Users,
                                title: "Lead Leakage",
                                problem: "78% of leads",
                                description: "Go cold because you can't respond fast enough or follow up consistently"
                            },
                            {
                                icon: TrendingUp,
                                title: "Growth Ceiling",
                                problem: "Can't scale",
                                description: "Without hiring more people or burning out trying to do it all yourself"
                            }
                        ].map((item, i) => (
                            <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-red-500/30 transition-colors group">
                                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                                    <item.icon className="h-7 w-7 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                <p className="text-3xl font-black text-red-400 mb-3">{item.problem}</p>
                                <p className="text-gray-400">{item.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 p-8 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-3xl text-center">
                        <p className="text-2xl font-bold mb-2">What if you had a team that never sleeps?</p>
                        <p className="text-gray-400">AI agents that handle the busywork while you focus on growth</p>
                    </div>
                </div>
            </section>

            {/* WHAT Section - The Solution */}
            <section id="what" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-cyan-400 text-sm font-bold tracking-widest uppercase">The Solution</span>
                        <h2 className="text-4xl md:text-5xl font-black mt-4 mb-6">
                            What <span className="text-cyan-400">LIV8 OS</span> Does For You
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            A complete AI operating system that runs your business operations on autopilot
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mb-16">
                        {[
                            {
                                icon: Bot,
                                title: "AI Manager Agent",
                                description: "Your personal AI that oversees everything, sends you daily briefings via Telegram, and makes sure nothing falls through the cracks",
                                highlight: "Like a COO that works 24/7"
                            },
                            {
                                icon: MessageSquare,
                                title: "Speed-to-Lead Automation",
                                description: "Respond to every lead in under 60 seconds with personalized AI messages. Book appointments automatically while you sleep",
                                highlight: "3x more appointments booked"
                            },
                            {
                                icon: Zap,
                                title: "Content Autopilot",
                                description: "AI generates social posts, emails, and campaigns based on your brand voice. Just approve and publish — or let it run autonomously",
                                highlight: "30+ posts created monthly"
                            },
                            {
                                icon: BarChart3,
                                title: "Smart Analytics",
                                description: "Real-time insights on what's working. AI spots opportunities and problems before you do, then suggests exactly what to do",
                                highlight: "Data-driven decisions, effortlessly"
                            }
                        ].map((item, i) => (
                            <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-cyan-500/30 transition-colors group">
                                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-6">
                                    <item.icon className="h-7 w-7 text-cyan-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                                <p className="text-gray-400 mb-4 leading-relaxed">{item.description}</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full">
                                    <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                                    <span className="text-sm text-cyan-400 font-medium">{item.highlight}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Feature List */}
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            "Telegram/Slack/Discord Integration",
                            "GoHighLevel Sync",
                            "Voice Command Support",
                            "Custom Workflows",
                            "Lead Scoring AI",
                            "Email & SMS Automation",
                            "Competitor Monitoring",
                            "White-Label Available"
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW Section - The Process */}
            <section id="how" className="py-24 px-6 bg-gradient-to-b from-transparent to-white/[0.02]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-cyan-400 text-sm font-bold tracking-widest uppercase">The Process</span>
                        <h2 className="text-4xl md:text-5xl font-black mt-4 mb-6">
                            How It <span className="text-cyan-400">Works</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Get up and running in minutes, not months
                        </p>
                    </div>

                    <div className="relative">
                        {/* Connection Line */}
                        <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

                        <div className="grid md:grid-cols-4 gap-8">
                            {[
                                {
                                    step: "01",
                                    title: "Sign Up",
                                    description: "Create your free account in 30 seconds. No credit card, no sales call required.",
                                    icon: User
                                },
                                {
                                    step: "02",
                                    title: "Connect",
                                    description: "Link your CRM, messaging apps, and calendar. We support 50+ integrations.",
                                    icon: Zap
                                },
                                {
                                    step: "03",
                                    title: "Meet Your AI",
                                    description: "Your AI Manager introduces itself via Telegram and learns your business.",
                                    icon: Bot
                                },
                                {
                                    step: "04",
                                    title: "Watch It Work",
                                    description: "Sit back as your AI handles follow-ups, content, and more — automatically.",
                                    icon: Rocket
                                }
                            ].map((item, i) => (
                                <div key={i} className="relative text-center">
                                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                                        <item.icon className="h-8 w-8 text-white" />
                                    </div>
                                    <span className="text-cyan-400 text-sm font-bold">{item.step}</span>
                                    <h3 className="text-xl font-bold mt-2 mb-3">{item.title}</h3>
                                    <p className="text-gray-400 text-sm">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <button onClick={scrollToForm} className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl text-lg font-bold hover:opacity-90 transition-all inline-flex items-center gap-3">
                            Start Your Free Trial
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-gray-500 text-sm mt-4">500 free credits included • No credit card required</p>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-cyan-400 text-sm font-bold tracking-widest uppercase">Pricing</span>
                        <h2 className="text-4xl md:text-5xl font-black mt-4 mb-6">
                            Simple, <span className="text-cyan-400">Transparent</span> Pricing
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Start free, upgrade when you're ready
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            {
                                name: "Free",
                                price: "$0",
                                period: "forever",
                                credits: "500 credits/mo",
                                features: ["1 AI Assistant", "Telegram Integration", "5 Workflows", "Community Support"],
                                cta: "Start Free",
                                popular: false
                            },
                            {
                                name: "Starter",
                                price: "$97",
                                period: "/month",
                                credits: "3,000 credits/mo",
                                features: ["1 AI Manager", "All Platforms", "Unlimited Workflows", "Brand Scanner", "Email Support"],
                                cta: "Get Started",
                                popular: false
                            },
                            {
                                name: "Growth",
                                price: "$297",
                                period: "/month",
                                credits: "10,000 credits/mo",
                                features: ["3 AI Agents", "Competitor Analysis", "Voice Commands", "Priority Support", "Custom Webhooks"],
                                cta: "Start Growing",
                                popular: true
                            },
                            {
                                name: "Scale",
                                price: "$497",
                                period: "/month",
                                credits: "30,000 credits/mo",
                                features: ["10 AI Agents", "White-Label Dashboard", "Multi-Location", "API Access", "Dedicated Manager"],
                                cta: "Scale Up",
                                popular: false
                            }
                        ].map((tier, i) => (
                            <div key={i} className={`relative p-8 rounded-3xl border ${tier.popular ? 'bg-gradient-to-b from-cyan-500/10 to-blue-600/10 border-cyan-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                                {tier.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-xs font-bold">
                                        Most Popular
                                    </div>
                                )}
                                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                                <div className="mb-4">
                                    <span className="text-4xl font-black">{tier.price}</span>
                                    <span className="text-gray-400">{tier.period}</span>
                                </div>
                                <p className="text-cyan-400 text-sm font-medium mb-6">{tier.credits}</p>
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                                            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={scrollToForm}
                                    className={`w-full py-3 rounded-xl font-bold transition-all ${tier.popular ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                    {tier.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Signup Form Section */}
            <section id="signup-form" className="py-24 px-6 bg-gradient-to-b from-transparent to-cyan-500/5">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-black mb-6">
                            Ready to <span className="text-cyan-400">Transform</span> Your Business?
                        </h2>
                        <p className="text-xl text-gray-400">
                            Start your free trial in 30 seconds. Your AI Manager will reach out immediately.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 bg-white/[0.02] border border-white/10 rounded-3xl space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Business Name *</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                        placeholder="Your Company"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Your Name *</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.contactName}
                                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                        placeholder="John Smith"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Email *</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                        placeholder="john@company.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Website</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="url"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                        placeholder="https://yourwebsite.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Industry</label>
                                <select
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                >
                                    <option value="" className="bg-gray-900">Select your industry</option>
                                    <option value="marketing" className="bg-gray-900">Marketing Agency</option>
                                    <option value="real_estate" className="bg-gray-900">Real Estate</option>
                                    <option value="coaching" className="bg-gray-900">Coaching/Consulting</option>
                                    <option value="ecommerce" className="bg-gray-900">E-Commerce</option>
                                    <option value="saas" className="bg-gray-900">SaaS/Tech</option>
                                    <option value="healthcare" className="bg-gray-900">Healthcare</option>
                                    <option value="finance" className="bg-gray-900">Finance/Insurance</option>
                                    <option value="other" className="bg-gray-900">Other</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating Your Account...
                                </>
                            ) : (
                                <>
                                    Start My Free Trial
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>

                        <p className="text-center text-sm text-gray-500">
                            By signing up, you agree to our Terms of Service and Privacy Policy.
                            <br />
                            <span className="text-cyan-400">500 free credits included • No credit card required</span>
                        </p>
                    </form>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tight">LIV8 <span className="text-cyan-400">OS</span></span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                        <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                        <a href="mailto:support@liv8.co" className="hover:text-white transition-colors">Support</a>
                    </div>
                    <p className="text-sm text-gray-500">© 2025 LIV8 AI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
