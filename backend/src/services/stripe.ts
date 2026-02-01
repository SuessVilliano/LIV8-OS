/**
 * Stripe Payment Integration
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * Handles subscriptions, payments, and billing for LIV8 OS
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// Pricing Plans
export const PRICING_PLANS = {
  // Individual Plans
  starter: {
    name: 'Starter',
    description: 'Perfect for solopreneurs getting started',
    priceMonthly: 97,
    priceYearly: 970, // ~2 months free
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
    features: [
      '1 AI Staff Member',
      '1,000 AI Credits/month',
      '5 Social Accounts',
      'Basic Analytics',
      'Email Support',
      'Content Studio'
    ],
    limits: {
      aiCredits: 1000,
      socialAccounts: 5,
      aiStaff: 1,
      scheduledPosts: 50,
      templates: 10
    }
  },
  growth: {
    name: 'Growth',
    description: 'For growing businesses scaling operations',
    priceMonthly: 197,
    priceYearly: 1970,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || 'price_growth_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_GROWTH_YEARLY || 'price_growth_yearly',
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
    limits: {
      aiCredits: 5000,
      socialAccounts: 15,
      aiStaff: 3,
      scheduledPosts: 200,
      templates: 50
    },
    popular: true
  },
  scale: {
    name: 'Scale',
    description: 'For established businesses and teams',
    priceMonthly: 497,
    priceYearly: 4970,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_SCALE_MONTHLY || 'price_scale_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_SCALE_YEARLY || 'price_scale_yearly',
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
    ],
    limits: {
      aiCredits: 25000,
      socialAccounts: -1, // unlimited
      aiStaff: -1,
      scheduledPosts: -1,
      templates: -1
    }
  },

  // Agency Plans (from whitelabel)
  agency_starter: {
    name: 'Agency Starter',
    description: 'Launch your agency with LIV8',
    priceMonthly: 297,
    priceYearly: 2970,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_AGENCY_STARTER_MONTHLY || 'price_agency_starter_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_AGENCY_STARTER_YEARLY || 'price_agency_starter_yearly',
    features: [
      'Up to 10 Client Accounts',
      'White-label Dashboard',
      'Custom Branding',
      'Client Management',
      'Revenue Sharing',
      'Agency Analytics'
    ],
    limits: {
      clients: 10,
      whitelabel: true
    }
  },
  agency_pro: {
    name: 'Agency Pro',
    description: 'Scale your agency operations',
    priceMonthly: 597,
    priceYearly: 5970,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_AGENCY_PRO_MONTHLY || 'price_agency_pro_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_AGENCY_PRO_YEARLY || 'price_agency_pro_yearly',
    features: [
      'Up to 50 Client Accounts',
      'Custom Domain Support',
      'Advanced White-labeling',
      'Priority Support',
      'Team Management',
      'API Access'
    ],
    limits: {
      clients: 50,
      whitelabel: true,
      customDomain: true
    },
    popular: true
  },
  agency_enterprise: {
    name: 'Agency Enterprise',
    description: 'Unlimited agency growth',
    priceMonthly: 1497,
    priceYearly: 14970,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_AGENCY_ENTERPRISE_MONTHLY || 'price_agency_enterprise_monthly',
    stripePriceIdYearly: process.env.STRIPE_PRICE_AGENCY_ENTERPRISE_YEARLY || 'price_agency_enterprise_yearly',
    features: [
      'Unlimited Client Accounts',
      'Multiple Custom Domains',
      'Dedicated Infrastructure',
      'SLA Guarantee',
      'Custom Development',
      'White-glove Onboarding'
    ],
    limits: {
      clients: -1,
      whitelabel: true,
      customDomain: true,
      dedicatedSupport: true
    }
  }
};

export type PlanId = keyof typeof PRICING_PLANS;

interface CustomerData {
  locationId: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

interface SubscriptionResult {
  subscriptionId: string;
  clientSecret?: string;
  status: string;
  currentPeriodEnd: Date;
}

export class StripeService {
  /**
   * Create or get a Stripe customer
   */
  async getOrCreateCustomer(data: CustomerData): Promise<string> {
    // Check if customer exists
    const existingCustomers = await stripe.customers.list({
      email: data.email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      // Update metadata if needed
      const customer = existingCustomers.data[0];
      if (data.locationId && customer.metadata?.locationId !== data.locationId) {
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            locationId: data.locationId
          }
        });
      }
      return customer.id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        locationId: data.locationId,
        ...data.metadata
      }
    });

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    planId: PlanId,
    interval: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const plan = PRICING_PLANS[planId];
    if (!plan) throw new Error('Invalid plan');

    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          planId
        }
      }
    });

    return session.url || '';
  }

  /**
   * Create a subscription directly (for API-based flow)
   */
  async createSubscription(
    customerId: string,
    planId: PlanId,
    interval: 'monthly' | 'yearly',
    paymentMethodId?: string
  ): Promise<SubscriptionResult> {
    const plan = PRICING_PLANS[planId];
    if (!plan) throw new Error('Invalid plan');

    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        planId
      }
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || undefined,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    };
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Get customer subscriptions
   */
  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method']
    });

    return subscriptions.data;
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    subscriptionId: string,
    newPlanId: PlanId,
    interval: 'monthly' | 'yearly'
  ): Promise<Stripe.Subscription> {
    const plan = PRICING_PLANS[newPlanId];
    if (!plan) throw new Error('Invalid plan');

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

    return stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId
        }
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        planId: newPlanId
      }
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
    if (immediately) {
      return stripe.subscriptions.cancel(subscriptionId);
    }

    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
  }

  /**
   * Resume cancelled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return session.url;
  }

  /**
   * Get invoices
   */
  async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit
    });

    return invoices.data;
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
    try {
      return await stripe.invoices.retrieveUpcoming({ customer: customerId });
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a one-time payment (for add-ons, credits, etc.)
   */
  async createPaymentIntent(
    customerId: string,
    amount: number,
    currency: string = 'usd',
    description?: string
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const paymentIntent = await stripe.paymentIntents.create({
      customer: customerId,
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      automatic_payment_methods: { enabled: true }
    });

    return {
      clientSecret: paymentIntent.client_secret || '',
      paymentIntentId: paymentIntent.id
    };
  }

  /**
   * Add AI credits to account
   */
  async purchaseCredits(
    customerId: string,
    creditAmount: number,
    price: number
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    return this.createPaymentIntent(
      customerId,
      price,
      'usd',
      `LIV8 OS - ${creditAmount} AI Credits`
    );
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload: string, signature: string): Promise<{ event: string; data: any }> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          event: 'subscription_created',
          data: {
            customerId: session.customer,
            subscriptionId: session.subscription,
            email: session.customer_email
          }
        };
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        return {
          event: 'payment_succeeded',
          data: {
            customerId: invoice.customer,
            subscriptionId: invoice.subscription,
            amount: invoice.amount_paid / 100,
            invoiceId: invoice.id
          }
        };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        return {
          event: 'payment_failed',
          data: {
            customerId: invoice.customer,
            subscriptionId: invoice.subscription,
            invoiceId: invoice.id
          }
        };
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        return {
          event: 'subscription_updated',
          data: {
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            status: subscription.status,
            planId: subscription.metadata.planId,
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          }
        };
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        return {
          event: 'subscription_cancelled',
          data: {
            customerId: subscription.customer,
            subscriptionId: subscription.id
          }
        };
      }

      default:
        return { event: event.type, data: event.data.object };
    }
  }

  /**
   * Get plan details with current pricing
   */
  getPlanDetails(planId: PlanId) {
    return PRICING_PLANS[planId];
  }

  /**
   * Get all plans
   */
  getAllPlans() {
    return PRICING_PLANS;
  }

  /**
   * Create a coupon in Stripe
   */
  async createCoupon(params: {
    code: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number;
    maxRedemptions?: number;
    expiresAt?: Date;
  }): Promise<{ coupon: Stripe.Coupon; promotionCode: Stripe.PromotionCode }> {
    // Create the coupon
    const couponParams: Stripe.CouponCreateParams = {
      duration: params.duration,
    };

    if (params.percentOff) {
      couponParams.percent_off = params.percentOff;
    } else if (params.amountOff) {
      couponParams.amount_off = params.amountOff;
      couponParams.currency = params.currency || 'usd';
    }

    if (params.duration === 'repeating' && params.durationInMonths) {
      couponParams.duration_in_months = params.durationInMonths;
    }

    if (params.maxRedemptions) {
      couponParams.max_redemptions = params.maxRedemptions;
    }

    const coupon = await stripe.coupons.create(couponParams);

    // Create a promotion code for the coupon (user-facing code)
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: params.code.toUpperCase(),
      max_redemptions: params.maxRedemptions,
      expires_at: params.expiresAt ? Math.floor(params.expiresAt.getTime() / 1000) : undefined,
    });

    return { coupon, promotionCode };
  }

  /**
   * Validate a promotion code
   */
  async validatePromotionCode(code: string): Promise<{
    valid: boolean;
    discount?: { percentOff?: number; amountOff?: number; currency?: string };
    promotionCode?: Stripe.PromotionCode;
  }> {
    try {
      const promotionCodes = await stripe.promotionCodes.list({
        code: code.toUpperCase(),
        active: true,
        limit: 1,
      });

      if (promotionCodes.data.length === 0) {
        return { valid: false };
      }

      const promoCode = promotionCodes.data[0];
      const coupon = promoCode.coupon;

      // Check if coupon is still valid
      if (!coupon.valid) {
        return { valid: false };
      }

      return {
        valid: true,
        discount: {
          percentOff: coupon.percent_off || undefined,
          amountOff: coupon.amount_off || undefined,
          currency: coupon.currency || undefined,
        },
        promotionCode: promoCode,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Apply a promotion code to a checkout session
   */
  async createCheckoutSessionWithCoupon(
    customerId: string,
    planId: PlanId,
    interval: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string,
    promotionCode?: string
  ): Promise<string> {
    const plan = PRICING_PLANS[planId];
    if (!plan) throw new Error('Invalid plan');

    const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          planId
        }
      }
    };

    // If a specific promotion code is provided, use it; otherwise allow user to enter any
    if (promotionCode) {
      const validation = await this.validatePromotionCode(promotionCode);
      if (validation.valid && validation.promotionCode) {
        sessionParams.discounts = [{ promotion_code: validation.promotionCode.id }];
      }
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return session.url || '';
  }

  /**
   * List all promotion codes
   */
  async listPromotionCodes(limit: number = 25): Promise<Stripe.PromotionCode[]> {
    const codes = await stripe.promotionCodes.list({
      limit,
      active: true,
    });
    return codes.data;
  }

  /**
   * Deactivate a promotion code
   */
  async deactivatePromotionCode(promotionCodeId: string): Promise<Stripe.PromotionCode> {
    return stripe.promotionCodes.update(promotionCodeId, { active: false });
  }
}

export const stripeService = new StripeService();
export default stripeService;
