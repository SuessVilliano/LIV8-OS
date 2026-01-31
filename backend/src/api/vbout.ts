import express from 'express';
import { vboutService } from '../services/vboutService.js';
import { authenticateUser } from '../middleware/authenticateUser.js'; // Assuming we'll have user authentication for these routes

const vboutRouter = express.Router();

// Middleware to protect Vbout routes if necessary
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
vboutRouter.get('/contacts', authenticateUser, async (req, res) => {
    try {
        const contacts = await vboutService.getContacts();
        res.json(contacts);
    } catch (error: any) {
        console.error('Error fetching Vbout contacts:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch contacts from Vbout' });
    }
});

// Example: Endpoint to create a contact in Vbout
vboutRouter.post('/contact', authenticateUser, async (req, res) => {
    try {
        const newContact = await vboutService.createContact(req.body);
        res.status(201).json(newContact);
    } catch (error: any) {
        console.error('Error creating Vbout contact:', error);
        res.status(500).json({ error: error.message || 'Failed to create contact in Vbout' });
    }
});

// Add more Vbout-specific API routes as needed

export default vboutRouter;
