/**
 * GHL Agent Studio API Routes
 *
 * Provides endpoints for managing and executing GHL Agent Studio agents.
 * Uses the new Agent Studio Public API:
 *   - List agents: GET /agent-studio/public-api/agents
 *   - Get agent:   GET /agent-studio/public-api/agents/{agentId}
 *   - Execute:     POST /agent-studio/public-api/agents/{agentId}/execute
 *
 * Only agents in "Production" lifecycle stage are accessible.
 * Authentication via OAuth 2.0 bearer tokens or PIT.
 */

import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { createGHLClient } from '../services/ghl-api-client.js';

const router = Router();

// Auth middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);
        (req as any).user = payload;
        next();
    } catch (error: any) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Helper to get GHL client from request
function getGHLClient(req: Request) {
    const ghlToken = req.headers['x-ghl-token'] as string || process.env.GHL_ACCESS_TOKEN || '';
    const locationId = req.headers['x-location-id'] as string || process.env.GHL_LOCATION_ID || '';

    if (!ghlToken || !locationId) {
        throw new Error('GHL credentials not configured. Set x-ghl-token and x-location-id headers or configure environment variables.');
    }

    return createGHLClient(ghlToken, locationId);
}

// ============================================================
// AGENT STUDIO AGENTS
// ============================================================

/**
 * GET /api/agent-studio/agents
 * List all active Agent Studio agents for the location
 */
router.get('/agents', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const { limit, offset } = req.query;

        const data = await client.listAgentStudioAgents({
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined
        });

        res.json({
            success: true,
            agents: data.agents || data,
            total: data.total || (data.agents || []).length
        });
    } catch (error: any) {
        console.error('[AgentStudio] List agents error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agent-studio/agents/:agentId
 * Get full metadata for a specific Agent Studio agent
 */
router.get('/agents/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.getAgentStudioAgent(req.params.agentId);

        res.json({
            success: true,
            agent: data.agent || data
        });
    } catch (error: any) {
        console.error('[AgentStudio] Get agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agent-studio/agents/:agentId/execute
 * Execute an Agent Studio agent
 * Body: { input: string, executionId?: string }
 *
 * First call omits executionId; response returns executionId for conversation continuity.
 */
router.post('/agents/:agentId/execute', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const { input, executionId } = req.body;

        if (!input) {
            return res.status(400).json({ error: 'input is required' });
        }

        const data = await client.executeAgentStudioAgent(
            req.params.agentId,
            input,
            executionId
        );

        res.json({
            success: true,
            result: data.result || data.output || data,
            executionId: data.executionId,
            agentId: req.params.agentId
        });
    } catch (error: any) {
        console.error('[AgentStudio] Execute agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CONVERSATION AI AGENTS
// ============================================================

/**
 * GET /api/agent-studio/conversation-ai/agents
 * List all Conversation AI agents
 */
router.get('/conversation-ai/agents', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const { status, limit, offset } = req.query;

        const data = await client.listConversationAIAgents({
            status: status as string,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined
        });

        res.json({
            success: true,
            agents: data.agents || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] List agents error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agent-studio/conversation-ai/agents
 * Create a new Conversation AI agent
 */
router.post('/conversation-ai/agents', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const { name, type, status, prompt, knowledgeBaseIds, channels } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }

        const data = await client.createConversationAIAgent({
            name, type, status, prompt, knowledgeBaseIds, channels
        });

        res.json({
            success: true,
            agent: data.agent || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] Create agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agent-studio/conversation-ai/agents/:agentId
 * Get a specific Conversation AI agent
 */
router.get('/conversation-ai/agents/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.getConversationAIAgent(req.params.agentId);

        res.json({
            success: true,
            agent: data.agent || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] Get agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/agent-studio/conversation-ai/agents/:agentId
 * Update a Conversation AI agent
 */
router.put('/conversation-ai/agents/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.updateConversationAIAgent(req.params.agentId, req.body);

        res.json({
            success: true,
            agent: data.agent || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] Update agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/agent-studio/conversation-ai/agents/:agentId
 * Delete a Conversation AI agent
 */
router.delete('/conversation-ai/agents/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        await client.deleteConversationAIAgent(req.params.agentId);

        res.json({ success: true, message: 'Agent deleted' });
    } catch (error: any) {
        console.error('[ConversationAI] Delete agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CONVERSATION AI ACTIONS
// ============================================================

/**
 * GET /api/agent-studio/conversation-ai/agents/:agentId/actions
 * List actions for a Conversation AI agent
 */
router.get('/conversation-ai/agents/:agentId/actions', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.listConversationAIActions(req.params.agentId);

        res.json({
            success: true,
            actions: data.actions || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] List actions error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agent-studio/conversation-ai/agents/:agentId/actions
 * Attach an action to a Conversation AI agent
 */
router.post('/conversation-ai/agents/:agentId/actions', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.attachConversationAIAction(req.params.agentId, req.body);

        res.json({
            success: true,
            action: data.action || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] Create action error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/agent-studio/conversation-ai/agents/:agentId/actions/:actionId
 * Update a Conversation AI action
 */
router.put('/conversation-ai/agents/:agentId/actions/:actionId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.updateConversationAIAction(
            req.params.agentId,
            req.params.actionId,
            req.body
        );

        res.json({
            success: true,
            action: data.action || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] Update action error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/agent-studio/conversation-ai/agents/:agentId/actions/:actionId
 * Delete a Conversation AI action
 */
router.delete('/conversation-ai/agents/:agentId/actions/:actionId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        await client.deleteConversationAIAction(req.params.agentId, req.params.actionId);

        res.json({ success: true, message: 'Action deleted' });
    } catch (error: any) {
        console.error('[ConversationAI] Delete action error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CONVERSATION AI GENERATIONS (Analytics)
// ============================================================

/**
 * GET /api/agent-studio/conversation-ai/generations
 * Get AI generation details for analytics/compliance
 */
router.get('/conversation-ai/generations', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const { agentId, contactId, conversationId, limit, offset, startDate, endDate } = req.query;

        const data = await client.getConversationAIGenerations({
            agentId: agentId as string,
            contactId: contactId as string,
            conversationId: conversationId as string,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
            startDate: startDate as string,
            endDate: endDate as string
        });

        res.json({
            success: true,
            generations: data.generations || data
        });
    } catch (error: any) {
        console.error('[ConversationAI] Get generations error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// VOICE AI (GHL Native)
// ============================================================

/**
 * GET /api/agent-studio/voice-ai/agents
 * List GHL native Voice AI agents
 */
router.get('/voice-ai/agents', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const { limit, offset } = req.query;

        const data = await client.listVoiceAIAgents({
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined
        });

        res.json({
            success: true,
            agents: data.agents || data
        });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] List agents error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agent-studio/voice-ai/agents
 * Create a GHL native Voice AI agent
 */
router.post('/voice-ai/agents', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.createVoiceAIAgent(req.body);

        res.json({
            success: true,
            agent: data.agent || data
        });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] Create agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agent-studio/voice-ai/agents/:agentId
 * Get a specific GHL Voice AI agent
 */
router.get('/voice-ai/agents/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.getVoiceAIAgent(req.params.agentId);

        res.json({
            success: true,
            agent: data.agent || data
        });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] Get agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/agent-studio/voice-ai/agents/:agentId
 * Update a GHL Voice AI agent
 */
router.patch('/voice-ai/agents/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.updateVoiceAIAgent(req.params.agentId, req.body);

        res.json({
            success: true,
            agent: data.agent || data
        });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] Update agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/agent-studio/voice-ai/agents/:agentId
 * Delete a GHL Voice AI agent
 */
router.delete('/voice-ai/agents/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        await client.deleteVoiceAIAgent(req.params.agentId);

        res.json({ success: true, message: 'Voice AI agent deleted' });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] Delete agent error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agent-studio/voice-ai/agents/:agentId/actions
 * Create a Voice AI action (custom webhook)
 */
router.post('/voice-ai/agents/:agentId/actions', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.createVoiceAIAction(req.params.agentId, req.body);

        res.json({
            success: true,
            action: data.action || data
        });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] Create action error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agent-studio/voice-ai/calls
 * List Voice AI call logs with filters
 */
router.get('/voice-ai/calls', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.listVoiceAICallLogs(req.query as any);

        res.json({
            success: true,
            calls: data.calls || data
        });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] List calls error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agent-studio/voice-ai/calls/:callId
 * Get a specific call log with transcript
 */
router.get('/voice-ai/calls/:callId', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.getVoiceAICallLog(req.params.callId);

        res.json({
            success: true,
            call: data.call || data
        });
    } catch (error: any) {
        console.error('[VoiceAI-GHL] Get call error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// GHL NATIVE MCP SERVER BRIDGE
// ============================================================

/**
 * GET /api/agent-studio/mcp/tools
 * List available tools from GHL's native MCP server
 */
router.get('/mcp/tools', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const data = await client.listGHLMCPTools();

        res.json({
            success: true,
            tools: data.tools || data
        });
    } catch (error: any) {
        console.error('[GHL-MCP] List tools error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/agent-studio/mcp/call
 * Call a tool on GHL's native MCP server
 */
router.post('/mcp/call', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);
        const { toolName, arguments: args } = req.body;

        if (!toolName) {
            return res.status(400).json({ error: 'toolName is required' });
        }

        const data = await client.callGHLMCP(toolName, args || {});

        res.json({
            success: true,
            result: data
        });
    } catch (error: any) {
        console.error('[GHL-MCP] Call tool error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/agent-studio/overview
 * Get a unified overview of all AI agents (Agent Studio + Conversation AI + Voice AI)
 */
router.get('/overview', authenticate, async (req: Request, res: Response) => {
    try {
        const client = getGHLClient(req);

        const [studioAgents, conversationAgents, voiceAgents] = await Promise.allSettled([
            client.listAgentStudioAgents({ limit: 50 }),
            client.listConversationAIAgents({ limit: 50 }),
            client.listVoiceAIAgents({ limit: 50 })
        ]);

        res.json({
            success: true,
            overview: {
                agentStudio: {
                    agents: studioAgents.status === 'fulfilled' ? (studioAgents.value.agents || []) : [],
                    error: studioAgents.status === 'rejected' ? studioAgents.reason?.message : undefined
                },
                conversationAI: {
                    agents: conversationAgents.status === 'fulfilled' ? (conversationAgents.value.agents || []) : [],
                    error: conversationAgents.status === 'rejected' ? conversationAgents.reason?.message : undefined
                },
                voiceAI: {
                    agents: voiceAgents.status === 'fulfilled' ? (voiceAgents.value.agents || []) : [],
                    error: voiceAgents.status === 'rejected' ? voiceAgents.reason?.message : undefined
                }
            }
        });
    } catch (error: any) {
        console.error('[AgentStudio] Overview error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
