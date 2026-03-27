/**
 * Ask AI + Agent Studio Integration API Routes
 *
 * Connects the conversational power of Ask AI with the workflow flexibility
 * of Agent Studio. Routes chat queries to custom AI agents, automates
 * multi-step actions, and delivers answers faster.
 *
 * Features:
 *   - Intelligent agent routing based on capability descriptions
 *   - Dynamic variable configuration (fixed defaults or ask-at-runtime)
 *   - Agent mapping management for Ask AI
 *   - Execution with conversation continuity via executionId
 */

import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { createGHLClient } from '../services/ghl-api-client.js';

const router = Router();

// In-memory agent mapping store (use database in production)
const agentMappings: Map<string, AgentMapping[]> = new Map();

interface AgentMapping {
    id: string;
    agentId: string;
    agentName: string;
    description: string;
    capabilities: string[];
    variables: VariableMapping[];
    createdAt: string;
    updatedAt: string;
}

interface VariableMapping {
    name: string;
    type: 'text' | 'number' | 'choice' | 'boolean';
    value?: string;
    askAtRuntime: boolean;
    choices?: string[];
    description?: string;
}

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

function getGHLClient(req: Request) {
    const ghlToken = req.headers['x-ghl-token'] as string || process.env.GHL_ACCESS_TOKEN || '';
    const locationId = req.headers['x-location-id'] as string || process.env.GHL_LOCATION_ID || '';

    if (!ghlToken || !locationId) {
        throw new Error('GHL credentials not configured.');
    }

    return { client: createGHLClient(ghlToken, locationId), locationId };
}

// ============================================================
// ASK AI - INTELLIGENT ROUTING
// ============================================================

/**
 * POST /api/ask-ai/query
 * Send a natural language query to Ask AI.
 * The system evaluates mapped agents and routes to the best match,
 * or falls back to built-in AI capabilities.
 */
router.post('/query', authenticate, async (req: Request, res: Response) => {
    try {
        const { client, locationId } = getGHLClient(req);
        const { query, conversationId, executionId } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'query is required' });
        }

        // Get mapped agents for this location
        const mappings = agentMappings.get(locationId) || [];

        // Find best matching agent based on query vs capabilities
        const matchedAgent = findBestAgent(query, mappings);

        if (matchedAgent) {
            // Collect runtime variables that need user input
            const runtimeVars = matchedAgent.variables.filter(v => v.askAtRuntime);
            const fixedVars = matchedAgent.variables.filter(v => !v.askAtRuntime);

            // Build input with fixed variables
            let input = query;
            for (const v of fixedVars) {
                if (v.value) {
                    input += `\n${v.name}: ${v.value}`;
                }
            }

            // If there are runtime variables that haven't been provided, ask for them
            const providedVars = req.body.variables || {};
            const missingVars = runtimeVars.filter(v => !providedVars[v.name]);

            if (missingVars.length > 0) {
                return res.json({
                    success: true,
                    status: 'needs_input',
                    agentName: matchedAgent.agentName,
                    agentId: matchedAgent.agentId,
                    missingVariables: missingVars.map(v => ({
                        name: v.name,
                        type: v.type,
                        description: v.description,
                        choices: v.choices
                    }))
                });
            }

            // Add provided runtime variables to input
            for (const v of runtimeVars) {
                if (providedVars[v.name]) {
                    input += `\n${v.name}: ${providedVars[v.name]}`;
                }
            }

            // Execute the matched agent
            const result = await client.executeAgentStudioAgent(
                matchedAgent.agentId,
                input,
                executionId
            );

            return res.json({
                success: true,
                status: 'completed',
                agentName: matchedAgent.agentName,
                agentId: matchedAgent.agentId,
                result: result.result || result.output || result,
                executionId: result.executionId
            });
        }

        // No matching agent - use GHL's native MCP for general queries
        try {
            const mcpResult = await client.callGHLMCP('ask-ai', { query });
            return res.json({
                success: true,
                status: 'completed',
                agentName: 'Ask AI (Built-in)',
                result: mcpResult
            });
        } catch {
            // Fallback response
            return res.json({
                success: true,
                status: 'no_match',
                message: 'No matching agent found for your query. Try rephrasing or check mapped agents.',
                availableAgents: mappings.map(m => ({
                    name: m.agentName,
                    capabilities: m.capabilities
                }))
            });
        }
    } catch (error: any) {
        console.error('[AskAI] Query error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ask-ai/query/:agentId
 * Direct execution - bypass routing and execute a specific agent
 */
router.post('/query/:agentId', authenticate, async (req: Request, res: Response) => {
    try {
        const { client } = getGHLClient(req);
        const { input, executionId, variables } = req.body;

        if (!input) {
            return res.status(400).json({ error: 'input is required' });
        }

        let fullInput = input;
        if (variables) {
            for (const [key, value] of Object.entries(variables)) {
                fullInput += `\n${key}: ${value}`;
            }
        }

        const result = await client.executeAgentStudioAgent(
            req.params.agentId,
            fullInput,
            executionId
        );

        res.json({
            success: true,
            status: 'completed',
            agentId: req.params.agentId,
            result: result.result || result.output || result,
            executionId: result.executionId
        });
    } catch (error: any) {
        console.error('[AskAI] Direct execute error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// AGENT MAPPING MANAGEMENT
// ============================================================

/**
 * GET /api/ask-ai/mappings
 * List all agent mappings for Ask AI
 */
router.get('/mappings', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string || process.env.GHL_LOCATION_ID || '';
        const mappings = agentMappings.get(locationId) || [];

        res.json({
            success: true,
            mappings,
            total: mappings.length
        });
    } catch (error: any) {
        console.error('[AskAI] List mappings error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ask-ai/mappings
 * Create a new agent mapping for Ask AI
 */
router.post('/mappings', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string || process.env.GHL_LOCATION_ID || '';
        const { agentId, agentName, description, capabilities, variables } = req.body;

        if (!agentId || !agentName || !description) {
            return res.status(400).json({ error: 'agentId, agentName, and description are required' });
        }

        const mapping: AgentMapping = {
            id: `mapping_${Date.now()}`,
            agentId,
            agentName,
            description,
            capabilities: capabilities || [],
            variables: (variables || []).map((v: any) => ({
                name: v.name,
                type: v.type || 'text',
                value: v.value,
                askAtRuntime: v.askAtRuntime || false,
                choices: v.choices,
                description: v.description
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const existing = agentMappings.get(locationId) || [];
        existing.push(mapping);
        agentMappings.set(locationId, existing);

        res.json({
            success: true,
            mapping
        });
    } catch (error: any) {
        console.error('[AskAI] Create mapping error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/ask-ai/mappings/:mappingId
 * Update an agent mapping
 */
router.put('/mappings/:mappingId', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string || process.env.GHL_LOCATION_ID || '';
        const mappings = agentMappings.get(locationId) || [];
        const index = mappings.findIndex(m => m.id === req.params.mappingId);

        if (index === -1) {
            return res.status(404).json({ error: 'Mapping not found' });
        }

        const updated = {
            ...mappings[index],
            ...req.body,
            id: mappings[index].id,
            updatedAt: new Date().toISOString()
        };

        mappings[index] = updated;
        agentMappings.set(locationId, mappings);

        res.json({
            success: true,
            mapping: updated
        });
    } catch (error: any) {
        console.error('[AskAI] Update mapping error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/ask-ai/mappings/:mappingId
 * Delete an agent mapping
 */
router.delete('/mappings/:mappingId', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string || process.env.GHL_LOCATION_ID || '';
        const mappings = agentMappings.get(locationId) || [];
        const filtered = mappings.filter(m => m.id !== req.params.mappingId);

        agentMappings.set(locationId, filtered);

        res.json({ success: true, message: 'Mapping deleted' });
    } catch (error: any) {
        console.error('[AskAI] Delete mapping error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Find the best matching agent for a query based on description and capabilities.
 * Uses keyword matching against agent descriptions and capability lists.
 */
function findBestAgent(query: string, mappings: AgentMapping[]): AgentMapping | null {
    if (mappings.length === 0) return null;

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    let bestMatch: AgentMapping | null = null;
    let bestScore = 0;

    for (const mapping of mappings) {
        let score = 0;
        const descLower = mapping.description.toLowerCase();
        const capsLower = mapping.capabilities.map(c => c.toLowerCase());

        // Score based on description match
        for (const word of queryWords) {
            if (descLower.includes(word)) score += 1;
        }

        // Score based on capability match (weighted higher)
        for (const cap of capsLower) {
            for (const word of queryWords) {
                if (cap.includes(word)) score += 2;
            }
            // Exact phrase match in capability
            if (queryLower.includes(cap) || cap.includes(queryLower)) {
                score += 5;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = mapping;
        }
    }

    // Only return if we have a reasonable match (at least 2 word matches)
    return bestScore >= 2 ? bestMatch : null;
}

export default router;
