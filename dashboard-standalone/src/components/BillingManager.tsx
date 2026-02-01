/**
 * Billing Manager Component
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * Manage subscriptions, view invoices, and upgrade plans
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Building2,
  Star,
  ArrowRight,
  FileText,
  Download,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  popular?: boolean;
  limits: Record<string, number | boolean>;
}

interface Subscription {
  id: string;
  status: string;
  planId: string;
  plan: Plan;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  date: string;
  pdfUrl: string;
  hostedUrl: string;
}

export default function BillingManager() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<{ individual: Plan[]; agency: Plan[] }>({ individual: [], agency: [] });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState<'plans' | 'subscription' | 'invoices'>('plans');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const customerId = localStorage.getItem('stripe_customer_id');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPlans(),
      fetchSubscription(),
      fetchInvoices()
    ]);
    setLoading(false);
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/billing/plans`);
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      // Demo plans
      setPlans({
        individual: [
          {
            id: 'starter',
            name: 'Starter',
            description: 'Perfect for solopreneurs getting started',
            priceMonthly: 97,
            priceYearly: 970,
            features: ['1 AI Staff Member', '1,000 AI Credits/month', '5 Social Accounts', 'Basic Analytics', 'Email Support'],
            limits: { aiCredits: 1000, socialAccounts: 5, aiStaff: 1 }
          },
          {
            id: 'growth',
            name: 'Growth',
            description: 'For growing businesses scaling operations',
            priceMonthly: 197,
            priceYearly: 1970,
            features: ['3 AI Staff Members', '5,000 AI Credits/month', '15 Social Accounts', 'Advanced Analytics', 'Priority Support', 'Voice Commands'],
            popular: true,
            limits: { aiCredits: 5000, socialAccounts: 15, aiStaff: 3 }
          },
          {
            id: 'scale',
            name: 'Scale',
            description: 'For established businesses and teams',
            priceMonthly: 497,
            priceYearly: 4970,
            features: ['Unlimited AI Staff', '25,000 AI Credits/month', 'Unlimited Social Accounts', 'Full Analytics Suite', 'API Access', 'Custom Integrations'],
            limits: { aiCredits: 25000, socialAccounts: -1, aiStaff: -1 }
          }
        ],
        agency: [
          {
            id: 'agency_starter',
            name: 'Agency Starter',
            description: 'Launch your agency with LIV8',
            priceMonthly: 297,
            priceYearly: 2970,
            features: ['Up to 10 Client Accounts', 'White-label Dashboard', 'Custom Branding', 'Client Management'],
            limits: { clients: 10, whitelabel: true }
          },
          {
            id: 'agency_pro',
            name: 'Agency Pro',
            description: 'Scale your agency operations',
            priceMonthly: 597,
            priceYearly: 5970,
            features: ['Up to 50 Client Accounts', 'Custom Domain Support', 'Advanced White-labeling', 'Priority Support'],
            popular: true,
            limits: { clients: 50, whitelabel: true, customDomain: true }
          },
          {
            id: 'agency_enterprise',
            name: 'Agency Enterprise',
            description: 'Unlimited agency growth',
            priceMonthly: 1497,
            priceYearly: 14970,
            features: ['Unlimited Client Accounts', 'Multiple Custom Domains', 'Dedicated Infrastructure', 'SLA Guarantee'],
            limits: { clients: -1, whitelabel: true, customDomain: true }
          }
        ]
      });
    }
  };

  const fetchSubscription = async () => {
    if (!customerId) return;

    try {
      const response = await fetch(`${API_BASE}/api/billing/subscription`, {
        headers: { 'x-stripe-customer-id': customerId }
      });
      const data = await response.json();
      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const fetchInvoices = async () => {
    if (!customerId) return;

    try {
      const response = await fetch(`${API_BASE}/api/billing/invoices`, {
        headers: { 'x-stripe-customer-id': customerId }
      });
      const data = await response.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      // Demo invoices
      setInvoices([
        { id: 'inv_1', number: 'INV-2026-001', amount: 197, status: 'paid', date: '2026-01-01', pdfUrl: '#', hostedUrl: '#' },
        { id: 'inv_2', number: 'INV-2025-012', amount: 197, status: 'paid', date: '2025-12-01', pdfUrl: '#', hostedUrl: '#' }
      ]);
    }
  };

  const selectPlan = async (planId: string) => {
    setProcessingPlan(planId);

    try {
      const email = localStorage.getItem('user_email') || 'user@example.com';
      const locationId = localStorage.getItem('os_loc_id') || 'demo';

      const response = await fetch(`${API_BASE}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          planId,
          interval: billingInterval,
          locationId
        })
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        // Store customer ID for later
        if (data.customerId) {
          localStorage.setItem('stripe_customer_id', data.customerId);
        }
        window.location.href = data.checkoutUrl;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout');
    }

    setProcessingPlan(null);
  };

  const openBillingPortal = async () => {
    if (!customerId) {
      alert('No billing account found');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId })
      });

      const data = await response.json();

      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (error) {
      console.error('Portal error:', error);
    }
  };

  const cancelSubscription = async () => {
    if (!subscription || !confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      await fetch(`${API_BASE}/api/billing/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id })
      });

      fetchSubscription();
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Billing & Plans</h2>
          <p className="text-gray-500">Manage your subscription and billing</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Current Subscription Banner */}
      {subscription && (
        <div className="p-6 bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-violet-400 font-medium">Current Plan</span>
              </div>
              <h3 className="text-xl font-bold text-white">{subscription.plan.name}</h3>
              <p className="text-gray-400 text-sm">
                {subscription.cancelAtPeriodEnd
                  ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={openBillingPortal}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Manage Billing
              </button>
              {!subscription.cancelAtPeriodEnd && (
                <button
                  onClick={cancelSubscription}
                  className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {[
          { id: 'plans', label: 'Plans', icon: Zap },
          { id: 'subscription', label: 'Subscription', icon: Star },
          { id: 'invoices', label: 'Invoices', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* Billing Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 p-1 bg-gray-800/50 rounded-xl">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingInterval === 'yearly'
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Individual Plans */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-400" />
              Individual Plans
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.individual.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  interval={billingInterval}
                  isCurrentPlan={subscription?.planId === plan.id}
                  processing={processingPlan === plan.id}
                  onSelect={() => selectPlan(plan.id)}
                />
              ))}
            </div>
          </div>

          {/* Agency Plans */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Agency Plans
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.agency.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  interval={billingInterval}
                  isCurrentPlan={subscription?.planId === plan.id}
                  processing={processingPlan === plan.id}
                  onSelect={() => selectPlan(plan.id)}
                  isAgency
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {subscription ? (
            <>
              <div className="p-6 bg-gray-900/50 border border-gray-800/50 rounded-2xl">
                <h3 className="font-semibold text-white mb-4">Plan Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Plan</div>
                    <div className="font-medium text-white">{subscription.plan.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Status</div>
                    <div className={`font-medium ${
                      subscription.status === 'active' ? 'text-green-400' : 'text-amber-400'
                    }`}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Next Billing</div>
                    <div className="font-medium text-white">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Amount</div>
                    <div className="font-medium text-white">
                      ${subscription.plan.priceMonthly}/mo
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-900/50 border border-gray-800/50 rounded-2xl">
                <h3 className="font-semibold text-white mb-4">Plan Limits</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(subscription.plan.limits).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-sm text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="font-medium text-white">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value === -1 ? 'Unlimited' : value.toLocaleString())}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-gray-900/50 border border-gray-800/50 rounded-2xl">
                <h3 className="font-semibold text-white mb-4">Included Features</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {subscription.plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="p-8 bg-gray-800/30 border border-gray-700/30 rounded-2xl text-center">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Active Subscription</h3>
              <p className="text-gray-500 text-sm mb-4">
                Choose a plan to get started with LIV8 OS
              </p>
              <button
                onClick={() => setActiveTab('plans')}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors"
              >
                View Plans
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="p-8 bg-gray-800/30 border border-gray-700/30 rounded-2xl text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Invoices Yet</h3>
              <p className="text-gray-500 text-sm">
                Your invoices will appear here after your first payment
              </p>
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Invoice</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="border-b border-gray-800/50">
                      <td className="p-4 text-white font-medium">{invoice.number}</td>
                      <td className="p-4 text-gray-400">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-white">${invoice.amount.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'paid'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 text-gray-400" />
                          </a>
                          <a
                            href={invoice.hostedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            title="View Invoice"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Plan Card Component
function PlanCard({
  plan,
  interval,
  isCurrentPlan,
  processing,
  onSelect,
  isAgency
}: {
  plan: Plan;
  interval: 'monthly' | 'yearly';
  isCurrentPlan: boolean;
  processing: boolean;
  onSelect: () => void;
  isAgency?: boolean;
}) {
  const price = interval === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const monthlyPrice = interval === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

  return (
    <div
      className={`relative p-6 rounded-2xl border transition-all ${
        plan.popular
          ? 'bg-gradient-to-b from-violet-600/10 to-purple-600/10 border-violet-500/50'
          : 'bg-gray-900/50 border-gray-800/50 hover:border-gray-700/50'
      } ${isCurrentPlan ? 'ring-2 ring-violet-500' : ''}`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 text-white text-xs font-medium rounded-full">
          Most Popular
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
          Current Plan
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="text-sm text-gray-500">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white">${monthlyPrice}</span>
        <span className="text-gray-500">/month</span>
        {interval === 'yearly' && (
          <div className="text-sm text-green-400 mt-1">
            ${price}/year (Save ${plan.priceMonthly * 12 - plan.priceYearly})
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className={`w-4 h-4 mt-0.5 ${isAgency ? 'text-amber-400' : 'text-violet-400'}`} />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrentPlan || processing}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
          isCurrentPlan
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : plan.popular
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'bg-gray-800 text-white hover:bg-gray-700'
        }`}
      >
        {processing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : (
          <>
            Get Started
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
