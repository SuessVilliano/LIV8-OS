import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * GoHighLevel REST API Client
 * Real API implementation using https://services.leadconnectorhq.com/
 *
 * Documentation: https://marketplace.gohighlevel.com/docs/
 */

const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

export interface GHLApiConfig {
    accessToken: string;
    locationId: string;
}

export interface GHLContact {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    website?: string;
    timezone?: string;
    dnd?: boolean;
    tags?: string[];
    source?: string;
    customFields?: Array<{ id: string; value: string }>;
}

export interface GHLSocialPost {
    accountIds: string[];
    content: string;
    mediaUrls?: string[];
    scheduledAt?: string; // ISO 8601 format
    status?: 'draft' | 'scheduled' | 'published';
    platformSpecific?: {
        facebook?: { content?: string };
        instagram?: { content?: string };
        linkedin?: { content?: string };
        twitter?: { content?: string };
        tiktok?: { content?: string };
        google?: { content?: string };
    };
}

export interface GHLSocialAccount {
    id: string;
    platform: string;
    name: string;
    avatar?: string;
    active: boolean;
}

export interface GHLWorkflowTrigger {
    workflowId: string;
    contactId: string;
}

export interface GHLMessage {
    type: 'SMS' | 'Email' | 'WhatsApp';
    contactId: string;
    message?: string;
    subject?: string;
    html?: string;
    emailFrom?: string;
    attachments?: string[];
}

/**
 * GoHighLevel API Client
 * Handles all real API interactions with GHL
 */
export class GHLApiClient {
    private client: AxiosInstance;
    private locationId: string;

    constructor(config: GHLApiConfig) {
        this.locationId = config.locationId;
        this.client = axios.create({
            baseURL: GHL_API_BASE_URL,
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json',
                'Version': API_VERSION
            }
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            (error: AxiosError) => {
                const status = error.response?.status;
                const data = error.response?.data as any;

                console.error(`[GHL API] Error ${status}:`, data?.message || error.message);

                if (status === 401) {
                    throw new Error('GHL API authentication failed. Please reconnect your account.');
                }
                if (status === 429) {
                    throw new Error('GHL API rate limit exceeded. Please try again later.');
                }

                throw new Error(data?.message || `GHL API error: ${error.message}`);
            }
        );
    }

    // ==================== CONTACTS ====================

    async createContact(contact: GHLContact): Promise<any> {
        const response = await this.client.post('/contacts/', {
            ...contact,
            locationId: this.locationId
        });
        return response.data;
    }

    async updateContact(contactId: string, updates: Partial<GHLContact>): Promise<any> {
        const response = await this.client.put(`/contacts/${contactId}`, updates);
        return response.data;
    }

    async getContact(contactId: string): Promise<any> {
        const response = await this.client.get(`/contacts/${contactId}`);
        return response.data;
    }

    async searchContacts(query: string, limit: number = 20): Promise<any> {
        const response = await this.client.get('/contacts/', {
            params: {
                locationId: this.locationId,
                query,
                limit
            }
        });
        return response.data;
    }

    async getContacts(params?: { limit?: number; startAfter?: string; startAfterId?: string }): Promise<any> {
        const response = await this.client.get('/contacts/', {
            params: {
                locationId: this.locationId,
                ...params
            }
        });
        return response.data;
    }

    async addTagsToContact(contactId: string, tags: string[]): Promise<any> {
        const response = await this.client.post(`/contacts/${contactId}/tags`, { tags });
        return response.data;
    }

    async removeTagsFromContact(contactId: string, tags: string[]): Promise<any> {
        const response = await this.client.delete(`/contacts/${contactId}/tags`, { data: { tags } });
        return response.data;
    }

    // ==================== CONVERSATIONS & MESSAGING ====================

    async sendMessage(message: GHLMessage): Promise<any> {
        const endpoint = message.type === 'Email'
            ? `/conversations/messages/email`
            : `/conversations/messages`;

        const payload: any = {
            type: message.type,
            contactId: message.contactId
        };

        if (message.type === 'Email') {
            payload.subject = message.subject;
            payload.html = message.html || message.message;
            payload.emailFrom = message.emailFrom;
            payload.attachments = message.attachments;
        } else {
            payload.message = message.message;
        }

        const response = await this.client.post(endpoint, payload);
        return response.data;
    }

    async sendSMS(contactId: string, message: string): Promise<any> {
        return this.sendMessage({
            type: 'SMS',
            contactId,
            message
        });
    }

    async sendEmail(contactId: string, subject: string, html: string, emailFrom?: string): Promise<any> {
        return this.sendMessage({
            type: 'Email',
            contactId,
            subject,
            html,
            emailFrom
        });
    }

    async getConversations(params?: { contactId?: string; assignedTo?: string; status?: string }): Promise<any> {
        const response = await this.client.get('/conversations/search', {
            params: {
                locationId: this.locationId,
                ...params
            }
        });
        return response.data;
    }

    async getConversationMessages(conversationId: string): Promise<any> {
        const response = await this.client.get(`/conversations/${conversationId}/messages`);
        return response.data;
    }

    // ==================== SOCIAL MEDIA ====================

    async getSocialMediaAccounts(): Promise<GHLSocialAccount[]> {
        const response = await this.client.get(`/social-media-posting/${this.locationId}/accounts`);
        return response.data.accounts || response.data;
    }

    async createSocialMediaPost(post: GHLSocialPost): Promise<any> {
        const response = await this.client.post(
            `/social-media-posting/${this.locationId}/posts`,
            post
        );
        return response.data;
    }

    async getSocialMediaPosts(params?: {
        status?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<any> {
        const response = await this.client.get(`/social-media-posting/${this.locationId}/posts`, {
            params
        });
        return response.data;
    }

    async getSocialMediaPost(postId: string): Promise<any> {
        const response = await this.client.get(`/social-media-posting/${this.locationId}/posts/${postId}`);
        return response.data;
    }

    async updateSocialMediaPost(postId: string, updates: Partial<GHLSocialPost>): Promise<any> {
        const response = await this.client.put(
            `/social-media-posting/${this.locationId}/posts/${postId}`,
            updates
        );
        return response.data;
    }

    async deleteSocialMediaPost(postId: string): Promise<any> {
        const response = await this.client.delete(
            `/social-media-posting/${this.locationId}/posts/${postId}`
        );
        return response.data;
    }

    async getSocialMediaStatistics(accountIds: string[], startDate?: string, endDate?: string): Promise<any> {
        const response = await this.client.get(`/social-media-posting/${this.locationId}/statistics`, {
            params: { accountIds: accountIds.join(','), startDate, endDate }
        });
        return response.data;
    }

    // ==================== WORKFLOWS ====================

    async getWorkflows(): Promise<any> {
        const response = await this.client.get('/workflows/', {
            params: { locationId: this.locationId }
        });
        return response.data;
    }

    async triggerWorkflow(workflowId: string, contactId: string): Promise<any> {
        // GHL workflows are triggered via webhook or contact enrollment
        const response = await this.client.post(`/workflows/${workflowId}/trigger`, {
            contactId,
            locationId: this.locationId
        });
        return response.data;
    }

    // ==================== PIPELINES & OPPORTUNITIES ====================

    async getPipelines(): Promise<any> {
        const response = await this.client.get('/opportunities/pipelines', {
            params: { locationId: this.locationId }
        });
        return response.data;
    }

    async createOpportunity(data: {
        pipelineId: string;
        pipelineStageId: string;
        contactId: string;
        name: string;
        monetaryValue?: number;
        status?: string;
    }): Promise<any> {
        const response = await this.client.post('/opportunities/', {
            ...data,
            locationId: this.locationId
        });
        return response.data;
    }

    async updateOpportunity(opportunityId: string, updates: {
        pipelineStageId?: string;
        status?: string;
        monetaryValue?: number;
        name?: string;
    }): Promise<any> {
        const response = await this.client.put(`/opportunities/${opportunityId}`, updates);
        return response.data;
    }

    async getOpportunities(params?: {
        pipelineId?: string;
        stageId?: string;
        status?: string;
        limit?: number;
    }): Promise<any> {
        const response = await this.client.get('/opportunities/search', {
            params: {
                locationId: this.locationId,
                ...params
            }
        });
        return response.data;
    }

    // ==================== CALENDARS ====================

    async getCalendars(): Promise<any> {
        const response = await this.client.get('/calendars/', {
            params: { locationId: this.locationId }
        });
        return response.data;
    }

    async getCalendarEvents(calendarId: string, startTime: string, endTime: string): Promise<any> {
        const response = await this.client.get(`/calendars/${calendarId}/events`, {
            params: { startTime, endTime }
        });
        return response.data;
    }

    async createAppointment(calendarId: string, data: {
        contactId: string;
        startTime: string;
        endTime: string;
        title?: string;
        notes?: string;
    }): Promise<any> {
        const response = await this.client.post(`/calendars/${calendarId}/appointments`, {
            ...data,
            locationId: this.locationId
        });
        return response.data;
    }

    // ==================== TASKS & NOTES ====================

    async createTask(contactId: string, data: {
        title: string;
        body?: string;
        dueDate?: string;
        completed?: boolean;
        assignedTo?: string;
    }): Promise<any> {
        const response = await this.client.post(`/contacts/${contactId}/tasks`, data);
        return response.data;
    }

    async getTasks(contactId: string): Promise<any> {
        const response = await this.client.get(`/contacts/${contactId}/tasks`);
        return response.data;
    }

    async createNote(contactId: string, body: string): Promise<any> {
        const response = await this.client.post(`/contacts/${contactId}/notes`, { body });
        return response.data;
    }

    async getNotes(contactId: string): Promise<any> {
        const response = await this.client.get(`/contacts/${contactId}/notes`);
        return response.data;
    }

    // ==================== BLOGS ====================

    async getBlogs(): Promise<any> {
        const response = await this.client.get('/blogs/', {
            params: { locationId: this.locationId }
        });
        return response.data;
    }

    async createBlogPost(blogId: string, data: {
        title: string;
        content: string;
        slug: string;
        authorId?: string;
        categoryIds?: string[];
        status?: 'draft' | 'published';
        imageUrl?: string;
    }): Promise<any> {
        const response = await this.client.post(`/blogs/${blogId}/posts`, data);
        return response.data;
    }

    async updateBlogPost(blogId: string, postId: string, updates: any): Promise<any> {
        const response = await this.client.put(`/blogs/${blogId}/posts/${postId}`, updates);
        return response.data;
    }

    // ==================== LOCATION INFO ====================

    async getLocationInfo(): Promise<any> {
        const response = await this.client.get(`/locations/${this.locationId}`);
        return response.data;
    }

    async getCustomFields(): Promise<any> {
        const response = await this.client.get('/locations/custom-fields', {
            params: { locationId: this.locationId }
        });
        return response.data;
    }

    async getTags(): Promise<any> {
        const response = await this.client.get('/locations/tags', {
            params: { locationId: this.locationId }
        });
        return response.data;
    }

    // ==================== WEBHOOKS ====================

    async triggerCustomWebhook(webhookUrl: string, payload: any): Promise<any> {
        const response = await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    }
}

/**
 * Factory function to create GHL API client
 */
export function createGHLClient(accessToken: string, locationId: string): GHLApiClient {
    return new GHLApiClient({ accessToken, locationId });
}

export default GHLApiClient;
