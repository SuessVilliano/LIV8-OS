/**
 * Vbout CRM Integration (Whitelabel Option)
 * For users who don't have GHL - provides full CRM functionality
 * Connects with Twilio for voice/SMS through VAPI
 */

import { CRMProvider, Contact, Pipeline, Deal, Activity, CRMConfig } from './types.js';

interface VboutConfig extends CRMConfig {
  apiKey: string;
  accountId: string;
  domain?: string;  // Custom whitelabel domain
}

interface VboutContact {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  status: string;
  lists: number[];
  fields: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface VboutList {
  id: number;
  name: string;
  contacts_count: number;
  status: string;
}

interface VboutCampaign {
  id: number;
  name: string;
  type: 'email' | 'sms' | 'social';
  status: 'draft' | 'scheduled' | 'sent' | 'sending';
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
}

interface VboutAutomation {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'draft';
  triggers: string[];
  actions: string[];
}

class VboutIntegration implements CRMProvider {
  name = 'vbout' as const;
  private baseUrl = 'https://api.vbout.com/1';
  private config: VboutConfig | null = null;

  /**
   * Initialize Vbout connection
   */
  async connect(config: VboutConfig): Promise<boolean> {
    this.config = config;

    try {
      // Verify connection
      const response = await this.makeRequest('/app/me');
      if (response.data) {
        console.log(`Connected to Vbout: ${response.data.email}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Vbout connection failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Vbout
   */
  async disconnect(): Promise<void> {
    this.config = null;
  }

  /**
   * Check connection status
   */
  async isConnected(): Promise<boolean> {
    if (!this.config) return false;
    try {
      await this.makeRequest('/app/me');
      return true;
    } catch {
      return false;
    }
  }

  // ============ CONTACTS (EMAIL MARKETING) ============

  /**
   * Get all contacts
   */
  async getContacts(filters?: {
    listId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Contact[]> {
    const params: Record<string, any> = {};
    if (filters?.listId) params.listid = filters.listId;
    if (filters?.status) params.status = filters.status;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.offset) params.offset = filters.offset;

    const response = await this.makeRequest('/emailmarketing/getcontacts', params);
    return (response.data?.contacts || []).map(this.mapContact);
  }

  /**
   * Get single contact
   */
  async getContact(contactId: string): Promise<Contact | null> {
    try {
      const response = await this.makeRequest('/emailmarketing/getcontact', {
        id: contactId
      });
      return response.data?.contact ? this.mapContact(response.data.contact) : null;
    } catch {
      return null;
    }
  }

  /**
   * Create contact
   */
  async createContact(contact: Partial<Contact>): Promise<Contact> {
    const params: Record<string, any> = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      phone: contact.phone,
      status: 'active'
    };

    // Add to default list if available
    if (contact.customFields?.listId) {
      params.listid = contact.customFields.listId;
    }

    // Add custom fields
    if (contact.customFields) {
      Object.entries(contact.customFields).forEach(([key, value]) => {
        if (key !== 'listId') {
          params[`field_${key}`] = value;
        }
      });
    }

    const response = await this.makeRequest('/emailmarketing/addcontact', params);

    return {
      id: String(response.data?.contact?.id || Date.now()),
      email: contact.email || '',
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      phone: contact.phone || '',
      tags: contact.tags || [],
      customFields: contact.customFields || {},
      source: 'LIV8-OS',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Update contact
   */
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const params: Record<string, any> = { id: contactId };

    if (updates.email) params.email = updates.email;
    if (updates.firstName) params.firstname = updates.firstName;
    if (updates.lastName) params.lastname = updates.lastName;
    if (updates.phone) params.phone = updates.phone;

    await this.makeRequest('/emailmarketing/editcontact', params);

    const contact = await this.getContact(contactId);
    return contact || { id: contactId, ...updates } as Contact;
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<boolean> {
    try {
      await this.makeRequest('/emailmarketing/deletecontact', { id: contactId });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add contact to list
   */
  async addToList(contactId: string, listId: number): Promise<void> {
    await this.makeRequest('/emailmarketing/addtolist', {
      id: contactId,
      listid: listId
    });
  }

  /**
   * Remove contact from list
   */
  async removeFromList(contactId: string, listId: number): Promise<void> {
    await this.makeRequest('/emailmarketing/removefromlist', {
      id: contactId,
      listid: listId
    });
  }

  // ============ LISTS ============

  /**
   * Get all lists
   */
  async getLists(): Promise<VboutList[]> {
    const response = await this.makeRequest('/emailmarketing/getlists');
    return response.data?.lists || [];
  }

  /**
   * Create list
   */
  async createList(name: string): Promise<VboutList> {
    const response = await this.makeRequest('/emailmarketing/addlist', { name });
    return response.data?.list;
  }

  // ============ PIPELINES (DEALS) ============

  /**
   * Get pipelines - Vbout uses "deals" module
   */
  async getPipelines(): Promise<Pipeline[]> {
    const response = await this.makeRequest('/deals/getpipelines');
    return (response.data?.pipelines || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      stages: (p.stages || []).map((s: any, idx: number) => ({
        id: String(s.id),
        name: s.name,
        order: idx
      }))
    }));
  }

  /**
   * Get deals
   */
  async getDeals(pipelineId?: string): Promise<Deal[]> {
    const params: Record<string, any> = {};
    if (pipelineId) params.pipeline_id = pipelineId;

    const response = await this.makeRequest('/deals/getdeals', params);
    return (response.data?.deals || []).map((d: any) => ({
      id: String(d.id),
      name: d.name,
      value: d.value || 0,
      stage: String(d.stage_id),
      pipelineId: String(d.pipeline_id),
      contactId: String(d.contact_id),
      status: d.status,
      createdAt: d.created_at
    }));
  }

  /**
   * Create deal
   */
  async createDeal(deal: Partial<Deal>): Promise<Deal> {
    const response = await this.makeRequest('/deals/adddeal', {
      name: deal.name,
      value: deal.value,
      pipeline_id: deal.pipelineId,
      stage_id: deal.stage,
      contact_id: deal.contactId
    });

    return {
      id: String(response.data?.deal?.id || Date.now()),
      name: deal.name || '',
      value: deal.value || 0,
      stage: deal.stage || '',
      pipelineId: deal.pipelineId || '',
      contactId: deal.contactId,
      status: 'open',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Update deal stage
   */
  async updateDealStage(dealId: string, stageId: string): Promise<Deal> {
    await this.makeRequest('/deals/editdeal', {
      id: dealId,
      stage_id: stageId
    });

    const deals = await this.getDeals();
    return deals.find(d => d.id === dealId) || { id: dealId, stage: stageId } as Deal;
  }

  // ============ CAMPAIGNS ============

  /**
   * Get email campaigns
   */
  async getCampaigns(type?: 'email' | 'sms'): Promise<VboutCampaign[]> {
    const endpoint = type === 'sms' ? '/sms/getcampaigns' : '/emailmarketing/getcampaigns';
    const response = await this.makeRequest(endpoint);
    return response.data?.campaigns || [];
  }

  /**
   * Create email campaign
   */
  async createEmailCampaign(campaign: {
    name: string;
    subject: string;
    fromName: string;
    fromEmail: string;
    content: string;
    listIds: number[];
  }): Promise<{ campaignId: number }> {
    const response = await this.makeRequest('/emailmarketing/addcampaign', {
      name: campaign.name,
      subject: campaign.subject,
      from_name: campaign.fromName,
      from_email: campaign.fromEmail,
      content: campaign.content,
      lists: campaign.listIds.join(',')
    });

    return { campaignId: response.data?.campaign?.id };
  }

  /**
   * Send campaign
   */
  async sendCampaign(campaignId: number, schedule?: Date): Promise<void> {
    const params: Record<string, any> = { id: campaignId };
    if (schedule) {
      params.scheduled_at = schedule.toISOString();
    }

    await this.makeRequest('/emailmarketing/sendcampaign', params);
  }

  // ============ SMS (via Twilio integration) ============

  /**
   * Send SMS - Vbout can integrate with Twilio
   */
  async sendSMS(to: string, message: string): Promise<{ messageId: string }> {
    const response = await this.makeRequest('/sms/send', {
      to,
      message
    });

    return { messageId: response.data?.message_id || String(Date.now()) };
  }

  /**
   * Create SMS campaign
   */
  async createSMSCampaign(campaign: {
    name: string;
    message: string;
    listIds: number[];
  }): Promise<{ campaignId: number }> {
    const response = await this.makeRequest('/sms/addcampaign', {
      name: campaign.name,
      message: campaign.message,
      lists: campaign.listIds.join(',')
    });

    return { campaignId: response.data?.campaign?.id };
  }

  // ============ AUTOMATIONS ============

  /**
   * Get automations
   */
  async getAutomations(): Promise<VboutAutomation[]> {
    const response = await this.makeRequest('/automation/getautomations');
    return response.data?.automations || [];
  }

  /**
   * Trigger automation for contact
   */
  async triggerAutomation(automationId: number, contactId: string): Promise<void> {
    await this.makeRequest('/automation/trigger', {
      automation_id: automationId,
      contact_id: contactId
    });
  }

  // ============ SOCIAL MEDIA ============

  /**
   * Get connected social accounts
   */
  async getSocialAccounts(): Promise<any[]> {
    const response = await this.makeRequest('/social/getaccounts');
    return response.data?.accounts || [];
  }

  /**
   * Schedule social post
   */
  async scheduleSocialPost(post: {
    accountIds: number[];
    content: string;
    mediaUrl?: string;
    scheduledAt: Date;
  }): Promise<{ postId: number }> {
    const response = await this.makeRequest('/social/addpost', {
      accounts: post.accountIds.join(','),
      content: post.content,
      media_url: post.mediaUrl,
      scheduled_at: post.scheduledAt.toISOString()
    });

    return { postId: response.data?.post?.id };
  }

  // ============ ANALYTICS ============

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: number): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    openRate: number;
    clickRate: number;
  }> {
    const response = await this.makeRequest('/emailmarketing/getcampaignstats', {
      id: campaignId
    });

    const stats = response.data?.stats || {};
    const sent = stats.sent || 0;

    return {
      sent,
      delivered: stats.delivered || 0,
      opened: stats.opened || 0,
      clicked: stats.clicked || 0,
      bounced: stats.bounced || 0,
      unsubscribed: stats.unsubscribed || 0,
      openRate: sent > 0 ? (stats.opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (stats.clicked / sent) * 100 : 0
    };
  }

  /**
   * Get contact activity
   */
  async getActivities(contactId: string): Promise<Activity[]> {
    const response = await this.makeRequest('/emailmarketing/getcontactactivity', {
      id: contactId
    });

    return (response.data?.activities || []).map((a: any) => ({
      id: String(a.id),
      contactId,
      type: a.type,
      description: a.description,
      createdAt: a.created_at
    }));
  }

  /**
   * Log activity
   */
  async logActivity(activity: Activity): Promise<void> {
    await this.makeRequest('/emailmarketing/addnote', {
      contact_id: activity.contactId,
      note: `[${activity.type}] ${activity.description}`
    });
  }

  // ============ WEBHOOKS ============

  /**
   * Register webhook
   */
  async registerWebhook(url: string, events: string[]): Promise<{ webhookId: string }> {
    const response = await this.makeRequest('/webhooks/add', {
      url,
      events: events.join(',')
    });

    return { webhookId: String(response.data?.webhook?.id) };
  }

  /**
   * Process incoming webhook
   */
  processWebhook(payload: any): {
    event: string;
    data: any;
    contactId?: string;
  } {
    return {
      event: payload.event,
      data: payload,
      contactId: payload.contact_id ? String(payload.contact_id) : undefined
    };
  }

  // ============ WHITELABEL FEATURES ============

  /**
   * Get whitelabel settings
   */
  async getWhitelabelSettings(): Promise<{
    domain: string;
    logo: string;
    colors: Record<string, string>;
    companyName: string;
  }> {
    const response = await this.makeRequest('/app/getwhitelabel');
    return response.data || {
      domain: this.config?.domain || '',
      logo: '',
      colors: {},
      companyName: ''
    };
  }

  /**
   * Update whitelabel branding
   */
  async updateWhitelabelBranding(branding: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  }): Promise<void> {
    await this.makeRequest('/app/updatewhitelabel', {
      logo: branding.logo,
      primary_color: branding.primaryColor,
      company_name: branding.companyName
    });
  }

  // ============ HELPERS ============

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.config?.apiKey) {
      throw new Error('Vbout not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('key', this.config.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vbout API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.response?.header?.status === 'error') {
      throw new Error(`Vbout error: ${data.response.header.message}`);
    }

    return data.response;
  }

  private mapContact(vbout: VboutContact): Contact {
    return {
      id: String(vbout.id),
      email: vbout.email,
      firstName: vbout.firstname,
      lastName: vbout.lastname,
      phone: vbout.phone,
      tags: vbout.tags || [],
      customFields: vbout.fields || {},
      source: 'vbout',
      createdAt: vbout.created_at,
      updatedAt: vbout.updated_at
    };
  }
}

export const vboutService = new VboutIntegration();
export default vboutService;
