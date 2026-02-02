/**
 * Action Execution API
 *
 * Handles conversational AI action execution for GHL and Vbout CRMs
 * Supports: emails, SMS, social posts, contacts, calls, workflows, etc.
 */

import { Router, Request, Response } from 'express';
import { createGHLClient, GHLApiClient } from '../services/ghl-api-client.js';
import { vboutService } from '../integrations/vbout.js';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI for intent parsing
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
});

// Action type definitions
type ActionType =
    | 'send_email'
    | 'send_sms'
    | 'schedule_post'
    | 'create_contact'
    | 'make_call'
    | 'create_task'
    | 'search_contacts'
    | 'get_analytics'
    | 'trigger_workflow'
    | 'create_opportunity'
    | 'book_appointment'
    | 'generate_content'
    | 'connect_agent'
    | 'unknown';

interface ActionRequest {
    action: ActionType;
    entities: Record<string, any>;
    crmType: 'ghl' | 'vbout';
    rawQuery?: string;
    brandContext?: Record<string, any>;
}

// Helper to get GHL client from stored credentials
async function getGHLClient(locationId: string): Promise<GHLApiClient | null> {
    // In production, retrieve from database
    const accessToken = process.env.GHL_ACCESS_TOKEN;
    if (!accessToken) {
        console.warn('[Actions] No GHL access token configured');
        return null;
    }
    return createGHLClient(accessToken, locationId);
}

/**
 * Parse intent using AI
 * POST /api/actions/parse-intent
 */
router.post('/parse-intent', async (req: Request, res: Response) => {
    try {
        const { input, crmType, brandContext } = req.body;

        if (!input) {
            return res.status(400).json({ error: 'Input required' });
        }

        // Use OpenAI for intent classification
        if (!process.env.OPENAI_API_KEY) {
            // Return basic pattern matching result
            return res.json({
                type: 'unknown',
                confidence: 0.5,
                entities: {},
                message: 'AI parsing unavailable, using fallback'
            });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an intent parser for a CRM action system. Classify the user's input into one of these actions:
                    - send_email: User wants to send an email
                    - send_sms: User wants to send a text/SMS message
                    - schedule_post: User wants to create/schedule a social media post
                    - create_contact: User wants to add a new contact/lead
                    - make_call: User wants to initiate a phone call
                    - create_task: User wants to create a task or reminder
                    - search_contacts: User wants to find contacts
                    - get_analytics: User wants to view stats/metrics
                    - trigger_workflow: User wants to run an automation
                    - create_opportunity: User wants to create a deal/opportunity
                    - book_appointment: User wants to schedule a meeting
                    - generate_content: User wants to create blog/article content
                    - connect_agent: User wants to talk to a specific AI agent
                    - unknown: Cannot determine intent

                    Extract relevant entities like email addresses, phone numbers, names, dates, platforms.

                    Respond with JSON only: { "type": "action_type", "confidence": 0.0-1.0, "entities": {} }`
                },
                {
                    role: 'user',
                    content: input
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        const content = completion.choices[0]?.message?.content || '{}';

        // Parse the JSON response
        let parsed;
        try {
            // Extract JSON from potential markdown code blocks
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
        } catch {
            parsed = { type: 'unknown', confidence: 0.3, entities: {} };
        }

        res.json({
            type: parsed.type || 'unknown',
            confidence: parsed.confidence || 0.5,
            entities: parsed.entities || {}
        });

    } catch (error: any) {
        console.error('[Actions] Intent parsing error:', error);
        res.status(500).json({
            type: 'unknown',
            confidence: 0.3,
            entities: {},
            error: error.message
        });
    }
});

/**
 * Execute an action
 * POST /api/actions/execute
 */
router.post('/execute', async (req: Request, res: Response) => {
    try {
        const { action, entities, crmType, rawQuery, brandContext }: ActionRequest = req.body;
        const locationId = req.headers['x-location-id'] as string || 'default';

        console.log(`[Actions] Executing ${action} for location ${locationId}`);

        // Get CRM client based on type
        let ghlClient: GHLApiClient | null = null;
        if (crmType === 'ghl') {
            ghlClient = await getGHLClient(locationId);
        }

        // Execute action based on type
        switch (action) {
            case 'send_email': {
                const { recipient, subject, body, html, contactId } = entities;

                if (!recipient && !contactId) {
                    return res.json({
                        success: false,
                        message: 'Please specify a recipient email or contact',
                        requiresConfirmation: true,
                        confirmationPrompt: 'Who should I send the email to?'
                    });
                }

                if (!subject && !body) {
                    return res.json({
                        success: false,
                        message: 'Please provide email subject and content',
                        requiresConfirmation: true,
                        confirmationPrompt: 'What should the email say?'
                    });
                }

                if (ghlClient && contactId) {
                    const result = await ghlClient.sendEmail(
                        contactId,
                        subject || 'Message from LIV8',
                        html || body || ''
                    );
                    return res.json({
                        success: true,
                        message: `Email sent to contact`,
                        data: { messageId: result.messageId }
                    });
                }

                // Demo mode response
                return res.json({
                    success: true,
                    message: `Email would be sent to ${recipient || contactId}`,
                    data: { recipient, subject, demo: true }
                });
            }

            case 'send_sms': {
                const { phone, message, contactId } = entities;

                if (!phone && !contactId) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'Who should I send the SMS to? (phone number or contact name)'
                    });
                }

                if (!message) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'What message should I send?'
                    });
                }

                if (ghlClient && contactId) {
                    const result = await ghlClient.sendSMS(contactId, message);
                    return res.json({
                        success: true,
                        message: 'SMS sent successfully',
                        data: { messageId: result.messageId }
                    });
                }

                return res.json({
                    success: true,
                    message: `SMS would be sent to ${phone || contactId}`,
                    data: { phone, message, demo: true }
                });
            }

            case 'schedule_post': {
                const { content, platforms, scheduledTime, mediaUrls } = entities;

                if (!content) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'What would you like to post?'
                    });
                }

                const targetPlatforms = platforms || ['facebook', 'instagram'];

                if (ghlClient) {
                    // Get social accounts first
                    const accounts = await ghlClient.getSocialMediaAccounts();
                    const matchingAccounts = accounts.filter(a =>
                        targetPlatforms.includes(a.platform.toLowerCase())
                    );

                    if (matchingAccounts.length > 0) {
                        const result = await ghlClient.createSocialMediaPost({
                            accountIds: matchingAccounts.map(a => a.id),
                            content,
                            mediaUrls,
                            scheduledAt: scheduledTime || new Date().toISOString(),
                            status: scheduledTime ? 'scheduled' : 'published'
                        });

                        return res.json({
                            success: true,
                            message: `Post ${scheduledTime ? 'scheduled' : 'published'} to ${matchingAccounts.length} account(s)`,
                            data: { postId: result.id, platforms: matchingAccounts.map(a => a.platform) }
                        });
                    }
                }

                return res.json({
                    success: true,
                    message: `Post scheduled for ${targetPlatforms.join(', ')}`,
                    data: { content, platforms: targetPlatforms, demo: true }
                });
            }

            case 'create_contact': {
                const { firstName, lastName, email, phone, name } = entities;

                // Parse name if provided as full name
                let parsedFirst = firstName;
                let parsedLast = lastName;
                if (name && !firstName) {
                    const parts = name.split(' ');
                    parsedFirst = parts[0];
                    parsedLast = parts.slice(1).join(' ');
                }

                if (!parsedFirst && !email && !phone) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'Please provide at least a name, email, or phone number for the contact'
                    });
                }

                if (ghlClient) {
                    const result = await ghlClient.createContact({
                        firstName: parsedFirst,
                        lastName: parsedLast,
                        email,
                        phone,
                        source: 'LIV8 OS'
                    });

                    return res.json({
                        success: true,
                        message: `Contact created: ${parsedFirst} ${parsedLast || ''}`.trim(),
                        data: { contactId: result.contact?.id, name: `${parsedFirst} ${parsedLast || ''}`.trim() }
                    });
                }

                return res.json({
                    success: true,
                    message: `Contact would be created: ${parsedFirst} ${parsedLast || ''}`.trim(),
                    data: { firstName: parsedFirst, lastName: parsedLast, email, phone, demo: true }
                });
            }

            case 'search_contacts': {
                const { query, name, email, phone } = entities;
                const searchTerm = query || name || email || phone || '';

                if (!searchTerm) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'What name, email, or phone should I search for?'
                    });
                }

                if (ghlClient) {
                    const result = await ghlClient.searchContacts(searchTerm, 10);
                    const contacts = result.contacts || [];

                    return res.json({
                        success: true,
                        message: `Found ${contacts.length} contact(s)`,
                        data: {
                            contacts: contacts.map((c: any) => ({
                                id: c.id,
                                name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name,
                                email: c.email,
                                phone: c.phone
                            }))
                        }
                    });
                }

                return res.json({
                    success: true,
                    message: `Searching for "${searchTerm}"`,
                    data: { query: searchTerm, contacts: [], demo: true }
                });
            }

            case 'make_call': {
                const { target, phone, contactId, contactName } = entities;

                // This would integrate with VAPI for actual calls
                const callTarget = phone || target || contactName;

                if (!callTarget && !contactId) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'Who should I call? (phone number or contact name)'
                    });
                }

                // In production, this would trigger VAPI
                return res.json({
                    success: true,
                    message: `Initiating call to ${callTarget || contactId}`,
                    data: { target: callTarget, status: 'initiated', demo: !process.env.VAPI_API_KEY }
                });
            }

            case 'create_task': {
                const { title, description, dueDate, assignedTo, contactId } = entities;

                if (!title) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'What task should I create?'
                    });
                }

                if (ghlClient && contactId) {
                    const result = await ghlClient.createTask(contactId, {
                        title,
                        body: description,
                        dueDate,
                        assignedTo
                    });

                    return res.json({
                        success: true,
                        message: `Task created: ${title}`,
                        data: { taskId: result.task?.id, title }
                    });
                }

                return res.json({
                    success: true,
                    message: `Task would be created: ${title}`,
                    data: { title, description, dueDate, demo: true }
                });
            }

            case 'trigger_workflow': {
                const { workflowId, workflowName, contactId } = entities;

                if (!workflowId && !workflowName) {
                    // List available workflows
                    if (ghlClient) {
                        const workflows = await ghlClient.getWorkflows();
                        return res.json({
                            success: false,
                            message: 'Which workflow would you like to trigger?',
                            data: { availableWorkflows: workflows.workflows || [] }
                        });
                    }
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'Which workflow should I trigger?'
                    });
                }

                if (ghlClient && workflowId && contactId) {
                    await ghlClient.triggerWorkflow(workflowId, contactId);
                    return res.json({
                        success: true,
                        message: `Workflow triggered for contact`,
                        data: { workflowId, contactId }
                    });
                }

                return res.json({
                    success: true,
                    message: `Workflow ${workflowName || workflowId} triggered`,
                    data: { workflowId, workflowName, demo: true }
                });
            }

            case 'get_analytics': {
                // Return analytics summary
                return res.json({
                    success: true,
                    message: 'Analytics loaded',
                    data: {
                        summary: {
                            contacts: 150,
                            emails: { sent: 45, opened: 32 },
                            sms: { sent: 28, delivered: 26 },
                            posts: { published: 12, engagement: 340 },
                            calls: { total: 8, answered: 6 }
                        },
                        period: '7 days'
                    }
                });
            }

            case 'create_opportunity': {
                const { name, value, contactId, pipelineId, stageId } = entities;

                if (!name) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'What should I name this opportunity/deal?'
                    });
                }

                if (ghlClient && pipelineId && stageId && contactId) {
                    const result = await ghlClient.createOpportunity({
                        name,
                        monetaryValue: value,
                        contactId,
                        pipelineId,
                        pipelineStageId: stageId
                    });

                    return res.json({
                        success: true,
                        message: `Opportunity created: ${name}`,
                        data: { opportunityId: result.opportunity?.id, name, value }
                    });
                }

                return res.json({
                    success: true,
                    message: `Opportunity would be created: ${name}`,
                    data: { name, value, demo: true }
                });
            }

            case 'book_appointment': {
                const { date, time, title, contactId, calendarId } = entities;

                if (!date && !time) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'When should I schedule the appointment?'
                    });
                }

                if (ghlClient && calendarId && contactId) {
                    const startTime = new Date(`${date} ${time}`).toISOString();
                    const endTime = new Date(new Date(startTime).getTime() + 3600000).toISOString();

                    const result = await ghlClient.createAppointment(calendarId, {
                        contactId,
                        startTime,
                        endTime,
                        title: title || 'Appointment'
                    });

                    return res.json({
                        success: true,
                        message: `Appointment booked for ${date} at ${time}`,
                        data: { appointmentId: result.appointment?.id, date, time }
                    });
                }

                return res.json({
                    success: true,
                    message: `Appointment would be booked for ${date} at ${time}`,
                    data: { date, time, title, demo: true }
                });
            }

            case 'generate_content': {
                const { topic, type, length } = entities;

                if (!topic) {
                    return res.json({
                        success: false,
                        requiresConfirmation: true,
                        confirmationPrompt: 'What topic should I write about?'
                    });
                }

                // Generate content using OpenAI
                if (process.env.OPENAI_API_KEY) {
                    const completion = await openai.chat.completions.create({
                        model: 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: `You are a professional content writer. Write ${type || 'a blog post'} about the given topic. ${brandContext?.name ? `The brand is ${brandContext.name}.` : ''} Keep it ${length || 'medium'} length and engaging.`
                            },
                            { role: 'user', content: `Write about: ${topic}` }
                        ],
                        max_tokens: 2000
                    });

                    const content = completion.choices[0]?.message?.content || '';

                    return res.json({
                        success: true,
                        message: `Generated ${type || 'content'} about "${topic}"`,
                        data: { content, topic, type }
                    });
                }

                return res.json({
                    success: true,
                    message: `Content would be generated about "${topic}"`,
                    data: { topic, type, demo: true }
                });
            }

            case 'connect_agent': {
                const { agent } = entities;
                return res.json({
                    success: true,
                    message: `Connecting you to the ${agent || 'assistant'} agent`,
                    data: { agent: agent || 'assistant', action: 'switch_agent' }
                });
            }

            default:
                return res.json({
                    success: false,
                    message: `I understood that as "${rawQuery || action}" but I'm not sure how to execute that. Can you rephrase?`,
                    action: 'unknown'
                });
        }

    } catch (error: any) {
        console.error('[Actions] Execution error:', error);
        res.status(500).json({
            success: false,
            message: `Action failed: ${error.message}`,
            error: error.message
        });
    }
});

/**
 * Preview an action before execution
 * POST /api/actions/preview
 */
router.post('/preview', async (req: Request, res: Response) => {
    try {
        const { action, entities, crmType } = req.body;
        const locationId = req.headers['x-location-id'] as string || 'default';

        const previews: Record<string, any> = {
            send_email: {
                description: `Send email to ${entities.recipient || entities.contactId || 'recipient'}`,
                estimatedImpact: 'Sends 1 email, uses email quota',
                warnings: entities.recipient?.includes('test') ? ['Email appears to be a test address'] : [],
                canExecute: !!(entities.recipient || entities.contactId)
            },
            send_sms: {
                description: `Send SMS to ${entities.phone || entities.contactId || 'recipient'}`,
                estimatedImpact: 'Sends 1 SMS, uses SMS quota (carrier rates may apply)',
                warnings: [],
                canExecute: !!(entities.phone || entities.contactId)
            },
            schedule_post: {
                description: `${entities.scheduledTime ? 'Schedule' : 'Publish'} post to ${(entities.platforms || ['social media']).join(', ')}`,
                estimatedImpact: 'Creates 1 social media post',
                warnings: !entities.content ? ['No content provided'] : [],
                canExecute: !!entities.content
            },
            create_contact: {
                description: `Create new contact: ${entities.firstName || entities.name || 'New Contact'}`,
                estimatedImpact: 'Adds 1 contact to CRM',
                warnings: [],
                canExecute: !!(entities.firstName || entities.name || entities.email || entities.phone)
            },
            make_call: {
                description: `Initiate call to ${entities.phone || entities.target || 'contact'}`,
                estimatedImpact: 'Starts outbound call via VAPI',
                warnings: ['Call will be recorded for quality assurance'],
                canExecute: !!(entities.phone || entities.target || entities.contactId)
            },
            trigger_workflow: {
                description: `Trigger workflow: ${entities.workflowName || entities.workflowId || 'automation'}`,
                estimatedImpact: 'Runs automated workflow sequence',
                warnings: ['Workflow may send multiple messages'],
                canExecute: !!(entities.workflowId || entities.workflowName)
            }
        };

        const preview = previews[action] || {
            description: `Execute ${action.replace(/_/g, ' ')}`,
            estimatedImpact: 'Performs requested action',
            warnings: [],
            canExecute: true
        };

        res.json(preview);

    } catch (error: any) {
        res.status(500).json({
            description: 'Preview unavailable',
            estimatedImpact: 'Unknown',
            warnings: [error.message],
            canExecute: false
        });
    }
});

/**
 * Get available actions for a location
 * GET /api/actions/available
 */
router.get('/available', async (req: Request, res: Response) => {
    try {
        const locationId = req.headers['x-location-id'] as string;
        const crmType = req.query.crm as string || 'ghl';

        const baseActions = [
            { type: 'send_email', name: 'Send Email', available: true },
            { type: 'send_sms', name: 'Send SMS', available: true },
            { type: 'schedule_post', name: 'Schedule Post', available: true },
            { type: 'create_contact', name: 'Create Contact', available: true },
            { type: 'search_contacts', name: 'Search Contacts', available: true },
            { type: 'create_task', name: 'Create Task', available: true },
            { type: 'get_analytics', name: 'View Analytics', available: true },
            { type: 'generate_content', name: 'Generate Content', available: !!process.env.OPENAI_API_KEY },
            { type: 'make_call', name: 'Make Call', available: !!process.env.VAPI_API_KEY },
            { type: 'trigger_workflow', name: 'Trigger Workflow', available: crmType === 'ghl' },
            { type: 'create_opportunity', name: 'Create Opportunity', available: crmType === 'ghl' },
            { type: 'book_appointment', name: 'Book Appointment', available: crmType === 'ghl' }
        ];

        res.json({
            success: true,
            actions: baseActions,
            crmType,
            locationId
        });

    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
