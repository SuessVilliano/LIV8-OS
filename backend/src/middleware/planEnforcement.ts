/**
 * Plan Enforcement Middleware
 * Checks user's subscription plan limits before allowing actions.
 *
 * Usage:
 *   router.post('/generate-image', authenticate, enforcePlanLimit('aiCredits'), handler);
 */

import { Request, Response, NextFunction } from 'express';

// Plan limits definition (mirrors stripe.ts PRICING_PLANS)
interface PlanLimits {
  aiCredits: number;
  socialAccounts: number;
  aiStaff: number;
  scheduledPosts: number;
  templates: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: { aiCredits: 1000, socialAccounts: 5, aiStaff: 1, scheduledPosts: 50, templates: 10 },
  growth: { aiCredits: 5000, socialAccounts: 15, aiStaff: 3, scheduledPosts: 200, templates: 50 },
  scale: { aiCredits: 25000, socialAccounts: -1, aiStaff: -1, scheduledPosts: -1, templates: -1 },
  agency_starter: { aiCredits: 10000, socialAccounts: 50, aiStaff: 10, scheduledPosts: 500, templates: -1 },
  agency_pro: { aiCredits: 50000, socialAccounts: -1, aiStaff: -1, scheduledPosts: -1, templates: -1 },
  agency_enterprise: { aiCredits: -1, socialAccounts: -1, aiStaff: -1, scheduledPosts: -1, templates: -1 },
  free: { aiCredits: 50, socialAccounts: 1, aiStaff: 0, scheduledPosts: 5, templates: 3 },
  super_admin: { aiCredits: -1, socialAccounts: -1, aiStaff: -1, scheduledPosts: -1, templates: -1 },
};

// In-memory usage tracking (replace with DB in production)
const usageCounters = new Map<string, Record<string, number>>();

function getUsage(userId: string): Record<string, number> {
  if (!usageCounters.has(userId)) {
    usageCounters.set(userId, { aiCredits: 0, socialAccounts: 0, aiStaff: 0, scheduledPosts: 0, templates: 0 });
  }
  return usageCounters.get(userId)!;
}

/**
 * Get the plan limits for a user based on their role/plan.
 * In production, this should query the database for the user's active subscription.
 */
function getUserPlanLimits(req: Request): PlanLimits {
  const user = (req as any).user;
  if (!user) return PLAN_LIMITS.free;

  // Super admins bypass all limits
  if (user.role === 'super_admin') return PLAN_LIMITS.super_admin;

  // TODO: In production, look up user's active subscription plan from DB
  // For now, use the plan from JWT metadata or default to free
  const planId = user.planId || 'free';
  return PLAN_LIMITS[planId] || PLAN_LIMITS.free;
}

/**
 * Middleware factory: enforces a specific plan limit.
 * -1 means unlimited.
 */
export function enforcePlanLimit(limitKey: keyof PlanLimits, incrementBy = 1) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limits = getUserPlanLimits(req);
    const limit = limits[limitKey];

    // -1 means unlimited
    if (limit === -1) {
      return next();
    }

    const usage = getUsage(user.userId);
    const currentUsage = usage[limitKey] || 0;

    if (currentUsage + incrementBy > limit) {
      return res.status(429).json({
        error: 'Plan limit reached',
        limit: limitKey,
        current: currentUsage,
        maximum: limit,
        message: `You've reached your ${limitKey} limit (${currentUsage}/${limit}). Upgrade your plan for more.`,
        upgradeUrl: '/pricing'
      });
    }

    // Increment usage after successful processing
    // Attach a helper to the request so the route handler can call it after success
    (req as any).incrementUsage = () => {
      usage[limitKey] = (usage[limitKey] || 0) + incrementBy;
    };

    next();
  };
}

/**
 * Check if a user's plan supports a specific feature.
 */
export function requirePlanFeature(feature: keyof PlanLimits) {
  return (req: Request, res: Response, next: NextFunction) => {
    const limits = getUserPlanLimits(req);
    const limit = limits[feature];

    if (limit === 0) {
      return res.status(403).json({
        error: 'Feature not available',
        feature,
        message: `This feature is not included in your current plan. Upgrade to access ${feature}.`,
        upgradeUrl: '/pricing'
      });
    }

    next();
  };
}

// Reset usage counters monthly (simplified - in production use DB + cron)
setInterval(() => {
  const now = new Date();
  if (now.getDate() === 1 && now.getHours() === 0) {
    console.log('[PlanEnforcement] Monthly usage reset');
    usageCounters.clear();
  }
}, 60 * 60 * 1000); // Check every hour

export { PLAN_LIMITS, getUsage };
