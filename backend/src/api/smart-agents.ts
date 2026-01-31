/**
 * Smart Agents API
 *
 * REST endpoints for the autonomous AI agents system.
 * Allows users to:
 * - Chat with AI to create agents, content, knowledge
 * - Deploy systems to GHL
 * - Manage autonomous workflows
 */

import { Router, Request, Response } from 'express';
import { authenticateMcp } from '../middleware/authenticateMcp.js';
import {
    createSmartAgentsController,
    STAFF_TEMPLATES,
    AVAILABLE_SNAPSHOTS,
    TASKMAGIC_WORKFLOWS
} from '../agents/smart-agents/index.js';
import { brandScanner } from '../services/brand-scanner.ts'; // Corrected import and usage
import { db } from '../db/index.js'; // Corrected import for db object

const router = Router();
const smartAgents = createSmartAgentsController();

// ========== ORCHESTRATOR (Natural Language) ==========

/**
 * POST /api/smart-agents/chat
 * Process natural language request through the orchestrator
 */
router.post('/chat', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { message, brandBrainId } = req.body;
        const { userId, locationId } = req.user as any;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const sessionId = `session_${locationId}_${Date.now()}`;

        const result = await smartAgents.processRequest({
            sessionId,
            locationId,
            userId,
            message,
            brandBrainId
        });

        // Log the interaction
        await db.logAction({
            userId,
            locationId,
            action: 'smart_agent_chat',
            details: {
                intent: result.intent,
                awaitingApproval: result.awaitingApproval,
                taskResultsCount: result.taskResults.length
            }
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== AGENT BUILDING ==========

/**
 * GET /api/smart-agents/templates
 * Get available AI staff templates
 */
router.get('/templates', authenticateMcp, (req: Request, res: Response) => {
    res.json({
        templates: Object.entries(STAFF_TEMPLATES).map(([key, template]) => ({
            key,
            name: template.name,
            role: template.role,
            description: template.description,
            capabilities: template.capabilities
        }))
    });
});

/**
 * POST /api/smart-agents/build-agent
 * Build a single AI agent from template
 */
router.post('/build-agent', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { templateKey, brandBrainId, customizations } = req.body;
        const { locationId } = req.user as any;

        if (!templateKey || !brandBrainId) {
            return res.status(400).json({ error: 'templateKey and brandBrainId are required' });
        }

        // Get brand brain
        const brandBrain = await db.getBrandBrain(brandBrainId); // Corrected usage
        if (!brandBrain) {
            return res.status(404).json({ error: 'Brand brain not found' });
        }

        const agent = await smartAgents.buildAgent({
            templateKey,
            brandBrain,
            customizations
        });

        res.json({ agent });
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Build agent error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/build-team
 * Build a team of AI agents
 */
router.post('/build-team', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { templateKeys, brandBrainId } = req.body;
        const { locationId } = req.user as any;

        if (!templateKeys || !Array.isArray(templateKeys) || !brandBrainId) {
            return res.status(400).json({ error: 'templateKeys array and brandBrainId are required' });
        }

        const brandBrain = await db.getBrandBrain(brandBrainId); // Corrected usage
        if (!brandBrain) {
            return res.status(404).json({ error: 'Brand brain not found' });
        }

        const agents = await smartAgents.buildAgentTeam({
            templateKeys,
            brandBrain
        });

        res.json({ agents });
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Build team error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== CONTENT CREATION ==========

/**
 * POST /api/smart-agents/generate-content
 * Generate content (social posts, emails, SMS, blogs)
 */
router.post('/generate-content', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { type, topic, brandBrainId, platforms, sequenceLength, goal, tone } = req.body;
        const { locationId } = req.user as any;

        if (!type || !topic || !brandBrainId) {
            return res.status(400).json({ error: 'type, topic, and brandBrainId are required' });
        }

        const brandBrain = await db.getBrandBrain(brandBrainId); // Corrected usage
        if (!brandBrain) {
            return res.status(404).json({ error: 'Brand brain not found' });
        }

        const content = await smartAgents.generateContent({
            type,
            topic,
            brandBrainId,
            platforms,
            sequenceLength,
            goal,
            tone
        }, brandBrain);

        res.json({ content });
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Generate content error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/generate-calendar
 * Generate a content calendar
 */
router.post('/generate-calendar', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { brandBrainId, platforms, weeks, postsPerWeek, topics } = req.body;
        const { locationId } = req.user as any;

        if (!brandBrainId || !platforms || !weeks || !postsPerWeek) {
            return res.status(400).json({ error: 'brandBrainId, platforms, weeks, and postsPerWeek are required' });
        }

        const brandBrain = await db.getBrandBrain(brandBrainId); // Corrected usage
        if (!brandBrain) {
            return res.status(404).json({ error: 'Brand brain not found' });
        }

        const calendar = await smartAgents.generateContentCalendar({
            brandBrain,
            platforms,
            weeks,
            postsPerWeek,
            topics
        });

        res.json({ calendar, totalPosts: calendar.length });
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Generate calendar error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== KNOWLEDGE BUILDING ==========

/**
 * POST /api/smart-agents/build-knowledge
 * Build knowledge base from website
 */
router.post('/build-knowledge', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { websiteUrl } = req.body;
        const { locationId, userId } = req.user as any;

        if (!websiteUrl) {
            return res.status(400).json({ error: 'websiteUrl is required' });
        }

        const result = await smartAgents.buildKnowledgeFromWebsite(websiteUrl);

        // Save brand brain to DB
        await db.saveBrandBrain(locationId, result.brandBrain); // Corrected usage

        await db.logAction({
            userId,
            locationId,
            action: 'build_knowledge',
            details: {
                domain: result.brandBrain.domain,
                entriesCount: result.entries.length
            }
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Build knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/build-objections
 * Build objection handling scripts
 */
router.post('/build-objections', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { brandBrainId, customObjections } = req.body;
        const { locationId } = req.user as any;

        if (!brandBrainId) {
            return res.status(400).json({ error: 'brandBrainId is required' });
        }

        const brandBrain = await db.getBrandBrain(brandBrainId); // Corrected usage
        if (!brandBrain) {
            return res.status(404).json({ error: 'Brand brain not found' });
        }

        const handlers = await smartAgents.buildObjectionHandlers({
            brandBrain,
            commonObjections: customObjections
        });

        res.json({ handlers });
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Build objections error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== DEPLOYMENT ==========

/**
 * GET /api/smart-agents/snapshots
 * List available GHL snapshots
 */
router.get('/snapshots', authenticateMcp, (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;

    const snapshots = smartAgents.getAvailableSnapshots();
    const filtered = category
        ? snapshots.filter(s => s.category === category)
        : snapshots;

    res.json({ snapshots: filtered });
});

/**
 * POST /api/smart-agents/recommend-snapshot
 * Get snapshot recommendations based on goals
 */
router.post('/recommend-snapshot', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { goals, industry } = req.body;

        if (!goals || !Array.isArray(goals)) {
            return res.status(400).json({ error: 'goals array is required' });
        }

        const recommendations = smartAgents.recommendSnapshot({
            goals,
            industry: industry || 'general'
        });

        res.json({ recommendations });
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Recommend snapshot error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/deploy-snapshot
 * Deploy a snapshot to GHL
 */
router.post('/deploy-snapshot', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { snapshotId, variables, dryRun } = req.body;
        const { locationId, userId } = req.user as any;

        if (!snapshotId) {
            return res.status(400).json({ error: 'snapshotId is required' });
        }

        const result = await smartAgents.deploySnapshot({
            method: 'snapshot',
            snapshotId,
            snapshotOverrides: variables,
            locationId,
            dryRun: dryRun ?? true
        });

        await db.logAction({
            userId,
            locationId,
            action: 'deploy_snapshot',
            details: {
                snapshotId,
                dryRun,
                success: result.success
            }
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Deploy snapshot error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/smart-agents/taskmagic/workflows
 * List TaskMagic workflows
 */
router.get('/taskmagic/workflows', authenticateMcp, (req: Request, res: Response) => {
    const workflows = Object.entries(TASKMAGIC_WORKFLOWS).map(([key, wf]) => ({
        key,
        id: wf.id,
        name: wf.name,
        description: wf.description,
        stepsCount: wf.steps.length
    }));

    res.json({
        configured: smartAgents.isTaskMagicConfigured(),
        workflows
    });
});

/**
 * POST /api/smart-agents/taskmagic/trigger
 * Trigger a TaskMagic workflow
 */
router.post('/taskmagic/trigger', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { workflowId, variables } = req.body;
        const { locationId, userId } = req.user as any;

        if (!workflowId) {
            return res.status(400).json({ error: 'workflowId is required' });
        }

        const result = await smartAgents.triggerTaskMagicWorkflow({
            workflowId,
            variables: variables || {},
            locationId
        });

        await db.logAction({
            userId,
            locationId,
            action: 'taskmagic_trigger',
            details: { workflowId, success: result.success }
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] TaskMagic trigger error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/verify-connection
 * Verify GHL connection and capabilities
 */
router.post('/verify-connection', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.user as any;

        // Get token from DB
        const tokenData = await db.getLocationToken(locationId);
        if (!tokenData) {
            return res.status(404).json({ error: 'Location token not found' });
        }

        const result = await smartAgents.verifyGHLConnection({
            token: tokenData.access_token,
            locationId
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Verify connection error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== FULL AUTOMATION ==========

/**
 * POST /api/smart-agents/full-setup
 * Run full autonomous onboarding
 */
router.post('/full-setup', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { websiteUrl, goals, selectedAgents } = req.body;
        const { locationId, userId } = req.user as any;

        if (!websiteUrl) {
            return res.status(400).json({ error: 'websiteUrl is required' });
        }

        // Get token from DB
        const tokenData = await db.getLocationToken(locationId);
        if (!tokenData) {
            return res.status(404).json({ error: 'Location token not found. Please connect your GHL account first.' });
        }

        const result = await smartAgents.fullAutonomousSetup({
            websiteUrl,
            locationId,
            token: tokenData.access_token,
            userId,
            goals,
            selectedAgents
        });

        // Save brand brain to DB
        await db.saveBrandBrain(locationId, result.brandBrain);

        await db.logAction({
            userId,
            locationId,
            action: 'full_autonomous_setup',
            details: {
                websiteUrl,
                status: result.status,
                agentsCount: result.agents.length,
                knowledgeCount: result.knowledge.length
            }
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Full setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/quick-setup
 * Run quick setup (creates standard tags and basic config)
 */
router.post('/quick-setup', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { brandBrainId } = req.body;
        const { locationId, userId } = req.user as any;

        if (!brandBrainId) {
            return res.status(400).json({ error: 'brandBrainId is required' });
        }

        const brandBrain = await db.getBrandBrain(brandBrainId); // Corrected usage
        if (!brandBrain) {
            return res.status(404).json({ error: 'Brand brain not found' });
        }

        const tokenData = await db.getLocationToken(locationId);
        if (!tokenData) {
            return res.status(404).json({ error: 'Location token not found' });
        }

        const result = await smartAgents.quickSetup({
            brandBrain,
            token: tokenData.access_token,
            locationId
        });

        await db.logAction({
            userId,
            locationId,
            action: 'quick_setup',
            details: { success: result.success }
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] Quick setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== MOLT.BOT INTEGRATION ==========

/**
 * POST /api/smart-agents/moltbot/connect
 * Connect to Molt.bot master brain
 */
router.post('/moltbot/connect', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const result = await smartAgents.connectMoltBot();
        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] MoltBot connect error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/smart-agents/moltbot/status
 * Get Molt.bot connection status
 */
router.get('/moltbot/status', authenticateMcp, (req: Request, res: Response) => {
    res.json(smartAgents.getMoltBotStatus());
});

/**
 * POST /api/smart-agents/moltbot/task
 * Submit a task to Molt.bot
 */
router.post('/moltbot/task', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { type, input } = req.body;
        const { locationId, userId } = req.user as any;

        if (!type || !input) {
            return res.status(400).json({ error: 'type and input are required' });
        }

        const result = await smartAgents.submitToMoltBot({
            type,
            input,
            locationId,
            userId
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] MoltBot task error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/moltbot/chat
 * Chat with Molt.bot
 */
router.post('/moltbot/chat', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { message, sessionId } = req.body;
        const { locationId } = req.user as any;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        const result = await smartAgents.chatWithMoltBot({
            message,
            sessionId: sessionId || `session_${Date.now()}`,
            locationId
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] MoltBot chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== MCP BRIDGE ==========

/**
 * POST /api/smart-agents/mcp/register
 * Register an MCP server
 */
router.post('/mcp/register', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { id, name, endpoint, protocol } = req.body;

        if (!id || !name || !endpoint || !protocol) {
            return res.status(400).json({ error: 'id, name, endpoint, and protocol are required' });
        }

        const result = await smartAgents.registerMCPServer({
            id,
            name,
            endpoint,
            protocol
        });

        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] MCP register error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/smart-agents/mcp/call
 * Call an MCP tool
 */
router.post('/mcp/call', authenticateMcp, async (req: Request, res: Response) => {
    try {
        const { toolName, args } = req.body;

        if (!toolName) {
            return res.status(400).json({ error: 'toolName is required' });
        }

        const result = await smartAgents.callMCPTool(toolName, args || {});
        res.json(result);
    } catch (error: any) {
        console.error('[SmartAgentsAPI] MCP call error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/smart-agents/mcp/tools
 * List all available MCP tools
 */
router.get('/mcp/tools', authenticateMcp, (req: Request, res: Response) => {
    res.json({ tools: smartAgents.listMCPTools() });
});

/**
 * GET /api/smart-agents/mcp/status
 * Get MCP bridge status
 */
router.get('/mcp/status', authenticateMcp, (req: Request, res: Response) => {
    res.json(smartAgents.getMCPBridgeStatus());
});

// ========== HEALTH CHECK ==========

/**
 * GET /api/smart-agents/status
 * Get smart agents system status
 */
router.get('/status', (req: Request, res: Response) => {
    res.json(smartAgents.getSystemStatus());
});

export default router;
