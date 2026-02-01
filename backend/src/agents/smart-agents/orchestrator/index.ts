/**
 * Orchestrator Agent
 *
 * The master brain that:
 * 1. Understands user intent from natural language
 * 2. Routes to appropriate specialized agents
 * 3. Coordinates multi-agent workflows
 * 4. Maintains conversation context
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    OrchestratorState,
    UserIntent,
    AgentType,
    AgentResult
} from '../types.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * State Annotation for the Orchestrator
 */
export const OrchestratorStateAnnotation = Annotation.Root({
    sessionId: Annotation<string>,
    locationId: Annotation<string>,
    userId: Annotation<string>,

    messages: Annotation<BaseMessage[]>({
        value: (curr, update) => [...curr, ...update],
        default: () => []
    }),

    currentIntent: Annotation<UserIntent>({
        value: (_, update) => update,
        default: () => 'unknown' as UserIntent
    }),
    confidence: Annotation<number>({
        value: (_, update) => update,
        default: () => 0
    }),
    extractedEntities: Annotation<Record<string, any>>({
        value: (_, update) => update,
        default: () => ({})
    }),

    targetAgent: Annotation<AgentType | null>({
        value: (_, update) => update,
        default: () => null
    }),
    agentQueue: Annotation<AgentType[]>({
        value: (_, update) => update,
        default: () => []
    }),

    brandBrainId: Annotation<string | null>({
        value: (_, update) => update,
        default: () => null
    }),
    activeAgentConfigs: Annotation<any[]>({
        value: (_, update) => update,
        default: () => []
    }),

    currentTask: Annotation<string | null>({
        value: (_, update) => update,
        default: () => null
    }),
    taskProgress: Annotation<number>({
        value: (_, update) => update,
        default: () => 0
    }),
    taskResults: Annotation<any[]>({
        value: (curr, update) => [...curr, ...update],
        default: () => []
    }),

    awaitingHumanApproval: Annotation<boolean>({
        value: (_, update) => update,
        default: () => false
    }),
    approvalReason: Annotation<string | null>({
        value: (_, update) => update,
        default: () => null
    }),

    responseToUser: Annotation<string>({
        value: (_, update) => update,
        default: () => ''
    })
});

export type OrchestratorStateType = typeof OrchestratorStateAnnotation.State;

/**
 * Intent Classification Prompt
 */
const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for LIV8 OS, an AI-powered CRM operating system.

Analyze the user's message and classify their intent into ONE of these categories:

INTENTS:
- create_agent: User wants to create/configure an AI agent (receptionist, follow-up bot, etc.)
- create_content: User wants content created (social posts, emails, SMS, blogs, ads)
- build_knowledge: User wants to build/update a knowledge base or FAQ
- deploy_system: User wants to deploy pipelines, workflows, or systems to GHL
- run_campaign: User wants to run a marketing campaign or sequence
- manage_contacts: User wants to work with contacts (add, update, search, segment)
- analyze_data: User wants analytics, reports, or insights
- configure_workflow: User wants to set up automations or workflows
- general_chat: General conversation, questions about the system
- unknown: Cannot determine intent

Also extract any relevant entities mentioned:
- business_name, website_url, industry, location
- content_type (social, email, sms, blog)
- agent_type (receptionist, setter, closer, etc.)
- platform (facebook, instagram, etc.)
- timeframe, goals, audience

Return JSON:
{
  "intent": "the_intent",
  "confidence": 0.0-1.0,
  "entities": { extracted entities },
  "reasoning": "brief explanation"
}`;

/**
 * Response Generation Prompt
 */
const RESPONSE_PROMPT = `You are LIV8, an AI assistant that helps businesses run on autopilot.

You're friendly, professional, and action-oriented. You don't just chat - you DO things.

Based on the classified intent and context, respond to help the user.

If you're about to take an action, confirm what you'll do.
If you need more info, ask specific questions.
If you completed something, summarize what was done.

Be concise but warm. Use emojis sparingly.`;

/**
 * Get Gemini model
 */
function getGemini() {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    return genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            responseMimeType: 'application/json'
        }
    });
}

/**
 * Node: Classify Intent
 */
async function classifyIntentNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
    console.log('[Orchestrator] Classifying intent...');

    const lastMessage = state.messages[state.messages.length - 1];
    if (!lastMessage || lastMessage._getType() !== 'human') {
        return { currentIntent: 'unknown', confidence: 0 };
    }

    try {
        const model = getGemini();

        const prompt = `${INTENT_CLASSIFICATION_PROMPT}

User message: "${lastMessage.content}"

Previous context: ${state.messages.slice(-5).map(m => `${m._getType()}: ${m.content}`).join('\n')}

Classify the intent:`;

        const result = await model.generateContent(prompt);
        const response = JSON.parse(result.response.text());

        console.log('[Orchestrator] Classified intent:', response.intent, 'confidence:', response.confidence);

        return {
            currentIntent: response.intent as UserIntent,
            confidence: response.confidence,
            extractedEntities: response.entities || {}
        };
    } catch (error: any) {
        console.error('[Orchestrator] Intent classification failed:', error.message);
        return { currentIntent: 'general_chat', confidence: 0.5 };
    }
}

/**
 * Node: Route to Agent
 */
async function routeToAgentNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
    console.log('[Orchestrator] Routing to agent for intent:', state.currentIntent);

    const intentToAgent: Record<UserIntent, AgentType | null> = {
        'create_agent': 'agent_builder',
        'create_content': 'content_creator',
        'build_knowledge': 'knowledge_builder',
        'deploy_system': 'snapshot_deployer',
        'run_campaign': 'workflow_designer',
        'manage_contacts': null, // Direct API
        'analyze_data': null, // Direct API
        'configure_workflow': 'workflow_designer',
        'general_chat': null, // Handle directly
        'unknown': null
    };

    const targetAgent = intentToAgent[state.currentIntent];

    return {
        targetAgent,
        currentTask: state.currentIntent === 'general_chat'
            ? 'respond_to_user'
            : `execute_${state.currentIntent}`
    };
}

/**
 * Node: Execute Agent Builder
 */
async function executeAgentBuilderNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
    console.log('[Orchestrator] Executing Agent Builder...');

    // This will be expanded to call the actual AgentBuilder
    // For now, return a placeholder response

    const entities = state.extractedEntities;

    const agentConfig = {
        id: `agent_${Date.now()}`,
        name: entities.agent_name || 'AI Assistant',
        role: entities.agent_type || 'receptionist',
        description: `AI agent created for ${entities.business_name || 'your business'}`,
        status: 'configured'
    };

    return {
        taskResults: [{ type: 'agent_created', data: agentConfig }],
        responseToUser: `I've configured a new ${agentConfig.role} agent named "${agentConfig.name}".

Here's what it can do:
- Answer inbound calls and messages
- Qualify leads based on your criteria
- Book appointments on your calendar
- Transfer to human when needed

Would you like me to:
1. Customize its responses and personality?
2. Set up its knowledge base?
3. Deploy it to your GHL location?`
    };
}

/**
 * Node: Execute Content Creator
 */
async function executeContentCreatorNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
    console.log('[Orchestrator] Executing Content Creator...');

    const entities = state.extractedEntities;
    const contentType = entities.content_type || 'social';
    const platforms = entities.platforms || ['facebook', 'instagram'];

    try {
        const model = getGemini();

        const prompt = `Create ${contentType} content for a business.

Business context:
- Industry: ${entities.industry || 'general business'}
- Topic: ${entities.topic || 'promotional content'}
- Platforms: ${platforms.join(', ')}
- Tone: Professional but friendly

Generate 3 variations of the content. For social posts, include hashtags.

Return JSON:
{
  "content": [
    { "platform": "platform_name", "text": "the content", "hashtags": ["tag1", "tag2"] }
  ],
  "summary": "brief description of what was created"
}`;

        const result = await model.generateContent(prompt);
        const response = JSON.parse(result.response.text());

        return {
            taskResults: [{ type: 'content_created', data: response.content }],
            responseToUser: `I've created ${response.content.length} pieces of content for you:

${response.content.map((c: any, i: number) => `**${i + 1}. ${c.platform}:**\n${c.text}\n${c.hashtags ? c.hashtags.join(' ') : ''}`).join('\n\n')}

Would you like me to:
1. Generate more variations?
2. Schedule these posts?
3. Create a full content calendar?`
        };
    } catch (error: any) {
        console.error('[Orchestrator] Content creation failed:', error.message);
        return {
            responseToUser: `I'd love to create content for you! Could you tell me:
- What type of content? (social posts, emails, SMS)
- What topic or promotion?
- Which platforms?`
        };
    }
}

/**
 * Node: Execute Knowledge Builder
 */
async function executeKnowledgeBuilderNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
    console.log('[Orchestrator] Executing Knowledge Builder...');

    const entities = state.extractedEntities;

    return {
        taskResults: [{ type: 'knowledge_building', status: 'started' }],
        responseToUser: `I'll help you build a knowledge base for your AI agents.

To create comprehensive knowledge, I need:

1. **Business Info**: Website URL or description of your services
2. **FAQs**: Common questions customers ask
3. **Pricing**: Your pricing structure (if applicable)
4. **Policies**: Return policy, service guarantees, etc.
5. **Scripts**: How you want the AI to respond in specific situations

Would you like to:
- **Scan your website** to auto-extract information?
- **Upload documents** (PDFs, docs)?
- **Answer questions** and I'll build it from your responses?`
    };
}

/**
 * Node: Execute Deployer
 */
async function executeDeployerNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
    console.log('[Orchestrator] Executing Deployer...');

    const entities = state.extractedEntities;

    return {
        awaitingHumanApproval: true,
        approvalReason: 'deployment_confirmation',
        responseToUser: `I'm ready to deploy to your GHL location.

**Deployment Plan:**
- Location: ${state.locationId}
- Method: ${entities.method || 'TaskMagic automation'}

**What will be created:**
- Pipeline: "New Leads" with stages (New → Contacted → Qualified → Booked → Sold)
- Workflow: "Fast 5 Speed-to-Lead" (responds in under 5 minutes)
- AI Agent: Configured and connected

**This requires your approval.** Reply "approve" to proceed or "modify" to make changes.`
    };
}

/**
 * Node: Generate Response
 */
async function generateResponseNode(state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> {
    console.log('[Orchestrator] Generating response...');

    // If we already have a response from an agent, use it
    if (state.responseToUser) {
        return {
            messages: [new AIMessage(state.responseToUser)]
        };
    }

    // Generate a general response
    try {
        const model = getGemini();

        const lastMessage = state.messages[state.messages.length - 1];

        const prompt = `${RESPONSE_PROMPT}

User said: "${lastMessage?.content || 'Hello'}"
Intent: ${state.currentIntent}
Context: ${JSON.stringify(state.extractedEntities)}

Respond helpfully:`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'text/plain' }
        });

        const response = result.response.text();

        return {
            messages: [new AIMessage(response)],
            responseToUser: response
        };
    } catch (error: any) {
        console.error('[Orchestrator] Response generation failed:', error.message);
        return {
            messages: [new AIMessage("I'm here to help! What would you like to create or configure today?")],
            responseToUser: "I'm here to help! What would you like to create or configure today?"
        };
    }
}

/**
 * Edge: Determine next step after routing
 */
function afterRouting(state: OrchestratorStateType): string {
    if (!state.targetAgent) {
        return 'generate_response';
    }

    switch (state.targetAgent) {
        case 'agent_builder':
            return 'execute_agent_builder';
        case 'content_creator':
            return 'execute_content_creator';
        case 'knowledge_builder':
            return 'execute_knowledge_builder';
        case 'snapshot_deployer':
        case 'taskmagic_deployer':
            return 'execute_deployer';
        default:
            return 'generate_response';
    }
}

/**
 * Edge: After agent execution
 */
function afterExecution(state: OrchestratorStateType): string {
    if (state.awaitingHumanApproval) {
        return END;
    }
    return 'generate_response';
}

/**
 * Create the Orchestrator Graph
 */
export function createOrchestratorGraph() {
    const graph = new StateGraph(OrchestratorStateAnnotation)
        // Nodes
        .addNode('classify_intent', classifyIntentNode)
        .addNode('route_to_agent', routeToAgentNode)
        .addNode('execute_agent_builder', executeAgentBuilderNode)
        .addNode('execute_content_creator', executeContentCreatorNode)
        .addNode('execute_knowledge_builder', executeKnowledgeBuilderNode)
        .addNode('execute_deployer', executeDeployerNode)
        .addNode('generate_response', generateResponseNode)

        // Flow
        .addEdge(START, 'classify_intent')
        .addEdge('classify_intent', 'route_to_agent')
        .addConditionalEdges('route_to_agent', afterRouting)
        .addConditionalEdges('execute_agent_builder', afterExecution)
        .addConditionalEdges('execute_content_creator', afterExecution)
        .addConditionalEdges('execute_knowledge_builder', afterExecution)
        .addConditionalEdges('execute_deployer', afterExecution)
        .addEdge('generate_response', END);

    return graph;
}

/**
 * Create compiled Orchestrator
 */
export function createOrchestrator() {
    const graph = createOrchestratorGraph();
    return graph.compile();
}

/**
 * Run the Orchestrator with a user message
 */
export async function runOrchestrator(params: {
    sessionId: string;
    locationId: string;
    userId: string;
    message: string;
    brandBrainId?: string;
}): Promise<{
    response: string;
    intent: UserIntent;
    taskResults: any[];
    awaitingApproval: boolean;
}> {
    const orchestrator = createOrchestrator();

    const initialState = {
        sessionId: params.sessionId,
        locationId: params.locationId,
        userId: params.userId,
        messages: [new HumanMessage(params.message)],
        brandBrainId: params.brandBrainId ?? undefined
    };

    const result = await orchestrator.invoke(initialState);

    const lastAIMessage = result.messages
        .filter((m: BaseMessage) => m._getType() === 'ai')
        .pop();

    return {
        response: result.responseToUser || lastAIMessage?.content?.toString() || 'How can I help you?',
        intent: result.currentIntent,
        taskResults: result.taskResults,
        awaitingApproval: result.awaitingHumanApproval
    };
}

export default createOrchestrator;
