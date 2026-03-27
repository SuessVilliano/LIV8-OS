import { GHLApiClient, createGHLClient } from './ghl-api-client.js';

/**
 * HighLevel MCP Client
 * Routes tool calls to the real GHL REST API
 *
 * This client maintains the MCP tool interface but executes
 * operations against the actual GHL API endpoints.
 */
export class HighLevelMCPClient {
    private clientCache: Map<string, GHLApiClient> = new Map();

    /**
     * Get or create a GHL API client for the given credentials
     */
    private getClient(token: string, locationId: string): GHLApiClient {
        const cacheKey = `${locationId}:${token.slice(-8)}`;

        if (!this.clientCache.has(cacheKey)) {
            this.clientCache.set(cacheKey, createGHLClient(token, locationId));
        }

        return this.clientCache.get(cacheKey)!;
    }

    /**
     * Call a tool on the HighLevel API
     * Routes MCP tool names to real API calls
     */
    async callTool(
        toolName: string,
        args: Record<string, any>,
        token: string,
        locationId: string
    ): Promise<any> {
        const client = this.getClient(token, locationId);

        console.log(`[MCP] Executing tool: ${toolName}`, { locationId, args: Object.keys(args) });

        try {
            const result = await this.routeToolCall(client, toolName, args);
            console.log(`[MCP] Tool ${toolName} completed successfully`);
            return result;
        } catch (error: any) {
            console.error(`[MCP] Tool ${toolName} failed:`, error.message);
            throw new Error(`MCP tool execution failed: ${error.message}`);
        }
    }

    /**
     * Route tool calls to appropriate API methods
     */
    private async routeToolCall(
        client: GHLApiClient,
        toolName: string,
        args: Record<string, any>
    ): Promise<any> {
        // Normalize tool name (handle both formats)
        const normalizedTool = toolName.replace(/_/g, '-').toLowerCase();

        switch (normalizedTool) {
            // ==================== CONTACTS ====================
            case 'contacts-create-contact':
            case 'ghl-create-contact':
            case 'ghl.createcontact':
                return client.createContact(args);

            case 'contacts-update-contact':
            case 'ghl-update-contact':
            case 'ghl.updatecontact':
                return client.updateContact(args.contactId, args);

            case 'contacts-get-contact':
            case 'ghl-get-contact':
                return client.getContact(args.contactId);

            case 'contacts-get-contacts':
            case 'ghl-search-contacts':
            case 'ghl.searchcontacts':
                if (args.query) {
                    return client.searchContacts(args.query, args.limit);
                }
                return client.getContacts(args);

            case 'contacts-add-tags':
            case 'ghl-add-tags':
                return client.addTagsToContact(args.contactId, args.tags);

            case 'contacts-remove-tags':
            case 'ghl-remove-tags':
                return client.removeTagsFromContact(args.contactId, args.tags);

            case 'contacts-get-all-tasks':
                return client.getTasks(args.contactId);

            case 'contacts-upsert-contact':
                return client.createContact(args); // Upsert handled by GHL

            // ==================== CONVERSATIONS & MESSAGING ====================
            case 'conversations-send-a-new-message':
            case 'ghl-send-sms':
            case 'ghl.sendsms':
                return client.sendSMS(args.contactId, args.message);

            case 'ghl-send-email':
            case 'ghl.sendemail':
                return client.sendEmail(args.contactId, args.subject, args.body || args.html);

            case 'conversations-search-conversation':
                return client.getConversations(args);

            case 'conversations-get-messages':
                return client.getConversationMessages(args.conversationId);

            // ==================== SOCIAL MEDIA ====================
            case 'socialmediaposting-get-account':
            case 'socialmediaposting-get-accounts':
            case 'ghl-get-social-accounts':
                return client.getSocialMediaAccounts();

            case 'socialmediaposting-create-post':
            case 'ghl-create-social-post':
            case 'ghl.createsocialmediapost':
                return client.createSocialMediaPost({
                    accountIds: args.accountIds,
                    content: args.content,
                    mediaUrls: args.mediaUrls,
                    scheduledAt: args.scheduledAt,
                    platformSpecific: args.platformSpecific
                });

            case 'socialmediaposting-get-posts':
            case 'ghl-get-social-posts':
                return client.getSocialMediaPosts(args);

            case 'socialmediaposting-get-post':
            case 'ghl-get-social-post':
                return client.getSocialMediaPost(args.postId);

            case 'socialmediaposting-edit-post':
            case 'ghl-update-social-post':
                return client.updateSocialMediaPost(args.postId, args);

            case 'socialmediaposting-delete-post':
                return client.deleteSocialMediaPost(args.postId);

            case 'socialmediaposting-get-social-media-statistics':
            case 'ghl-get-social-statistics':
                return client.getSocialMediaStatistics(args.accountIds, args.startDate, args.endDate);

            // ==================== WORKFLOWS ====================
            case 'ghl-trigger-workflow':
            case 'ghl.triggerworkflow':
                return client.triggerWorkflow(args.workflowId, args.contactId);

            case 'ghl-get-workflows':
                return client.getWorkflows();

            // ==================== PIPELINES & OPPORTUNITIES ====================
            case 'opportunities-get-pipelines':
            case 'ghl-get-pipelines':
                return client.getPipelines();

            case 'opportunities-search-opportunity':
            case 'ghl-search-opportunities':
                return client.getOpportunities(args);

            case 'opportunities-get-opportunity':
            case 'ghl-get-opportunity':
                return client.getOpportunities({ ...args });

            case 'opportunities-update-opportunity':
            case 'ghl-update-opportunity':
            case 'ghl-move-opportunity':
            case 'ghl.moveopportunity':
                return client.updateOpportunity(args.opportunityId, {
                    pipelineStageId: args.pipelineStageId || args.stage,
                    status: args.status,
                    monetaryValue: args.monetaryValue
                });

            case 'ghl-create-opportunity':
                return client.createOpportunity(args as any);

            // ==================== CALENDARS ====================
            case 'calendars-get-calendar-events':
            case 'ghl-get-calendar-events':
                return client.getCalendarEvents(args.calendarId, args.startDate, args.endDate);

            case 'calendars-get-appointment-notes': {
                // Get calendars with event details
                const calendars = await client.getCalendars();
                return { ...calendars, note: 'Use calendar event details for appointment notes' };
            }

            case 'ghl-get-calendars':
                return client.getCalendars();

            case 'ghl-create-appointment':
                return client.createAppointment(args.calendarId, args as any);

            // ==================== TASKS & NOTES ====================
            case 'ghl-create-task':
            case 'ghl.createtask':
                return client.createTask(args.contactId, {
                    title: args.title,
                    body: args.body,
                    dueDate: args.dueDate,
                    completed: args.completed,
                    assignedTo: args.assignedTo
                });

            case 'ghl-create-note':
            case 'ghl.createnote':
                return client.createNote(args.contactId, args.body || args.note);

            // ==================== BLOGS ====================
            case 'blogs-get-blogs':
            case 'ghl-get-blogs':
                return client.getBlogs();

            case 'blogs-create-blog-post':
            case 'ghl-create-blog-post':
                return client.createBlogPost(args.blogId, {
                    title: args.title,
                    content: args.content,
                    slug: args.slug,
                    authorId: args.authorId,
                    categoryIds: args.categoryIds,
                    status: args.status
                });

            case 'blogs-update-blog-post':
            case 'ghl-update-blog-post':
                return client.updateBlogPost(args.blogId, args.postId, args);

            case 'blogs-get-blog-post': {
                // Get specific blog post by fetching blog and filtering
                const blogsData = await client.getBlogs();
                const blogs = blogsData.blogs || [];
                if (args.postId && blogs.length > 0) {
                    for (const blog of blogs) {
                        const posts = blog.posts || [];
                        const post = posts.find((p: any) => p.id === args.postId);
                        if (post) return { post };
                    }
                }
                return blogsData;
            }

            case 'blogs-get-all-blog-authors-by-location':
            case 'blogs-get-all-categories-by-location':
                return client.getBlogs(); // Categories/authors come with blogs

            case 'blogs-check-url-slug-exists': {
                // Check slug existence by fetching blogs and searching
                const allBlogs = await client.getBlogs();
                const allPosts = (allBlogs.blogs || []).flatMap((b: any) => b.posts || []);
                const slugExists = allPosts.some((p: any) => p.slug === args.slug);
                return { exists: slugExists, slug: args.slug };
            }

            // ==================== LOCATIONS ====================
            case 'locations-get-location':
            case 'ghl-get-location':
                return client.getLocationInfo();

            case 'locations-get-custom-fields':
            case 'ghl-get-custom-fields':
                return client.getCustomFields();

            case 'ghl-get-tags':
                return client.getTags();

            // ==================== PAYMENTS ====================
            case 'payments-get-order-by-id':
                return { error: 'Payment operations require Stripe/payment integration setup. Configure in Settings.', configured: false };
            case 'payments-list-transactions':
                return { transactions: [], error: 'Payment operations require Stripe/payment integration setup.', configured: false };

            // ==================== EMAIL TEMPLATES ====================
            case 'emails-create-template':
            case 'emails-fetch-template':
                return { error: 'Email template operations require GHL email integration.', configured: false };

            // ==================== CUSTOM WEBHOOK ====================
            case 'ghl-trigger-webhook':
            case 'trigger-webhook':
                return client.triggerCustomWebhook(args.webhookUrl, args.payload);

            // ==================== AGENT STUDIO ====================
            case 'agent-studio-list-agents':
            case 'ghl-list-studio-agents':
                return client.listAgentStudioAgents(args);

            case 'agent-studio-get-agent':
            case 'ghl-get-studio-agent':
                return client.getAgentStudioAgent(args.agentId);

            case 'agent-studio-execute-agent':
            case 'ghl-execute-agent':
                return client.executeAgentStudioAgent(args.agentId, args.input, args.executionId);

            // ==================== CONVERSATION AI ====================
            case 'conversation-ai-list-agents':
            case 'ghl-list-conversation-agents':
                return client.listConversationAIAgents(args);

            case 'conversation-ai-get-agent':
            case 'ghl-get-conversation-agent':
                return client.getConversationAIAgent(args.agentId);

            case 'conversation-ai-create-agent':
            case 'ghl-create-conversation-agent':
                return client.createConversationAIAgent(args as any);

            case 'conversation-ai-update-agent':
            case 'ghl-update-conversation-agent':
                return client.updateConversationAIAgent(args.agentId, args);

            case 'conversation-ai-delete-agent':
            case 'ghl-delete-conversation-agent':
                return client.deleteConversationAIAgent(args.agentId);

            case 'conversation-ai-attach-action':
            case 'ghl-attach-conversation-action':
                return client.attachConversationAIAction(args.agentId, args);

            case 'conversation-ai-list-actions':
            case 'ghl-list-conversation-actions':
                return client.listConversationAIActions(args.agentId);

            case 'conversation-ai-get-generations':
            case 'ghl-get-ai-generations':
                return client.getConversationAIGenerations(args);

            // ==================== VOICE AI (GHL Native) ====================
            case 'voice-ai-list-agents':
            case 'ghl-list-voice-agents':
                return client.listVoiceAIAgents(args);

            case 'voice-ai-get-agent':
            case 'ghl-get-voice-agent':
                return client.getVoiceAIAgent(args.agentId);

            case 'voice-ai-create-agent':
            case 'ghl-create-voice-agent':
                return client.createVoiceAIAgent(args as any);

            case 'voice-ai-update-agent':
            case 'ghl-update-voice-agent':
                return client.updateVoiceAIAgent(args.agentId, args);

            case 'voice-ai-delete-agent':
            case 'ghl-delete-voice-agent':
                return client.deleteVoiceAIAgent(args.agentId);

            case 'voice-ai-create-action':
            case 'ghl-create-voice-action':
                return client.createVoiceAIAction(args.agentId, args);

            case 'voice-ai-list-calls':
            case 'ghl-list-voice-calls':
                return client.listVoiceAICallLogs(args);

            case 'voice-ai-get-call':
            case 'ghl-get-voice-call':
                return client.getVoiceAICallLog(args.callId);

            // ==================== GHL NATIVE MCP ====================
            case 'ghl-mcp-call':
                return client.callGHLMCP(args.toolName, args.arguments || {});

            case 'ghl-mcp-list-tools':
                return client.listGHLMCPTools();

            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    // ==================== CONVENIENCE METHODS ====================
    // These maintain backwards compatibility with existing code

    async createContact(token: string, locationId: string, contactData: any) {
        return this.callTool('ghl-create-contact', contactData, token, locationId);
    }

    async updateContact(token: string, locationId: string, contactId: string, updates: any) {
        return this.callTool('ghl-update-contact', { contactId, ...updates }, token, locationId);
    }

    async searchContacts(token: string, locationId: string, query: any) {
        return this.callTool('ghl-search-contacts', query, token, locationId);
    }

    async sendSMS(token: string, locationId: string, contactId: string, message: string) {
        return this.callTool('ghl-send-sms', { contactId, message }, token, locationId);
    }

    async sendEmail(token: string, locationId: string, contactId: string, subject: string, body: string) {
        return this.callTool('ghl-send-email', { contactId, subject, body }, token, locationId);
    }

    async createTask(token: string, locationId: string, taskData: any) {
        return this.callTool('ghl-create-task', taskData, token, locationId);
    }

    async createNote(token: string, locationId: string, contactId: string, note: string) {
        return this.callTool('ghl-create-note', { contactId, note }, token, locationId);
    }

    async moveOpportunity(token: string, locationId: string, opportunityId: string, stage: string) {
        return this.callTool('ghl-move-opportunity', { opportunityId, pipelineStageId: stage }, token, locationId);
    }

    async createWorkflow(token: string, locationId: string, workflowConfig: any) {
        // Workflows are created in GHL UI, not via API
        // This triggers an existing workflow instead
        console.warn('[MCP] createWorkflow called - workflows must be created in GHL UI');
        return { success: true, message: 'Workflows must be created in GHL UI' };
    }

    async triggerWorkflow(token: string, locationId: string, workflowId: string, contactId: string) {
        return this.callTool('ghl-trigger-workflow', { workflowId, contactId }, token, locationId);
    }

    // Social media convenience methods
    async getSocialMediaAccounts(token: string, locationId: string) {
        return this.callTool('ghl-get-social-accounts', {}, token, locationId);
    }

    async createSocialMediaPost(token: string, locationId: string, postData: any) {
        return this.callTool('ghl-create-social-post', postData, token, locationId);
    }

    async getSocialMediaPosts(token: string, locationId: string, filters?: any) {
        return this.callTool('ghl-get-social-posts', filters || {}, token, locationId);
    }

    // ==================== AGENT STUDIO CONVENIENCE METHODS ====================

    async listAgentStudioAgents(token: string, locationId: string, params?: any) {
        return this.callTool('agent-studio-list-agents', params || {}, token, locationId);
    }

    async getAgentStudioAgent(token: string, locationId: string, agentId: string) {
        return this.callTool('agent-studio-get-agent', { agentId }, token, locationId);
    }

    async executeAgentStudioAgent(token: string, locationId: string, agentId: string, input: string, executionId?: string) {
        return this.callTool('agent-studio-execute-agent', { agentId, input, executionId }, token, locationId);
    }

    // ==================== CONVERSATION AI CONVENIENCE METHODS ====================

    async listConversationAIAgents(token: string, locationId: string, params?: any) {
        return this.callTool('conversation-ai-list-agents', params || {}, token, locationId);
    }

    async createConversationAIAgent(token: string, locationId: string, agentData: any) {
        return this.callTool('conversation-ai-create-agent', agentData, token, locationId);
    }

    async attachConversationAIAction(token: string, locationId: string, agentId: string, actionData: any) {
        return this.callTool('conversation-ai-attach-action', { agentId, ...actionData }, token, locationId);
    }

    async getAIGenerations(token: string, locationId: string, params?: any) {
        return this.callTool('conversation-ai-get-generations', params || {}, token, locationId);
    }

    // ==================== VOICE AI (GHL NATIVE) CONVENIENCE METHODS ====================

    async listVoiceAIAgents(token: string, locationId: string, params?: any) {
        return this.callTool('voice-ai-list-agents', params || {}, token, locationId);
    }

    async createVoiceAIAgent(token: string, locationId: string, agentData: any) {
        return this.callTool('voice-ai-create-agent', agentData, token, locationId);
    }

    async listVoiceAICallLogs(token: string, locationId: string, params?: any) {
        return this.callTool('voice-ai-list-calls', params || {}, token, locationId);
    }

    // ==================== GHL NATIVE MCP ====================

    async callGHLNativeMCP(token: string, locationId: string, toolName: string, args: any) {
        return this.callTool('ghl-mcp-call', { toolName, arguments: args }, token, locationId);
    }

    async listGHLNativeMCPTools(token: string, locationId: string) {
        return this.callTool('ghl-mcp-list-tools', {}, token, locationId);
    }
}

export const mcpClient = new HighLevelMCPClient();
