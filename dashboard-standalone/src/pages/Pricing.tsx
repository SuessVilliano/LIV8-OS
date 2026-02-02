import { useState, useEffect } from 'react';
import {
    Sparkles,
    Check,
    Zap,
    Building2,
    Crown,
    Rocket,
    Users,
    Star,
    ArrowRight,
    Loader2,
    Gift,
    CheckCircle2,
    AlertCircle,
    Tag
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface PricingPlan {
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    popular?: boolean;
    limits?: Record<string, any>;
}

const Pricing = () => {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const [plans, setPlans] = useState<{ individual: PricingPlan[]; agency: PricingPlan[] }>({
        individual: [],
        agency: []
    });
    const [loading, setLoading] = useState(true);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [couponValidating, setCouponValidating] = useState(false);
    const [couponStatus, setCouponStatus] = useState<{
        valid: boolean;
        discount?: { percentOff?: number; amountOff?: number };
        message?: string;
    } | null>(null);
    const [showCouponInput, setShowCouponInput] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/billing/plans`);
            if (response.ok) {
                const data = await response.json();
                setPlans(data.plans);
            }
        } catch (error) {
            console.error('Failed to fetch plans:', error);
            // Use fallback plans
            setPlans({
                individual: [
                    {
                        id: 'starter',
                        name: 'Starter',
                        description: 'Perfect for solopreneurs getting started',
                        priceMonthly: 97,
                        priceYearly: 970,
                        features: [
                            '1 AI Staff Member',
                            '1,000 AI Credits/month',
                            '5 Social Accounts',
                            'Basic Analytics',
                            'Email Support',
                            'Content Studio'
                        ]
                    },
                    {
                        id: 'growth',
                        name: 'Growth',
                        description: 'For growing businesses scaling operations',
                        priceMonthly: 197,
                        priceYearly: 1970,
                        features: [
                            '3 AI Staff Members',
                            '5,000 AI Credits/month',
                            '15 Social Accounts',
                            'Advanced Analytics',
                            'Priority Support',
                            'Voice Commands',
                            'Custom Templates',
                            'Team Collaboration'
                        ],
                        popular: true
                    },
                    {
                        id: 'scale',
                        name: 'Scale',
                        description: 'For established businesses and teams',
                        priceMonthly: 497,
                        priceYearly: 4970,
                        features: [
                            'Unlimited AI Staff',
                            '25,000 AI Credits/month',
                            'Unlimited Social Accounts',
                            'Full Analytics Suite',
                            'Dedicated Support',
                            'API Access',
                            'Custom Integrations',
                            'White-label Reports',
                            'Priority Processing'
                        ]
                    }
                ],
                agency: [
                    {
                        id: 'agency_starter',
                        name: 'Agency Starter',
                        description: 'Launch your agency with LIV8',
                        priceMonthly: 297,
                        priceYearly: 2970,
                        features: [
                            'Up to 10 Client Accounts',
                            'White-label Dashboard',
                            'Custom Branding',
                            'Client Management',
                            'Revenue Sharing',
                            'Agency Analytics'
                        ]
                    },
                    {
                        id: 'agency_pro',
                        name: 'Agency Pro',
                        description: 'Scale your agency operations',
                        priceMonthly: 597,
                        priceYearly: 5970,
                        features: [
                            'Up to 50 Client Accounts',
                            'Custom Domain Support',
                            'Advanced White-labeling',
                            'Priority Support',
                            'Team Management',
                            'API Access'
                        ],
                        popular: true
                    }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    const validateCoupon = async () => {
        if (!couponCode.trim()) return;

        setCouponValidating(true);
        setCouponStatus(null);

        try {
            const response = await fetch(`${API_BASE}/api/billing/validate-coupon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode.trim().toUpperCase() })
            });

            const data = await response.json();

            if (data.valid) {
                setCouponStatus({
                    valid: true,
                    discount: data.discount,
                    message: data.discount.percentOff === 100
                        ? 'Free beta access activated!'
                        : data.discount.percentOff
                            ? `${data.discount.percentOff}% off applied!`
                            : `$${(data.discount.amountOff / 100).toFixed(2)} off applied!`
                });
            } else {
                setCouponStatus({
                    valid: false,
                    message: 'Invalid or expired coupon code'
                });
            }
        } catch (error) {
            setCouponStatus({
                valid: false,
                message: 'Failed to validate coupon'
            });
        } finally {
            setCouponValidating(false);
        }
    };

    const handleSelectPlan = async (planId: string) => {
        setProcessingPlan(planId);

        try {
            const email = localStorage.getItem('os_email') || '';
            const locationId = localStorage.getItem('os_loc_id') || '';

            const endpoint = couponStatus?.valid
                ? `${API_BASE}/api/billing/checkout-with-coupon`
                : `${API_BASE}/api/billing/checkout`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    planId,
                    interval,
                    locationId,
                    ...(couponStatus?.valid && { couponCode: couponCode.trim().toUpperCase() })
                })
            });

            const data = await response.json();

            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                alert('Failed to create checkout session. Please try again.');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setProcessingPlan(null);
        }
    };

    const getPrice = (plan: PricingPlan) => {
        const basePrice = interval === 'yearly' ? plan.priceYearly : plan.priceMonthly;

        if (couponStatus?.valid && couponStatus.discount) {
            if (couponStatus.discount.percentOff) {
                return basePrice * (1 - couponStatus.discount.percentOff / 100);
            }
            if (couponStatus.discount.amountOff) {
                return Math.max(0, basePrice - couponStatus.discount.amountOff / 100);
            }
        }

        return basePrice;
    };

    const getPlanIcon = (planId: string) => {
        if (planId.includes('agency')) {
            if (planId.includes('enterprise')) return Crown;
            if (planId.includes('pro')) return Building2;
            return Users;
        }
        if (planId === 'scale') return Rocket;
        if (planId === 'growth') return Zap;
        return Star;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neuro" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--os-bg)] text-[var(--os-text)] py-16 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-neuro" />
                        <span className="text-[10px] font-black text-neuro uppercase tracking-[0.3em]">
                            Choose Your Plan
                        </span>
                    </div>
                    <h1 className="text-5xl font-black uppercase tracking-tight mb-4">
                        Scale Your <span className="text-neuro">Business</span>
                    </h1>
                    <p className="text-[var(--os-text-muted)] max-w-2xl mx-auto">
                        AI-powered automation for modern businesses. Start free with our beta program.
                    </p>
                </div>

                {/* Beta Coupon Banner */}
                <div className="max-w-2xl mx-auto mb-10">
                    <div className="bg-gradient-to-r from-neuro/20 to-purple-500/20 border border-neuro/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-neuro/20 flex items-center justify-center">
                                    <Gift className="h-6 w-6 text-neuro" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Beta Program</h3>
                                    <p className="text-xs text-[var(--os-text-muted)]">
                                        Enter code <span className="font-mono font-bold text-neuro">LIV8BETA</span> for free access
                                    </p>
                                </div>
                            </div>
                            {!showCouponInput ? (
                                <button
                                    onClick={() => setShowCouponInput(true)}
                                    className="px-4 py-2 bg-neuro text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-105 transition-all"
                                >
                                    <Tag className="h-3.5 w-3.5 inline mr-2" />
                                    Apply Coupon
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="Enter code"
                                        className="w-32 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg px-3 py-2 text-xs font-mono uppercase focus:border-neuro outline-none"
                                    />
                                    <button
                                        onClick={validateCoupon}
                                        disabled={couponValidating || !couponCode.trim()}
                                        className="px-4 py-2 bg-neuro text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {couponValidating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Apply'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {couponStatus && (
                            <div className={`mt-4 flex items-center gap-2 text-sm ${couponStatus.valid ? 'text-emerald-500' : 'text-red-500'}`}>
                                {couponStatus.valid ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                {couponStatus.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Interval Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-1.5 flex">
                        <button
                            onClick={() => setInterval('monthly')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                interval === 'monthly'
                                    ? 'bg-neuro text-white'
                                    : 'text-[var(--os-text-muted)] hover:text-neuro'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setInterval('yearly')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                interval === 'yearly'
                                    ? 'bg-neuro text-white'
                                    : 'text-[var(--os-text-muted)] hover:text-neuro'
                            }`}
                        >
                            Yearly <span className="text-emerald-400 ml-1">Save 2 months</span>
                        </button>
                    </div>
                </div>

                {/* Individual Plans */}
                <div className="mb-16">
                    <h2 className="text-xl font-black uppercase text-center mb-8">
                        Individual Plans
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.individual.map((plan) => {
                            const Icon = getPlanIcon(plan.id);
                            const price = getPrice(plan);
                            const originalPrice = interval === 'yearly' ? plan.priceYearly : plan.priceMonthly;
                            const hasDiscount = price !== originalPrice;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative bg-[var(--os-surface)] border rounded-3xl p-8 transition-all hover:scale-[1.02] ${
                                        plan.popular
                                            ? 'border-neuro shadow-xl shadow-neuro/20'
                                            : 'border-[var(--os-border)]'
                                    }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-neuro text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                                            Most Popular
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                            plan.popular ? 'bg-neuro text-white' : 'bg-neuro/10 text-neuro'
                                        }`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{plan.name}</h3>
                                            <p className="text-[10px] text-[var(--os-text-muted)]">{plan.description}</p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        {hasDiscount && (
                                            <div className="text-sm text-[var(--os-text-muted)] line-through">
                                                ${originalPrice}/{interval === 'yearly' ? 'yr' : 'mo'}
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black">
                                                ${price === 0 ? 'Free' : price.toFixed(0)}
                                            </span>
                                            {price > 0 && (
                                                <span className="text-[var(--os-text-muted)] text-sm">
                                                    /{interval === 'yearly' ? 'yr' : 'mo'}
                                                </span>
                                            )}
                                        </div>
                                        {hasDiscount && couponStatus?.valid && (
                                            <div className="text-xs text-emerald-500 font-bold mt-1">
                                                Beta discount applied!
                                            </div>
                                        )}
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-center gap-2 text-sm">
                                                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleSelectPlan(plan.id)}
                                        disabled={processingPlan !== null}
                                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                            plan.popular
                                                ? 'bg-neuro text-white hover:scale-105'
                                                : 'bg-[var(--os-bg)] border border-[var(--os-border)] text-[var(--os-text)] hover:border-neuro hover:text-neuro'
                                        } disabled:opacity-50`}
                                    >
                                        {processingPlan === plan.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                Get Started <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Agency Plans */}
                {plans.agency.length > 0 && (
                    <div>
                        <h2 className="text-xl font-black uppercase text-center mb-8">
                            Agency Plans
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {plans.agency.map((plan) => {
                                const Icon = getPlanIcon(plan.id);
                                const price = getPrice(plan);
                                const originalPrice = interval === 'yearly' ? plan.priceYearly : plan.priceMonthly;
                                const hasDiscount = price !== originalPrice;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative bg-[var(--os-surface)] border rounded-3xl p-8 transition-all hover:scale-[1.02] ${
                                            plan.popular
                                                ? 'border-neuro shadow-xl shadow-neuro/20'
                                                : 'border-[var(--os-border)]'
                                        }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-neuro text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                                                Best Value
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                                plan.popular ? 'bg-neuro text-white' : 'bg-neuro/10 text-neuro'
                                            }`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{plan.name}</h3>
                                                <p className="text-[10px] text-[var(--os-text-muted)]">{plan.description}</p>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            {hasDiscount && (
                                                <div className="text-sm text-[var(--os-text-muted)] line-through">
                                                    ${originalPrice}/{interval === 'yearly' ? 'yr' : 'mo'}
                                                </div>
                                            )}
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black">
                                                    ${price === 0 ? 'Free' : price.toFixed(0)}
                                                </span>
                                                {price > 0 && (
                                                    <span className="text-[var(--os-text-muted)] text-sm">
                                                        /{interval === 'yearly' ? 'yr' : 'mo'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <ul className="space-y-3 mb-8">
                                            {plan.features.map((feature, index) => (
                                                <li key={index} className="flex items-center gap-2 text-sm">
                                                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleSelectPlan(plan.id)}
                                            disabled={processingPlan !== null}
                                            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                                plan.popular
                                                    ? 'bg-neuro text-white hover:scale-105'
                                                    : 'bg-[var(--os-bg)] border border-[var(--os-border)] text-[var(--os-text)] hover:border-neuro hover:text-neuro'
                                            } disabled:opacity-50`}
                                        >
                                            {processingPlan === plan.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    Get Started <ArrowRight className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* FAQ/Trust Section */}
                <div className="mt-20 text-center">
                    <p className="text-[var(--os-text-muted)] text-sm">
                        All plans include 14-day money-back guarantee • Cancel anytime • Enterprise? <a href="mailto:hello@liv8.co" className="text-neuro hover:underline">Contact us</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
