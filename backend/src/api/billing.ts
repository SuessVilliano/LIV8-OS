/**
 * Billing API Routes
 *
 * Handles subscriptions, payments, and billing management
 */

import { Router, Request, Response } from 'express';
import { stripeService, PRICING_PLANS, PlanId } from '../services/stripe.js';

const router = Router();

/**
 * Get all pricing plans
 */
router.get('/plans', (req: Request, res: Response) => {
  try {
    const plans = Object.entries(PRICING_PLANS).map(([id, plan]) => ({
      id,
      ...plan
    }));

    // Separate individual and agency plans
    const individualPlans = plans.filter(p => !p.id.startsWith('agency_'));
    const agencyPlans = plans.filter(p => p.id.startsWith('agency_'));

    res.json({
      success: true,
      plans: {
        individual: individualPlans,
        agency: agencyPlans
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current subscription
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const customerId = req.headers['x-stripe-customer-id'] as string;

    if (!customerId) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No subscription found'
      });
    }

    const subscriptions = await stripeService.getCustomerSubscriptions(customerId);
    const activeSubscription = subscriptions.find(s =>
      s.status === 'active' || s.status === 'trialing'
    );

    if (!activeSubscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription'
      });
    }

    const planId = activeSubscription.metadata.planId as PlanId;
    const plan = PRICING_PLANS[planId];

    res.json({
      success: true,
      subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        planId,
        plan,
        currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create checkout session for new subscription
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { email, planId, interval = 'monthly', locationId, affiliateId } = req.body;

    if (!email || !planId) {
      return res.status(400).json({ error: 'Email and planId required' });
    }

    if (!PRICING_PLANS[planId as PlanId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Get or create customer
    const customerId = await stripeService.getOrCreateCustomer({
      email,
      locationId: locationId || 'unknown'
    });

    // Create checkout session with optional affiliate tracking
    const baseUrl = process.env.APP_URL || 'https://os.liv8ai.com';
    const checkoutUrl = await stripeService.createCheckoutSession(
      customerId,
      planId as PlanId,
      interval as 'monthly' | 'yearly',
      `${baseUrl}/settings/billing?success=true`,
      `${baseUrl}/settings/billing?cancelled=true`,
      affiliateId // PushLap Growth affiliate ID
    );

    res.json({
      success: true,
      checkoutUrl,
      customerId
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create subscription directly (for card-on-file)
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { customerId, planId, interval = 'monthly', paymentMethodId } = req.body;

    if (!customerId || !planId) {
      return res.status(400).json({ error: 'customerId and planId required' });
    }

    const result = await stripeService.createSubscription(
      customerId,
      planId as PlanId,
      interval as 'monthly' | 'yearly',
      paymentMethodId
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update subscription plan
 */
router.put('/subscription', async (req: Request, res: Response) => {
  try {
    const { subscriptionId, newPlanId, interval = 'monthly' } = req.body;

    if (!subscriptionId || !newPlanId) {
      return res.status(400).json({ error: 'subscriptionId and newPlanId required' });
    }

    const subscription = await stripeService.updateSubscription(
      subscriptionId,
      newPlanId as PlanId,
      interval as 'monthly' | 'yearly'
    );

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planId: newPlanId
      }
    });
  } catch (error: any) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel subscription
 */
router.post('/subscription/cancel', async (req: Request, res: Response) => {
  try {
    const { subscriptionId, immediately = false } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId required' });
    }

    const subscription = await stripeService.cancelSubscription(subscriptionId, immediately);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resume cancelled subscription
 */
router.post('/subscription/resume', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId required' });
    }

    const subscription = await stripeService.resumeSubscription(subscriptionId);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });
  } catch (error: any) {
    console.error('Resume subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get customer portal URL
 */
router.post('/portal', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId required' });
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const portalUrl = await stripeService.createPortalSession(
      customerId,
      `${baseUrl}/settings/billing`
    );

    res.json({
      success: true,
      portalUrl
    });
  } catch (error: any) {
    console.error('Portal error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get invoices
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const customerId = req.headers['x-stripe-customer-id'] as string;

    if (!customerId) {
      return res.json({ success: true, invoices: [] });
    }

    const invoices = await stripeService.getInvoices(customerId);

    res.json({
      success: true,
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        amount: (inv.amount_paid || 0) / 100,
        status: inv.status,
        date: new Date((inv.created || 0) * 1000),
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get upcoming invoice
 */
router.get('/upcoming-invoice', async (req: Request, res: Response) => {
  try {
    const customerId = req.headers['x-stripe-customer-id'] as string;

    if (!customerId) {
      return res.json({ success: true, invoice: null });
    }

    const invoice = await stripeService.getUpcomingInvoice(customerId);

    if (!invoice) {
      return res.json({ success: true, invoice: null });
    }

    res.json({
      success: true,
      invoice: {
        amount: (invoice.amount_due || 0) / 100,
        date: new Date((invoice.next_payment_attempt || 0) * 1000),
        items: invoice.lines.data.map(line => ({
          description: line.description,
          amount: (line.amount || 0) / 100
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Purchase AI credits
 */
router.post('/purchase-credits', async (req: Request, res: Response) => {
  try {
    const { customerId, creditAmount } = req.body;

    if (!customerId || !creditAmount) {
      return res.status(400).json({ error: 'customerId and creditAmount required' });
    }

    // Credit pricing: $10 per 1000 credits
    const price = (creditAmount / 1000) * 10;

    const result = await stripeService.purchaseCredits(customerId, creditAmount, price);

    res.json({
      success: true,
      ...result,
      amount: price
    });
  } catch (error: any) {
    console.error('Purchase credits error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Validate a coupon/promotion code
 */
router.post('/validate-coupon', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code required' });
    }

    const result = await stripeService.validatePromotionCode(code);

    if (!result.valid) {
      return res.json({
        success: false,
        valid: false,
        message: 'Invalid or expired coupon code'
      });
    }

    res.json({
      success: true,
      valid: true,
      discount: result.discount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create checkout session with coupon
 */
router.post('/checkout-with-coupon', async (req: Request, res: Response) => {
  try {
    const { email, planId, interval = 'monthly', locationId, couponCode, affiliateId } = req.body;

    if (!email || !planId) {
      return res.status(400).json({ error: 'Email and planId required' });
    }

    if (!PRICING_PLANS[planId as PlanId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Get or create customer
    const customerId = await stripeService.getOrCreateCustomer({
      email,
      locationId: locationId || 'unknown'
    });

    // Create checkout session with coupon and optional affiliate tracking
    const baseUrl = process.env.APP_URL || 'https://os.liv8ai.com';
    const checkoutUrl = await stripeService.createCheckoutSessionWithCoupon(
      customerId,
      planId as PlanId,
      interval as 'monthly' | 'yearly',
      `${baseUrl}/settings/billing?success=true`,
      `${baseUrl}/settings/billing?cancelled=true`,
      couponCode,
      affiliateId // PushLap Growth affiliate ID
    );

    res.json({
      success: true,
      checkoutUrl,
      customerId
    });
  } catch (error: any) {
    console.error('Checkout with coupon error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new coupon (admin only)
 */
router.post('/coupons', async (req: Request, res: Response) => {
  try {
    // Verify admin password
    const adminPassword = req.headers['x-admin-password'] || req.body.adminPassword;
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      code,
      percentOff,
      amountOff,
      currency = 'usd',
      duration = 'once',
      durationInMonths,
      maxRedemptions,
      expiresAt
    } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code required' });
    }

    if (!percentOff && !amountOff) {
      return res.status(400).json({ error: 'Either percentOff or amountOff required' });
    }

    const result = await stripeService.createCoupon({
      code,
      percentOff,
      amountOff,
      currency,
      duration,
      durationInMonths,
      maxRedemptions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    res.json({
      success: true,
      coupon: {
        id: result.coupon.id,
        code: result.promotionCode.code,
        percentOff: result.coupon.percent_off,
        amountOff: result.coupon.amount_off,
        duration: result.coupon.duration,
        promotionCodeId: result.promotionCode.id
      }
    });
  } catch (error: any) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all coupons (admin only)
 */
router.get('/coupons', async (req: Request, res: Response) => {
  try {
    // Verify admin password
    const adminPassword = req.headers['x-admin-password'] as string;
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const promotionCodes = await stripeService.listPromotionCodes();

    res.json({
      success: true,
      coupons: promotionCodes.map(pc => ({
        id: pc.id,
        code: pc.code,
        active: pc.active,
        percentOff: pc.coupon.percent_off,
        amountOff: pc.coupon.amount_off,
        timesRedeemed: pc.times_redeemed,
        maxRedemptions: pc.max_redemptions,
        expiresAt: pc.expires_at ? new Date(pc.expires_at * 1000) : null
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Deactivate a coupon (admin only)
 */
router.delete('/coupons/:promotionCodeId', async (req: Request, res: Response) => {
  try {
    // Verify admin password
    const adminPassword = req.headers['x-admin-password'] as string;
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { promotionCodeId } = req.params;

    await stripeService.deactivatePromotionCode(promotionCodeId);

    res.json({
      success: true,
      message: 'Coupon deactivated'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Idempotency: Track processed Stripe event IDs to prevent duplicate processing.
 * In production with multiple instances, replace with a database table (stripe_events).
 */
const processedStripeEvents = new Map<string, number>(); // eventId -> timestamp
const STRIPE_EVENT_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup old events every hour
setInterval(() => {
  const cutoff = Date.now() - STRIPE_EVENT_TTL;
  for (const [id, ts] of processedStripeEvents) {
    if (ts < cutoff) processedStripeEvents.delete(id);
  }
}, 60 * 60 * 1000);

/**
 * Grace period tracking for failed payments.
 * Maps customerId -> { failedAt, notified, graceEndsAt }
 */
const paymentGracePeriods = new Map<string, {
  failedAt: Date;
  notified: boolean;
  graceEndsAt: Date;
  subscriptionId: string;
}>();
const GRACE_PERIOD_DAYS = 7;

/**
 * Stripe webhook handler (idempotent)
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Need raw body for signature verification
    const payload = JSON.stringify(req.body);
    const result = await stripeService.handleWebhook(payload, signature);

    // Idempotency check: skip if already processed
    const eventId = req.body?.id;
    if (eventId && processedStripeEvents.has(eventId)) {
      console.log(`[Billing] Duplicate webhook event ${eventId}, skipping`);
      return res.json({ received: true, duplicate: true });
    }

    console.log(`[Billing] Processing webhook: ${result.event}`, result.data);

    // Handle specific events
    switch (result.event) {
      case 'subscription_created': {
        // Update user's subscription status in database
        console.log('[Billing] New subscription created:', result.data);
        // TODO: db.updateUserSubscription(result.data.customerId, { status: 'active', subscriptionId: result.data.subscriptionId })
        // Clear any grace period
        if (result.data.customerId) {
          paymentGracePeriods.delete(result.data.customerId as string);
        }
        break;
      }

      case 'payment_succeeded': {
        // Record payment, clear grace period if active
        console.log('[Billing] Payment succeeded:', result.data);
        if (result.data.customerId) {
          const gracePeriod = paymentGracePeriods.get(result.data.customerId as string);
          if (gracePeriod) {
            console.log(`[Billing] Payment recovered for customer ${result.data.customerId}, clearing grace period`);
            paymentGracePeriods.delete(result.data.customerId as string);
            // TODO: db.updateUserSubscription(result.data.customerId, { status: 'active', pastDue: false })
          }
        }
        break;
      }

      case 'payment_failed': {
        // Start grace period instead of immediate lockout
        console.log('[Billing] Payment failed:', result.data);
        const customerId = result.data.customerId as string;
        if (customerId && !paymentGracePeriods.has(customerId)) {
          const now = new Date();
          const graceEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
          paymentGracePeriods.set(customerId, {
            failedAt: now,
            notified: false,
            graceEndsAt: graceEnd,
            subscriptionId: result.data.subscriptionId as string
          });
          console.log(`[Billing] Grace period started for ${customerId}, expires ${graceEnd.toISOString()}`);
          // TODO: Send email notification about failed payment
          // TODO: db.updateUserSubscription(customerId, { status: 'past_due', graceEndsAt: graceEnd })
        }
        break;
      }

      case 'subscription_updated': {
        console.log('[Billing] Subscription updated:', result.data);
        // TODO: db.updateUserSubscription(result.data.customerId, { planId: result.data.planId, status: result.data.status })
        break;
      }

      case 'subscription_cancelled': {
        // Disable premium features but don't delete data
        console.log('[Billing] Subscription cancelled:', result.data);
        // TODO: db.updateUserSubscription(result.data.customerId, { status: 'cancelled', features: 'free_tier' })
        if (result.data.customerId) {
          paymentGracePeriods.delete(result.data.customerId as string);
        }
        break;
      }
    }

    // Mark event as processed (idempotency)
    if (eventId) {
      processedStripeEvents.set(eventId, Date.now());
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Billing] Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
