import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { BrandBrain } from '../../services/brand-scanner.js';
import { BuildPlan } from '../../services/snapshot-builder.js';

/**
 * Onboarding Agent State Annotation
 *
 * Defines the state shape for the onboarding agent using LangGraph's
 * Annotation system. This enables automatic state merging and persistence.
 */
export const OnboardingStateAnnotation = Annotation.Root({
    // Session identifiers
    threadId: Annotation<string>({
        reducer: (_, b) => b,
        default: () => ''
    }),
    locationId: Annotation<string>({
        reducer: (_, b) => b,
        default: () => ''
    }),
    userId: Annotation<string>({
        reducer: (_, b) => b,
        default: () => ''
    }),
    agencyId: Annotation<string>({
        reducer: (_, b) => b,
        default: () => ''
    }),

    // Conversation messages - accumulate over time
    messages: Annotation<BaseMessage[]>({
        reducer: (curr, update) => [...curr, ...update],
        default: () => []
    }),

    // Onboarding data
    websiteUrl: Annotation<string | null>({
        reducer: (_, b) => b,
        default: () => null
    }),
    brandBrain: Annotation<BrandBrain | null>({
        reducer: (_, b) => b,
        default: () => null
    }),
    selectedStaff: Annotation<string[]>({
        reducer: (_, b) => b,
        default: () => []
    }),
    goals: Annotation<string[]>({
        reducer: (_, b) => b,
        default: () => []
    }),
    buildPlan: Annotation<BuildPlan | null>({
        reducer: (_, b) => b,
        default: () => null
    }),

    // Approval workflow
    approvalStatus: Annotation<'pending' | 'approved' | 'rejected' | null>({
        reducer: (_, b) => b,
        default: () => null
    }),
    approvalNotes: Annotation<string | null>({
        reducer: (_, b) => b,
        default: () => null
    }),

    // Deployment
    deploymentResult: Annotation<{
        success: boolean;
        deployed: any;
        errors: any[];
    } | null>({
        reducer: (_, b) => b,
        default: () => null
    }),

    // Flow control
    currentStep: Annotation<string>({
        reducer: (_, b) => b,
        default: () => 'greet'
    }),
    awaitingUserInput: Annotation<boolean>({
        reducer: (_, b) => b,
        default: () => false
    }),
    errorCount: Annotation<number>({
        reducer: (curr, update) => update,
        default: () => 0
    }),
    lastError: Annotation<string | null>({
        reducer: (_, b) => b,
        default: () => null
    })
});

/**
 * Onboarding state type derived from annotation
 */
export type OnboardingState = typeof OnboardingStateAnnotation.State;

/**
 * Input type for state updates (partial)
 */
export type OnboardingStateInput = typeof OnboardingStateAnnotation.Update;

/**
 * Initial state factory
 */
export function createInitialState(params: {
    threadId: string;
    locationId: string;
    userId: string;
    agencyId: string;
}): Partial<OnboardingState> {
    return {
        threadId: params.threadId,
        locationId: params.locationId,
        userId: params.userId,
        agencyId: params.agencyId,
        messages: [],
        websiteUrl: null,
        brandBrain: null,
        selectedStaff: [],
        goals: [],
        buildPlan: null,
        approvalStatus: null,
        approvalNotes: null,
        deploymentResult: null,
        currentStep: 'greet',
        awaitingUserInput: false,
        errorCount: 0,
        lastError: null
    };
}
