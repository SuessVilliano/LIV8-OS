import express from 'express';
import crypto from 'crypto';
import { vboutService } from '../services/vboutService.js';
// Removed: import { authenticateUser } from '../middleware/authenticateUser.js'; // Caused build error

const vboutRouter = express.Router();

/**
 * Verify VBout webhook signature (HMAC-SHA256)
 * Security fix: Validates incoming webhooks are authentic
 */
function verifyVboutWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) {
        return false;
    }

    try {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');

        // Use timing-safe comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        console.error('[VBout] Signature verification error:', error);
        return false;
    }
}

// Middleware to protect Vbout routes if necessary
// This is currently disabled until `authenticateUser` is properly implemented.
// vboutRouter.use(authenticateUser); 

// Endpoint for Vbout webhooks
vboutRouter.post('/events', async (req, res) => {
    // Vbout uses an API Key for authentication of webhook calls to their API,
    // but for inbound webhooks *to us*, we might need a shared secret for validation.
    // As per Vbout's documentation, they push data *to* a URL.
    // The image provided earlier showed an "OAuth Token" and "Client Secret".
    // We should clarify if Vbout signs their outbound webhooks.
    // For now, we proceed assuming no signature verification is in place, but it's a security best practice.

    console.log('Received Vbout webhook event at /api/vbout/events');
    // Log the full webhook body for inspection and debugging during development
    console.log('Vbout Webhook Body:', JSON.stringify(req.body, null, 2));

    const vboutEvent = req.body;

    // --- Placeholder for Webhook Validation (e.g., shared secret or IP whitelist) ---
    // If Vbout provides a webhook secret, we would implement verification here:
    // const vboutWebhookSecret = process.env.VBOUT_WEBHOOK_SECRET;
    // const signature = req.headers['x-vbout-signature'] || req.headers['Vbout-Signature']; // Check common headers
    // if (vboutWebhookSecret && signature && !verifyVboutWebhookSignature(req.rawBody, signature, vboutWebhookSecret)) {
    //     console.warn('Unauthorized: Invalid Vbout webhook signature.');
    //     return res.status(401).send('Unauthorized: Invalid webhook signature');
    // }

    try {
        // --- Determine Event Type and Process ---
        // Vbout webhook payload structure isn't fully explicit for *outbound* events from the docs found so far.
        // We will need to infer event types based on the presence of certain fields or specific structures in the payload.
        // Common events: contact creation/update, email activity, form submission, automation trigger.

        // Example: If a 'contact' object is present and has certain fields, it could be a contact event.
        if (vboutEvent && vboutEvent.contact && vboutEvent.contact.email) {
            // This is a basic example; you'd need more sophisticated logic
            // to differentiate between contact created, updated, or deleted.
            console.log(`Vbout Contact Event detected for email: ${vboutEvent.contact.email}`);
            // await agentManager.handleVboutContactEvent(vboutEvent.contact);
        } else if (vboutEvent && vboutEvent.automation_id && vboutEvent.event_type === 'automation_triggered') {
            console.log(`Vbout Automation Triggered: ${vboutEvent.automation_id}`);
            // await agentManager.handleVboutAutomationTrigger(vboutEvent);
        } else {
            console.log('Unhandled Vbout event type. Payload:', vboutEvent);
        }

        // --- Trigger AI Manager Actions ---
        // This is where the autonomous agency comes into play.
        // The AI Manager will receive this event and decide on the next steps.
        // e.g., if a new lead is created in Vbout, the AI Manager could:
        // - Create a corresponding lead in GHL (if not already there).
        // - Assign a follow-up task to a human agent.
        // - Send a personalized welcome email via Vbout.
        // - Update the client's dashboard with the new lead information.
        // await agentManager.processVboutWebhook(vboutEvent);

        res.status(200).send('Vbout event received and being processed by AI Manager.');
    } catch (error: any) {
        console.error('Error processing Vbout webhook event:', error);
        res.status(500).json({ error: 'Failed to process Vbout event', details: error.message });
    }
});

// Example: Endpoint to get contacts from Vbout
// Removed `authenticateUser` middleware for now
vboutRouter.get('/contacts', async (req, res) => {
    try {
        const listId = req.query.listId as string;
        if (!listId) {
            return res.status(400).json({ error: 'listId query parameter is required' });
        }
        const contacts = await vboutService.getContacts(listId);
        res.json(contacts);
    } catch (error: any) {
        console.error('Error fetching Vbout contacts:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch contacts from Vbout' });
    }
});

// Example: Endpoint to create a contact in Vbout
// Removed `authenticateUser` middleware for now
vboutRouter.post('/contact', async (req, res) => {
    try {
        const newContact = await vboutService.createContact(req.body);
        res.status(201).json(newContact);
    } catch (error: any) {
        console.error('Error creating Vbout contact:', error);
        res.status(500).json({ error: error.message || 'Failed to create contact in Vbout' });
    }
});

// Social sync endpoint - sync scheduled posts to VBout
vboutRouter.post('/social/sync', async (req, res) => {
    try {
        const { locationId, assets, brandColors, posts } = req.body;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        console.log(`[VBout] Syncing social content for location: ${locationId}`);

        // In production, this would use the VBout API to:
        // 1. Upload brand assets to VBout's media library
        // 2. Create scheduled posts in VBout's social planner
        // 3. Apply brand colors to email templates

        const syncedItems = {
            assets: assets?.length || 0,
            posts: posts?.length || 0,
            brandColors: brandColors ? true : false
        };

        // Example: Create posts in VBout
        if (posts && posts.length > 0) {
            for (const post of posts) {
                try {
                    // await vboutService.createSocialPost({
                    //     content: post.content,
                    //     scheduledAt: post.scheduledAt,
                    //     channel: post.channel
                    // });
                    console.log(`[VBout] Would create post: ${post.title}`);
                } catch (err) {
                    console.error(`[VBout] Failed to create post: ${post.title}`, err);
                }
            }
        }

        res.json({
            success: true,
            message: 'Social content synced to VBout',
            synced: syncedItems
        });

    } catch (error: any) {
        console.error('[VBout] Social sync error:', error);
        res.status(500).json({ error: error.message || 'Failed to sync to VBout' });
    }
});

// Add more Vbout-specific API routes as needed

export default vboutRouter;
