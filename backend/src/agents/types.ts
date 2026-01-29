import { BaseMessage } from '@langchain/core/messages';
import { BrandBrain } from '../services/brand-scanner.js';
import { BuildPlan } from '../services/snapshot-builder.js';

/**
 * Base agent state interface
 * All agent states extend this
 */
export interface BaseAgentState {
    threadId: string;
    locationId: string;
    userId: string;
    agencyId: string;
    messages: BaseMessage[];
    currentStep: string;
    awaitingUserInput: boolean;
    errorCount: number;
    lastError: string | null;
}

/**
 * Onboarding agent state
 */
export interface OnboardingAgentState extends BaseAgentState {
    // Onboarding data
    websiteUrl: string | null;
    brandBrain: BrandBrain | null;
    selectedStaff: string[];
    goals: string[];
    buildPlan: BuildPlan | null;

    // Approval workflow
    approvalStatus: 'pending' | 'approved' | 'rejected' | null;
    approvalNotes: string | null;

    // Deployment
    deploymentResult: {
        success: boolean;
        deployed: any;
        errors: any[];
    } | null;
}

/**
 * AI Staff role keys
 */
export type AIStaffRole =
    | 'AI_RECEPTIONIST'
    | 'MISSED_CALL_RECOVERY'
    | 'REVIEW_COLLECTOR'
    | 'LEAD_QUALIFIER'
    | 'BOOKING_ASSISTANT'
    | 'REENGAGEMENT_AGENT';

/**
 * AI Staff template
 */
export interface AIStaffTemplate {
    key: AIStaffRole;
    name: string;
    description: string;
    recommended: boolean;
}

/**
 * Available AI Staff templates
 */
export const AI_STAFF_TEMPLATES: AIStaffTemplate[] = [
    {
        key: 'AI_RECEPTIONIST',
        name: 'AI Receptionist',
        description: 'Answers calls 24/7, handles FAQs, filters spam',
        recommended: true
    },
    {
        key: 'MISSED_CALL_RECOVERY',
        name: 'Missed Call Recovery',
        description: 'Instant SMS to missed calls with callback link',
        recommended: true
    },
    {
        key: 'REVIEW_COLLECTOR',
        name: 'Review Collector',
        description: 'Automatically requests reviews after service completion',
        recommended: true
    },
    {
        key: 'LEAD_QUALIFIER',
        name: 'Lead Qualifier',
        description: 'SMS/IG qualification questions to score leads',
        recommended: false
    },
    {
        key: 'BOOKING_ASSISTANT',
        name: 'Booking Assistant',
        description: 'Calendar negotiation and appointment booking',
        recommended: false
    },
    {
        key: 'REENGAGEMENT_AGENT',
        name: 'Re-engagement Agent',
        description: 'Reactivates cold leads (90+ days inactive)',
        recommended: false
    }
];

/**
 * Node result type for partial state updates
 */
export type NodeResult<T extends BaseAgentState> = Partial<T>;

/**
 * Edge decision type
 */
export type EdgeDecision = string | '__end__';

/**
 * Agent factory configuration
 */
export interface AgentConfig {
    agentType: string;
    checkpointEnabled: boolean;
    maxRetries: number;
    timeoutMs: number;
}

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
    agentType: 'generic',
    checkpointEnabled: true,
    maxRetries: 3,
    timeoutMs: 120000
};

/**
 * Agent event types for logging
 */
export type AgentEventType =
    | 'session_start'
    | 'session_end'
    | 'node_enter'
    | 'node_exit'
    | 'tool_call'
    | 'tool_result'
    | 'user_input'
    | 'ai_response'
    | 'error'
    | 'checkpoint_save'
    | 'checkpoint_restore'
    | 'approval_requested'
    | 'approval_received';

/**
 * Agent execution context
 */
export interface AgentContext {
    threadId: string;
    locationId: string;
    userId: string;
    agencyId: string;
    ghlToken?: string;
}
