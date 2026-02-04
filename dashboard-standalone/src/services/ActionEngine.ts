/**
 * ActionEngine - Conversational AI Action Execution Layer
 *
 * Maps natural language intents to real CRM actions (GHL-first, Vbout fallback)
 * Supports: emails, social posts, SMS, calls, contact management, agent interactions
 */

import { getBackendUrl } from './api';

const API_BASE = getBackendUrl();

// Action Types
export type ActionType =
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

export interface ActionIntent {
    type: ActionType;
    confidence: number;
    entities: Record<string, any>;
    rawQuery: string;
}

export interface ActionResult {
    success: boolean;
    action: ActionType;
    message: string;
    data?: any;
    requiresConfirmation?: boolean;
    confirmationPrompt?: string;
}

export interface ActionContext {
    locationId: string;
    crmType: 'ghl' | 'vbout';
    accessToken?: string;
    brandContext?: Record<string, any>;
}

// Intent patterns for local parsing (fallback if AI fails)
const INTENT_PATTERNS: { pattern: RegExp; type: ActionType; extractor?: (match: RegExpMatchArray) => Record<string, any> }[] = [
    // Email patterns
    {
        pattern: /(?:send|write|compose|draft)\s+(?:an?\s+)?email\s+(?:to\s+)?([^\s@]+@[^\s@]+\.[^\s@]+)?/i,
        type: 'send_email',
        extractor: (m) => ({ recipient: m[1] })
    },
    {
        pattern: /email\s+([^\s@]+@[^\s@]+\.[^\s@]+)/i,
        type: 'send_email',
        extractor: (m) => ({ recipient: m[1] })
    },
    // SMS patterns
    {
        pattern: /(?:send|text|sms)\s+(?:a\s+)?(?:text|sms|message)\s+(?:to\s+)?(\+?[\d\s\-()]+)?/i,
        type: 'send_sms',
        extractor: (m) => ({ phone: m[1]?.replace(/\D/g, '') })
    },
    // Social post patterns
    {
        pattern: /(?:post|schedule|publish|share)\s+(?:on\s+|to\s+)?(facebook|instagram|linkedin|twitter|tiktok|social)/i,
        type: 'schedule_post',
        extractor: (m) => ({ platform: m[1]?.toLowerCase() })
    },
    {
        pattern: /(?:create|schedule)\s+(?:a\s+)?(?:social\s+)?post/i,
        type: 'schedule_post'
    },
    // Contact patterns
    {
        pattern: /(?:create|add|new)\s+(?:a\s+)?(?:contact|lead)/i,
        type: 'create_contact'
    },
    {
        pattern: /(?:find|search|look\s*up)\s+(?:contacts?|leads?)\s*(?:named?\s+)?(\w+)?/i,
        type: 'search_contacts',
        extractor: (m) => ({ query: m[1] })
    },
    // Call patterns
    {
        pattern: /(?:call|dial|phone)\s+(\+?[\d\s\-()]+|[\w\s]+)/i,
        type: 'make_call',
        extractor: (m) => ({ target: m[1] })
    },
    // Task patterns
    {
        pattern: /(?:create|add|set)\s+(?:a\s+)?(?:task|reminder|todo)/i,
        type: 'create_task'
    },
    // Workflow patterns
    {
        pattern: /(?:trigger|run|start|execute)\s+(?:the\s+)?(?:workflow|automation)/i,
        type: 'trigger_workflow'
    },
    // Analytics patterns
    {
        pattern: /(?:show|get|fetch|display)\s+(?:my\s+)?(?:analytics|stats|statistics|metrics|dashboard)/i,
        type: 'get_analytics'
    },
    // Opportunity patterns
    {
        pattern: /(?:create|add)\s+(?:an?\s+)?(?:opportunity|deal)/i,
        type: 'create_opportunity'
    },
    // Appointment patterns
    {
        pattern: /(?:book|schedule)\s+(?:an?\s+)?(?:appointment|meeting|call)/i,
        type: 'book_appointment'
    },
    // Content generation
    {
        pattern: /(?:generate|write|create|draft)\s+(?:a\s+)?(?:blog|article|post|content|copy)/i,
        type: 'generate_content'
    },
    // Agent connection
    {
        pattern: /(?:connect|talk|speak|switch)\s+(?:to|with)\s+(?:the\s+)?(?:manager|marketing|sales|support|operations|assistant)/i,
        type: 'connect_agent',
        extractor: (m) => {
            const text = m[0].toLowerCase();
            if (text.includes('marketing')) return { agent: 'marketing' };
            if (text.includes('sales')) return { agent: 'sales' };
            if (text.includes('support')) return { agent: 'support' };
            if (text.includes('operations')) return { agent: 'operations' };
            if (text.includes('manager')) return { agent: 'manager' };
            return { agent: 'assistant' };
        }
    }
];

/**
 * Parse user input to detect intent locally
 */
export function parseIntent(input: string): ActionIntent {
    const normalizedInput = input.toLowerCase().trim();

    for (const { pattern, type, extractor } of INTENT_PATTERNS) {
        const match = normalizedInput.match(pattern);
        if (match) {
            return {
                type,
                confidence: 0.8,
                entities: extractor ? extractor(match) : {},
                rawQuery: input
            };
        }
    }

    return {
        type: 'unknown',
        confidence: 0.3,
        entities: {},
        rawQuery: input
    };
}

/**
 * Execute an action against the backend
 */
export async function executeAction(
    intent: ActionIntent,
    context: ActionContext,
    additionalData?: Record<string, any>
): Promise<ActionResult> {
    const token = localStorage.getItem('os_token');

    try {
        const response = await fetch(`${API_BASE}/api/actions/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Location-Id': context.locationId
            },
            body: JSON.stringify({
                action: intent.type,
                entities: { ...intent.entities, ...additionalData },
                crmType: context.crmType,
                rawQuery: intent.rawQuery,
                brandContext: context.brandContext
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                action: intent.type,
                message: error.message || 'Action execution failed'
            };
        }

        const result = await response.json();
        return {
            success: result.success,
            action: intent.type,
            message: result.message,
            data: result.data,
            requiresConfirmation: result.requiresConfirmation,
            confirmationPrompt: result.confirmationPrompt
        };
    } catch (error: any) {
        return {
            success: false,
            action: intent.type,
            message: `Network error: ${error.message}`
        };
    }
}

/**
 * Get AI-powered intent parsing (uses backend AI)
 */
export async function parseIntentWithAI(
    input: string,
    context: ActionContext
): Promise<ActionIntent> {
    const token = localStorage.getItem('os_token');

    try {
        const response = await fetch(`${API_BASE}/api/actions/parse-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Location-Id': context.locationId
            },
            body: JSON.stringify({
                input,
                crmType: context.crmType,
                brandContext: context.brandContext
            })
        });

        if (!response.ok) {
            // Fallback to local parsing
            return parseIntent(input);
        }

        const result = await response.json();
        return {
            type: result.type || 'unknown',
            confidence: result.confidence || 0.5,
            entities: result.entities || {},
            rawQuery: input
        };
    } catch {
        // Fallback to local parsing
        return parseIntent(input);
    }
}

/**
 * Get action preview/confirmation before execution
 */
export async function previewAction(
    intent: ActionIntent,
    context: ActionContext,
    additionalData?: Record<string, any>
): Promise<{
    description: string;
    estimatedImpact: string;
    warnings?: string[];
    canExecute: boolean;
}> {
    const token = localStorage.getItem('os_token');

    try {
        const response = await fetch(`${API_BASE}/api/actions/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Location-Id': context.locationId
            },
            body: JSON.stringify({
                action: intent.type,
                entities: { ...intent.entities, ...additionalData },
                crmType: context.crmType
            })
        });

        if (!response.ok) {
            return {
                description: `Execute ${intent.type.replace(/_/g, ' ')}`,
                estimatedImpact: 'Unknown impact',
                canExecute: false,
                warnings: ['Unable to preview action']
            };
        }

        return await response.json();
    } catch {
        return {
            description: `Execute ${intent.type.replace(/_/g, ' ')}`,
            estimatedImpact: 'Unknown',
            canExecute: true
        };
    }
}

/**
 * Get suggested quick actions based on context
 */
export function getSuggestedActions(agentRole?: string): { label: string; command: string; icon: string }[] {
    const commonActions = [
        { label: 'Send Email', command: 'Send an email to ', icon: '📧' },
        { label: 'Post to Social', command: 'Create a social media post about ', icon: '📱' },
        { label: 'Send SMS', command: 'Text ', icon: '💬' },
        { label: 'Search Contacts', command: 'Find contacts named ', icon: '🔍' },
        { label: 'View Analytics', command: 'Show my analytics', icon: '📊' }
    ];

    const roleSpecificActions: Record<string, typeof commonActions> = {
        marketing: [
            { label: 'Draft Campaign', command: 'Create a marketing campaign for ', icon: '🎯' },
            { label: 'Schedule Posts', command: 'Schedule social posts for this week', icon: '📅' },
            { label: 'Generate Content', command: 'Write a blog post about ', icon: '✍️' }
        ],
        sales: [
            { label: 'Create Lead', command: 'Add a new lead named ', icon: '👤' },
            { label: 'Send Follow-up', command: 'Send a follow-up email to ', icon: '📩' },
            { label: 'Create Opportunity', command: 'Create a new deal for ', icon: '💰' }
        ],
        support: [
            { label: 'Create Ticket', command: 'Create a support ticket for ', icon: '🎫' },
            { label: 'Send Response', command: 'Send a response to ', icon: '↩️' },
            { label: 'Check Status', command: 'Check ticket status for ', icon: '📋' }
        ],
        operations: [
            { label: 'Run Workflow', command: 'Trigger workflow ', icon: '⚡' },
            { label: 'Sync CRM', command: 'Sync contacts from CRM', icon: '🔄' },
            { label: 'Create Task', command: 'Create a task to ', icon: '✅' }
        ],
        manager: [
            { label: 'Get Report', command: 'Show me the weekly report', icon: '📈' },
            { label: 'Team Status', command: 'What is the team working on', icon: '👥' },
            { label: 'Escalate Issue', command: 'Escalate issue ', icon: '🚨' }
        ]
    };

    if (agentRole && roleSpecificActions[agentRole]) {
        return [...roleSpecificActions[agentRole], ...commonActions.slice(0, 2)];
    }

    return commonActions;
}

/**
 * Format action result for display
 */
export function formatActionResult(result: ActionResult): string {
    if (result.success) {
        switch (result.action) {
            case 'send_email':
                return `✅ Email sent successfully${result.data?.recipient ? ` to ${result.data.recipient}` : ''}`;
            case 'send_sms':
                return `✅ SMS sent${result.data?.phone ? ` to ${result.data.phone}` : ''}`;
            case 'schedule_post':
                return `✅ Post scheduled for ${result.data?.platforms?.join(', ') || 'social media'}`;
            case 'create_contact':
                return `✅ Contact created: ${result.data?.name || 'New contact'}`;
            case 'make_call':
                return `📞 Initiating call${result.data?.target ? ` to ${result.data.target}` : ''}...`;
            case 'search_contacts':
                const count = result.data?.contacts?.length || 0;
                return `🔍 Found ${count} contact${count !== 1 ? 's' : ''}`;
            case 'create_task':
                return `✅ Task created: ${result.data?.title || 'New task'}`;
            case 'trigger_workflow':
                return `⚡ Workflow triggered: ${result.data?.workflowName || 'Automation'}`;
            case 'get_analytics':
                return `📊 Analytics loaded`;
            default:
                return result.message || '✅ Action completed';
        }
    } else {
        return `❌ ${result.message || 'Action failed'}`;
    }
}

/**
 * Check if action requires confirmation
 */
export function requiresConfirmation(actionType: ActionType): boolean {
    const confirmationRequired: ActionType[] = [
        'send_email',
        'send_sms',
        'make_call',
        'trigger_workflow',
        'create_opportunity'
    ];
    return confirmationRequired.includes(actionType);
}

/**
 * Get action type display name
 */
export function getActionDisplayName(actionType: ActionType): string {
    const names: Record<ActionType, string> = {
        send_email: 'Send Email',
        send_sms: 'Send SMS',
        schedule_post: 'Schedule Social Post',
        create_contact: 'Create Contact',
        make_call: 'Make Call',
        create_task: 'Create Task',
        search_contacts: 'Search Contacts',
        get_analytics: 'View Analytics',
        trigger_workflow: 'Trigger Workflow',
        create_opportunity: 'Create Opportunity',
        book_appointment: 'Book Appointment',
        generate_content: 'Generate Content',
        connect_agent: 'Connect to Agent',
        unknown: 'Unknown Action'
    };
    return names[actionType] || actionType;
}

export default {
    parseIntent,
    parseIntentWithAI,
    executeAction,
    previewAction,
    getSuggestedActions,
    formatActionResult,
    requiresConfirmation,
    getActionDisplayName
};
