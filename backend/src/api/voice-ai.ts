/**
 * Voice AI API - White-Label VAPI Integration
 *
 * Provides a complete headless voice AI platform proxying VAPI's API.
 * All endpoints are authenticated and scoped to the user's location.
 *
 * Endpoints:
 *   Assistants: CRUD + duplicate
 *   Calls: List, create (outbound), get details
 *   Phone Numbers: CRUD
 *   Analytics: Aggregated call metrics
 */

import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';

const router = Router();

const VAPI_BASE = 'https://api.vapi.ai';

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

// Get VAPI API key - supports per-location keys stored in env or a default
function getVapiKey(locationId?: string): string {
    // Check for location-specific key first
    if (locationId) {
        const locationKey = process.env[`VAPI_API_KEY_${locationId}`];
        if (locationKey) return locationKey;
    }
    const key = process.env.VAPI_API_KEY;
    if (!key) throw new Error('VAPI_API_KEY not configured');
    return key;
}

// VAPI fetch helper
async function vapiRequest(
    method: string,
    path: string,
    locationId?: string,
    body?: any
): Promise<any> {
    const apiKey = getVapiKey(locationId);
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };

    const options: RequestInit = { method, headers };
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const url = `${VAPI_BASE}${path}`;
    const response = await fetch(url, options);

    if (!response.ok) {
        let errMsg = `VAPI ${response.status}`;
        try {
            const errBody = await response.json();
            errMsg = errBody.message || errBody.error || errMsg;
        } catch {}
        throw new Error(errMsg);
    }

    // DELETE may return 204 with no body
    if (response.status === 204) return { success: true };

    return response.json();
}

// ============================================================
// ASSISTANTS
// ============================================================

/**
 * GET /api/voice-ai/assistants
 * List all assistants
 */
router.get('/assistants', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const data = await vapiRequest('GET', '/assistant', locationId);
        res.json({ success: true, assistants: Array.isArray(data) ? data : [] });
    } catch (error: any) {
        console.error('[VoiceAI] List assistants error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/voice-ai/assistants
 * Create a new assistant
 */
router.post('/assistants', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const body = req.body;

        // Inject location metadata
        if (locationId) {
            body.metadata = { ...body.metadata, locationId };
        }

        const assistant = await vapiRequest('POST', '/assistant', locationId, body);
        res.json({ success: true, assistant });
    } catch (error: any) {
        console.error('[VoiceAI] Create assistant error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/voice-ai/assistants/:id
 * Get a specific assistant
 */
router.get('/assistants/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const assistant = await vapiRequest('GET', `/assistant/${req.params.id}`, locationId);
        res.json({ success: true, assistant });
    } catch (error: any) {
        console.error('[VoiceAI] Get assistant error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/voice-ai/assistants/:id
 * Update an assistant
 */
router.patch('/assistants/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const assistant = await vapiRequest('PATCH', `/assistant/${req.params.id}`, locationId, req.body);
        res.json({ success: true, assistant });
    } catch (error: any) {
        console.error('[VoiceAI] Update assistant error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/voice-ai/assistants/:id
 * Delete an assistant
 */
router.delete('/assistants/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        await vapiRequest('DELETE', `/assistant/${req.params.id}`, locationId);
        res.json({ success: true, message: 'Assistant deleted' });
    } catch (error: any) {
        console.error('[VoiceAI] Delete assistant error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/voice-ai/assistants/:id/duplicate
 * Duplicate an assistant
 */
router.post('/assistants/:id/duplicate', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        // Fetch the original
        const original = await vapiRequest('GET', `/assistant/${req.params.id}`, locationId);
        // Remove id fields and rename
        const { id, createdAt, updatedAt, orgId, ...config } = original;
        config.name = `${config.name || 'Assistant'} (Copy)`;
        const duplicate = await vapiRequest('POST', '/assistant', locationId, config);
        res.json({ success: true, assistant: duplicate });
    } catch (error: any) {
        console.error('[VoiceAI] Duplicate assistant error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CALLS
// ============================================================

/**
 * GET /api/voice-ai/calls
 * List calls with optional filters
 * Query params: assistantId, limit, createdAtGe, createdAtLe
 */
router.get('/calls', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const { assistantId, limit, createdAtGe, createdAtLe } = req.query;

        let path = '/call?';
        const params: string[] = [];
        if (assistantId) params.push(`assistantId=${assistantId}`);
        if (limit) params.push(`limit=${limit}`);
        if (createdAtGe) params.push(`createdAtGe=${createdAtGe}`);
        if (createdAtLe) params.push(`createdAtLe=${createdAtLe}`);
        path += params.join('&');

        const data = await vapiRequest('GET', path, locationId);
        res.json({ success: true, calls: Array.isArray(data) ? data : [] });
    } catch (error: any) {
        console.error('[VoiceAI] List calls error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/voice-ai/calls
 * Create an outbound call
 */
router.post('/calls', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const { assistantId, phoneNumberId, customerNumber, metadata, scheduledAt } = req.body;

        if (!assistantId || !customerNumber) {
            return res.status(400).json({ error: 'assistantId and customerNumber are required' });
        }

        const callBody: any = {
            assistantId,
            customer: { number: customerNumber },
            metadata: { ...metadata, locationId },
        };

        if (phoneNumberId) callBody.phoneNumberId = phoneNumberId;
        if (scheduledAt) callBody.schedulePlan = { earliestAt: scheduledAt };

        const call = await vapiRequest('POST', '/call', locationId, callBody);
        res.json({ success: true, call });
    } catch (error: any) {
        console.error('[VoiceAI] Create call error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/voice-ai/calls/:id
 * Get call details (includes transcript, recording, analysis)
 */
router.get('/calls/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const call = await vapiRequest('GET', `/call/${req.params.id}`, locationId);
        res.json({ success: true, call });
    } catch (error: any) {
        console.error('[VoiceAI] Get call error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// PHONE NUMBERS
// ============================================================

/**
 * GET /api/voice-ai/phone-numbers
 * List all phone numbers
 */
router.get('/phone-numbers', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const data = await vapiRequest('GET', '/phone-number', locationId);
        res.json({ success: true, phoneNumbers: Array.isArray(data) ? data : [] });
    } catch (error: any) {
        console.error('[VoiceAI] List phone numbers error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/voice-ai/phone-numbers
 * Create / import a phone number
 */
router.post('/phone-numbers', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const phoneNumber = await vapiRequest('POST', '/phone-number', locationId, req.body);
        res.json({ success: true, phoneNumber });
    } catch (error: any) {
        console.error('[VoiceAI] Create phone number error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/voice-ai/phone-numbers/:id
 * Get a specific phone number
 */
router.get('/phone-numbers/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const phoneNumber = await vapiRequest('GET', `/phone-number/${req.params.id}`, locationId);
        res.json({ success: true, phoneNumber });
    } catch (error: any) {
        console.error('[VoiceAI] Get phone number error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/voice-ai/phone-numbers/:id
 * Update a phone number
 */
router.patch('/phone-numbers/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const phoneNumber = await vapiRequest('PATCH', `/phone-number/${req.params.id}`, locationId, req.body);
        res.json({ success: true, phoneNumber });
    } catch (error: any) {
        console.error('[VoiceAI] Update phone number error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/voice-ai/phone-numbers/:id
 * Delete a phone number
 */
router.delete('/phone-numbers/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        await vapiRequest('DELETE', `/phone-number/${req.params.id}`, locationId);
        res.json({ success: true, message: 'Phone number deleted' });
    } catch (error: any) {
        console.error('[VoiceAI] Delete phone number error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ANALYTICS
// ============================================================

/**
 * POST /api/voice-ai/analytics
 * Query analytics from VAPI
 */
router.post('/analytics', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const data = await vapiRequest('POST', '/analytics', locationId, req.body);
        res.json({ success: true, analytics: data });
    } catch (error: any) {
        console.error('[VoiceAI] Analytics error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/voice-ai/analytics/summary
 * Quick summary: total calls, total minutes, success rate, active assistants
 * Computed by fetching recent calls and aggregating client-side
 */
router.get('/analytics/summary', authenticate, async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;

        // Fetch recent calls and assistants in parallel
        const [calls, assistants] = await Promise.all([
            vapiRequest('GET', '/call?limit=100', locationId),
            vapiRequest('GET', '/assistant', locationId),
        ]);

        const callList = Array.isArray(calls) ? calls : [];
        const assistantList = Array.isArray(assistants) ? assistants : [];

        let totalMinutes = 0;
        let completedCalls = 0;
        let failedCalls = 0;
        const costTotal = 0;

        for (const call of callList) {
            if (call.endedReason === 'assistant-ended-call' || call.endedReason === 'customer-ended-call' || call.status === 'ended') {
                completedCalls++;
            } else if (call.endedReason === 'assistant-error' || call.status === 'failed') {
                failedCalls++;
            }
            if (call.costs) {
                for (const c of call.costs) {
                    if (c.minutes) totalMinutes += c.minutes;
                }
            }
            // Fallback: use duration if available
            if (call.duration && totalMinutes === 0) {
                totalMinutes += call.duration / 60;
            }
        }

        const successRate = callList.length > 0
            ? Math.round((completedCalls / callList.length) * 100)
            : 0;

        res.json({
            success: true,
            summary: {
                totalCalls: callList.length,
                completedCalls,
                failedCalls,
                totalMinutes: Math.round(totalMinutes * 10) / 10,
                successRate,
                activeAssistants: assistantList.length,
                costTotal: Math.round(costTotal * 100) / 100,
            },
        });
    } catch (error: any) {
        console.error('[VoiceAI] Analytics summary error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// WEBHOOKS
// ============================================================

/**
 * POST /api/voice-ai/webhooks/vapi
 * Handle incoming VAPI webhooks (server events)
 */
router.post('/webhooks/vapi', async (req: Request, res: Response) => {
    try {
        const event = req.body;
        const { message } = event;

        if (!message) {
            return res.status(200).json({ success: true });
        }

        const eventType = message.type;
        console.log(`[VoiceAI Webhook] ${eventType}`, message.call?.id || '');

        switch (eventType) {
            case 'end-of-call-report': {
                // Log call completion - could store in DB, trigger workflows, etc.
                const call = message.call;
                console.log('[VoiceAI Webhook] Call ended:', {
                    callId: call?.id,
                    duration: call?.duration,
                    endedReason: call?.endedReason,
                    summary: message.analysis?.summary,
                });
                break;
            }

            case 'function-call': {
                // Handle function calls from the assistant during a call
                const { functionCall, call } = message;
                if (functionCall) {
                    const result = await handleFunctionCall(functionCall, call);
                    return res.json({ result });
                }
                break;
            }

            case 'assistant-request': {
                // Dynamic assistant assignment for inbound calls
                // Return assistant config or assistantId
                break;
            }

            case 'status-update': {
                console.log('[VoiceAI Webhook] Status:', message.status);
                break;
            }
        }

        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[VoiceAI Webhook] Error:', error.message);
        res.status(200).json({ success: true }); // Always 200 to avoid VAPI retries
    }
});

// Function call handler
async function handleFunctionCall(
    functionCall: { name: string; parameters: Record<string, any> },
    call: any
): Promise<string> {
    const { name, parameters } = functionCall;

    switch (name) {
        case 'check_availability':
            return JSON.stringify({ available: true, slots: ['Tomorrow 2pm', 'Tomorrow 4pm', 'Friday 10am'] });
        case 'book_appointment':
            return JSON.stringify({ booked: true, datetime: parameters.datetime, confirmation: 'APPT-' + Date.now() });
        case 'get_pricing':
            return JSON.stringify({ message: 'Let me connect you with someone who can provide detailed pricing.' });
        case 'transfer_to_human':
            return JSON.stringify({ transferring: true, reason: parameters.reason });
        case 'lookup_customer':
            return JSON.stringify({ found: true, name: 'Customer', message: 'Account found.' });
        default:
            return JSON.stringify({ message: 'Let me check on that for you.' });
    }
}

export default router;
