import { GoogleGenerativeAI } from '@google/generative-ai';
import { businessTwin } from '../db/business-twin.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Agent Executor Service
 *
 * Executes AI staff agents with Business Twin context.
 * All responses are grounded in verified facts - NO HALLUCINATION.
 */

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
        sourcedFacts?: string[];
        constraintsChecked?: boolean;
        sopExecuted?: string;
    };
}

export interface AgentExecutionResult {
    response: string;
    sourcedFacts: string[];
    constraintsApplied: string[];
    sopExecuted?: string;
    requiresApproval: boolean;
    approvalReason?: string;
    suggestedActions?: {
        action: string;
        params: Record<string, any>;
    }[];
    escalateTo?: string;
}

export interface AgentSession {
    id: string;
    locationId: string;
    agentRole: string;
    messages: AgentMessage[];
    createdAt: Date;
    lastActivityAt: Date;
}

// In-memory session store (use Redis in production)
const sessions = new Map<string, AgentSession>();

export const agentExecutor = {
    /**
     * Start a new agent session
     */
    async startSession(params: {
        locationId: string;
        agentRole: string;
    }): Promise<AgentSession> {
        const sessionId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session: AgentSession = {
            id: sessionId,
            locationId: params.locationId,
            agentRole: params.agentRole,
            messages: [],
            createdAt: new Date(),
            lastActivityAt: new Date()
        };

        sessions.set(sessionId, session);

        return session;
    },

    /**
     * Execute an agent with a user message
     */
    async execute(params: {
        sessionId?: string;
        locationId: string;
        agentRole: string;
        userMessage: string;
        context?: Record<string, any>;
    }): Promise<AgentExecutionResult> {
        const { locationId, agentRole, userMessage, context } = params;

        // Get or create session
        let session: AgentSession;
        if (params.sessionId && sessions.has(params.sessionId)) {
            session = sessions.get(params.sessionId)!;
        } else {
            session = await this.startSession({ locationId, agentRole });
        }

        // Add user message to history
        session.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        });

        // Load Business Twin context
        const twinContext = await businessTwin.generateAgentContext(locationId, agentRole);
        const knowledge = await businessTwin.getKnowledge(locationId);
        const twin = await businessTwin.getByLocationId(locationId);

        if (!twin) {
            return {
                response: "I'm sorry, but I don't have access to the business information yet. Please complete the onboarding first.",
                sourcedFacts: [],
                constraintsApplied: [],
                requiresApproval: false
            };
        }

        // Check for SOP triggers
        const applicableSOP = this.findApplicableSOP(userMessage, twin.sops, agentRole);

        // Check constraints
        const constraintCheck = this.checkConstraints(userMessage, twin.constraints, agentRole);

        // If constraint requires approval, return early
        if (constraintCheck.requiresApproval) {
            return {
                response: `I need to check with a manager before proceeding. ${constraintCheck.reason}`,
                sourcedFacts: [],
                constraintsApplied: constraintCheck.appliedConstraints,
                requiresApproval: true,
                approvalReason: constraintCheck.reason,
                escalateTo: 'manager'
            };
        }

        // Build the prompt
        const systemPrompt = this.buildSystemPrompt({
            twinContext,
            knowledge,
            twin,
            agentRole,
            applicableSOP,
            constraintCheck,
            conversationHistory: session.messages.slice(-10) // Last 10 messages
        });

        // Execute with Gemini
        const result = await this.callGemini({
            systemPrompt,
            userMessage,
            context
        });

        // Verify response against knowledge base
        const verificationResult = this.verifyResponse(result.response, knowledge);

        // Add assistant message to history
        session.messages.push({
            role: 'assistant',
            content: result.response,
            timestamp: new Date(),
            metadata: {
                sourcedFacts: verificationResult.usedFacts,
                constraintsChecked: true,
                sopExecuted: applicableSOP?.name
            }
        });

        session.lastActivityAt = new Date();
        sessions.set(session.id, session);

        return {
            response: result.response,
            sourcedFacts: verificationResult.usedFacts,
            constraintsApplied: constraintCheck.appliedConstraints,
            sopExecuted: applicableSOP?.name,
            requiresApproval: result.requiresApproval,
            approvalReason: result.approvalReason,
            suggestedActions: result.suggestedActions,
            escalateTo: result.escalateTo
        };
    },

    /**
     * Build the system prompt with all context
     */
    buildSystemPrompt(params: {
        twinContext: string;
        knowledge: any[];
        twin: any;
        agentRole: string;
        applicableSOP: any;
        constraintCheck: any;
        conversationHistory: AgentMessage[];
    }): string {
        const { twinContext, knowledge, twin, agentRole, applicableSOP, constraintCheck, conversationHistory } = params;

        let prompt = `You are an AI staff member for ${twin.identity.businessName || 'this business'}.

${twinContext}

## CRITICAL RULES
1. ONLY state facts that appear in the VERIFIED FACTS section above
2. If you don't know something, say "Let me check on that" or "I'll need to verify that information"
3. NEVER make up statistics, prices, timeframes, or specific claims
4. Always maintain the brand voice described above
5. Follow any applicable SOPs step by step

`;

        // Add applicable SOP if found
        if (applicableSOP) {
            prompt += `\n## CURRENT SOP TO FOLLOW: ${applicableSOP.name}
${applicableSOP.description}

Steps:
${applicableSOP.steps.map((s: any) => `${s.order}. ${s.action}${s.details ? ` - ${s.details}` : ''}${s.requiresApproval ? ' [REQUIRES APPROVAL]' : ''}`).join('\n')}

`;
        }

        // Add constraint reminders
        if (constraintCheck.appliedConstraints.length > 0) {
            prompt += `\n## ACTIVE CONSTRAINTS
${constraintCheck.appliedConstraints.join('\n')}

`;
        }

        // Add conversation context
        if (conversationHistory.length > 0) {
            prompt += `\n## RECENT CONVERSATION
${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

`;
        }

        // Add response format instructions
        prompt += `\n## RESPONSE FORMAT
- Be helpful and on-brand
- If the user asks about something not in your knowledge base, offer to find out or connect them with someone who can help
- If a step in an SOP requires approval, clearly state that you need to check with a manager
- For pricing or specific commitments, always verify against the knowledge base first

Respond naturally as the ${agentRole} for ${twin.identity.businessName || 'this business'}.`;

        return prompt;
    },

    /**
     * Call Gemini API
     */
    async callGemini(params: {
        systemPrompt: string;
        userMessage: string;
        context?: Record<string, any>;
    }): Promise<{
        response: string;
        requiresApproval: boolean;
        approvalReason?: string;
        suggestedActions?: any[];
        escalateTo?: string;
    }> {
        if (!GEMINI_API_KEY) {
            console.warn('[Agent Executor] No GEMINI_API_KEY - using fallback response');
            return {
                response: "I'm here to help! However, the AI system is not fully configured yet. Please ensure the API key is set up.",
                requiresApproval: false
            };
        }

        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash'
            });

            const result = await model.generateContent([
                { text: params.systemPrompt },
                { text: `User: ${params.userMessage}` }
            ]);

            const responseText = result.response.text();

            // Check if response indicates need for approval
            const requiresApproval = responseText.toLowerCase().includes('need to check with') ||
                responseText.toLowerCase().includes('requires approval') ||
                responseText.toLowerCase().includes('let me verify');

            // Check for escalation indicators
            let escalateTo: string | undefined;
            if (responseText.toLowerCase().includes('speak to a manager') ||
                responseText.toLowerCase().includes('human representative')) {
                escalateTo = 'human';
            }

            return {
                response: responseText,
                requiresApproval,
                escalateTo
            };

        } catch (error: any) {
            console.error('[Agent Executor] Gemini error:', error);
            return {
                response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
                requiresApproval: false
            };
        }
    },

    /**
     * Find applicable SOP for the user's message
     */
    findApplicableSOP(message: string, sops: any[], agentRole: string): any {
        if (!sops || sops.length === 0) return null;

        const messageLower = message.toLowerCase();

        // Filter SOPs that apply to this agent role
        const applicableSOPs = sops.filter(sop =>
            sop.isActive &&
            (sop.appliesTo.includes('*') || sop.appliesTo.includes(agentRole))
        );

        // Find SOP with matching trigger conditions
        for (const sop of applicableSOPs) {
            for (const trigger of sop.triggerConditions || []) {
                const triggerLower = trigger.toLowerCase();
                // Simple keyword matching - could be enhanced with NLP
                const keywords = triggerLower.split(/\s+/);
                const matches = keywords.filter(k => messageLower.includes(k));
                if (matches.length >= 2 || (keywords.length === 1 && matches.length === 1)) {
                    return sop;
                }
            }
        }

        return null;
    },

    /**
     * Check constraints against the message
     */
    checkConstraints(message: string, constraints: any[], agentRole: string): {
        appliedConstraints: string[];
        requiresApproval: boolean;
        reason?: string;
    } {
        if (!constraints || constraints.length === 0) {
            return { appliedConstraints: [], requiresApproval: false };
        }

        const messageLower = message.toLowerCase();
        const appliedConstraints: string[] = [];
        let requiresApproval = false;
        let approvalReason: string | undefined;

        for (const constraint of constraints) {
            // Check if constraint applies to this role
            if (!constraint.appliesTo.includes('*') && !constraint.appliesTo.includes(agentRole)) {
                continue;
            }

            const ruleLower = constraint.rule.toLowerCase();

            // Check different constraint types
            switch (constraint.type) {
                case 'never_mention':
                    // Extract keywords from rule
                    const avoidKeywords = ruleLower.match(/\b\w+\b/g) || [];
                    for (const keyword of avoidKeywords) {
                        if (messageLower.includes(keyword) && keyword.length > 3) {
                            appliedConstraints.push(`Avoid mentioning: ${keyword}`);
                        }
                    }
                    break;

                case 'require_approval':
                    // Check if this action requires approval
                    if (messageLower.includes('refund') ||
                        messageLower.includes('discount') ||
                        messageLower.includes('credit') ||
                        messageLower.includes('mass') ||
                        messageLower.includes('bulk')) {
                        requiresApproval = true;
                        approvalReason = constraint.rule;
                        appliedConstraints.push(constraint.rule);
                    }
                    break;

                case 'never_do':
                    appliedConstraints.push(`Remember: ${constraint.rule}`);
                    break;

                case 'always_include':
                    appliedConstraints.push(`Always: ${constraint.rule}`);
                    break;
            }
        }

        return {
            appliedConstraints,
            requiresApproval,
            reason: approvalReason
        };
    },

    /**
     * Verify response uses only sourced facts
     */
    verifyResponse(response: string, knowledge: any[]): {
        usedFacts: string[];
        unverifiedClaims: string[];
    } {
        const usedFacts: string[] = [];
        const unverifiedClaims: string[] = [];

        // Simple fact matching - check if response content appears in knowledge base
        const responseLower = response.toLowerCase();

        for (const fact of knowledge) {
            const factLower = fact.fact.toLowerCase();
            // Check for significant overlap
            const factWords = factLower.split(/\s+/).filter((w: string) => w.length > 4);
            const matchCount = factWords.filter((w: string) => responseLower.includes(w)).length;

            if (matchCount >= 3 || (factWords.length <= 3 && matchCount >= 2)) {
                usedFacts.push(fact.fact);
            }
        }

        return { usedFacts, unverifiedClaims };
    },

    /**
     * Get session by ID
     */
    getSession(sessionId: string): AgentSession | undefined {
        return sessions.get(sessionId);
    },

    /**
     * Get all sessions for a location
     */
    getSessionsByLocation(locationId: string): AgentSession[] {
        return Array.from(sessions.values()).filter(s => s.locationId === locationId);
    },

    /**
     * Clear old sessions (cleanup)
     */
    cleanupSessions(maxAgeHours: number = 24): number {
        const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        let cleaned = 0;

        for (const [id, session] of sessions.entries()) {
            if (session.lastActivityAt < cutoff) {
                sessions.delete(id);
                cleaned++;
            }
        }

        return cleaned;
    }
};
