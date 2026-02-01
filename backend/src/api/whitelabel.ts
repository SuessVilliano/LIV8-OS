/**
 * Whitelabel API
 * Endpoints for agency whitelabel management
 */

import { Router, Request, Response } from 'express';
import { whitelabelService, WHITELABEL_TIERS, SUGGESTED_CLIENT_PRICING } from '../services/whitelabel.js';

const router = Router();

/**
 * GET /api/whitelabel/tiers
 * Get available whitelabel pricing tiers
 */
router.get('/tiers', (req: Request, res: Response) => {
  res.json({
    success: true,
    tiers: Object.entries(WHITELABEL_TIERS).map(([key, tier]) => ({
      id: key,
      ...tier
    })),
    suggestedClientPricing: SUGGESTED_CLIENT_PRICING
  });
});

/**
 * POST /api/whitelabel/create
 * Create a new whitelabel account
 */
router.post('/create', (req: Request, res: Response) => {
  const { agencyId, tier, branding } = req.body;

  if (!agencyId || !tier || !branding) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: agencyId, tier, branding'
    });
  }

  if (!WHITELABEL_TIERS[tier as keyof typeof WHITELABEL_TIERS]) {
    return res.status(400).json({
      success: false,
      error: `Invalid tier. Available: ${Object.keys(WHITELABEL_TIERS).join(', ')}`
    });
  }

  const config = whitelabelService.createWhitelabel(agencyId, tier, branding);

  res.json({
    success: true,
    whitelabel: config
  });
});

/**
 * GET /api/whitelabel/:id
 * Get whitelabel configuration
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const config = whitelabelService.getWhitelabel(id);

  if (!config) {
    return res.status(404).json({
      success: false,
      error: 'Whitelabel configuration not found'
    });
  }

  res.json({
    success: true,
    whitelabel: config
  });
});

/**
 * GET /api/whitelabel/agency/:agencyId
 * Get whitelabel by agency ID
 */
router.get('/agency/:agencyId', (req: Request, res: Response) => {
  const { agencyId } = req.params;

  const config = whitelabelService.getByAgencyId(agencyId);

  if (!config) {
    return res.status(404).json({
      success: false,
      error: 'No whitelabel configuration found for this agency'
    });
  }

  res.json({
    success: true,
    whitelabel: config
  });
});

/**
 * PUT /api/whitelabel/:id
 * Update whitelabel configuration
 */
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const config = whitelabelService.updateWhitelabel(id, updates);

  if (!config) {
    return res.status(404).json({
      success: false,
      error: 'Whitelabel configuration not found'
    });
  }

  res.json({
    success: true,
    whitelabel: config
  });
});

/**
 * POST /api/whitelabel/:id/domain
 * Set custom domain
 */
router.post('/:id/domain', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      error: 'Missing domain'
    });
  }

  const result = await whitelabelService.setCustomDomain(id, domain);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Failed to set custom domain. Upgrade to Agency Pro or higher.'
    });
  }

  res.json({
    success: true,
    dnsRecords: result.dnsRecords,
    message: 'Domain configured. Please add the following DNS record to verify ownership.'
  });
});

/**
 * POST /api/whitelabel/:id/domain/verify
 * Verify custom domain
 */
router.post('/:id/domain/verify', async (req: Request, res: Response) => {
  const { id } = req.params;

  const verified = await whitelabelService.verifyDomain(id);

  res.json({
    success: verified,
    message: verified
      ? 'Domain verified and SSL enabled'
      : 'Domain verification failed. Please check DNS records.'
  });
});

/**
 * PUT /api/whitelabel/:id/pricing
 * Update client pricing tiers
 */
router.put('/:id/pricing', (req: Request, res: Response) => {
  const { id } = req.params;
  const { tiers } = req.body;

  if (!tiers || !Array.isArray(tiers)) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid pricing tiers'
    });
  }

  const config = whitelabelService.updateClientPricing(id, tiers);

  if (!config) {
    return res.status(404).json({
      success: false,
      error: 'Whitelabel configuration not found'
    });
  }

  res.json({
    success: true,
    whitelabel: config
  });
});

// ============ CLIENT MANAGEMENT ============

/**
 * POST /api/whitelabel/:id/clients
 * Create a new client
 */
router.post('/:id/clients', (req: Request, res: Response) => {
  const { id } = req.params;
  const { businessName, email, tierId } = req.body;

  if (!businessName || !email || !tierId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: businessName, email, tierId'
    });
  }

  const client = whitelabelService.createClient(id, { businessName, email, tierId });

  if (!client) {
    return res.status(400).json({
      success: false,
      error: 'Failed to create client. Check whitelabel exists and client limit not reached.'
    });
  }

  res.json({
    success: true,
    client
  });
});

/**
 * GET /api/whitelabel/:id/clients
 * Get all clients for whitelabel
 */
router.get('/:id/clients', (req: Request, res: Response) => {
  const { id } = req.params;

  const clients = whitelabelService.getClients(id);

  res.json({
    success: true,
    clients,
    total: clients.length
  });
});

/**
 * GET /api/whitelabel/clients/:clientId
 * Get single client
 */
router.get('/clients/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;

  const client = whitelabelService.getClient(clientId);

  if (!client) {
    return res.status(404).json({
      success: false,
      error: 'Client not found'
    });
  }

  res.json({
    success: true,
    client
  });
});

/**
 * PUT /api/whitelabel/clients/:clientId/subscription
 * Update client subscription
 */
router.put('/clients/:clientId/subscription', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const subscription = req.body;

  const client = whitelabelService.updateClientSubscription(clientId, subscription);

  if (!client) {
    return res.status(404).json({
      success: false,
      error: 'Client not found'
    });
  }

  res.json({
    success: true,
    client
  });
});

/**
 * POST /api/whitelabel/clients/:clientId/usage
 * Track client usage
 */
router.post('/clients/:clientId/usage', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { type, amount } = req.body;

  if (!type) {
    return res.status(400).json({
      success: false,
      error: 'Missing usage type'
    });
  }

  whitelabelService.trackUsage(clientId, type, amount || 1);

  res.json({
    success: true,
    message: 'Usage tracked'
  });
});

/**
 * GET /api/whitelabel/clients/:clientId/limits
 * Check client feature limits
 */
router.get('/clients/:clientId/limits', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { feature } = req.query;

  if (!feature) {
    return res.status(400).json({
      success: false,
      error: 'Missing feature parameter'
    });
  }

  const limits = whitelabelService.canUseFeature(clientId, feature as any);

  res.json({
    success: true,
    ...limits
  });
});

/**
 * GET /api/whitelabel/domain/:domain
 * Resolve whitelabel by custom domain (for multi-tenant routing)
 */
router.get('/domain/:domain', (req: Request, res: Response) => {
  const { domain } = req.params;

  const config = whitelabelService.getByDomain(domain);

  if (!config) {
    return res.status(404).json({
      success: false,
      error: 'No whitelabel found for this domain'
    });
  }

  // Return only public branding info for domain resolution
  res.json({
    success: true,
    branding: config.branding,
    settings: {
      allowClientSignup: config.settings.allowClientSignup,
      showPoweredBy: config.settings.showPoweredBy,
      customTermsUrl: config.settings.customTermsUrl,
      customPrivacyUrl: config.settings.customPrivacyUrl,
      supportEmail: config.settings.supportEmail
    },
    clientPricing: config.clientPricing.tiers
  });
});

export default router;
