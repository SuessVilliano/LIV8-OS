/**
 * Vbout CRM Integration for LIV8 Moltworker
 *
 * Provides access to contacts, email campaigns, automations, and social media.
 * Used for LIV8 CRM clients who prefer the Vbout platform.
 */

const VBOUT_API_BASE = 'https://api.vbout.com/1';

interface VboutContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  lists: string[];
  fields: Record<string, any>;
  dateCreated: string;
  dateModified: string;
}

interface VboutCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  type: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  dateCreated: string;
}

interface VboutAutomation {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  triggerType: string;
  contactsEnrolled: number;
  dateCreated: string;
}

export class VboutIntegration {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${VBOUT_API_BASE}${endpoint}`);
    url.searchParams.set('key', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vbout API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.response?.header?.status === 'error') {
      throw new Error(`Vbout API Error: ${data.response.header.message}`);
    }

    return data.response?.data || data;
  }

  private async postRequest(endpoint: string, body: Record<string, any>): Promise<any> {
    const url = `${VBOUT_API_BASE}${endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vbout API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.response?.data || data;
  }

  // ============================================
  // CONTACTS (Email Marketing)
  // ============================================

  async getContacts(params: { limit?: number; offset?: string; listId?: string } = {}): Promise<VboutContact[]> {
    const data = await this.request('/emailmarketing/getcontacts', {
      limit: params.limit || 50,
      offset: params.offset,
      listid: params.listId
    });
    return data.contacts || [];
  }

  async getContact(contactId: string): Promise<VboutContact> {
    const data = await this.request('/emailmarketing/getcontact', { id: contactId });
    return data.contact;
  }

  async createContact(contact: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    listId: string;
    fields?: Record<string, any>;
  }): Promise<VboutContact> {
    const data = await this.postRequest('/emailmarketing/addcontact', {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      phone: contact.phone,
      listid: contact.listId,
      fields: contact.fields
    });
    return data.contact;
  }

  async updateContact(contactId: string, updates: Partial<VboutContact>): Promise<VboutContact> {
    const data = await this.postRequest('/emailmarketing/editcontact', {
      id: contactId,
      ...updates
    });
    return data.contact;
  }

  async addToList(contactId: string, listId: string): Promise<void> {
    await this.postRequest('/emailmarketing/addtolist', {
      id: contactId,
      listid: listId
    });
  }

  async removeFromList(contactId: string, listId: string): Promise<void> {
    await this.postRequest('/emailmarketing/removefromlist', {
      id: contactId,
      listid: listId
    });
  }

  // ============================================
  // EMAIL LISTS
  // ============================================

  async getLists(): Promise<any[]> {
    const data = await this.request('/emailmarketing/getlists');
    return data.lists || [];
  }

  async createList(name: string, description?: string): Promise<any> {
    const data = await this.postRequest('/emailmarketing/addlist', {
      name,
      description
    });
    return data.list;
  }

  // ============================================
  // EMAIL CAMPAIGNS
  // ============================================

  async getCampaigns(): Promise<VboutCampaign[]> {
    const data = await this.request('/emailmarketing/getcampaigns');
    return data.campaigns || [];
  }

  async getCampaign(campaignId: string): Promise<VboutCampaign> {
    const data = await this.request('/emailmarketing/getcampaign', { id: campaignId });
    return data.campaign;
  }

  async getCampaignStats(campaignId: string): Promise<any> {
    const data = await this.request('/emailmarketing/getcampaignstats', { id: campaignId });
    return data.stats;
  }

  async createCampaign(campaign: {
    name: string;
    subject: string;
    fromName: string;
    fromEmail: string;
    htmlContent: string;
    listId: string;
  }): Promise<VboutCampaign> {
    const data = await this.postRequest('/emailmarketing/addcampaign', {
      name: campaign.name,
      subject: campaign.subject,
      from_name: campaign.fromName,
      from_email: campaign.fromEmail,
      html: campaign.htmlContent,
      listid: campaign.listId
    });
    return data.campaign;
  }

  async sendCampaign(campaignId: string): Promise<void> {
    await this.postRequest('/emailmarketing/sendcampaign', { id: campaignId });
  }

  // ============================================
  // AUTOMATIONS
  // ============================================

  async getAutomations(): Promise<VboutAutomation[]> {
    const data = await this.request('/automation/getautomations');
    return data.automations || [];
  }

  async getAutomation(automationId: string): Promise<VboutAutomation> {
    const data = await this.request('/automation/getautomation', { id: automationId });
    return data.automation;
  }

  async pauseAutomation(automationId: string): Promise<void> {
    await this.postRequest('/automation/pauseautomation', { id: automationId });
  }

  async resumeAutomation(automationId: string): Promise<void> {
    await this.postRequest('/automation/resumeautomation', { id: automationId });
  }

  async enrollContact(automationId: string, contactId: string): Promise<void> {
    await this.postRequest('/automation/enrollcontact', {
      automationid: automationId,
      contactid: contactId
    });
  }

  // ============================================
  // SOCIAL MEDIA
  // ============================================

  async getSocialProfiles(): Promise<any[]> {
    const data = await this.request('/social/getprofiles');
    return data.profiles || [];
  }

  async scheduleSocialPost(post: {
    profileIds: string[];
    message: string;
    imageUrl?: string;
    scheduledTime?: string;
  }): Promise<any> {
    const data = await this.postRequest('/social/addpost', {
      profiles: post.profileIds.join(','),
      message: post.message,
      image: post.imageUrl,
      scheduled_time: post.scheduledTime
    });
    return data.post;
  }

  async getSocialPosts(profileId: string): Promise<any[]> {
    const data = await this.request('/social/getposts', { profileid: profileId });
    return data.posts || [];
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getEmailStats(startDate: string, endDate: string): Promise<any> {
    const data = await this.request('/emailmarketing/getstats', {
      start_date: startDate,
      end_date: endDate
    });
    return data.stats;
  }

  async getSocialStats(profileId: string): Promise<any> {
    const data = await this.request('/social/getstats', { profileid: profileId });
    return data.stats;
  }

  // ============================================
  // TEMPLATES
  // ============================================

  async getEmailTemplates(): Promise<any[]> {
    const data = await this.request('/emailmarketing/gettemplates');
    return data.templates || [];
  }

  async getTemplate(templateId: string): Promise<any> {
    const data = await this.request('/emailmarketing/gettemplate', { id: templateId });
    return data.template;
  }

  // ============================================
  // TRANSACTIONAL EMAIL
  // ============================================

  async sendTransactionalEmail(params: {
    to: string;
    from: string;
    fromName: string;
    subject: string;
    htmlContent: string;
  }): Promise<any> {
    const data = await this.postRequest('/emailmarketing/sendtransactional', {
      to: params.to,
      from: params.from,
      from_name: params.fromName,
      subject: params.subject,
      html: params.htmlContent
    });
    return data;
  }
}
