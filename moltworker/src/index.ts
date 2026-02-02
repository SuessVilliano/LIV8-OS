/**
 * LIV8 Moltworker - Autonomous Agency Platform
 *
 * Each client gets their own AI Manager that orchestrates AI Staff agents.
 * Runs on Cloudflare Workers edge network for low latency worldwide.
 *
 * Architecture:
 * - AI Manager: Coordinates all activities, lives in Telegram/Discord/Slack
 * - AI Staff: Specialized agents (Social, Sales, Support, Operations)
 * - Brand Brain: Client's knowledge base stored in R2
 * - CRM Integration: GHL and Vbout via secure API Gateway
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { TelegramHandler } from './handlers/telegram';
import { DiscordHandler } from './handlers/discord';
import { SlackHandler } from './handlers/slack';
import { AIManager } from './agents/manager';
import { SmartAgents } from './agents/smart-agents';
import { BrandBrain } from './utils/brand-brain';
import { GHLIntegration } from './integrations/ghl';
import { VboutIntegration } from './integrations/vbout';

// Environment type definitions
export interface Env {
  // AI bindings
  AI: any;

  // Storage bindings
  BRAND_BRAIN: R2Bucket;
  DOCUMENTS: R2Bucket;
  SESSIONS: KVNamespace;
  CLIENT_CONFIG: KVNamespace;

  // Durable Objects
  AI_MANAGER: DurableObjectNamespace;
  AGENT_STAFF: DurableObjectNamespace;

  // Queues
  TASK_QUEUE: Queue;

  // Secrets
  ANTHROPIC_API_KEY: string;
  GOOGLE_AI_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  DISCORD_BOT_TOKEN: string;
  SLACK_BOT_TOKEN: string;
  AI_GATEWAY_API_KEY: string;
  AI_GATEWAY_BASE_URL: string;

  // Variables
  ENVIRONMENT: string;
  LIV8_API_URL: string;
  GHL_API_VERSION: string;
}

// Staff agent templates
export const STAFF_TEMPLATES = {
  'social-media': {
    name: 'Social Media Agent',
    role: 'marketing',
    capabilities: ['create_posts', 'schedule_content', 'analyze_engagement', 'respond_comments'],
    systemPrompt: `You are a Social Media Marketing specialist. Your role is to:
- Create engaging social media content aligned with the brand voice
- Schedule posts for optimal engagement times
- Analyze performance metrics and suggest improvements
- Respond to comments and messages professionally
Always maintain brand consistency and follow the Brand Brain guidelines.`
  },
  'email-specialist': {
    name: 'Email Specialist',
    role: 'marketing',
    capabilities: ['draft_emails', 'create_sequences', 'segment_lists', 'analyze_campaigns'],
    systemPrompt: `You are an Email Marketing specialist. Your role is to:
- Draft compelling email copy that converts
- Create automated email sequences for nurturing
- Segment contact lists for targeted campaigns
- Analyze open rates, click rates, and conversions
Follow CAN-SPAM guidelines and maintain brand voice.`
  },
  'sales-agent': {
    name: 'Sales Agent',
    role: 'sales',
    capabilities: ['qualify_leads', 'send_proposals', 'follow_up', 'close_deals'],
    systemPrompt: `You are a Sales Agent. Your role is to:
- Qualify incoming leads based on criteria
- Present offers and handle objections
- Follow up with prospects at optimal times
- Guide conversations toward booking/closing
Use the SOPs and pricing from Brand Brain. Never deviate from approved offers.`
  },
  'support-agent': {
    name: 'Support Agent',
    role: 'support',
    capabilities: ['answer_faqs', 'troubleshoot', 'escalate_issues', 'collect_feedback'],
    systemPrompt: `You are a Customer Support Agent. Your role is to:
- Answer frequently asked questions using the knowledge base
- Troubleshoot common issues step-by-step
- Escalate complex matters to human staff appropriately
- Collect and log customer feedback
Always be helpful, patient, and professional.`
  },
  'operations-agent': {
    name: 'Operations Agent',
    role: 'operations',
    capabilities: ['manage_pipeline', 'clean_data', 'monitor_automations', 'generate_reports'],
    systemPrompt: `You are an Operations Agent. Your role is to:
- Monitor and maintain CRM pipeline hygiene
- Clean and organize contact data
- Ensure automations are running correctly
- Generate reports on key metrics
Work silently in the background unless reporting issues.`
  }
};

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: ['https://os.liv8ai.com', 'https://staging.liv8ai.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Client-ID']
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// WEBHOOK ENDPOINTS (Messaging Platforms)
// ============================================

// Telegram webhook
app.post('/webhook/telegram/:clientId', async (c) => {
  const clientId = c.req.param('clientId');
  const body = await c.req.json();

  const handler = new TelegramHandler(c.env, clientId);
  const response = await handler.handleUpdate(body);

  return c.json(response);
});

// Discord webhook
app.post('/webhook/discord/:clientId', async (c) => {
  const clientId = c.req.param('clientId');
  const body = await c.req.json();

  const handler = new DiscordHandler(c.env, clientId);
  const response = await handler.handleInteraction(body);

  return c.json(response);
});

// Slack webhook
app.post('/webhook/slack/:clientId', async (c) => {
  const clientId = c.req.param('clientId');
  const body = await c.req.json();

  const handler = new SlackHandler(c.env, clientId);
  const response = await handler.handleEvent(body);

  return c.json(response);
});

// ============================================
// CLIENT PROVISIONING API
// ============================================

// Provision new client (called during onboarding)
app.post('/api/provision', async (c) => {
  const { clientId, clientName, crmType, crmCredentials, messagingPlatform, brandBrain } = await c.req.json();

  // Store client configuration
  await c.env.CLIENT_CONFIG.put(`client:${clientId}`, JSON.stringify({
    id: clientId,
    name: clientName,
    crmType, // 'ghl' | 'vbout' | 'liv8'
    messagingPlatform, // 'telegram' | 'discord' | 'slack' | 'whatsapp'
    createdAt: new Date().toISOString(),
    status: 'active'
  }));

  // Store CRM credentials securely (encrypted in KV)
  await c.env.CLIENT_CONFIG.put(`creds:${clientId}`, JSON.stringify(crmCredentials));

  // Initialize Brand Brain in R2
  const brain = new BrandBrain(c.env, clientId);
  await brain.initialize(brandBrain);

  // Build AI Staff team
  const smartAgents = new SmartAgents(c.env, clientId);
  await smartAgents.buildAgentTeam(['social-media', 'email-specialist', 'sales-agent', 'support-agent']);

  // Get AI Manager Durable Object
  const managerId = c.env.AI_MANAGER.idFromName(clientId);
  const manager = c.env.AI_MANAGER.get(managerId);

  // Initialize manager
  await manager.fetch(new Request('https://internal/init', {
    method: 'POST',
    body: JSON.stringify({ clientId, clientName, crmType })
  }));

  // Generate webhook URL for messaging platform
  const baseUrl = c.env.ENVIRONMENT === 'production'
    ? 'https://agent.liv8ai.com'
    : 'https://liv8-moltworker.workers.dev';

  const webhookUrl = `${baseUrl}/webhook/${messagingPlatform}/${clientId}`;

  return c.json({
    success: true,
    clientId,
    webhookUrl,
    message: `LIV8 OS provisioned for ${clientName}. AI Manager is ready in ${messagingPlatform}.`
  });
});

// ============================================
// AI MANAGER API (Internal)
// ============================================

// Chat with AI Manager
app.post('/api/chat/:clientId', async (c) => {
  const clientId = c.req.param('clientId');
  const { message, context } = await c.req.json();

  const managerId = c.env.AI_MANAGER.idFromName(clientId);
  const manager = c.env.AI_MANAGER.get(managerId);

  const response = await manager.fetch(new Request('https://internal/chat', {
    method: 'POST',
    body: JSON.stringify({ message, context })
  }));

  return c.json(await response.json());
});

// Execute agent action
app.post('/api/action/:clientId', async (c) => {
  const clientId = c.req.param('clientId');
  const { agentType, action, params } = await c.req.json();

  const smartAgents = new SmartAgents(c.env, clientId);
  const result = await smartAgents.executeAction(agentType, action, params);

  return c.json(result);
});

// Get AI Staff status
app.get('/api/staff/:clientId', async (c) => {
  const clientId = c.req.param('clientId');

  const smartAgents = new SmartAgents(c.env, clientId);
  const staff = await smartAgents.getStaffStatus();

  return c.json({ success: true, staff });
});

// ============================================
// CRM INTEGRATION API
// ============================================

// Sync with GHL
app.post('/api/crm/ghl/:clientId/sync', async (c) => {
  const clientId = c.req.param('clientId');

  const credsRaw = await c.env.CLIENT_CONFIG.get(`creds:${clientId}`);
  if (!credsRaw) {
    return c.json({ error: 'Client not found' }, 404);
  }

  const creds = JSON.parse(credsRaw);
  const ghl = new GHLIntegration(creds.ghlApiKey, creds.ghlLocationId);

  const contacts = await ghl.getContacts({ limit: 100 });
  const opportunities = await ghl.getOpportunities();
  const workflows = await ghl.getWorkflows();

  return c.json({ success: true, contacts, opportunities, workflows });
});

// Sync with Vbout
app.post('/api/crm/vbout/:clientId/sync', async (c) => {
  const clientId = c.req.param('clientId');

  const credsRaw = await c.env.CLIENT_CONFIG.get(`creds:${clientId}`);
  if (!credsRaw) {
    return c.json({ error: 'Client not found' }, 404);
  }

  const creds = JSON.parse(credsRaw);
  const vbout = new VboutIntegration(creds.vboutApiKey);

  const contacts = await vbout.getContacts({ limit: 100 });
  const campaigns = await vbout.getCampaigns();
  const automations = await vbout.getAutomations();

  return c.json({ success: true, contacts, campaigns, automations });
});

// ============================================
// BRAND BRAIN API
// ============================================

// Query Brand Brain (QMD - semantic search)
app.post('/api/brain/:clientId/query', async (c) => {
  const clientId = c.req.param('clientId');
  const { query, topK = 5 } = await c.req.json();

  const brain = new BrandBrain(c.env, clientId);
  const results = await brain.query(query, topK);

  return c.json({ success: true, results });
});

// Add knowledge to Brand Brain
app.post('/api/brain/:clientId/add', async (c) => {
  const clientId = c.req.param('clientId');
  const { type, content, metadata } = await c.req.json();

  const brain = new BrandBrain(c.env, clientId);
  await brain.addKnowledge(type, content, metadata);

  return c.json({ success: true, message: 'Knowledge added to Brand Brain' });
});

// ============================================
// QUEUE CONSUMER
// ============================================

export default {
  fetch: app.fetch,

  // Process queued tasks
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { clientId, taskType, params } = message.body;

      try {
        const smartAgents = new SmartAgents(env, clientId);

        switch (taskType) {
          case 'schedule_post':
            await smartAgents.executeAction('social-media', 'create_post', params);
            break;
          case 'send_email':
            await smartAgents.executeAction('email-specialist', 'draft_email', params);
            break;
          case 'follow_up':
            await smartAgents.executeAction('sales-agent', 'follow_up', params);
            break;
          case 'sync_crm':
            // Trigger CRM sync
            break;
        }

        message.ack();
      } catch (error) {
        console.error(`Task failed: ${taskType}`, error);
        message.retry();
      }
    }
  }
};

// ============================================
// DURABLE OBJECTS
// ============================================

export { AIManagerDO } from './agents/manager';
export { AgentStaffDO } from './agents/staff-do';
