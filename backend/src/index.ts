// Load environment variables (MUST be first line before any imports)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRouter from './api/auth.js';
import operatorRouter from './api/operator.js';
import setupRouter from './api/setup.js';
import analyticsRouter from './api/analytics.js';
import taskmagicRouter from './api/taskmagic.js';
import socialContentRouter from './api/social-content.js';
import settingsRouter from './api/settings.js';
import agentsRouter from './api/agents.js';
import smartAgentsRouter from './api/smart-agents.js';
import vboutRouter from './api/vbout.js'; // New: Vbout router
import { agentSessions } from './db/agent-sessions.js';
import { mcpClient } from './services/mcp-client.js'; // From stashed changes
import { authenticateMcp } from './middleware/authenticateMcp.js'; // From stashed changes
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types'; // From stashed changes

console.log('DEBUG: POSTGRES_URL from process.env:', process.env.POSTGRES_URL);
console.log('DEBUG: JWT_SECRET from process.env:', process.env.JWT_SECRET);

// Auto-initialize database tables on startup
const initDatabase = async () => {
    try {
        await agentSessions.initTables();
        console.log('✅ Database tables initialized');
    } catch (error: any) {
        console.warn('⚠️ Database init skipped (may already exist):', error.message);
    }
};

// Initialize in background (don't block startup)
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.startsWith('chrome-extension://')) {
            callback(null, true);
        }
        else if (origin?.includes('gohighlevel.com') || origin?.includes('leadconnectorhq.com')) {
            callback(null, true);
        }
        else if (process.env.NODE_ENV === 'production') {
            const allowed = [
                'https://your-dashboard-domain.vercel.app',
                'https://os.liv8ai.com',
                'https://app.gohighlevel.com',
                'https://crm.liv8.co' // New: Vbout whitelabel domain
            ];
            if (allowed.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, true);
            }
        } else {
            callback(null, true);
        }
    },
    credentials: true
}));

app.use(express.json());

// Health check with configuration status
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'LIV8 GHL Backend',
        config: {
            database: !!process.env.POSTGRES_URL,
            gemini: !!process.env.GEMINI_API_KEY,
            jwt: !!process.env.JWT_SECRET,
            taskmagic: !!process.env.TASKMAGIC_WEBHOOK_URL
        }
    });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/operator', operatorRouter);
app.use('/api/setup', setupRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/taskmagic', taskmagicRouter);
app.use('/api/social', socialContentRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/smart-agents', smartAgentsRouter);
app.use('/api/vbout', vboutRouter); // New: Vbout API routes


// --- MCP Integration ---

// Define tool definitions for MCP
const ghlToolDefinitions = {
    'ghl-create-contact': {
        description: 'Creates a new contact in GoHighLevel.',
        parameters: {
            type: 'object',
            properties: {
                firstName: { type: 'string', description: 'First name of the contact' },
                lastName: { type: 'string', description: 'Last name of the contact' },
                email: { type: 'string', format: 'email', description: 'Email of the contact' },
                phone: { type: 'string', description: 'Phone number of the contact' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add to the contact' }
            },
            required: ['firstName', 'email']
        },
        returns: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                email: { type: 'string' }
            }
        }
    },
    'ghl-send-sms': {
        description: 'Sends an SMS message to a contact in GoHighLevel.',
        parameters: {
            type: 'object',
            properties: {
                contactId: { type: 'string', description: 'ID of the contact to send SMS to' },
                message: { type: 'string', description: 'The SMS message content' }
            },
            required: ['contactId', 'message']
        },
        returns: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    },
    'ghl-get-contact': {
        description: 'Retrieves a contact from GoHighLevel by ID.',
        parameters: {
            type: 'object',
            properties: {
                contactId: { type: 'string', description: 'ID of the contact to retrieve' }
            },
            required: ['contactId']
        },
        returns: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                email: { type: 'string' }
            }
        }
    },
    'ghl-search-contacts': {
        description: 'Searches for contacts in GoHighLevel by a query string.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query for contacts' },
                limit: { type: 'number', description: 'Maximum number of results to return' }
            },
            required: ['query']
        },
        returns: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    firstName: { type: 'string' },
                    email: { type: 'string' }
                }
            }
        }
    }
    // TODO: Add more tool definitions as needed
};

// GET /mcp for listing tools (schema discovery)
app.get('/mcp', (req, res) => { // Removed authenticateMcp
    try {
        return res.json({
            response: {
                tools: Object.entries(ghlToolDefinitions).map(([name, definition]) => ({ name, definition }))
            }
        });
    } catch (error: any) {
        console.error('MCP ListTools request failed:', error);
        return res.status(500).json({ error: error.message || 'Internal MCP server error during tool listing' });
    }
});

// POST /mcp for calling tools
app.post('/mcp', async (req, res) => { // Removed authenticateMcp
    try {
        // Dummy values for debugging without authentication
        const ghlToken = process.env.GHL_TEST_TOKEN || 'dummy_ghl_token';
        const ghlLocationId = process.env.GHL_TEST_LOCATION_ID || 'dummy_ghl_location_id';

        // Ensure GHL test credentials are set in .env for actual use
        if (!process.env.GHL_TEST_TOKEN || !process.env.GHL_TEST_LOCATION_ID) {
            console.warn("GHL_TEST_TOKEN or GHL_TEST_LOCATION_ID not set. Using dummy values for MCP tool execution.");
        }
        
        // Determine if it's a CallTool request
        const callToolRequest = CallToolRequestSchema.parse(req.body);
        const { name, arguments: args } = callToolRequest.params;

        console.log(`[MCP] CallTool request: ${name} with args:`, args);

        const result = await mcpClient.callTool(name, args || {}, ghlToken, ghlLocationId);
        return res.json({ response: { result } });
        
    } catch (error: any) {
        console.error('MCP CallTool request failed:', error);
        if (error.issues) { // Zod validation errors
            return res.status(400).json({ error: 'Invalid MCP request payload', details: error.issues });
        }
        return res.status(500).json({ error: error.message || 'Internal MCP server error' });
    }
});


// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 LIV8 GHL Backend running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
export default app;
