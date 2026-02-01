/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse with configurable limits
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (for production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

interface RateLimitOptions {
  windowMs?: number;      // Time window in milliseconds
  maxRequests?: number;   // Max requests per window
  keyGenerator?: (req: any) => string;  // Custom key generator
  skipFailedRequests?: boolean;
  message?: string;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000,           // 1 minute default
    maxRequests = 100,          // 100 requests per minute default
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    skipFailedRequests = false,
    message = 'Too many requests, please try again later'
  } = options;

  return (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
      return;
    }

    // If skipFailedRequests is true, decrement count on error
    if (skipFailedRequests) {
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          const storedEntry = rateLimitStore.get(key);
          if (storedEntry) {
            storedEntry.count = Math.max(0, storedEntry.count - 1);
          }
        }
      });
    }

    next();
  };
}

// Preset configurations for different use cases
export const rateLimitPresets = {
  // Strict limit for auth endpoints (prevent brute force)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,           // 10 attempts per 15 min
    message: 'Too many login attempts, please try again in 15 minutes'
  }),

  // Standard API limit
  api: rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,          // 100 requests per minute
    message: 'API rate limit exceeded'
  }),

  // AI endpoints (expensive operations)
  ai: rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 20,           // 20 AI requests per minute
    message: 'AI request limit exceeded, please wait'
  }),

  // Webhooks (more lenient)
  webhook: rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 500,          // 500 webhook calls per minute
    message: 'Webhook rate limit exceeded'
  })
};
