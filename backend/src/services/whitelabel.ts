/**
 * Whitelabel System
 *
 * Allows agencies to offer LIV8 OS to their clients with custom branding
 * Includes pricing tiers, feature gating, and custom domain support
 */

// Whitelabel pricing tiers
export const WHITELABEL_TIERS = {
  agency_starter: {
    name: 'Agency Starter',
    price: 297,
    billingPeriod: 'monthly',
    maxClients: 10,
    features: {
      customBranding: true,
      customDomain: false,
      whiteGlove: false,
      apiAccess: false,
      prioritySupport: false,
      clientsCanSelfOnboard: true,
      customEmailDomain: false,
      removeLIV8Branding: false,
      aiCreditsPerClient: 100,
      maxAIStaffPerClient: 3,
      maxIntegrationsPerClient: 2
    },
    description: 'Perfect for small agencies getting started'
  },
  agency_pro: {
    name: 'Agency Pro',
    price: 597,
    billingPeriod: 'monthly',
    maxClients: 50,
    features: {
      customBranding: true,
      customDomain: true,
      whiteGlove: false,
      apiAccess: true,
      prioritySupport: true,
      clientsCanSelfOnboard: true,
      customEmailDomain: true,
      removeLIV8Branding: true,
      aiCreditsPerClient: 500,
      maxAIStaffPerClient: 6,
      maxIntegrationsPerClient: 5
    },
    description: 'For growing agencies with multiple clients'
  },
  agency_enterprise: {
    name: 'Agency Enterprise',
    price: 1497,
    billingPeriod: 'monthly',
    maxClients: -1, // unlimited
    features: {
      customBranding: true,
      customDomain: true,
      whiteGlove: true,
      apiAccess: true,
      prioritySupport: true,
      clientsCanSelfOnboard: true,
      customEmailDomain: true,
      removeLIV8Branding: true,
      aiCreditsPerClient: -1, // unlimited
      maxAIStaffPerClient: -1, // unlimited
      maxIntegrationsPerClient: -1 // unlimited
    },
    description: 'Unlimited everything for large agencies'
  }
};

// Client pricing (what agencies charge their clients)
export const SUGGESTED_CLIENT_PRICING = {
  basic: {
    name: 'Basic',
    suggestedPrice: 97,
    features: ['1 AI Staff', 'Basic Content', '100 AI Credits/mo']
  },
  professional: {
    name: 'Professional',
    suggestedPrice: 297,
    features: ['3 AI Staff', 'Full Content Studio', '500 AI Credits/mo', 'CRM Integration']
  },
  premium: {
    name: 'Premium',
    suggestedPrice: 497,
    features: ['6 AI Staff', 'Unlimited Content', '2000 AI Credits/mo', 'All Integrations', 'Voice AI']
  },
  enterprise: {
    name: 'Enterprise',
    suggestedPrice: 997,
    features: ['Unlimited AI Staff', 'Unlimited Everything', 'Priority Support', 'Custom Development']
  }
};

// Whitelabel configuration
export interface WhitelabelConfig {
  id: string;
  agencyId: string;
  tier: keyof typeof WHITELABEL_TIERS;

  // Branding
  branding: {
    companyName: string;
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };

  // Domain
  domain?: {
    customDomain: string;
    sslEnabled: boolean;
    verifiedAt?: string;
  };

  // Email
  email?: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
    customDomain?: string;
  };

  // Pricing (agency sets their own client pricing)
  clientPricing: {
    tiers: ClientPricingTier[];
    currency: string;
    stripeAccountId?: string;
  };

  // Settings
  settings: {
    allowClientSignup: boolean;
    requireApproval: boolean;
    showPoweredBy: boolean;
    customTermsUrl?: string;
    customPrivacyUrl?: string;
    supportEmail: string;
    supportUrl?: string;
  };

  // Stats
  stats: {
    totalClients: number;
    activeClients: number;
    totalRevenue: number;
    mrr: number;
  };

  createdAt: string;
  updatedAt: string;
}

export interface ClientPricingTier {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  limits: {
    aiStaff: number;
    aiCredits: number;
    integrations: number;
    contentPosts: number;
  };
  isPopular?: boolean;
  isCustom?: boolean;
}

// Whitelabel client (sub-account)
export interface WhitelabelClient {
  id: string;
  whitelabelId: string;
  agencyId: string;

  // Client info
  businessName: string;
  email: string;
  phone?: string;
  website?: string;

  // Subscription
  subscription: {
    tierId: string;
    status: 'active' | 'trial' | 'past_due' | 'canceled';
    trialEndsAt?: string;
    currentPeriodEnd: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };

  // Usage
  usage: {
    aiCreditsUsed: number;
    contentCreated: number;
    conversationsHad: number;
    lastActiveAt: string;
  };

  // Settings
  settings: {
    locationId: string;
    timezone: string;
    language: string;
  };

  createdAt: string;
  updatedAt: string;
}

class WhitelabelService {
  private configs: Map<string, WhitelabelConfig> = new Map();
  private clients: Map<string, WhitelabelClient> = new Map();

  /**
   * Create whitelabel account for agency
   */
  createWhitelabel(agencyId: string, tier: keyof typeof WHITELABEL_TIERS, branding: WhitelabelConfig['branding']): WhitelabelConfig {
    const id = `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const config: WhitelabelConfig = {
      id,
      agencyId,
      tier,
      branding,
      clientPricing: {
        tiers: this.getDefaultClientPricing(),
        currency: 'USD'
      },
      settings: {
        allowClientSignup: true,
        requireApproval: false,
        showPoweredBy: tier !== 'agency_enterprise',
        supportEmail: ''
      },
      stats: {
        totalClients: 0,
        activeClients: 0,
        totalRevenue: 0,
        mrr: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configs.set(id, config);
    return config;
  }

  /**
   * Get whitelabel config
   */
  getWhitelabel(id: string): WhitelabelConfig | null {
    return this.configs.get(id) || null;
  }

  /**
   * Get whitelabel by agency ID
   */
  getByAgencyId(agencyId: string): WhitelabelConfig | null {
    for (const config of this.configs.values()) {
      if (config.agencyId === agencyId) return config;
    }
    return null;
  }

  /**
   * Get whitelabel by custom domain
   */
  getByDomain(domain: string): WhitelabelConfig | null {
    for (const config of this.configs.values()) {
      if (config.domain?.customDomain === domain) return config;
    }
    return null;
  }

  /**
   * Update whitelabel config
   */
  updateWhitelabel(id: string, updates: Partial<WhitelabelConfig>): WhitelabelConfig | null {
    const config = this.configs.get(id);
    if (!config) return null;

    const updated = {
      ...config,
      ...updates,
      id: config.id,
      agencyId: config.agencyId,
      updatedAt: new Date().toISOString()
    };

    this.configs.set(id, updated);
    return updated;
  }

  /**
   * Set custom domain
   */
  async setCustomDomain(id: string, domain: string): Promise<{ success: boolean; dnsRecords?: any }> {
    const config = this.configs.get(id);
    if (!config) return { success: false };

    const tierFeatures = WHITELABEL_TIERS[config.tier].features;
    if (!tierFeatures.customDomain) {
      return { success: false };
    }

    config.domain = {
      customDomain: domain,
      sslEnabled: false
    };

    this.configs.set(id, config);

    // Return DNS records for agency to configure
    return {
      success: true,
      dnsRecords: {
        type: 'CNAME',
        name: domain,
        value: 'whitelabel.liv8.co',
        ttl: 3600
      }
    };
  }

  /**
   * Verify domain
   */
  async verifyDomain(id: string): Promise<boolean> {
    const config = this.configs.get(id);
    if (!config?.domain) return false;

    // In production, verify DNS records
    // For now, mark as verified
    config.domain.verifiedAt = new Date().toISOString();
    config.domain.sslEnabled = true;

    this.configs.set(id, config);
    return true;
  }

  /**
   * Update client pricing
   */
  updateClientPricing(id: string, tiers: ClientPricingTier[]): WhitelabelConfig | null {
    const config = this.configs.get(id);
    if (!config) return null;

    config.clientPricing.tiers = tiers;
    config.updatedAt = new Date().toISOString();

    this.configs.set(id, config);
    return config;
  }

  // ============ CLIENT MANAGEMENT ============

  /**
   * Create client account
   */
  createClient(whitelabelId: string, client: {
    businessName: string;
    email: string;
    tierId: string;
  }): WhitelabelClient | null {
    const config = this.configs.get(whitelabelId);
    if (!config) return null;

    // Check client limit
    const tierLimits = WHITELABEL_TIERS[config.tier];
    if (tierLimits.maxClients !== -1 && config.stats.totalClients >= tierLimits.maxClients) {
      return null;
    }

    const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const locationId = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newClient: WhitelabelClient = {
      id,
      whitelabelId,
      agencyId: config.agencyId,
      businessName: client.businessName,
      email: client.email,
      subscription: {
        tierId: client.tierId,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 day trial
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      usage: {
        aiCreditsUsed: 0,
        contentCreated: 0,
        conversationsHad: 0,
        lastActiveAt: new Date().toISOString()
      },
      settings: {
        locationId,
        timezone: 'UTC',
        language: 'en'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.clients.set(id, newClient);

    // Update stats
    config.stats.totalClients++;
    config.stats.activeClients++;
    this.configs.set(whitelabelId, config);

    return newClient;
  }

  /**
   * Get client
   */
  getClient(clientId: string): WhitelabelClient | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * Get all clients for whitelabel
   */
  getClients(whitelabelId: string): WhitelabelClient[] {
    const clients: WhitelabelClient[] = [];
    this.clients.forEach(client => {
      if (client.whitelabelId === whitelabelId) {
        clients.push(client);
      }
    });
    return clients;
  }

  /**
   * Update client subscription
   */
  updateClientSubscription(clientId: string, subscription: Partial<WhitelabelClient['subscription']>): WhitelabelClient | null {
    const client = this.clients.get(clientId);
    if (!client) return null;

    client.subscription = { ...client.subscription, ...subscription };
    client.updatedAt = new Date().toISOString();

    this.clients.set(clientId, client);

    // Update MRR if status changed to active
    if (subscription.status === 'active') {
      this.updateMRR(client.whitelabelId);
    }

    return client;
  }

  /**
   * Track client usage
   */
  trackUsage(clientId: string, type: 'ai_credits' | 'content' | 'conversation', amount: number = 1): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (type) {
      case 'ai_credits':
        client.usage.aiCreditsUsed += amount;
        break;
      case 'content':
        client.usage.contentCreated += amount;
        break;
      case 'conversation':
        client.usage.conversationsHad += amount;
        break;
    }

    client.usage.lastActiveAt = new Date().toISOString();
    this.clients.set(clientId, client);
  }

  /**
   * Check if client can use feature (within limits)
   */
  canUseFeature(clientId: string, feature: 'ai_credits' | 'ai_staff' | 'integrations'): { allowed: boolean; limit: number; used: number } {
    const client = this.clients.get(clientId);
    if (!client) return { allowed: false, limit: 0, used: 0 };

    const config = this.configs.get(client.whitelabelId);
    if (!config) return { allowed: false, limit: 0, used: 0 };

    const tier = config.clientPricing.tiers.find(t => t.id === client.subscription.tierId);
    if (!tier) return { allowed: false, limit: 0, used: 0 };

    switch (feature) {
      case 'ai_credits':
        const limit = tier.limits.aiCredits;
        const used = client.usage.aiCreditsUsed;
        return {
          allowed: limit === -1 || used < limit,
          limit,
          used
        };
      // Add other feature checks
      default:
        return { allowed: true, limit: -1, used: 0 };
    }
  }

  // ============ HELPERS ============

  private getDefaultClientPricing(): ClientPricingTier[] {
    return [
      {
        id: 'basic',
        name: 'Basic',
        price: 97,
        billingPeriod: 'monthly',
        features: ['1 AI Staff Member', 'Basic Content Creation', '100 AI Credits/month', 'Email Support'],
        limits: { aiStaff: 1, aiCredits: 100, integrations: 1, contentPosts: 10 }
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 297,
        billingPeriod: 'monthly',
        features: ['3 AI Staff Members', 'Full Content Studio', '500 AI Credits/month', 'CRM Integration', 'Priority Support'],
        limits: { aiStaff: 3, aiCredits: 500, integrations: 3, contentPosts: 50 },
        isPopular: true
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 497,
        billingPeriod: 'monthly',
        features: ['6 AI Staff Members', 'Unlimited Content', '2000 AI Credits/month', 'All Integrations', 'Voice AI', 'Dedicated Support'],
        limits: { aiStaff: 6, aiCredits: 2000, integrations: 10, contentPosts: -1 }
      }
    ];
  }

  private updateMRR(whitelabelId: string): void {
    const config = this.configs.get(whitelabelId);
    if (!config) return;

    let mrr = 0;
    this.clients.forEach(client => {
      if (client.whitelabelId === whitelabelId && client.subscription.status === 'active') {
        const tier = config.clientPricing.tiers.find(t => t.id === client.subscription.tierId);
        if (tier) {
          mrr += tier.billingPeriod === 'monthly' ? tier.price : tier.price / 12;
        }
      }
    });

    config.stats.mrr = mrr;
    this.configs.set(whitelabelId, config);
  }
}

export const whitelabelService = new WhitelabelService();
export default whitelabelService;
