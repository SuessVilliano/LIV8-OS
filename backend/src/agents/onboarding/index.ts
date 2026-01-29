import { StateGraph, END, START, MemorySaver } from '@langchain/langgraph';
import { OnboardingStateAnnotation, OnboardingState, createInitialState } from './state.js';
import * as nodes from './nodes.js';
import * as edges from './edges.js';
import { PostgresCheckpointer } from '../checkpointer.js';

/**
 * Onboarding Agent Graph
 *
 * A LangGraph-based state machine that guides users through
 * the GHL onboarding process with AI assistance.
 *
 * Flow:
 * START -> greet -> collect_info -> scan_brand -> select_staff
 *       -> set_goals -> generate_plan -> await_approval -> deploy -> verify -> END
 */

/**
 * Create the Onboarding Agent graph
 * Returns a compiled graph ready for execution
 */
export function createOnboardingGraph() {
    const graph = new StateGraph(OnboardingStateAnnotation)
        // Add all nodes
        .addNode('greet', nodes.greetNode)
        .addNode('collect_info', nodes.collectInfoNode)
        .addNode('scan_brand', nodes.scanBrandNode)
        .addNode('select_staff', nodes.selectStaffNode)
        .addNode('set_goals', nodes.setGoalsNode)
        .addNode('generate_plan', nodes.generatePlanNode)
        .addNode('await_approval', nodes.awaitApprovalNode)
        .addNode('deploy', nodes.deployNode)
        .addNode('verify', nodes.verifyNode)
        .addNode('error_handler', nodes.errorHandlerNode)

        // Define edges from START
        .addEdge(START, 'greet')

        // Define conditional edges for each node
        .addConditionalEdges('greet', edges.afterGreet)
        .addConditionalEdges('collect_info', edges.afterCollectInfo)
        .addConditionalEdges('scan_brand', edges.afterScanBrand)
        .addConditionalEdges('select_staff', edges.afterSelectStaff)
        .addConditionalEdges('set_goals', edges.afterSetGoals)
        .addConditionalEdges('generate_plan', edges.afterGeneratePlan)
        .addConditionalEdges('await_approval', edges.afterAwaitApproval)
        .addConditionalEdges('deploy', edges.afterDeploy)
        .addConditionalEdges('verify', edges.afterVerify)
        .addConditionalEdges('error_handler', edges.afterError);

    return graph;
}

/**
 * Create a compiled graph with PostgreSQL checkpointing
 */
export function createOnboardingAgent(checkpointer?: PostgresCheckpointer) {
    const graph = createOnboardingGraph();

    // Use provided checkpointer or create new one
    const cp = checkpointer || new PostgresCheckpointer();

    return graph.compile({ checkpointer: cp });
}

/**
 * Create a compiled graph with in-memory checkpointing (for testing)
 */
export function createOnboardingAgentWithMemory() {
    const graph = createOnboardingGraph();
    const memoryCheckpointer = new MemorySaver();

    return graph.compile({ checkpointer: memoryCheckpointer });
}

/**
 * Run the onboarding agent for a new session
 */
export async function startOnboardingSession(params: {
    threadId: string;
    locationId: string;
    userId: string;
    agencyId: string;
    checkpointer?: PostgresCheckpointer;
}): Promise<OnboardingState> {
    const agent = createOnboardingAgent(params.checkpointer);

    const initialState = createInitialState({
        threadId: params.threadId,
        locationId: params.locationId,
        userId: params.userId,
        agencyId: params.agencyId
    });

    const config = {
        configurable: {
            thread_id: params.threadId
        }
    };

    const result = await agent.invoke(initialState, config);

    return result as OnboardingState;
}

/**
 * Resume an onboarding session with user input
 */
export async function resumeOnboardingSession(params: {
    threadId: string;
    userMessage: string;
    checkpointer?: PostgresCheckpointer;
}): Promise<OnboardingState> {
    const { HumanMessage } = await import('@langchain/core/messages');

    const agent = createOnboardingAgent(params.checkpointer);

    const config = {
        configurable: {
            thread_id: params.threadId
        }
    };

    // Resume with user's message
    const result = await agent.invoke(
        {
            messages: [new HumanMessage(params.userMessage)]
        },
        config
    );

    return result as OnboardingState;
}

/**
 * Resume with approval decision
 */
export async function submitApprovalDecision(params: {
    threadId: string;
    approved: boolean;
    notes?: string;
    checkpointer?: PostgresCheckpointer;
}): Promise<OnboardingState> {
    const agent = createOnboardingAgent(params.checkpointer);

    const config = {
        configurable: {
            thread_id: params.threadId
        }
    };

    const message = params.approved ? 'approve' : `reject: ${params.notes || 'Changes requested'}`;

    const { HumanMessage } = await import('@langchain/core/messages');

    const result = await agent.invoke(
        {
            messages: [new HumanMessage(message)]
        },
        config
    );

    return result as OnboardingState;
}

/**
 * Get current state of an onboarding session
 */
export async function getOnboardingState(params: {
    threadId: string;
    checkpointer?: PostgresCheckpointer;
}): Promise<OnboardingState | null> {
    const agent = createOnboardingAgent(params.checkpointer);

    const config = {
        configurable: {
            thread_id: params.threadId
        }
    };

    try {
        const state = await agent.getState(config);
        return state.values as OnboardingState;
    } catch (error) {
        console.error('[Onboarding] Failed to get state:', error);
        return null;
    }
}

// Export types and functions
export type { OnboardingState, OnboardingStateInput } from './state.js';
export { OnboardingStateAnnotation, createInitialState } from './state.js';
export * as onboardingNodes from './nodes.js';
export * as onboardingEdges from './edges.js';
export * as onboardingPrompts from './prompts.js';
