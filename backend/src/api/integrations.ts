import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { createIntegrationManager, vapiService, telegramService } from '../integrations/index.js';

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

// ============ STATUS ============

/**
 * GET /api/integrations/status/:locationId
 * Get all integration statuses for a location
 */
router.get('/status/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const manager = createIntegrationManager(locationId);

        const status = await manager.getStatus();

        res.json({
            success: true,
            status
        });

    } catch (error: any) {
        console.error('[Integrations API] Status error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/capabilities/:tier
 * Get capabilities for a subscription tier
 */
router.get('/capabilities/:tier', authenticate, async (req: Request, res: Response) => {
    try {
        const { tier } = req.params;
        const { locationId } = req.query;

        const manager = createIntegrationManager(locationId as string || 'default');
        const capabilities = manager.getCapabilities(tier as any);

        res.json({
            success: true,
            tier,
            capabilities
        });

    } catch (error: any) {
        console.error('[Integrations API] Capabilities error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ VAPI (Voice) ============

/**
 * POST /api/integrations/vapi/assistant
 * Create a VAPI voice assistant
 */
router.post('/vapi/assistant', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, agentRole, voiceId } = req.body;

        if (!locationId || !agentRole) {
            return res.status(400).json({ error: 'locationId and agentRole are required' });
        }

        const result = await vapiService.createAssistant({
            locationId,
            agentRole,
            voiceId
        });

        res.json({
            success: true,
            assistantId: result.assistantId,
            name: result.config.name
        });

    } catch (error: any) {
        console.error('[Integrations API] VAPI create error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/vapi/assistants
 * List all VAPI assistants
 */
router.get('/vapi/assistants', authenticate, async (req: Request, res: Response) => {
    try {
        const assistants = await vapiService.listAssistants();

        res.json({
            success: true,
            assistants
        });

    } catch (error: any) {
        console.error('[Integrations API] VAPI list error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/vapi/call
 * Make an outbound call
 */
router.post('/vapi/call', authenticate, async (req: Request, res: Response) => {
    try {
        const { assistantId, phoneNumber, metadata } = req.body;

        if (!assistantId || !phoneNumber) {
            return res.status(400).json({ error: 'assistantId and phoneNumber are required' });
        }

        const call = await vapiService.makeCall({
            assistantId,
            phoneNumber,
            metadata
        });

        res.json({
            success: true,
            call
        });

    } catch (error: any) {
        console.error('[Integrations API] VAPI call error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/integrations/vapi/call/:callId
 * Get call details
 */
router.get('/vapi/call/:callId', authenticate, async (req: Request, res: Response) => {
    try {
        const { callId } = req.params;

        const call = await vapiService.getCall(callId);

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        res.json({
            success: true,
            call
        });

    } catch (error: any) {
        console.error('[Integrations API] VAPI get call error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/vapi/webhook
 * VAPI webhook endpoint
 */
router.post('/vapi/webhook', async (req: Request, res: Response) => {
    try {
        const payload = req.body;

        console.log('[VAPI Webhook] Received:', payload.type);

        const result = await vapiService.processWebhook(payload);

        res.json(result);

    } catch (error: any) {
        console.error('[Integrations API] VAPI webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/integrations/vapi/assistant/:assistantId
 * Delete a VAPI assistant
 */
router.delete('/vapi/assistant/:assistantId', authenticate, async (req: Request, res: Response) => {
    try {
        const { assistantId } = req.params;

        await vapiService.deleteAssistant(assistantId);

        res.json({
            success: true,
            message: 'Assistant deleted'
        });

    } catch (error: any) {
        console.error('[Integrations API] VAPI delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ TELEGRAM ============

/**
 * POST /api/integrations/telegram/connect
 * Connect a Telegram bot
 */
router.post('/telegram/connect', authenticate, async (req: Request, res: Response) => {
    try {
        const { botToken, locationId, defaultAgentRole } = req.body;

        if (!botToken || !locationId) {
            return res.status(400).json({ error: 'botToken and locationId are required' });
        }

        // Construct webhook URL
        const webhookUrl = `${process.env.API_URL || 'https://liv8-backend.onrender.com'}/api/integrations/telegram/webhook/${botToken}`;

        const result = await telegramService.registerBot({
            provider: 'telegram',
            botToken,
            webhookUrl,
            locationId,
            defaultAgentRole: defaultAgentRole || 'assistant'
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            botInfo: result.botInfo,
            webhookUrl
        });

    } catch (error: any) {
        console.error('[Integrations API] Telegram connect error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/integrations/telegram/webhook/:botToken
 * Telegram webhook endpoint
 */
router.post('/telegram/webhook/:botToken', async (req: Request, res: Response) => {
    try {
        const { botToken } = req.params;
        const update = req.body;

        // Process update asynchronously
        telegramService.processUpdate(botToken, update).catch(err => {
            console.error('[Telegram Webhook] Process error:', err);
        });

        // Always respond 200 OK to Telegram
        res.status(200).send('OK');

    } catch (error: any) {
        console.error('[Integrations API] Telegram webhook error:', error);
        res.status(200).send('OK'); // Still respond OK to prevent retries
    }
});

/**
 * GET /api/integrations/telegram/status/:botToken
 * Get Telegram bot status
 */
router.get('/telegram/status/:botToken', authenticate, async (req: Request, res: Response) => {
    try {
        const { botToken } = req.params;

        const [botInfo, webhookInfo] = await Promise.all([
            telegramService.getBotInfo(botToken),
            telegramService.getWebhookInfo(botToken)
        ]);

        res.json({
            success: true,
            bot: botInfo,
            webhook: webhookInfo
        });

    } catch (error: any) {
        console.error('[Integrations API] Telegram status error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/integrations/telegram/disconnect/:botToken
 * Disconnect Telegram bot
 */
router.delete('/telegram/disconnect/:botToken', authenticate, async (req: Request, res: Response) => {
    try {
        const { botToken } = req.params;

        const success = await telegramService.removeWebhook(botToken);

        res.json({
            success,
            message: success ? 'Bot disconnected' : 'Failed to disconnect'
        });

    } catch (error: any) {
        console.error('[Integrations API] Telegram disconnect error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
