import { mcpClient as baseMcpClient } from './mcp-client.js';

/**
 * Complete HighLevel MCP Client
 * All 36 tools available in GHL MCP
 */
export const ghlTools = {
    // ==================== CALENDARS ====================

    async getCalendarEvents(token: string, locationId: string, params: {
        calendarId?: string;
        userId?: string;
        groupId?: string;
        startDate?: string;
        endDate?: string;
    }) {
        return baseMcpClient.callTool('calendars_get-calendar-events', params, token, locationId);
    },

    async getAppointmentNotes(token: string, locationId: string, appointmentId: string) {
        return baseMcpClient.callTool('calendars_get-appointment-notes', { appointmentId }, token, locationId);
    },

    // ==================== CONTACTS ====================

    async getAllTasks(token: string, locationId: string, contactId: string) {
        return baseMcpClient.callTool('contacts_get-all-tasks', { contactId }, token, locationId);
    },

    async addTags(token: string, locationId: string, contactId: string, tags: string[]) {
        return baseMcpClient.callTool('contacts_add-tags', { contactId, tags }, token, locationId);
    },

    async removeTags(token: string, locationId: string, contactId: string, tags: string[]) {
        return baseMcpClient.callTool('contacts_remove-tags', { contactId, tags }, token, locationId);
    },

    async getContact(token: string, locationId: string, contactId: string) {
        return baseMcpClient.callTool('contacts_get-contact', { contactId }, token, locationId);
    },

    async updateContact(token: string, locationId: string, contactId: string, updates: any) {
        return baseMcpClient.callTool('contacts_update-contact', { contactId, ...updates }, token, locationId);
    },

    async upsertContact(token: string, locationId: string, contactData: any) {
        return baseMcpClient.callTool('contacts_upsert-contact', contactData, token, locationId);
    },

    async createContact(token: string, locationId: string, contactData: any) {
        return baseMcpClient.callTool('contacts_create-contact', contactData, token, locationId);
    },

    async getContacts(token: string, locationId: string, filters?: any) {
        return baseMcpClient.callTool('contacts_get-contacts', filters || {}, token, locationId);
    },

    // ==================== CONVERSATIONS ====================

    async searchConversation(token: string, locationId: string, searchParams: {
        contactId?: string;
        assignedTo?: string;
        status?: string;
    }) {
        return baseMcpClient.callTool('conversations_search-conversation', searchParams, token, locationId);
    },

    async getMessages(token: string, locationId: string, conversationId: string) {
        return baseMcpClient.callTool('conversations_get-messages', { conversationId }, token, locationId);
    },

    async sendMessage(token: string, locationId: string, params: {
        conversationId: string;
        type: 'SMS' | 'Email';
        message: string;
    }) {
        return baseMcpClient.callTool('conversations_send-a-new-message', params, token, locationId);
    },

    // ==================== LOCATIONS ====================

    async getLocation(token: string, locationId: string) {
        return baseMcpClient.callTool('locations_get-location', { locationId }, token, locationId);
    },

    async getCustomFields(token: string, locationId: string) {
        return baseMcpClient.callTool('locations_get-custom-fields', {}, token, locationId);
    },

    // ==================== OPPORTUNITIES ====================

    async searchOpportunity(token: string, locationId: string, searchParams: {
        pipelineId?: string;
        stageId?: string;
        assignedTo?: string;
        status?: string;
    }) {
        return baseMcpClient.callTool('opportunities_search-opportunity', searchParams, token, locationId);
    },

    async getPipelines(token: string, locationId: string) {
        return baseMcpClient.callTool('opportunities_get-pipelines', {}, token, locationId);
    },

    async getOpportunity(token: string, locationId: string, opportunityId: string) {
        return baseMcpClient.callTool('opportunities_get-opportunity', { opportunityId }, token, locationId);
    },

    async updateOpportunity(token: string, locationId: string, opportunityId: string, updates: {
        name?: string;
        stageId?: string;
        status?: string;
        monetaryValue?: number;
    }) {
        return baseMcpClient.callTool('opportunities_update-opportunity', { opportunityId, ...updates }, token, locationId);
    },

    // ==================== PAYMENTS ====================

    async getOrderById(token: string, locationId: string, orderId: string) {
        return baseMcpClient.callTool('payments_get-order-by-id', { orderId }, token, locationId);
    },

    async listTransactions(token: string, locationId: string, params: {
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
    }) {
        return baseMcpClient.callTool('payments_list-transactions', params, token, locationId);
    },

    // ==================== BLOGS ====================

    async checkBlogSlugExists(token: string, locationId: string, blogId: string, slug: string) {
        return baseMcpClient.callTool('blogs_check-url-slug-exists', { blogId, slug }, token, locationId);
    },

    async updateBlogPost(token: string, locationId: string, blogId: string, postId: string, postData: any) {
        return baseMcpClient.callTool('blogs_update-blog-post', { blogId, postId, ...postData }, token, locationId);
    },

    async createBlogPost(token: string, locationId: string, blogId: string, postData: {
        title: string;
        content: string;
        slug: string;
        authorId?: string;
        categoryIds?: string[];
    }) {
        return baseMcpClient.callTool('blogs_create-blog-post', { blogId, ...postData }, token, locationId);
    },

    async getBlogAuthors(token: string, locationId: string) {
        return baseMcpClient.callTool('blogs_get-all-blog-authors-by-location', {}, token, locationId);
    },

    async getBlogCategories(token: string, locationId: string) {
        return baseMcpClient.callTool('blogs_get-all-categories-by-location', {}, token, locationId);
    },

    async getBlogPost(token: string, locationId: string, blogId: string, postId: string) {
        return baseMcpClient.callTool('blogs_get-blog-post', { blogId, postId }, token, locationId);
    },

    async getBlogs(token: string, locationId: string) {
        return baseMcpClient.callTool('blogs_get-blogs', {}, token, locationId);
    },

    // ==================== EMAIL TEMPLATES ====================

    async createEmailTemplate(token: string, locationId: string, templateData: {
        name: string;
        subject: string;
        body: string;
    }) {
        return baseMcpClient.callTool('emails_create-template', templateData, token, locationId);
    },

    async getEmailTemplates(token: string, locationId: string) {
        return baseMcpClient.callTool('emails_fetch-template', {}, token, locationId);
    },

    // ==================== SOCIAL MEDIA ====================

    async getSocialMediaAccounts(token: string, locationId: string) {
        return baseMcpClient.callTool('socialmediaposting_get-account', {}, token, locationId);
    },

    async getSocialMediaStatistics(token: string, locationId: string, params: {
        accountIds: string[];
        startDate?: string;
        endDate?: string;
    }) {
        return baseMcpClient.callTool('socialmediaposting_get-social-media-statistics', params, token, locationId);
    },

    async createSocialMediaPost(token: string, locationId: string, postData: {
        accountIds: string[];
        content: string;
        mediaUrls?: string[];
        scheduledAt?: string;
    }) {
        return baseMcpClient.callTool('socialmediaposting_create-post', postData, token, locationId);
    },

    async getSocialMediaPost(token: string, locationId: string, postId: string) {
        return baseMcpClient.callTool('socialmediaposting_get-post', { postId }, token, locationId);
    },

    async getSocialMediaPosts(token: string, locationId: string, filters?: any) {
        return baseMcpClient.callTool('socialmediaposting_get-posts', filters || {}, token, locationId);
    },

    async updateSocialMediaPost(token: string, locationId: string, postId: string, updates: any) {
        return baseMcpClient.callTool('socialmediaposting_edit-post', { postId, ...updates }, token, locationId);
    },

    // ==================== AGENT STUDIO ====================

    async listAgentStudioAgents(token: string, locationId: string, params?: { limit?: number; offset?: number }) {
        return baseMcpClient.callTool('agent-studio-list-agents', params || {}, token, locationId);
    },

    async getAgentStudioAgent(token: string, locationId: string, agentId: string) {
        return baseMcpClient.callTool('agent-studio-get-agent', { agentId }, token, locationId);
    },

    async executeAgentStudioAgent(token: string, locationId: string, agentId: string, input: string, executionId?: string) {
        return baseMcpClient.callTool('agent-studio-execute-agent', { agentId, input, executionId }, token, locationId);
    },

    // ==================== CONVERSATION AI ====================

    async listConversationAIAgents(token: string, locationId: string, params?: any) {
        return baseMcpClient.callTool('conversation-ai-list-agents', params || {}, token, locationId);
    },

    async getConversationAIAgent(token: string, locationId: string, agentId: string) {
        return baseMcpClient.callTool('conversation-ai-get-agent', { agentId }, token, locationId);
    },

    async createConversationAIAgent(token: string, locationId: string, agentData: any) {
        return baseMcpClient.callTool('conversation-ai-create-agent', agentData, token, locationId);
    },

    async updateConversationAIAgent(token: string, locationId: string, agentId: string, updates: any) {
        return baseMcpClient.callTool('conversation-ai-update-agent', { agentId, ...updates }, token, locationId);
    },

    async deleteConversationAIAgent(token: string, locationId: string, agentId: string) {
        return baseMcpClient.callTool('conversation-ai-delete-agent', { agentId }, token, locationId);
    },

    async attachConversationAIAction(token: string, locationId: string, agentId: string, actionData: any) {
        return baseMcpClient.callTool('conversation-ai-attach-action', { agentId, ...actionData }, token, locationId);
    },

    async listConversationAIActions(token: string, locationId: string, agentId: string) {
        return baseMcpClient.callTool('conversation-ai-list-actions', { agentId }, token, locationId);
    },

    async getAIGenerations(token: string, locationId: string, params?: any) {
        return baseMcpClient.callTool('conversation-ai-get-generations', params || {}, token, locationId);
    },

    // ==================== VOICE AI (GHL Native) ====================

    async listVoiceAIAgents(token: string, locationId: string, params?: any) {
        return baseMcpClient.callTool('voice-ai-list-agents', params || {}, token, locationId);
    },

    async getVoiceAIAgent(token: string, locationId: string, agentId: string) {
        return baseMcpClient.callTool('voice-ai-get-agent', { agentId }, token, locationId);
    },

    async createVoiceAIAgent(token: string, locationId: string, agentData: any) {
        return baseMcpClient.callTool('voice-ai-create-agent', agentData, token, locationId);
    },

    async updateVoiceAIAgent(token: string, locationId: string, agentId: string, updates: any) {
        return baseMcpClient.callTool('voice-ai-update-agent', { agentId, ...updates }, token, locationId);
    },

    async deleteVoiceAIAgent(token: string, locationId: string, agentId: string) {
        return baseMcpClient.callTool('voice-ai-delete-agent', { agentId }, token, locationId);
    },

    async createVoiceAIAction(token: string, locationId: string, agentId: string, actionData: any) {
        return baseMcpClient.callTool('voice-ai-create-action', { agentId, ...actionData }, token, locationId);
    },

    async listVoiceAICallLogs(token: string, locationId: string, params?: any) {
        return baseMcpClient.callTool('voice-ai-list-calls', params || {}, token, locationId);
    },

    async getVoiceAICallLog(token: string, locationId: string, callId: string) {
        return baseMcpClient.callTool('voice-ai-get-call', { callId }, token, locationId);
    },

    // ==================== GHL NATIVE MCP ====================

    async callGHLNativeMCP(token: string, locationId: string, toolName: string, args: any) {
        return baseMcpClient.callTool('ghl-mcp-call', { toolName, arguments: args }, token, locationId);
    },

    async listGHLNativeMCPTools(token: string, locationId: string) {
        return baseMcpClient.callTool('ghl-mcp-list-tools', {}, token, locationId);
    }
};

export default ghlTools;
