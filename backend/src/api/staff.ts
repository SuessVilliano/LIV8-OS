import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { agentExecutor } from '../services/agent-executor.js';
import { businessTwin } from '../db/business-twin.js';

const router = Router();

// Auth middleware
const authenticate = (req: Request, res: Response, next: any) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized - no token' });
        }

        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);

        (req as any).userId = payload.userId;
        (req as any).agencyId = payload.agencyId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * POST /api/staff/chat
 * Send a message to an AI staff member
 */
router.post('/chat', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, agentRole, message, sessionId, context } = req.body;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }
        if (!agentRole) {
            return res.status(400).json({ error: 'agentRole is required' });
        }
        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        // Valid agent roles
        const validRoles = ['marketing', 'sales', 'support', 'operations', 'manager', 'assistant'];
        if (!validRoles.includes(agentRole)) {
            return res.status(400).json({
                error: `Invalid agentRole. Must be one of: ${validRoles.join(', ')}`
            });
        }

        // Execute the agent
        const result = await agentExecutor.execute({
            sessionId,
            locationId,
            agentRole,
            userMessage: message,
            context
        });

        res.json({
            success: true,
            response: result.response,
            metadata: {
                sourcedFacts: result.sourcedFacts,
                constraintsApplied: result.constraintsApplied,
                sopExecuted: result.sopExecuted,
                requiresApproval: result.requiresApproval,
                approvalReason: result.approvalReason,
                escalateTo: result.escalateTo
            },
            suggestedActions: result.suggestedActions
        });

    } catch (error: any) {
        console.error('[Staff API] Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/staff/session
 * Start a new chat session with an AI staff member
 */
router.post('/session', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, agentRole } = req.body;

        if (!locationId || !agentRole) {
            return res.status(400).json({ error: 'locationId and agentRole are required' });
        }

        const session = await agentExecutor.startSession({
            locationId,
            agentRole
        });

        // Get agent info from twin
        const twin = await businessTwin.getByLocationId(locationId);
        const agentConfig = twin?.agentConfigs?.[agentRole];

        res.json({
            success: true,
            session: {
                id: session.id,
                agentRole: session.agentRole,
                agentName: agentConfig?.name || `${agentRole.charAt(0).toUpperCase() + agentRole.slice(1)} Agent`,
                createdAt: session.createdAt
            },
            greeting: getAgentGreeting(agentRole, twin?.identity?.businessName)
        });

    } catch (error: any) {
        console.error('[Staff API] Session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/staff/session/:sessionId
 * Get session details and history
 */
router.get('/session/:sessionId', authenticate, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const session = agentExecutor.getSession(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                agentRole: session.agentRole,
                locationId: session.locationId,
                messageCount: session.messages.length,
                createdAt: session.createdAt,
                lastActivityAt: session.lastActivityAt
            },
            messages: session.messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp
            }))
        });

    } catch (error: any) {
        console.error('[Staff API] Get session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/staff/roles
 * Get available AI staff roles for a location
 */
router.get('/roles/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        const twin = await businessTwin.getByLocationId(locationId);

        if (!twin) {
            return res.status(404).json({ error: 'Business Twin not found' });
        }

        const roles = Object.entries(twin.agentConfigs || {}).map(([role, config]: [string, any]) => ({
            id: role,
            name: config.name || role,
            description: getRoleDescription(role),
            isConfigured: true,
            systemPromptAdditions: config.systemPromptAdditions?.length || 0,
            allowedActions: config.allowedActions || [],
            restrictedActions: config.restrictedActions || []
        }));

        res.json({
            success: true,
            roles,
            businessName: twin.identity?.businessName
        });

    } catch (error: any) {
        console.error('[Staff API] Get roles error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/staff/quick-action
 * Execute a quick action without full conversation
 */
router.post('/quick-action', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, agentRole, action, params } = req.body;

        if (!locationId || !agentRole || !action) {
            return res.status(400).json({ error: 'locationId, agentRole, and action are required' });
        }

        // Map actions to agent-friendly prompts
        const actionPrompts: Record<string, string> = {
            'generate_social_post': `Create a social media post about: ${params?.topic || 'our business'}`,
            'draft_email': `Draft an email about: ${params?.subject || 'following up'}`,
            'answer_faq': `Answer this FAQ: ${params?.question || 'What do you do?'}`,
            'summarize_leads': 'Give me a summary of recent lead activity',
            'suggest_followups': 'What follow-ups should I prioritize today?',
            'create_sms': `Draft an SMS for: ${params?.purpose || 'appointment reminder'}`
        };

        const prompt = actionPrompts[action];
        if (!prompt) {
            return res.status(400).json({ error: `Unknown action: ${action}` });
        }

        const result = await agentExecutor.execute({
            locationId,
            agentRole,
            userMessage: prompt,
            context: params
        });

        res.json({
            success: true,
            action,
            result: result.response,
            metadata: {
                sourcedFacts: result.sourcedFacts.length,
                requiresApproval: result.requiresApproval
            }
        });

    } catch (error: any) {
        console.error('[Staff API] Quick action error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/staff/context/:locationId/:role
 * Get the full context that an agent sees (for debugging/transparency)
 */
router.get('/context/:locationId/:role', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, role } = req.params;

        const context = await businessTwin.generateAgentContext(locationId, role);
        const knowledge = await businessTwin.getKnowledge(locationId);
        const twin = await businessTwin.getByLocationId(locationId);

        if (!twin) {
            return res.status(404).json({ error: 'Business Twin not found' });
        }

        const applicableSOPs = (twin.sops || []).filter((sop: any) =>
            sop.isActive && (sop.appliesTo.includes('*') || sop.appliesTo.includes(role))
        );

        const applicableConstraints = (twin.constraints || []).filter((c: any) =>
            c.appliesTo.includes('*') || c.appliesTo.includes(role)
        );

        res.json({
            success: true,
            context,
            knowledge: knowledge.slice(0, 20), // First 20 facts
            knowledgeCount: knowledge.length,
            sops: applicableSOPs.map((s: any) => ({
                name: s.name,
                description: s.description,
                stepCount: s.steps?.length || 0
            })),
            constraints: applicableConstraints.map((c: any) => ({
                type: c.type,
                rule: c.rule,
                severity: c.severity
            })),
            agentConfig: twin.agentConfigs?.[role] || null
        });

    } catch (error: any) {
        console.error('[Staff API] Get context error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper functions
function getAgentGreeting(role: string, businessName?: string): string {
    const greetings: Record<string, string> = {
        marketing: `Hi! I'm your Marketing Manager. I can help you create content, plan campaigns, and optimize for AEO/SEO. What would you like to work on?`,
        sales: `Hello! I'm your Sales Agent. I can help qualify leads, answer prospect questions, and guide conversations toward booking. How can I assist?`,
        support: `Hi there! I'm your Support Agent. I can help answer customer questions, troubleshoot issues, and route complex matters appropriately. What do you need help with?`,
        operations: `Hello! I'm your Operations Specialist. I can help monitor systems, check on automations, and ensure everything's running smoothly. What would you like to review?`,
        manager: `Hi! I'm your AI Manager. I oversee the other AI staff members and can help with escalations, reporting, and coordination. What can I help you with?`,
        assistant: `Hello! I'm your Personal Assistant. I can help manage your schedule, provide updates, and handle whatever you need. What's on your mind?`
    };

    let greeting = greetings[role] || `Hello! I'm here to help. What can I do for you?`;

    if (businessName) {
        greeting = greeting.replace('your', `the ${businessName}`);
    }

    return greeting;
}

function getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
        marketing: 'Handles social content, email campaigns, SMS marketing, and brand consistency',
        sales: 'Qualifies leads, presents offers, handles objections, and closes deals',
        support: 'Handles FAQs, schedules appointments, and routes complex queries',
        operations: 'Oversees CRM, contact management, pipeline hygiene, and automations',
        manager: 'Supervises AI staff, generates reports, and handles escalations',
        assistant: 'Your direct line for updates, approvals, and personal tasks'
    };

    return descriptions[role] || 'AI staff member';
}

export default router;
