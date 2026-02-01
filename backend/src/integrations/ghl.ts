/**
 * GoHighLevel (GHL) CRM Integration
 * Connects with GHL's API for contacts, conversations, opportunities, and AI agents
 */

import { CRMProvider, Contact, Pipeline, Deal, Activity, CRMConfig } from './types.js';

interface GHLConfig extends CRMConfig {
  apiKey: string;
  locationId: string;
  agencyId?: string;
  refreshToken?: string;
}

interface GHLContact {
  id: string;
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  customFields: Record<string, any>;
  source: string;
  dateAdded: string;
  dateUpdated: string;
}

interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  lastMessageBody: string;
  lastMessageDate: string;
  type: 'SMS' | 'Email' | 'GMB' | 'FB' | 'IG' | 'WhatsApp' | 'Live_Chat';
  unreadCount: number;
}

interface GHLOpportunity {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  monetaryValue: number;
  contactId: string;
  assignedTo: string;
  dateAdded: string;
}

interface GHLWorkflow {
  id: string;
  name: string;
  status: 'draft' | 'published';
  locationId: string;
}

class GHLIntegration implements CRMProvider {
  name = 'ghl' as const;
  private baseUrl = 'https://services.leadconnectorhq.com';
  private config: GHLConfig | null = null;

  /**
   * Initialize GHL connection
   */
  async connect(config: GHLConfig): Promise<boolean> {
    this.config = config;

    // Verify connection by fetching location info
    try {
      const response = await this.makeRequest('/locations/' + config.locationId);
      if (response.location) {
        console.log(`Connected to GHL location: ${response.location.name}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('GHL connection failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from GHL
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
      await this.makeRequest('/locations/' + this.config.locationId);
      return true;
    } catch {
      return false;
    }
  }

  // ============ CONTACTS ============

  /**
   * Get all contacts with optional filters
   */
  async getContacts(filters?: {
    query?: string;
    tags?: string[];
    limit?: number;
    startAfter?: string;
  }): Promise<Contact[]> {
    const params = new URLSearchParams();
    if (filters?.query) params.append('query', filters.query);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.startAfter) params.append('startAfter', filters.startAfter);

    const response = await this.makeRequest(
      `/contacts/?locationId=${this.config?.locationId}&${params.toString()}`
    );

    return (response.contacts || []).map(this.mapContact);
  }

  /**
   * Get single contact by ID
   */
  async getContact(contactId: string): Promise<Contact | null> {
    try {
      const response = await this.makeRequest(`/contacts/${contactId}`);
      return response.contact ? this.mapContact(response.contact) : null;
    } catch {
      return null;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(contact: Partial<Contact>): Promise<Contact> {
    const ghlContact = {
      locationId: this.config?.locationId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
      customField: contact.customFields,
      source: contact.source || 'LIV8-OS'
    };

    const response = await this.makeRequest('/contacts/', {
      method: 'POST',
      body: JSON.stringify(ghlContact)
    });

    return this.mapContact(response.contact);
  }

  /**
   * Update existing contact
   */
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const ghlUpdates: any = {};
    if (updates.firstName) ghlUpdates.firstName = updates.firstName;
    if (updates.lastName) ghlUpdates.lastName = updates.lastName;
    if (updates.email) ghlUpdates.email = updates.email;
    if (updates.phone) ghlUpdates.phone = updates.phone;
    if (updates.tags) ghlUpdates.tags = updates.tags;
    if (updates.customFields) ghlUpdates.customField = updates.customFields;

    const response = await this.makeRequest(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(ghlUpdates)
    });

    return this.mapContact(response.contact);
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/contacts/${contactId}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add tags to contact
   */
  async addTags(contactId: string, tags: string[]): Promise<void> {
    await this.makeRequest(`/contacts/${contactId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags })
    });
  }

  /**
   * Remove tags from contact
   */
  async removeTags(contactId: string, tags: string[]): Promise<void> {
    await this.makeRequest(`/contacts/${contactId}/tags`, {
      method: 'DELETE',
      body: JSON.stringify({ tags })
    });
  }

  // ============ CONVERSATIONS ============

  /**
   * Get conversations for a contact
   */
  async getConversations(contactId: string): Promise<GHLConversation[]> {
    const response = await this.makeRequest(
      `/conversations/search?locationId=${this.config?.locationId}&contactId=${contactId}`
    );
    return response.conversations || [];
  }

  /**
   * Send message in conversation
   */
  async sendMessage(conversationId: string, message: {
    type: 'SMS' | 'Email' | 'WhatsApp';
    body: string;
    subject?: string;
  }): Promise<{ messageId: string }> {
    const response = await this.makeRequest(`/conversations/messages`, {
      method: 'POST',
      body: JSON.stringify({
        type: message.type,
        conversationId,
        message: message.body,
        subject: message.subject
      })
    });
    return { messageId: response.messageId };
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversationId: string): Promise<any[]> {
    const response = await this.makeRequest(`/conversations/${conversationId}/messages`);
    return response.messages || [];
  }

  // ============ PIPELINES & OPPORTUNITIES ============

  /**
   * Get all pipelines
   */
  async getPipelines(): Promise<Pipeline[]> {
    const response = await this.makeRequest(
      `/opportunities/pipelines?locationId=${this.config?.locationId}`
    );

    return (response.pipelines || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      stages: (p.stages || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        order: s.position
      }))
    }));
  }

  /**
   * Get deals/opportunities
   */
  async getDeals(pipelineId?: string): Promise<Deal[]> {
    let url = `/opportunities/search?locationId=${this.config?.locationId}`;
    if (pipelineId) url += `&pipelineId=${pipelineId}`;

    const response = await this.makeRequest(url);

    return (response.opportunities || []).map((o: GHLOpportunity) => ({
      id: o.id,
      name: o.name,
      value: o.monetaryValue,
      stage: o.pipelineStageId,
      pipelineId: o.pipelineId,
      contactId: o.contactId,
      status: o.status,
      assignedTo: o.assignedTo,
      createdAt: o.dateAdded
    }));
  }

  /**
   * Create opportunity/deal
   */
  async createDeal(deal: Partial<Deal>): Promise<Deal> {
    const response = await this.makeRequest('/opportunities/', {
      method: 'POST',
      body: JSON.stringify({
        locationId: this.config?.locationId,
        name: deal.name,
        pipelineId: deal.pipelineId,
        pipelineStageId: deal.stage,
        status: deal.status || 'open',
        contactId: deal.contactId,
        monetaryValue: deal.value,
        assignedTo: deal.assignedTo
      })
    });

    return {
      id: response.opportunity.id,
      name: response.opportunity.name,
      value: response.opportunity.monetaryValue,
      stage: response.opportunity.pipelineStageId,
      pipelineId: response.opportunity.pipelineId,
      contactId: response.opportunity.contactId,
      status: response.opportunity.status,
      createdAt: response.opportunity.dateAdded
    };
  }

  /**
   * Update opportunity stage
   */
  async updateDealStage(dealId: string, stageId: string): Promise<Deal> {
    const response = await this.makeRequest(`/opportunities/${dealId}`, {
      method: 'PUT',
      body: JSON.stringify({ pipelineStageId: stageId })
    });

    return {
      id: response.opportunity.id,
      name: response.opportunity.name,
      value: response.opportunity.monetaryValue,
      stage: response.opportunity.pipelineStageId,
      pipelineId: response.opportunity.pipelineId,
      contactId: response.opportunity.contactId,
      status: response.opportunity.status,
      createdAt: response.opportunity.dateAdded
    };
  }

  // ============ WORKFLOWS & AUTOMATIONS ============

  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<GHLWorkflow[]> {
    const response = await this.makeRequest(
      `/workflows/?locationId=${this.config?.locationId}`
    );
    return response.workflows || [];
  }

  /**
   * Add contact to workflow
   */
  async addToWorkflow(contactId: string, workflowId: string): Promise<void> {
    await this.makeRequest(`/contacts/${contactId}/workflow/${workflowId}`, {
      method: 'POST'
    });
  }

  /**
   * Remove contact from workflow
   */
  async removeFromWorkflow(contactId: string, workflowId: string): Promise<void> {
    await this.makeRequest(`/contacts/${contactId}/workflow/${workflowId}`, {
      method: 'DELETE'
    });
  }

  // ============ CALENDARS & APPOINTMENTS ============

  /**
   * Get calendars
   */
  async getCalendars(): Promise<any[]> {
    const response = await this.makeRequest(
      `/calendars/?locationId=${this.config?.locationId}`
    );
    return response.calendars || [];
  }

  /**
   * Get available slots
   */
  async getAvailableSlots(calendarId: string, startDate: string, endDate: string): Promise<any[]> {
    const response = await this.makeRequest(
      `/calendars/${calendarId}/free-slots?startDate=${startDate}&endDate=${endDate}`
    );
    return response.slots || [];
  }

  /**
   * Book appointment
   */
  async bookAppointment(appointment: {
    calendarId: string;
    contactId: string;
    startTime: string;
    endTime: string;
    title?: string;
    notes?: string;
  }): Promise<{ appointmentId: string }> {
    const response = await this.makeRequest('/calendars/events/appointments', {
      method: 'POST',
      body: JSON.stringify({
        calendarId: appointment.calendarId,
        locationId: this.config?.locationId,
        contactId: appointment.contactId,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        title: appointment.title,
        notes: appointment.notes
      })
    });
    return { appointmentId: response.id };
  }

  // ============ ACTIVITIES & NOTES ============

  /**
   * Log activity for contact
   */
  async logActivity(activity: Activity): Promise<void> {
    await this.makeRequest(`/contacts/${activity.contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        body: `[${activity.type.toUpperCase()}] ${activity.description}`,
        userId: activity.userId
      })
    });
  }

  /**
   * Get contact activities/notes
   */
  async getActivities(contactId: string): Promise<Activity[]> {
    const response = await this.makeRequest(`/contacts/${contactId}/notes`);
    return (response.notes || []).map((n: any) => ({
      id: n.id,
      contactId,
      type: 'note',
      description: n.body,
      userId: n.userId,
      createdAt: n.dateAdded
    }));
  }

  // ============ GHL AI AGENTS ============

  /**
   * Get GHL's native AI agents/bots
   */
  async getAIAgents(): Promise<any[]> {
    try {
      const response = await this.makeRequest(
        `/conversations/ai/bots?locationId=${this.config?.locationId}`
      );
      return response.bots || [];
    } catch {
      // AI bots endpoint might not be available in all accounts
      return [];
    }
  }

  /**
   * Trigger GHL workflow with AI action
   */
  async triggerAIWorkflow(workflowId: string, contactId: string, data: any): Promise<void> {
    await this.makeRequest(`/workflows/${workflowId}/trigger`, {
      method: 'POST',
      body: JSON.stringify({
        contactId,
        locationId: this.config?.locationId,
        ...data
      })
    });
  }

  // ============ WEBHOOKS ============

  /**
   * Register webhook for events
   */
  async registerWebhook(url: string, events: string[]): Promise<{ webhookId: string }> {
    const response = await this.makeRequest('/webhooks/', {
      method: 'POST',
      body: JSON.stringify({
        locationId: this.config?.locationId,
        url,
        events // e.g., ['contact.create', 'opportunity.status_change', 'conversation.message']
      })
    });
    return { webhookId: response.id };
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
      event: payload.type || payload.event,
      data: payload,
      contactId: payload.contactId || payload.contact?.id
    };
  }

  // ============ SYNC WITH LIV8 ============

  /**
   * Sync contact from GHL to LIV8 Business Twin
   */
  async syncContactToTwin(contactId: string, locationId: string): Promise<any> {
    const contact = await this.getContact(contactId);
    if (!contact) throw new Error('Contact not found');

    // This would update the Business Twin's knowledge with contact info
    // For now, return the mapped contact data
    return {
      synced: true,
      contact,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sync all pipeline data for analytics
   */
  async syncPipelineData(): Promise<{
    pipelines: Pipeline[];
    deals: Deal[];
    summary: {
      totalDeals: number;
      totalValue: number;
      byStage: Record<string, number>;
    };
  }> {
    const pipelines = await this.getPipelines();
    const deals = await this.getDeals();

    const byStage: Record<string, number> = {};
    deals.forEach(d => {
      byStage[d.stage] = (byStage[d.stage] || 0) + 1;
    });

    return {
      pipelines,
      deals,
      summary: {
        totalDeals: deals.length,
        totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
        byStage
      }
    };
  }

  // ============ HELPERS ============

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.config?.apiKey) {
      throw new Error('GHL not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GHL API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private mapContact(ghl: GHLContact): Contact {
    return {
      id: ghl.id,
      firstName: ghl.firstName,
      lastName: ghl.lastName,
      email: ghl.email,
      phone: ghl.phone,
      tags: ghl.tags,
      customFields: ghl.customFields,
      source: ghl.source,
      createdAt: ghl.dateAdded,
      updatedAt: ghl.dateUpdated
    };
  }
}

export const ghlService = new GHLIntegration();
export default ghlService;
