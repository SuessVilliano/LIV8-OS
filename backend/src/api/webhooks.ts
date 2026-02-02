import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import crypto from 'crypto';

const router = Router();

// In-memory webhook storage (replace with DB in production)
const webhooks: Map<string, any[]> = new Map();

// Generate webhook secret
const generateWebhookSecret = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * GET /api/webhooks
 * List all webhooks for a client
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const clientId = req.query.clientId as string || 'default';
        const clientWebhooks = webhooks.get(clientId) || [];

        res.json({
            webhooks: clientWebhooks,
            total: clientWebhooks.length
        });
    } catch (error: any) {
        console.error('List webhooks error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { clientId, name, type, events, targetUrl } = req.body;

        if (!name || !events || events.length === 0) {
            return res.status(400).json({ error: 'Name and events are required' });
        }

        const webhookId = `wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const webhook = {
            id: webhookId,
            name,
            type: type || 'inbound',
            url: type === 'outbound' ? targetUrl : `${process.env.API_URL || 'https://api.liv8.io'}/api/webhooks/${clientId}/${webhookId}`,
            events,
            secret: generateWebhookSecret(),
            active: true,
            createdAt: new Date().toISOString(),
            lastTriggered: null
        };

        const clientWebhooks = webhooks.get(clientId) || [];
        clientWebhooks.push(webhook);
        webhooks.set(clientId, clientWebhooks);

        res.json({ webhook });
    } catch (error: any) {
        console.error('Create webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = req.query.clientId as string || 'default';

        const clientWebhooks = webhooks.get(clientId) || [];
        const filtered = clientWebhooks.filter(w => w.id !== id);
        webhooks.set(clientId, filtered);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/webhooks/:clientId/voice
 * Handle voice commands from iOS Shortcuts
 */
router.post('/:clientId/voice', async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const { text, audio, transcription } = req.body;

        const command = text || transcription || '';

        console.log(`[Voice Webhook] Client: ${clientId}, Command: ${command}`);

        // Process the voice command with AI
        // For now, return a simple acknowledgment
        const response = {
            success: true,
            command: command,
            response: `I received your command: "${command}". Processing with your AI staff.`,
            timestamp: new Date().toISOString()
        };

        // TODO: Route to appropriate AI agent based on command intent
        // This would integrate with the Moltworker AI Manager

        res.json(response);
    } catch (error: any) {
        console.error('Voice webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/webhooks/:clientId/telegram
 * Handle Telegram bot messages
 */
router.post('/:clientId/telegram', async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const { message, update_id, chat_id } = req.body;

        console.log(`[Telegram Webhook] Client: ${clientId}, Message:`, message);

        // Extract text from Telegram message format
        const text = message?.text || req.body.text || '';

        const response = {
            success: true,
            message: text,
            response: `Command received: "${text}". Your AI manager is processing this request.`,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error: any) {
        console.error('Telegram webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/webhooks/:clientId/:webhookId
 * Generic webhook receiver
 */
router.post('/:clientId/:webhookId', async (req: Request, res: Response) => {
    try {
        const { clientId, webhookId } = req.params;
        const payload = req.body;

        console.log(`[Webhook] Client: ${clientId}, Webhook: ${webhookId}`, payload);

        // Find the webhook
        const clientWebhooks = webhooks.get(clientId) || [];
        const webhook = clientWebhooks.find(w => w.id === webhookId);

        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        // Verify webhook signature if provided
        const signature = req.headers['x-webhook-signature'] as string;
        if (webhook.secret && signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhook.secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (signature !== expectedSignature) {
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
        }

        // Update last triggered
        webhook.lastTriggered = new Date().toISOString();

        // Process the webhook based on events
        const response = {
            success: true,
            webhookId,
            received: true,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error: any) {
        console.error('Webhook receiver error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/webhooks/secret/generate
 * Generate a new webhook secret
 */
router.post('/secret/generate', authenticate, async (req: Request, res: Response) => {
    try {
        const secret = generateWebhookSecret();
        res.json({ secret });
    } catch (error: any) {
        console.error('Generate secret error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
