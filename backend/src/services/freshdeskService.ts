/**
 * Freshdesk Integration Service
 * Handles ticket management, AI analysis, and report generation
 */

interface FreshdeskTicket {
    id: number;
    subject: string;
    description: string;
    description_text: string;
    status: number;
    priority: number;
    type: string | null;
    source: number;
    requester_id: number;
    responder_id: number | null;
    created_at: string;
    updated_at: string;
    due_by: string | null;
    tags: string[];
    custom_fields: Record<string, any>;
    requester?: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
    };
    conversations?: FreshdeskConversation[];
}

interface FreshdeskConversation {
    id: number;
    body: string;
    body_text: string;
    incoming: boolean;
    private: boolean;
    user_id: number;
    created_at: string;
}

interface TicketAnalysis {
    ticketId: number;
    subject: string;
    category: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    sentiment: 'frustrated' | 'neutral' | 'positive';
    summary: string;
    suggestedResponse: string;
    similarResolved: {
        ticketId: number;
        subject: string;
        resolution: string;
        similarity: number;
    }[];
    estimatedResolutionTime: string;
    requiresEscalation: boolean;
    escalationReason?: string;
}

interface DailyReport {
    date: string;
    summary: {
        totalOpen: number;
        newToday: number;
        resolvedToday: number;
        overdueTickets: number;
        avgResponseTime: string;
        avgResolutionTime: string;
    };
    ticketsByType: Record<string, number>;
    ticketsByPriority: {
        urgent: number;
        high: number;
        medium: number;
        low: number;
    };
    needsAttention: TicketAnalysis[];
    aiSuggestions: {
        ticketId: number;
        subject: string;
        suggestedResponse: string;
    }[];
}

// Status mappings
const STATUS_MAP: Record<number, string> = {
    2: 'Open',
    3: 'Pending',
    4: 'Resolved',
    5: 'Closed'
};

const PRIORITY_MAP: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Urgent'
};

const SOURCE_MAP: Record<number, string> = {
    1: 'Email',
    2: 'Portal',
    3: 'Phone',
    7: 'Chat',
    9: 'Feedback Widget',
    10: 'Outbound Email'
};

class FreshdeskService {
    private apiKey: string;
    private domain: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.FRESHDESK_API_KEY || '';
        this.domain = process.env.FRESHDESK_DOMAIN || '';
        this.baseUrl = `https://${this.domain}.freshdesk.com/api/v2`;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        if (!this.apiKey || !this.domain) {
            throw new Error('Freshdesk API key or domain not configured');
        }

        const auth = Buffer.from(`${this.apiKey}:X`).toString('base64');

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Freshdesk API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    /**
     * Get all open tickets
     */
    async getOpenTickets(): Promise<FreshdeskTicket[]> {
        // Status 2 = Open, 3 = Pending
        const tickets = await this.request<FreshdeskTicket[]>(
            '/tickets?filter=open&include=requester'
        );
        return tickets;
    }

    /**
     * Get tickets by status
     */
    async getTicketsByStatus(status: 'open' | 'pending' | 'resolved' | 'closed'): Promise<FreshdeskTicket[]> {
        const statusMap = { open: 2, pending: 3, resolved: 4, closed: 5 };
        return this.request<FreshdeskTicket[]>(
            `/tickets?filter=${status}&include=requester`
        );
    }

    /**
     * Get recently resolved tickets for learning
     */
    async getResolvedTickets(days: number = 30): Promise<FreshdeskTicket[]> {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const dateStr = since.toISOString().split('T')[0];

        return this.request<FreshdeskTicket[]>(
            `/tickets?updated_since=${dateStr}&filter=resolved&include=requester`
        );
    }

    /**
     * Get ticket with conversations
     */
    async getTicketWithConversations(ticketId: number): Promise<FreshdeskTicket> {
        const [ticket, conversations] = await Promise.all([
            this.request<FreshdeskTicket>(`/tickets/${ticketId}?include=requester`),
            this.request<FreshdeskConversation[]>(`/tickets/${ticketId}/conversations`)
        ]);

        return { ...ticket, conversations };
    }

    /**
     * Reply to a ticket
     */
    async replyToTicket(ticketId: number, body: string, isPrivate: boolean = false): Promise<any> {
        return this.request(`/tickets/${ticketId}/reply`, {
            method: 'POST',
            body: JSON.stringify({
                body,
                private: isPrivate
            })
        });
    }

    /**
     * Update ticket status
     */
    async updateTicketStatus(ticketId: number, status: number): Promise<FreshdeskTicket> {
        return this.request<FreshdeskTicket>(`/tickets/${ticketId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    /**
     * Get ticket statistics
     */
    async getTicketStats(): Promise<{
        open: number;
        pending: number;
        resolved: number;
        overdue: number;
    }> {
        const [open, pending, resolved] = await Promise.all([
            this.request<FreshdeskTicket[]>('/tickets?filter=open'),
            this.request<FreshdeskTicket[]>('/tickets?filter=pending'),
            this.request<FreshdeskTicket[]>('/tickets?filter=resolved')
        ]);

        const now = new Date();
        const overdue = [...open, ...pending].filter(t =>
            t.due_by && new Date(t.due_by) < now
        ).length;

        return {
            open: open.length,
            pending: pending.length,
            resolved: resolved.length,
            overdue
        };
    }

    /**
     * Search tickets
     */
    async searchTickets(query: string): Promise<FreshdeskTicket[]> {
        const results = await this.request<{ results: FreshdeskTicket[] }>(
            `/search/tickets?query="${encodeURIComponent(query)}"`
        );
        return results.results || [];
    }

    /**
     * Get tickets created today
     */
    async getTicketsCreatedToday(): Promise<FreshdeskTicket[]> {
        const today = new Date().toISOString().split('T')[0];
        return this.request<FreshdeskTicket[]>(
            `/tickets?updated_since=${today}&include=requester`
        );
    }
}

export const freshdeskService = new FreshdeskService();
export type { FreshdeskTicket, FreshdeskConversation, TicketAnalysis, DailyReport };
