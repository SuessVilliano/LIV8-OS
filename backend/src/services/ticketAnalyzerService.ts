/**
 * AI Ticket Analyzer Service
 * Cross-references with resolved tickets to generate intelligent responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { freshdeskService, FreshdeskTicket, TicketAnalysis, DailyReport } from './freshdeskService.js';

interface ResolvedTicketCache {
    tickets: FreshdeskTicket[];
    lastUpdated: Date;
}

interface CompanyStandards {
    greeting: string;
    closing: string;
    tone: string;
    maxResponseLength: number;
    escalationKeywords: string[];
    priorityKeywords: Record<string, string[]>;
}

const DEFAULT_STANDARDS: CompanyStandards = {
    greeting: "Hi {name},\n\nThank you for reaching out to our support team.",
    closing: "Please let us know if you have any other questions.\n\nBest regards,\nLIV8 Support Team",
    tone: "professional, friendly, concise, solution-focused",
    maxResponseLength: 300,
    escalationKeywords: ['legal', 'lawyer', 'sue', 'refund', 'cancel subscription', 'data breach', 'security'],
    priorityKeywords: {
        critical: ['down', 'broken', 'urgent', 'emergency', 'not working', 'outage'],
        high: ['error', 'bug', 'issue', 'problem', 'cant', "can't", 'unable'],
        medium: ['question', 'how to', 'help', 'configure', 'setup'],
        low: ['suggestion', 'feature request', 'nice to have', 'wondering']
    }
};

class TicketAnalyzerService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private resolvedCache: ResolvedTicketCache | null = null;
    private standards: CompanyStandards = DEFAULT_STANDARDS;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    /**
     * Load resolved tickets for learning (cached)
     */
    private async loadResolvedTickets(): Promise<FreshdeskTicket[]> {
        const now = new Date();
        const cacheAge = this.resolvedCache
            ? (now.getTime() - this.resolvedCache.lastUpdated.getTime()) / 1000 / 60
            : Infinity;

        // Refresh cache every 30 minutes
        if (!this.resolvedCache || cacheAge > 30) {
            try {
                const tickets = await freshdeskService.getResolvedTickets(60);

                // Get conversations for each ticket (limit to 50 for performance)
                const ticketsWithConversations = await Promise.all(
                    tickets.slice(0, 50).map(async (ticket) => {
                        try {
                            return await freshdeskService.getTicketWithConversations(ticket.id);
                        } catch {
                            return ticket;
                        }
                    })
                );

                this.resolvedCache = {
                    tickets: ticketsWithConversations,
                    lastUpdated: now
                };
            } catch (error) {
                console.error('Failed to load resolved tickets:', error);
                if (!this.resolvedCache) {
                    this.resolvedCache = { tickets: [], lastUpdated: now };
                }
            }
        }

        return this.resolvedCache.tickets;
    }

    /**
     * Find similar resolved tickets
     */
    private async findSimilarTickets(ticket: FreshdeskTicket, resolvedTickets: FreshdeskTicket[]): Promise<{
        ticketId: number;
        subject: string;
        resolution: string;
        similarity: number;
    }[]> {
        if (resolvedTickets.length === 0) return [];

        const ticketText = `${ticket.subject} ${ticket.description_text || ticket.description}`.toLowerCase();
        const ticketWords = new Set(ticketText.split(/\s+/).filter(w => w.length > 3));

        const similarities = resolvedTickets.map(resolved => {
            const resolvedText = `${resolved.subject} ${resolved.description_text || resolved.description}`.toLowerCase();
            const resolvedWords = new Set(resolvedText.split(/\s+/).filter(w => w.length > 3));

            // Calculate Jaccard similarity
            const intersection = [...ticketWords].filter(w => resolvedWords.has(w)).length;
            const union = new Set([...ticketWords, ...resolvedWords]).size;
            const similarity = union > 0 ? intersection / union : 0;

            // Get resolution from last agent response
            const agentResponses = resolved.conversations?.filter(c => !c.incoming && !c.private) || [];
            const lastResponse = agentResponses[agentResponses.length - 1];
            const resolution = lastResponse?.body_text || lastResponse?.body || 'No resolution recorded';

            return {
                ticketId: resolved.id,
                subject: resolved.subject,
                resolution: resolution.substring(0, 500),
                similarity: Math.round(similarity * 100)
            };
        });

        return similarities
            .filter(s => s.similarity > 20)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
    }

    /**
     * Determine ticket urgency based on content
     */
    private determineUrgency(ticket: FreshdeskTicket): 'critical' | 'high' | 'medium' | 'low' {
        const text = `${ticket.subject} ${ticket.description_text || ''}`.toLowerCase();

        for (const [urgency, keywords] of Object.entries(this.standards.priorityKeywords)) {
            if (keywords.some(kw => text.includes(kw))) {
                return urgency as 'critical' | 'high' | 'medium' | 'low';
            }
        }

        // Map Freshdesk priority to urgency
        const priorityMap: Record<number, 'critical' | 'high' | 'medium' | 'low'> = {
            4: 'critical',
            3: 'high',
            2: 'medium',
            1: 'low'
        };

        return priorityMap[ticket.priority] || 'medium';
    }

    /**
     * Check if ticket requires escalation
     */
    private checkEscalation(ticket: FreshdeskTicket): { requires: boolean; reason?: string } {
        const text = `${ticket.subject} ${ticket.description_text || ''}`.toLowerCase();

        for (const keyword of this.standards.escalationKeywords) {
            if (text.includes(keyword)) {
                return { requires: true, reason: `Contains escalation keyword: "${keyword}"` };
            }
        }

        // Check for repeated contacts (3+ conversations from customer)
        const customerMessages = ticket.conversations?.filter(c => c.incoming).length || 0;
        if (customerMessages >= 3) {
            return { requires: true, reason: 'Customer has contacted multiple times without resolution' };
        }

        return { requires: false };
    }

    /**
     * Analyze sentiment of ticket
     */
    private async analyzeSentiment(text: string): Promise<'frustrated' | 'neutral' | 'positive'> {
        const frustratedWords = ['frustrated', 'angry', 'upset', 'disappointed', 'terrible', 'worst', 'horrible', 'ridiculous', 'unacceptable'];
        const positiveWords = ['thanks', 'thank you', 'appreciate', 'great', 'helpful', 'excellent'];

        const lowerText = text.toLowerCase();

        if (frustratedWords.some(w => lowerText.includes(w))) return 'frustrated';
        if (positiveWords.some(w => lowerText.includes(w))) return 'positive';
        return 'neutral';
    }

    /**
     * Generate AI response for ticket
     */
    async generateResponse(ticket: FreshdeskTicket, similarResolved: any[]): Promise<string> {
        const requesterName = ticket.requester?.name?.split(' ')[0] || 'there';

        const contextFromResolved = similarResolved.length > 0
            ? `\n\nSimilar resolved tickets and their solutions:\n${similarResolved.map((t, i) =>
                `${i + 1}. Issue: "${t.subject}"\n   Resolution: ${t.resolution.substring(0, 200)}...`
            ).join('\n')}`
            : '';

        const prompt = `You are a support agent for LIV8, a GoHighLevel-based CRM and AI automation platform.

Generate a professional, concise support response for this ticket:

Subject: ${ticket.subject}
Description: ${ticket.description_text || ticket.description}
${contextFromResolved}

COMPANY STANDARDS:
- Tone: ${this.standards.tone}
- Max length: ${this.standards.maxResponseLength} words
- Be direct and solution-focused
- If you need more information, ask specific questions
- Never make promises about timelines without certainty

Customer name: ${requesterName}

Write ONLY the response body (no subject line, no greeting like "Hi", no closing signature - those will be added automatically).
Focus on the solution or next steps.`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            // Format with greeting and closing
            const greeting = this.standards.greeting.replace('{name}', requesterName);
            const fullResponse = `${greeting}\n\n${response}\n\n${this.standards.closing}`;

            return fullResponse;
        } catch (error) {
            console.error('AI response generation failed:', error);
            return `${this.standards.greeting.replace('{name}', requesterName)}\n\nThank you for contacting us. Our team is reviewing your request and will respond shortly.\n\n${this.standards.closing}`;
        }
    }

    /**
     * Analyze a single ticket
     */
    async analyzeTicket(ticket: FreshdeskTicket): Promise<TicketAnalysis> {
        const resolvedTickets = await this.loadResolvedTickets();
        const similarResolved = await this.findSimilarTickets(ticket, resolvedTickets);
        const urgency = this.determineUrgency(ticket);
        const escalation = this.checkEscalation(ticket);
        const sentiment = await this.analyzeSentiment(ticket.description_text || ticket.description || '');

        // Generate AI summary
        let summary = '';
        try {
            const summaryResult = await this.model.generateContent(
                `Summarize this support ticket in 1-2 sentences:\nSubject: ${ticket.subject}\nDescription: ${ticket.description_text || ticket.description}`
            );
            summary = summaryResult.response.text();
        } catch {
            summary = ticket.subject;
        }

        // Generate suggested response
        const suggestedResponse = await this.generateResponse(ticket, similarResolved);

        // Estimate resolution time
        const resolutionTimes: Record<string, string> = {
            critical: '1-2 hours',
            high: '4-8 hours',
            medium: '24-48 hours',
            low: '2-3 business days'
        };

        return {
            ticketId: ticket.id,
            subject: ticket.subject,
            category: ticket.type || 'General',
            urgency,
            sentiment,
            summary,
            suggestedResponse,
            similarResolved,
            estimatedResolutionTime: resolutionTimes[urgency],
            requiresEscalation: escalation.requires,
            escalationReason: escalation.reason
        };
    }

    /**
     * Analyze all open tickets
     */
    async analyzeOpenTickets(): Promise<TicketAnalysis[]> {
        const openTickets = await freshdeskService.getOpenTickets();

        const analyses = await Promise.all(
            openTickets.map(ticket => this.analyzeTicket(ticket))
        );

        // Sort by urgency
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return analyses.sort((a, b) =>
            urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
        );
    }

    /**
     * Generate daily report
     */
    async generateDailyReport(): Promise<DailyReport> {
        const [openTickets, stats, todayTickets] = await Promise.all([
            freshdeskService.getOpenTickets(),
            freshdeskService.getTicketStats(),
            freshdeskService.getTicketsCreatedToday()
        ]);

        // Analyze tickets needing attention
        const analyses = await Promise.all(
            openTickets.slice(0, 20).map(t => this.analyzeTicket(t))
        );

        const needsAttention = analyses.filter(a =>
            a.urgency === 'critical' ||
            a.urgency === 'high' ||
            a.requiresEscalation ||
            a.sentiment === 'frustrated'
        );

        // Count by type
        const ticketsByType: Record<string, number> = {};
        openTickets.forEach(t => {
            const type = t.type || 'Unclassified';
            ticketsByType[type] = (ticketsByType[type] || 0) + 1;
        });

        // Count by priority
        const ticketsByPriority = {
            urgent: openTickets.filter(t => t.priority === 4).length,
            high: openTickets.filter(t => t.priority === 3).length,
            medium: openTickets.filter(t => t.priority === 2).length,
            low: openTickets.filter(t => t.priority === 1).length
        };

        // AI suggestions for top tickets
        const aiSuggestions = analyses.slice(0, 10).map(a => ({
            ticketId: a.ticketId,
            subject: a.subject,
            suggestedResponse: a.suggestedResponse
        }));

        return {
            date: new Date().toISOString().split('T')[0],
            summary: {
                totalOpen: stats.open + stats.pending,
                newToday: todayTickets.length,
                resolvedToday: stats.resolved,
                overdueTickets: stats.overdue,
                avgResponseTime: 'N/A', // Would need ticket audit data
                avgResolutionTime: 'N/A'
            },
            ticketsByType,
            ticketsByPriority,
            needsAttention,
            aiSuggestions
        };
    }

    /**
     * Update company standards
     */
    setCompanyStandards(standards: Partial<CompanyStandards>) {
        this.standards = { ...this.standards, ...standards };
    }
}

export const ticketAnalyzerService = new TicketAnalyzerService();
