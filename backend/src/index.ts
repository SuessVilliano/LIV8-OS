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
import webhooksRouter from './api/webhooks.js'; // Webhook management
import brandRouter from './api/brand.js'; // Brand assets & knowledge base
import studioRouter from './api/studio.js'; // Creative Studio API
import actionsRouter from './api/actions.js'; // Action Execution API
import voiceCredentialsRouter from './api/voice-credentials.js'; // Voice Credentials Vault
import opportunitiesRouter from './api/opportunities.js'; // Opportunities pipeline API
import agencyRouter from './api/agency.js'; // Agency provisioning API
import lateRouter from './api/late.js'; // Late social media API (13 platforms)
import smsRouter from './api/sms.js'; // Unified SMS API (Twilio, Telnyx, TextLink)
import textlinkRouter from './api/textlink.js'; // TextLink SMS gateway
import inboxRouter from './api/inbox.js'; // Unified multi-channel inbox
import anychatRouter from './api/anychat.js'; // AnyChat.one live chat integration
import openclawRouter from './api/openclaw.js'; // OpenClaw AI Manager integration (openclaw.ai)
import scrapersRouter from './api/scrapers.js'; // Unified scrapers API (Apify, RapidAPI, Firecrawl, Kimi)
import voiceAiRouter from './api/voice-ai.js'; // Voice AI - White-label VAPI integration
import agentStudioRouter from './api/agent-studio.js'; // GHL Agent Studio + Conversation AI + Voice AI (native)
import askAiRouter from './api/ask-ai.js'; // Ask AI + Agent Studio integration
import { agentSessions } from './db/agent-sessions.js';
import { businessTwin } from './db/business-twin.js';
import { mcpClient } from './services/mcp-client.js'; // From stashed changes
import { authenticateMcp } from './middleware/authenticateMcp.js'; // From stashed changes
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types'; // From stashed changes
import { rateLimit, rateLimitPresets } from './middleware/rateLimit.js';
import { requestLogger } from './services/logger.js';

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

        // Initialize inbox, studio, and credential tables
        try {
            const { initConversationTables } = await import('./db/conversations.js');
            await initConversationTables();
            console.log('✅ Inbox conversation tables initialized');
        } catch (e: any) {
            console.warn('⚠️ Inbox tables init skipped:', e.message);
        }

        try {
            const { studioDb } = await import('./db/studio.js');
            await studioDb.initTables();
            console.log('✅ Studio tables initialized');
        } catch (e: any) {
            console.warn('⚠️ Studio tables init skipped:', e.message);
        }

        try {
            const { initializeTables } = await import('./db/init-tables.js');
            await initializeTables();
            console.log('✅ Core tables verified');
        } catch (e: any) {
            console.warn('⚠️ Core tables init skipped:', e.message);
        }
    } catch (error: any) {
        dbError = error.message;
        console.warn('⚠️ Database init failed:', error.message);
    }
};

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

// Structured request logging
app.use(requestLogger());

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
app.use('/api/webhooks', rateLimitPresets.webhook, webhooksRouter); // Webhook management (lenient for incoming webhooks)
app.use('/api/brand', rateLimitPresets.api, brandRouter); // Brand assets & knowledge base
app.use('/api/studio', rateLimitPresets.ai, studioRouter); // Creative Studio API (AI rate limiting)
app.use('/api/actions', rateLimitPresets.ai, actionsRouter); // Action Execution API (AI rate limiting)
app.use('/api/voice-credentials', rateLimitPresets.api, voiceCredentialsRouter); // Voice Credentials Vault
app.use('/api/opportunities', rateLimitPresets.api, opportunitiesRouter); // Opportunities pipeline API
app.use('/api/agency', rateLimitPresets.api, agencyRouter); // Agency provisioning API
app.use('/api/late', rateLimitPresets.api, lateRouter); // Late social media API (13 platforms)
app.use('/api/sms', rateLimitPresets.api, smsRouter); // Unified SMS API (Twilio, Telnyx, TextLink)
app.use('/api/textlink', rateLimitPresets.api, textlinkRouter); // TextLink SMS gateway
app.use('/api/inbox', rateLimitPresets.api, inboxRouter); // Unified multi-channel inbox
app.use('/api/anychat', rateLimitPresets.api, anychatRouter); // AnyChat.one live chat integration
app.use('/api/openclaw', rateLimitPresets.api, openclawRouter); // OpenClaw AI Manager integration
app.use('/api/scrapers', rateLimitPresets.ai, scrapersRouter); // Unified scrapers API (Apify, RapidAPI, Firecrawl, Kimi)
app.use('/api/voice-ai', rateLimitPresets.api, voiceAiRouter); // Voice AI - White-label VAPI integration
app.use('/api/agent-studio', rateLimitPresets.ai, agentStudioRouter); // GHL Agent Studio + Conversation AI + Voice AI (native)
app.use('/api/ask-ai', rateLimitPresets.ai, askAiRouter); // Ask AI + Agent Studio integration


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
    },
    // --- Agent Studio Tools ---
    'ghl-list-studio-agents': {
        description: 'List all active Agent Studio agents for the location. Returns agents in Production lifecycle stage.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Max agents to return (pagination)' },
                offset: { type: 'number', description: 'Offset for pagination' }
            }
        },
        returns: {
            type: 'object',
            properties: {
                agents: { type: 'array' },
                total: { type: 'number' }
            }
        }
    },
    'ghl-execute-agent': {
        description: 'Execute a GHL Agent Studio agent with input. Returns structured JSON output. Use executionId for conversation continuity.',
        parameters: {
            type: 'object',
            properties: {
                agentId: { type: 'string', description: 'ID of the Agent Studio agent to execute' },
                input: { type: 'string', description: 'Input text/query for the agent' },
                executionId: { type: 'string', description: 'Optional execution ID for continuing a conversation thread' }
            },
            required: ['agentId', 'input']
        },
        returns: {
            type: 'object',
            properties: {
                result: { type: 'object' },
                executionId: { type: 'string' }
            }
        }
    },
    'ghl-create-conversation-agent': {
        description: 'Create a new Conversation AI agent in GHL with a name, prompt, and optional knowledge base.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Agent name' },
                prompt: { type: 'string', description: 'System prompt for the agent' },
                channels: { type: 'array', items: { type: 'string' }, description: 'Channels (SMS, Email, WhatsApp, etc.)' },
                knowledgeBaseIds: { type: 'array', items: { type: 'string' }, description: 'Knowledge base IDs to attach' }
            },
            required: ['name']
        },
        returns: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                status: { type: 'string' }
            }
        }
    },
    'ghl-attach-conversation-action': {
        description: 'Attach an action (book appointment, send follow-up, collect info, trigger webhook) to a Conversation AI agent.',
        parameters: {
            type: 'object',
            properties: {
                agentId: { type: 'string', description: 'Conversation AI agent ID' },
                name: { type: 'string', description: 'Action name' },
                description: { type: 'string', description: 'Action description' },
                type: { type: 'string', description: 'Action type (webhook, workflow, booking, etc.)' },
                workflowId: { type: 'string', description: 'Workflow ID to trigger (optional)' },
                triggerMessage: { type: 'string', description: 'Message that triggers this action' }
            },
            required: ['agentId', 'name', 'type']
        },
        returns: {
            type: 'object',
            properties: {
                actionId: { type: 'string' },
                name: { type: 'string' }
            }
        }
    },
    'ghl-get-ai-generations': {
        description: 'Get Conversation AI generation details for analytics, compliance, and debugging. Shows knowledge sources used, conversation history, and action decisions.',
        parameters: {
            type: 'object',
            properties: {
                agentId: { type: 'string', description: 'Filter by agent ID' },
                contactId: { type: 'string', description: 'Filter by contact ID' },
                limit: { type: 'number', description: 'Max results' },
                startDate: { type: 'string', description: 'Start date (ISO 8601)' },
                endDate: { type: 'string', description: 'End date (ISO 8601)' }
            }
        },
        returns: {
            type: 'array',
            items: { type: 'object' }
        }
    },
    'ghl-create-voice-agent': {
        description: 'Create a GHL native Voice AI agent with a prompt, voice, and language configuration.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Voice agent name' },
                prompt: { type: 'string', description: 'System prompt for voice conversations' },
                voiceId: { type: 'string', description: 'Voice ID for TTS' },
                language: { type: 'string', description: 'Language code (e.g., en-US)' },
                firstMessage: { type: 'string', description: 'Initial greeting message' }
            },
            required: ['name']
        },
        returns: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' }
            }
        }
    },
    'ghl-list-voice-calls': {
        description: 'List Voice AI call logs with filters for agent, contact, date range, and call type.',
        parameters: {
            type: 'object',
            properties: {
                agentId: { type: 'string', description: 'Filter by voice agent ID' },
                contactId: { type: 'string', description: 'Filter by contact ID' },
                callType: { type: 'string', description: 'Filter by call type (inbound/outbound)' },
                startDate: { type: 'string', description: 'Start date (ISO 8601)' },
                endDate: { type: 'string', description: 'End date (ISO 8601)' },
                limit: { type: 'number', description: 'Max results' }
            }
        },
        returns: {
            type: 'array',
            items: { type: 'object' }
        }
    },
    'ghl-mcp-call': {
        description: 'Call a tool on GHL native MCP server. This bridges to GHL internal AI assistant (Ask AI) capabilities including contacts, conversations, calendars, pipelines, payments, workflows, and more.',
        parameters: {
            type: 'object',
            properties: {
                toolName: { type: 'string', description: 'MCP tool name (e.g., contacts_create-contact, conversations_send-a-new-message)' },
                arguments: { type: 'object', description: 'Tool arguments' }
            },
            required: ['toolName']
        },
        returns: {
            type: 'object'
        }
    },

    // --- Late Social Media Tools ---
    'late-list-accounts': {
        description: 'List connected Late social media accounts across 13 platforms.',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        },
        returns: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    platform: { type: 'string' },
                    username: { type: 'string' }
                }
            }
        }
    },
    'late-create-post': {
        description: 'Create a social media post via Late. Supports Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat.',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Post content' },
                platforms: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Platforms to post to (twitter, instagram, linkedin, facebook, tiktok, youtube, pinterest, reddit, bluesky, threads, googlebusiness, telegram, snapchat)'
                },
                scheduledFor: { type: 'string', description: 'ISO 8601 date for scheduled post (optional)' },
                mediaUrls: { type: 'array', items: { type: 'string' }, description: 'Media URLs to attach (optional)' },
                isDraft: { type: 'boolean', description: 'Save as draft instead of publishing' }
            },
            required: ['content', 'platforms']
        },
        returns: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                status: { type: 'string' }
            }
        }
    },
    'late-publish-now': {
        description: 'Publish content immediately to social platforms via Late.',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Post content' },
                platforms: { type: 'array', items: { type: 'string' }, description: 'Platforms to post to' },
                mediaUrls: { type: 'array', items: { type: 'string' }, description: 'Media URLs to attach (optional)' }
            },
            required: ['content', 'platforms']
        },
        returns: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                postId: { type: 'string' }
            }
        }
    },
    'late-cross-post': {
        description: 'Cross-post content to multiple social platforms at once via Late.',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Post content' },
                platforms: { type: 'array', items: { type: 'string' }, description: 'Platforms to post to' },
                isDraft: { type: 'boolean', description: 'Save as draft instead of publishing' }
            },
            required: ['content', 'platforms']
        },
        returns: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                results: { type: 'array' }
            }
        }
    },
    'late-list-posts': {
        description: 'List scheduled/published posts from Late.',
        parameters: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['draft', 'scheduled', 'published', 'failed'], description: 'Filter by status' },
                limit: { type: 'number', description: 'Maximum results (default 20)' }
            }
        },
        returns: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    status: { type: 'string' }
                }
            }
        }
    },
    'late-retry-failed': {
        description: 'Retry all failed Late posts.',
        parameters: {
            type: 'object',
            properties: {}
        },
        returns: {
            type: 'object',
            properties: {
                total: { type: 'number' },
                succeeded: { type: 'number' },
                failed: { type: 'number' }
            }
        }
    },
    'late-get-platforms': {
        description: 'Get list of supported social media platforms with character limits.',
        parameters: {
            type: 'object',
            properties: {}
        },
        returns: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    charLimit: { type: 'number' }
                }
            }
        }
    }
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

// Start server with proper initialization
const HOST = '0.0.0.0';

const startServer = async () => {
    // Initialize database before accepting requests
    console.log('🔄 Initializing database...');
    await initDatabase();

    if (dbError && process.env.NODE_ENV === 'production') {
        console.error('❌ Database initialization failed in production. Server may have limited functionality.');
        console.error('   Error:', dbError);
    }

    const server = app.listen(Number(PORT), HOST, () => {
        console.log(`🚀 LIV8 GHL Backend running on http://${HOST}:${PORT}`);
        if (dbInitialized) {
            console.log('✅ Database ready');
        } else if (dbError) {
            console.warn('⚠️ Database not available:', dbError);
        }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('🛑 SIGTERM received, shutting down gracefully...');
        server.close(() => {
            console.log('👋 Server closed');
            process.exit(0);
        });
    });
};

startServer().catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

// Export for Vercel
export default app;
