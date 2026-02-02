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
import twinRouter from './api/twin.js'; // Business Twin API
import staffRouter from './api/staff.js'; // AI Staff API
import integrationsRouter from './api/integrations.js'; // Voice, Messaging, CRM integrations
import contentRouter from './api/content.js'; // Content creation with SEO/AEO/GEO
import aiRouter from './api/ai.js'; // Multi-AI provider management
import schedulerRouter from './api/scheduler.js'; // Content scheduling & templates
import whitelabelRouter from './api/whitelabel.js'; // Agency whitelabel system
import socialMediaRouter from './api/social.js'; // Social media publishing (FB, IG, X, LinkedIn, TikTok)
import billingRouter from './api/billing.js'; // Stripe payments & subscriptions
import notificationsRouter from './api/notifications.js'; // Notification system
import crmRouter from './api/crm.js'; // CRM validation & account creation
import dashboardRouter from './api/dashboard.js'; // Dashboard data API
import { agentSessions } from './db/agent-sessions.js';
import { businessTwin } from './db/business-twin.js';
import { mcpClient } from './services/mcp-client.js'; // From stashed changes
import { authenticateMcp } from './middleware/authenticateMcp.js'; // From stashed changes
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types'; // From stashed changes
import { rateLimit, rateLimitPresets } from './middleware/rateLimit.js';

// Log environment status (not the actual values for security)
console.log('Environment check:', {
    POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Set' : '❌ Missing',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing',
    NODE_ENV: process.env.NODE_ENV || 'development'
});

// Track database initialization status
let dbInitialized = false;
let dbError: string | null = null;

// Auto-initialize database tables on startup (only if POSTGRES_URL is configured)
const initDatabase = async () => {
    if (!process.env.POSTGRES_URL) {
        dbError = 'POSTGRES_URL not configured';
        console.warn('⚠️ Database initialization skipped: POSTGRES_URL not set');
        return;
    }

    try {
        await agentSessions.initTables();
        await businessTwin.initTables();
        dbInitialized = true;
        console.log('✅ Database tables initialized (agent_sessions + business_twins)');
    } catch (error: any) {
        dbError = error.message;
        console.warn('⚠️ Database init failed:', error.message);
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
                'https://os.liv8ai.com',
                'https://os.liv8.co',
                'https://app.gohighlevel.com',
                'https://crm.liv8.co',
                process.env.DASHBOARD_URL // Allow custom dashboard URL from env
            ].filter(Boolean) as string[];
            if (allowed.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Origin not allowed by CORS policy'));
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
    const allConfigured = !!process.env.POSTGRES_URL && !!process.env.JWT_SECRET;

    res.json({
        status: allConfigured && dbInitialized ? 'ok' : 'degraded',
        service: 'LIV8 GHL Backend',
        config: {
            database: !!process.env.POSTGRES_URL,
            databaseConnected: dbInitialized,
            databaseError: dbError,
            gemini: !!process.env.GEMINI_API_KEY,
            jwt: !!process.env.JWT_SECRET,
            taskmagic: !!process.env.TASKMAGIC_WEBHOOK_URL,
            vbout: !!process.env.VBOUT_API_KEY
        },
        message: !allConfigured
            ? 'Missing required environment variables. Please configure POSTGRES_URL and JWT_SECRET in Vercel dashboard.'
            : dbError
                ? `Database error: ${dbError}`
                : 'All systems operational'
    });
});

// API Routes with rate limiting
app.use('/api/auth', rateLimitPresets.auth, authRouter); // Strict rate limiting for auth
app.use('/api/operator', rateLimitPresets.api, operatorRouter);
app.use('/api/setup', rateLimitPresets.api, setupRouter);
app.use('/api/analytics', rateLimitPresets.api, analyticsRouter);
app.use('/api/taskmagic', rateLimitPresets.api, taskmagicRouter);
app.use('/api/social', rateLimitPresets.api, socialContentRouter);
app.use('/api/settings', rateLimitPresets.api, settingsRouter);
app.use('/api/agents', rateLimitPresets.api, agentsRouter);
app.use('/api/smart-agents', rateLimitPresets.ai, smartAgentsRouter); // AI rate limiting
app.use('/api/vbout', rateLimitPresets.api, vboutRouter);
app.use('/api/twin', rateLimitPresets.ai, twinRouter); // AI rate limiting for Business Twin
app.use('/api/staff', rateLimitPresets.ai, staffRouter); // AI rate limiting for Staff Chat
app.use('/api/integrations', rateLimitPresets.api, integrationsRouter);
app.use('/api/content', rateLimitPresets.ai, contentRouter); // AI rate limiting for content generation
app.use('/api/ai', rateLimitPresets.ai, aiRouter); // AI rate limiting
app.use('/api/scheduler', rateLimitPresets.api, schedulerRouter);
app.use('/api/whitelabel', rateLimitPresets.api, whitelabelRouter);
app.use('/api/social-media', rateLimitPresets.api, socialMediaRouter);
app.use('/api/billing', rateLimitPresets.api, billingRouter);
app.use('/api/notifications', rateLimitPresets.webhook, notificationsRouter); // Lenient for webhooks
app.use('/api/crm', rateLimitPresets.api, crmRouter); // CRM validation & account creation
app.use('/api/dashboard', rateLimitPresets.api, dashboardRouter); // Dashboard data API


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

// Start server
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`🚀 LIV8 GHL Backend running on http://${HOST}:${PORT}`);
});

// Export for Vercel
export default app;
