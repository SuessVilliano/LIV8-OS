/**
 * VAPI Integration Service
 *
 * Handles voice AI calls through VAPI.
 * Works with both GHL (VAPI installed in GHL) and LIV8 CRM (VAPI + Twilio)
 *
 * VAPI provides:
 * - AI voice agents
 * - Real-time transcription
 * - Function calling during calls
 * - Webhook events
 */

import { VoiceCall, VoiceWebhookPayload } from './types.js';
import { businessTwin } from '../db/business-twin.js';
import { agentExecutor } from '../services/agent-executor.js';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

export interface VAPIAssistantConfig {
    name: string;
    model: {
        provider: 'openai' | 'anthropic' | 'google';
        model: string;
        temperature?: number;
    };
    voice: {
        provider: 'elevenlabs' | 'playht' | 'deepgram' | 'openai';
        voiceId: string;
    };
    firstMessage: string;
    systemPrompt: string;
    functions?: VAPIFunction[];
    endCallPhrases?: string[];
    transcriber?: {
        provider: 'deepgram' | 'assembly';
        language?: string;
    };
}

export interface VAPIFunction {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description: string;
        }>;
        required?: string[];
    };
}

export const vapiService = {
    /**
     * Create a VAPI assistant based on Business Twin
     */
    async createAssistant(params: {
        locationId: string;
        agentRole: string;
        voiceId?: string;
    }): Promise<{ assistantId: string; config: VAPIAssistantConfig }> {
        if (!VAPI_API_KEY) {
            throw new Error('VAPI_API_KEY not configured');
        }

        const { locationId, agentRole, voiceId } = params;

        // Get context from Business Twin
        const twin = await businessTwin.getByLocationId(locationId);
        const context = await businessTwin.generateAgentContext(locationId, agentRole);

        if (!twin) {
            throw new Error('Business Twin not found');
        }

        const businessName = twin.identity?.businessName || 'the business';
        const agentName = twin.agentConfigs?.[agentRole]?.name || `${agentRole} Agent`;

        // Build assistant config
        const config: VAPIAssistantConfig = {
            name: `${businessName} - ${agentName}`,
            model: {
                provider: 'openai',
                model: 'gpt-4-turbo-preview',
                temperature: 0.7
            },
            voice: {
                provider: 'elevenlabs',
                voiceId: voiceId || 'EXAVITQu4vr4xnSDxMaL' // Default professional voice
            },
            firstMessage: getFirstMessage(agentRole, businessName),
            systemPrompt: buildVoiceSystemPrompt(context, agentRole, businessName),
            functions: getAgentFunctions(agentRole),
            endCallPhrases: [
                'goodbye', 'bye', 'have a great day',
                'thanks for calling', 'that\'s all I need'
            ],
            transcriber: {
                provider: 'deepgram',
                language: 'en-US'
            }
        };

        // Create assistant in VAPI
        const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`VAPI error: ${error.message || 'Failed to create assistant'}`);
        }

        const assistant = await response.json();

        return {
            assistantId: assistant.id,
            config
        };
    },

    /**
     * Make an outbound call
     */
    async makeCall(params: {
        assistantId: string;
        phoneNumber: string;
        metadata?: Record<string, any>;
    }): Promise<VoiceCall> {
        if (!VAPI_API_KEY) {
            throw new Error('VAPI_API_KEY not configured');
        }

        const response = await fetch(`${VAPI_BASE_URL}/call/phone`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assistantId: params.assistantId,
                customer: {
                    number: params.phoneNumber
                },
                metadata: params.metadata
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`VAPI call error: ${error.message || 'Failed to initiate call'}`);
        }

        const call = await response.json();

        return {
            id: call.id,
            provider: 'vapi',
            direction: 'outbound',
            from: call.phoneNumber?.number || '',
            to: params.phoneNumber,
            status: 'ringing',
            startedAt: new Date()
        };
    },

    /**
     * Get call details
     */
    async getCall(callId: string): Promise<VoiceCall | null> {
        if (!VAPI_API_KEY) {
            throw new Error('VAPI_API_KEY not configured');
        }

        const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to get call');
        }

        const call = await response.json();

        return {
            id: call.id,
            provider: 'vapi',
            direction: call.direction,
            from: call.phoneNumber?.number || '',
            to: call.customer?.number || '',
            status: mapVAPIStatus(call.status),
            duration: call.duration,
            recordingUrl: call.recordingUrl,
            transcript: call.transcript,
            metadata: call.metadata,
            startedAt: new Date(call.startedAt),
            endedAt: call.endedAt ? new Date(call.endedAt) : undefined
        };
    },

    /**
     * Process webhook from VAPI
     */
    async processWebhook(payload: VAPIWebhookEvent): Promise<{
        action?: string;
        response?: string;
    }> {
        const { type, call, message, functionCall } = payload;

        switch (type) {
            case 'function-call':
                // Handle function calls from VAPI
                if (functionCall) {
                    return this.handleFunctionCall(functionCall, call);
                }
                break;

            case 'end-of-call-report':
                // Call ended - log and update CRM
                console.log('[VAPI] Call ended:', call.id);
                // TODO: Update CRM with call outcome
                break;

            case 'transcript':
                // Real-time transcript update
                console.log('[VAPI] Transcript:', message?.content);
                break;
        }

        return {};
    },

    /**
     * Handle function calls from VAPI during a call
     */
    async handleFunctionCall(
        functionCall: { name: string; parameters: Record<string, any> },
        call: any
    ): Promise<{ response: string }> {
        const { name, parameters } = functionCall;

        switch (name) {
            case 'check_availability':
                // Check calendar availability
                return { response: 'I have availability tomorrow at 2pm and 4pm. Which works better for you?' };

            case 'book_appointment':
                // Book an appointment
                return { response: `I've scheduled your appointment for ${parameters.datetime}. You'll receive a confirmation shortly.` };

            case 'get_pricing':
                // Get pricing from knowledge base
                const locationId = call.metadata?.locationId;
                if (locationId) {
                    const result = await agentExecutor.execute({
                        locationId,
                        agentRole: 'sales',
                        userMessage: `What is the pricing for ${parameters.service || 'our services'}?`
                    });
                    return { response: result.response };
                }
                return { response: 'Let me connect you with someone who can provide detailed pricing information.' };

            case 'transfer_to_human':
                // Transfer to human
                return { response: 'I\'ll transfer you to a team member now. Please hold.' };

            case 'lookup_customer':
                // Look up customer in CRM
                return { response: 'I found your account. How can I help you today?' };

            default:
                return { response: 'Let me check on that for you.' };
        }
    },

    /**
     * List all assistants
     */
    async listAssistants(): Promise<any[]> {
        if (!VAPI_API_KEY) {
            throw new Error('VAPI_API_KEY not configured');
        }

        const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to list assistants');
        }

        return response.json();
    },

    /**
     * Update assistant
     */
    async updateAssistant(assistantId: string, updates: Partial<VAPIAssistantConfig>): Promise<void> {
        if (!VAPI_API_KEY) {
            throw new Error('VAPI_API_KEY not configured');
        }

        const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to update assistant');
        }
    },

    /**
     * Delete assistant
     */
    async deleteAssistant(assistantId: string): Promise<void> {
        if (!VAPI_API_KEY) {
            throw new Error('VAPI_API_KEY not configured');
        }

        const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete assistant');
        }
    }
};

// ============ HELPER FUNCTIONS ============

interface VAPIWebhookEvent {
    type: string;
    call: any;
    message?: { role: string; content: string };
    functionCall?: { name: string; parameters: Record<string, any> };
}

function getFirstMessage(role: string, businessName: string): string {
    const messages: Record<string, string> = {
        sales: `Hi! Thanks for calling ${businessName}. This is your AI sales assistant. How can I help you today?`,
        support: `Hello and thank you for calling ${businessName}. I'm here to help with any questions or issues. What can I assist you with?`,
        assistant: `Hi! You've reached ${businessName}. I'm your AI assistant. How may I direct your call?`,
        marketing: `Hello! Thanks for your interest in ${businessName}. I can tell you about our services. What would you like to know?`
    };

    return messages[role] || `Hi! Thanks for calling ${businessName}. How can I help you today?`;
}

function buildVoiceSystemPrompt(context: string, role: string, businessName: string): string {
    return `You are a voice AI agent for ${businessName}, acting as the ${role}.

${context}

## VOICE-SPECIFIC GUIDELINES
1. Keep responses conversational and concise (1-2 sentences when possible)
2. Use natural speech patterns - contractions, filler words are OK
3. If you don't understand, ask for clarification
4. Never spell out URLs or email addresses - offer to text/email them instead
5. When booking appointments, confirm the time clearly
6. For complex questions, offer to transfer to a human

## AVAILABLE FUNCTIONS
You can use these functions during the call:
- check_availability: Check calendar for available times
- book_appointment: Book an appointment
- get_pricing: Get pricing information
- transfer_to_human: Transfer to a human representative
- lookup_customer: Look up customer by phone number

Remember: You're on a phone call. Be helpful, professional, and efficient.`;
}

function getAgentFunctions(role: string): VAPIFunction[] {
    const baseFunctions: VAPIFunction[] = [
        {
            name: 'transfer_to_human',
            description: 'Transfer the call to a human representative',
            parameters: {
                type: 'object',
                properties: {
                    reason: {
                        type: 'string',
                        description: 'Reason for transfer'
                    }
                }
            }
        },
        {
            name: 'lookup_customer',
            description: 'Look up customer information in the CRM',
            parameters: {
                type: 'object',
                properties: {
                    identifier: {
                        type: 'string',
                        description: 'Phone number or email to look up'
                    }
                }
            }
        }
    ];

    const roleFunctions: Record<string, VAPIFunction[]> = {
        sales: [
            {
                name: 'check_availability',
                description: 'Check available appointment times',
                parameters: {
                    type: 'object',
                    properties: {
                        date: {
                            type: 'string',
                            description: 'Date to check (YYYY-MM-DD or "tomorrow", "next week")'
                        }
                    }
                }
            },
            {
                name: 'book_appointment',
                description: 'Book an appointment for the caller',
                parameters: {
                    type: 'object',
                    properties: {
                        datetime: {
                            type: 'string',
                            description: 'Date and time for appointment'
                        },
                        service: {
                            type: 'string',
                            description: 'Service type'
                        }
                    },
                    required: ['datetime']
                }
            },
            {
                name: 'get_pricing',
                description: 'Get pricing information for services',
                parameters: {
                    type: 'object',
                    properties: {
                        service: {
                            type: 'string',
                            description: 'Service to get pricing for'
                        }
                    }
                }
            }
        ],
        support: [
            {
                name: 'check_order_status',
                description: 'Check the status of an order',
                parameters: {
                    type: 'object',
                    properties: {
                        orderNumber: {
                            type: 'string',
                            description: 'Order number to look up'
                        }
                    }
                }
            },
            {
                name: 'create_ticket',
                description: 'Create a support ticket',
                parameters: {
                    type: 'object',
                    properties: {
                        issue: {
                            type: 'string',
                            description: 'Description of the issue'
                        },
                        priority: {
                            type: 'string',
                            description: 'Priority level: low, medium, high'
                        }
                    },
                    required: ['issue']
                }
            }
        ]
    };

    return [...baseFunctions, ...(roleFunctions[role] || [])];
}

function mapVAPIStatus(status: string): VoiceCall['status'] {
    const statusMap: Record<string, VoiceCall['status']> = {
        'queued': 'ringing',
        'ringing': 'ringing',
        'in-progress': 'in_progress',
        'completed': 'completed',
        'failed': 'failed',
        'busy': 'failed',
        'no-answer': 'no_answer'
    };

    return statusMap[status] || 'failed';
}
