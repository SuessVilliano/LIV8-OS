import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authService } from '../services/auth.js';
import { db } from '../db/index.js';
import {
    agentSessions,
    createCheckpointer,
    startOnboardingSession,
    resumeOnboardingSession,
    submitApprovalDecision,
    getOnboardingState,
    AI_STAFF_TEMPLATES
} from '../agents/index.js';

const router = express.Router();

/**
 * Authentication middleware
 */
const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);
        (req as any).user = payload;
        next();
    } catch (error: any) {
        console.error('[Agents API] Auth error:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/agents/onboarding/start
 * Start a new onboarding session
 */
router.post('/onboarding/start', async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        const { locationId } = req.body;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        // Generate unique thread ID
        const threadId = `onboarding-${locationId}-${uuidv4().slice(0, 8)}`;

        // Create session in database
        const session = await agentSessions.create({
            threadId,
            agentType: 'onboarding',
            locationId,
            userId: user.userId,
            agencyId: user.agencyId,
            status: 'active'
        });

        // Start the onboarding agent
        const checkpointer = createCheckpointer();
        const result = await startOnboardingSession({
            threadId,
            locationId,
            userId: user.userId,
            agencyId: user.agencyId,
            checkpointer
        });

        // Update session with current state
        await agentSessions.updateState(threadId, {
            currentStep: result.currentStep,
            awaitingUserInput: result.awaitingUserInput
        });
        await agentSessions.updateStatus(
            threadId,
            result.awaitingUserInput ? 'awaiting_input' : 'active',
            result.currentStep
        );

        // Log event
        await agentSessions.logEvent({
            sessionId: session.id,
            eventType: 'session_start',
            nodeName: 'greet',
            eventData: { locationId }
        });

        // Return response
        res.json({
            success: true,
            sessionId: session.id,
            threadId,
            messages: result.messages.map(m => ({
                role: m._getType(),
                content: m.content
            })),
            currentStep: result.currentStep,
            awaitingInput: result.awaitingUserInput
        });

    } catch (error: any) {
        console.error('[Agents API] Start error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agents/onboarding/message
 * Send a message to the onboarding agent
 */
router.post('/onboarding/message', async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        const { threadId, message } = req.body;

        if (!threadId) {
            return res.status(400).json({ error: 'threadId is required' });
        }
        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        // Verify session exists
        const session = await agentSessions.getByThreadId(threadId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Resume the agent with user's message
        const checkpointer = createCheckpointer();
        const result = await resumeOnboardingSession({
            threadId,
            userMessage: message,
            checkpointer
        });

        // Update session
        await agentSessions.updateState(threadId, {
            currentStep: result.currentStep,
            awaitingUserInput: result.awaitingUserInput,
            brandBrain: result.brandBrain ? true : false,
            selectedStaff: result.selectedStaff,
            goals: result.goals,
            buildPlan: result.buildPlan ? true : false,
            approvalStatus: result.approvalStatus
        });

        const newStatus = result.awaitingUserInput ? 'awaiting_input' :
            result.approvalStatus === 'pending' ? 'awaiting_approval' : 'active';
        await agentSessions.updateStatus(threadId, newStatus, result.currentStep);

        // Log event
        await agentSessions.logEvent({
            sessionId: session.id,
            eventType: 'user_input',
            nodeName: result.currentStep,
            eventData: { messageLength: message.length }
        });

        // Get latest AI messages (last 2)
        const latestMessages = result.messages.slice(-2).map(m => ({
            role: m._getType(),
            content: m.content
        }));

        res.json({
            success: true,
            messages: latestMessages,
            currentStep: result.currentStep,
            awaitingInput: result.awaitingUserInput,
            state: {
                hasBrandBrain: !!result.brandBrain,
                selectedStaff: result.selectedStaff,
                goals: result.goals,
                hasBuildPlan: !!result.buildPlan,
                approvalStatus: result.approvalStatus,
                deploymentSuccess: result.deploymentResult?.success
            }
        });

    } catch (error: any) {
        console.error('[Agents API] Message error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agents/onboarding/approve
 * Approve or reject the build plan
 */
router.post('/onboarding/approve', async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        const { threadId, approved, notes } = req.body;

        if (!threadId) {
            return res.status(400).json({ error: 'threadId is required' });
        }
        if (typeof approved !== 'boolean') {
            return res.status(400).json({ error: 'approved (boolean) is required' });
        }

        // Verify session exists
        const session = await agentSessions.getByThreadId(threadId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Submit approval decision
        const checkpointer = createCheckpointer();
        const result = await submitApprovalDecision({
            threadId,
            approved,
            notes,
            checkpointer
        });

        // Update session
        await agentSessions.updateStatus(
            threadId,
            result.awaitingUserInput ? 'awaiting_input' : 'active',
            result.currentStep
        );

        // Log approval event
        await db.logAction(
            user.userId,
            user.agencyId,
            session.location_id,
            approved ? 'approve_build_plan' : 'reject_build_plan',
            'agents.onboarding',
            { approved, notes },
            { step: result.currentStep },
            'success'
        );

        await agentSessions.logEvent({
            sessionId: session.id,
            eventType: approved ? 'approval_received' : 'approval_received',
            nodeName: result.currentStep,
            eventData: { approved, notes }
        });

        res.json({
            success: true,
            messages: result.messages.slice(-2).map(m => ({
                role: m._getType(),
                content: m.content
            })),
            currentStep: result.currentStep,
            awaitingInput: result.awaitingUserInput,
            deploymentResult: result.deploymentResult
        });

    } catch (error: any) {
        console.error('[Agents API] Approve error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agents/onboarding/session/:threadId
 * Get session state and history
 */
router.get('/onboarding/session/:threadId', async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;

        // Get session from database
        const session = await agentSessions.getByThreadId(threadId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Get current state from agent
        const checkpointer = createCheckpointer();
        const state = await getOnboardingState({ threadId, checkpointer });

        // Get recent events
        const events = await agentSessions.getEvents(session.id, 20);

        res.json({
            success: true,
            session: {
                id: session.id,
                threadId: session.thread_id,
                agentType: session.agent_type,
                locationId: session.location_id,
                status: session.status,
                currentNode: session.current_node,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            },
            state: state ? {
                currentStep: state.currentStep,
                awaitingInput: state.awaitingUserInput,
                hasBrandBrain: !!state.brandBrain,
                brandName: state.brandBrain?.brand_name,
                selectedStaff: state.selectedStaff,
                goals: state.goals,
                hasBuildPlan: !!state.buildPlan,
                approvalStatus: state.approvalStatus,
                deploymentResult: state.deploymentResult,
                errorCount: state.errorCount,
                lastError: state.lastError
            } : null,
            events: events.map(e => ({
                type: e.event_type,
                node: e.node_name,
                timestamp: e.timestamp
            }))
        });

    } catch (error: any) {
        console.error('[Agents API] Get session error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agents/sessions
 * List all sessions for user's agency
 */
router.get('/sessions', async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        const { status, locationId, limit = '50' } = req.query;

        let sessions;
        if (locationId) {
            sessions = await agentSessions.listByLocation(
                locationId as string,
                parseInt(limit as string)
            );
        } else {
            sessions = await agentSessions.listByAgency(
                user.agencyId,
                parseInt(limit as string)
            );
        }

        // Filter by status if provided
        if (status) {
            sessions = sessions.filter(s => s.status === status);
        }

        res.json({
            success: true,
            count: sessions.length,
            sessions: sessions.map(s => ({
                id: s.id,
                threadId: s.thread_id,
                agentType: s.agent_type,
                locationId: s.location_id,
                status: s.status,
                currentNode: s.current_node,
                createdAt: s.created_at,
                updatedAt: s.updated_at
            }))
        });

    } catch (error: any) {
        console.error('[Agents API] List sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agents/staff-templates
 * Get available AI staff templates
 */
router.get('/staff-templates', async (_req: Request, res: Response) => {
    res.json({
        success: true,
        templates: AI_STAFF_TEMPLATES
    });
});

/**
 * POST /api/agents/init-tables
 * Initialize agent database tables (admin only)
 */
router.post('/init-tables', async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        // Only allow owners/admins
        if (user.role !== 'owner' && user.role !== 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        await agentSessions.initTables();

        res.json({
            success: true,
            message: 'Agent tables initialized successfully'
        });

    } catch (error: any) {
        console.error('[Agents API] Init tables error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/agents/session/:threadId
 * Mark session as completed/cancelled
 */
router.delete('/session/:threadId', async (req: Request, res: Response) => {
    try {
        const { threadId } = req.params;

        const session = await agentSessions.getByThreadId(threadId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await agentSessions.complete(threadId);

        res.json({
            success: true,
            message: 'Session marked as completed'
        });

    } catch (error: any) {
        console.error('[Agents API] Delete session error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
