/**
 * GoHighLevel (GHL) CRM Integration for LIV8 Moltworker
 *
 * Provides access to contacts, opportunities, workflows, and more.
 * Uses GHL API v2 with location-level access.
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string;
  dateUpdated: string;
  customFields: Record<string, any>;
}

interface GHLOpportunity {
  id: string;
  name: string;
  status: string;
  pipelineId: string;
  pipelineStageId: string;
  monetaryValue: number;
  contact: { id: string; name: string; email: string };
  dateAdded: string;
}

interface GHLWorkflow {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  version: number;
}

export class GHLIntegration {
  private apiKey: string;
  private locationId: string;

  constructor(apiKey: string, locationId: string) {
    this.apiKey = apiKey;
    this.locationId = locationId;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${GHL_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GHL API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============================================
  // CONTACTS
  // ============================================

  async getContacts(params: { limit?: number; startAfter?: string; query?: string } = {}): Promise<GHLContact[]> {
    const queryParams = new URLSearchParams({
      locationId: this.locationId,
      limit: String(params.limit || 20)
    });

    if (params.startAfter) queryParams.set('startAfter', params.startAfter);
    if (params.query) queryParams.set('query', params.query);

    const data = await this.request(`/contacts/?${queryParams}`);
    return data.contacts || [];
  }

  async getContact(contactId: string): Promise<GHLContact> {
    const data = await this.request(`/contacts/${contactId}`);
    return data.contact;
  }

  async createContact(contact: Partial<GHLContact>): Promise<GHLContact> {
    const data = await this.request('/contacts/', {
      method: 'POST',
      body: JSON.stringify({
        ...contact,
        locationId: this.locationId
      })
    });
    return data.contact;
  }

  async updateContact(contactId: string, updates: Partial<GHLContact>): Promise<GHLContact> {
    const data = await this.request(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return data.contact;
  }

  async addTag(contactId: string, tag: string): Promise<void> {
    await this.request(`/contacts/${contactId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags: [tag] })
    });
  }

  async removeTag(contactId: string, tag: string): Promise<void> {
    await this.request(`/contacts/${contactId}/tags`, {
      method: 'DELETE',
      body: JSON.stringify({ tags: [tag] })
    });
  }

  // ============================================
  // OPPORTUNITIES
  // ============================================

  async getOpportunities(pipelineId?: string): Promise<GHLOpportunity[]> {
    const queryParams = new URLSearchParams({ locationId: this.locationId });
    if (pipelineId) queryParams.set('pipelineId', pipelineId);

    const data = await this.request(`/opportunities/search?${queryParams}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    return data.opportunities || [];
  }

  async getOpportunity(opportunityId: string): Promise<GHLOpportunity> {
    const data = await this.request(`/opportunities/${opportunityId}`);
    return data.opportunity;
  }

  async createOpportunity(opportunity: {
    name: string;
    pipelineId: string;
    pipelineStageId: string;
    contactId: string;
    monetaryValue?: number;
  }): Promise<GHLOpportunity> {
    const data = await this.request('/opportunities/', {
      method: 'POST',
      body: JSON.stringify({
        ...opportunity,
        locationId: this.locationId
      })
    });
    return data.opportunity;
  }

  async updateOpportunityStage(opportunityId: string, pipelineStageId: string): Promise<void> {
    await this.request(`/opportunities/${opportunityId}`, {
      method: 'PUT',
      body: JSON.stringify({ pipelineStageId })
    });
  }

  // ============================================
  // PIPELINES
  // ============================================

  async getPipelines(): Promise<any[]> {
    const data = await this.request(`/opportunities/pipelines?locationId=${this.locationId}`);
    return data.pipelines || [];
  }

  // ============================================
  // WORKFLOWS
  // ============================================

  async getWorkflows(): Promise<GHLWorkflow[]> {
    const data = await this.request(`/workflows/?locationId=${this.locationId}`);
    return data.workflows || [];
  }

  async getWorkflow(workflowId: string): Promise<GHLWorkflow> {
    const data = await this.request(`/workflows/${workflowId}`);
    return data.workflow;
  }

  // ============================================
  // CONVERSATIONS & MESSAGES
  // ============================================

  async getConversations(contactId: string): Promise<any[]> {
    const data = await this.request(`/conversations/search?locationId=${this.locationId}&contactId=${contactId}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    return data.conversations || [];
  }

  async sendSMS(contactId: string, message: string): Promise<any> {
    const data = await this.request('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({
        type: 'SMS',
        contactId,
        message
      })
    });
    return data;
  }

  async sendEmail(contactId: string, subject: string, body: string): Promise<any> {
    const data = await this.request('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({
        type: 'Email',
        contactId,
        subject,
        html: body
      })
    });
    return data;
  }

  // ============================================
  // CALENDARS & APPOINTMENTS
  // ============================================

  async getCalendars(): Promise<any[]> {
    const data = await this.request(`/calendars/?locationId=${this.locationId}`);
    return data.calendars || [];
  }

  async getAppointments(calendarId: string, startDate: string, endDate: string): Promise<any[]> {
    const data = await this.request(`/calendars/${calendarId}/appointments?startTime=${startDate}&endTime=${endDate}`);
    return data.appointments || [];
  }

  async bookAppointment(calendarId: string, appointment: {
    contactId: string;
    startTime: string;
    endTime: string;
    title?: string;
  }): Promise<any> {
    const data = await this.request(`/calendars/${calendarId}/appointments`, {
      method: 'POST',
      body: JSON.stringify(appointment)
    });
    return data.appointment;
  }

  // ============================================
  // FORMS & SURVEYS
  // ============================================

  async getForms(): Promise<any[]> {
    const data = await this.request(`/forms/?locationId=${this.locationId}`);
    return data.forms || [];
  }

  async getFormSubmissions(formId: string): Promise<any[]> {
    const data = await this.request(`/forms/${formId}/submissions?locationId=${this.locationId}`);
    return data.submissions || [];
  }

  // ============================================
  // CUSTOM VALUES & FIELDS
  // ============================================

  async getCustomFields(): Promise<any[]> {
    const data = await this.request(`/locations/${this.locationId}/customFields`);
    return data.customFields || [];
  }

  async getCustomValues(): Promise<any[]> {
    const data = await this.request(`/locations/${this.locationId}/customValues`);
    return data.customValues || [];
  }
}
