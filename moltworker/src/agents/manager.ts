/**
 * AI Manager - The orchestrator for each client's autonomous agency
 *
 * Lives in the client's messaging platform (Telegram/Discord/Slack)
 * Coordinates AI Staff, manages Brand Brain, integrates with CRM
 */

import { Env, STAFF_TEMPLATES } from '../index';
import { BrandBrain } from '../utils/brand-brain';
import { SmartAgents } from './smart-agents';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agentId?: string;
}

interface ManagerState {
  clientId: string;
  clientName: string;
  crmType: string;
  initialized: boolean;
  conversationHistory: ConversationMessage[];
  activeAgents: string[];
  lastActivity: string;
}

interface IPlanStep {
  id: string;
  description: string;
  agentType: string;
  action: string;
  params: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
}

interface IPlan {
  id: string;
  goal: string;
  steps: IPlanStep[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  createdAt: string;
}

export class AIManagerDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private managerState: ManagerState | null = null;
  private currentPlan: IPlan | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/init':
        return this.handleInit(request);
      case '/chat':
        return this.handleChat(request);
      case '/plan':
        return this.handlePlan(request);
      case '/status':
        return this.handleStatus();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleInit(request: Request): Promise<Response> {
    const { clientId, clientName, crmType } = await request.json() as any;

    this.managerState = {
      clientId,
      clientName,
      crmType,
      initialized: true,
      conversationHistory: [],
      activeAgents: Object.keys(STAFF_TEMPLATES),
      lastActivity: new Date().toISOString()
    };

    await this.state.storage.put('managerState', this.managerState);

    // Generate welcome message
    const welcomeMessage = this.generateWelcome(clientName, crmType);

    return new Response(JSON.stringify({
      success: true,
      message: welcomeMessage
    }));
  }

  private async handleChat(request: Request): Promise<Response> {
    const { message, context } = await request.json() as any;

    // Load state if not in memory
    if (!this.managerState) {
      this.managerState = await this.state.storage.get('managerState') as ManagerState;
    }

    if (!this.managerState) {
      return new Response(JSON.stringify({ error: 'Manager not initialized' }), { status: 400 });
    }

    // Add user message to history
    this.managerState.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Analyze intent and determine response
    const response = await this.processMessage(message, context);

    // Add assistant response to history
    this.managerState.conversationHistory.push({
      role: 'assistant',
      content: response.message,
      timestamp: new Date().toISOString(),
      agentId: response.delegatedTo
    });

    // Keep only last 50 messages
    if (this.managerState.conversationHistory.length > 50) {
      this.managerState.conversationHistory = this.managerState.conversationHistory.slice(-50);
    }

    this.managerState.lastActivity = new Date().toISOString();
    await this.state.storage.put('managerState', this.managerState);

    return new Response(JSON.stringify(response));
  }

  private async processMessage(message: string, context?: any): Promise<{
    message: string;
    delegatedTo?: string;
    actions?: any[];
    plan?: IPlan;
  }> {
    const lowerMessage = message.toLowerCase();

    // Load Brand Brain for context
    const brain = new BrandBrain(this.env, this.managerState!.clientId);
    const relevantKnowledge = await brain.query(message, 3);

    // Intent detection
    const intent = this.detectIntent(lowerMessage);

    switch (intent.type) {
      case 'status_check':
        return this.handleStatusCheck();

      case 'social_media':
        return this.delegateToAgent('social-media', message, relevantKnowledge);

      case 'email':
        return this.delegateToAgent('email-specialist', message, relevantKnowledge);

      case 'sales':
        return this.delegateToAgent('sales-agent', message, relevantKnowledge);

      case 'support':
        return this.delegateToAgent('support-agent', message, relevantKnowledge);

      case 'crm_action':
        return this.handleCRMAction(message, intent.action);

      case 'complex_task':
        return this.createPlan(message, relevantKnowledge);

      default:
        return this.generateGeneralResponse(message, relevantKnowledge);
    }
  }

  private detectIntent(message: string): { type: string; action?: string } {
    // Status check patterns
    if (message.includes('status') || message.includes('report') || message.includes('how are')) {
      return { type: 'status_check' };
    }

    // Social media patterns
    if (message.includes('post') || message.includes('social') || message.includes('instagram') ||
        message.includes('facebook') || message.includes('linkedin') || message.includes('twitter')) {
      return { type: 'social_media' };
    }

    // Email patterns
    if (message.includes('email') || message.includes('newsletter') || message.includes('sequence') ||
        message.includes('campaign')) {
      return { type: 'email' };
    }

    // Sales patterns
    if (message.includes('lead') || message.includes('follow up') || message.includes('proposal') ||
        message.includes('close') || message.includes('sale') || message.includes('prospect')) {
      return { type: 'sales' };
    }

    // Support patterns
    if (message.includes('support') || message.includes('help') || message.includes('issue') ||
        message.includes('problem') || message.includes('customer')) {
      return { type: 'support' };
    }

    // CRM action patterns
    if (message.includes('sync') || message.includes('crm') || message.includes('contacts') ||
        message.includes('ghl') || message.includes('vbout')) {
      return { type: 'crm_action', action: 'sync' };
    }

    // Complex task detection (multiple actions needed)
    if (message.includes(' and ') || message.includes('then') || message.length > 200) {
      return { type: 'complex_task' };
    }

    return { type: 'general' };
  }

  private async handleStatusCheck(): Promise<{ message: string; actions?: any[] }> {
    const smartAgents = new SmartAgents(this.env, this.managerState!.clientId);
    const staffStatus = await smartAgents.getStaffStatus();

    const activeCount = staffStatus.filter(s => s.status === 'active').length;
    const recentActions = staffStatus.map(s => `- ${s.name}: ${s.lastAction}`).join('\n');

    return {
      message: `**Agency Status Report**

Active AI Staff: ${activeCount}/${staffStatus.length}
CRM: ${this.managerState!.crmType.toUpperCase()} connected
Last Activity: ${this.managerState!.lastActivity}

**Recent Agent Activity:**
${recentActions}

All systems operational. What would you like to focus on?`
    };
  }

  private async delegateToAgent(agentType: string, message: string, knowledge: any[]): Promise<{
    message: string;
    delegatedTo: string;
    actions?: any[];
  }> {
    const smartAgents = new SmartAgents(this.env, this.managerState!.clientId);
    const template = STAFF_TEMPLATES[agentType as keyof typeof STAFF_TEMPLATES];

    // Execute with the smart agent
    const result = await smartAgents.chat(agentType, message, {
      brandKnowledge: knowledge,
      crmType: this.managerState!.crmType
    });

    return {
      message: `**${template.name}:** ${result.response}`,
      delegatedTo: agentType,
      actions: result.suggestedActions
    };
  }

  private async handleCRMAction(message: string, action?: string): Promise<{
    message: string;
    actions?: any[];
  }> {
    const crmType = this.managerState!.crmType;

    if (action === 'sync') {
      return {
        message: `Syncing with ${crmType.toUpperCase()}... I'll update you when complete.

Your Operations Agent is handling:
- Fetching latest contacts
- Updating pipeline stages
- Checking automation status

This usually takes 30-60 seconds.`,
        actions: [{ type: 'crm_sync', crmType }]
      };
    }

    return {
      message: `I can help with your ${crmType.toUpperCase()} CRM. What would you like to do?
- Sync latest data
- View contact summary
- Check pipeline health
- Review recent activity`
    };
  }

  private async createPlan(message: string, knowledge: any[]): Promise<{
    message: string;
    plan: IPlan;
  }> {
    // Create a multi-step plan for complex tasks
    const planId = `plan_${Date.now()}`;

    // Analyze the task and break it down
    const steps = this.decomposeToPlanSteps(message);

    const plan: IPlan = {
      id: planId,
      goal: message,
      steps,
      status: 'planning',
      createdAt: new Date().toISOString()
    };

    this.currentPlan = plan;
    await this.state.storage.put('currentPlan', plan);

    const stepsPreview = steps.map((s, i) =>
      `${i + 1}. ${s.description} (${STAFF_TEMPLATES[s.agentType as keyof typeof STAFF_TEMPLATES]?.name || s.agentType})`
    ).join('\n');

    return {
      message: `I've created a plan to accomplish this:

**Goal:** ${message}

**Steps:**
${stepsPreview}

Should I proceed with executing this plan?`,
      plan
    };
  }

  private decomposeToPlanSteps(message: string): IPlanStep[] {
    const steps: IPlanStep[] = [];
    const lowerMessage = message.toLowerCase();

    // Simple rule-based decomposition (in production, use AI for this)
    if (lowerMessage.includes('post') || lowerMessage.includes('social')) {
      steps.push({
        id: `step_${Date.now()}_1`,
        description: 'Draft social media content',
        agentType: 'social-media',
        action: 'create_post',
        params: { topic: message },
        status: 'pending'
      });
    }

    if (lowerMessage.includes('email')) {
      steps.push({
        id: `step_${Date.now()}_2`,
        description: 'Draft email content',
        agentType: 'email-specialist',
        action: 'draft_email',
        params: { purpose: message },
        status: 'pending'
      });
    }

    if (lowerMessage.includes('lead') || lowerMessage.includes('follow')) {
      steps.push({
        id: `step_${Date.now()}_3`,
        description: 'Identify leads for follow-up',
        agentType: 'sales-agent',
        action: 'suggest_followups',
        params: {},
        status: 'pending'
      });
    }

    if (steps.length === 0) {
      // Default step
      steps.push({
        id: `step_${Date.now()}_default`,
        description: 'Process request',
        agentType: 'support-agent',
        action: 'process',
        params: { request: message },
        status: 'pending'
      });
    }

    return steps;
  }

  private async generateGeneralResponse(message: string, knowledge: any[]): Promise<{
    message: string;
  }> {
    const knowledgeContext = knowledge.length > 0
      ? `\n\nRelevant from your Brand Brain:\n${knowledge.map(k => `- ${k.content}`).join('\n')}`
      : '';

    return {
      message: `I'm your AI Manager for ${this.managerState!.clientName}.

I can help you with:
- **Social Media**: Create and schedule posts
- **Email**: Draft campaigns and sequences
- **Sales**: Follow up with leads, create proposals
- **Support**: Answer customer questions
- **CRM**: Sync and manage your ${this.managerState!.crmType.toUpperCase()} data

Just tell me what you need!${knowledgeContext}`
    };
  }

  private async handlePlan(request: Request): Promise<Response> {
    const { action, stepId } = await request.json() as any;

    if (!this.currentPlan) {
      this.currentPlan = await this.state.storage.get('currentPlan') as IPlan;
    }

    if (!this.currentPlan) {
      return new Response(JSON.stringify({ error: 'No active plan' }), { status: 400 });
    }

    if (action === 'execute') {
      return this.executePlan();
    }

    if (action === 'cancel') {
      this.currentPlan = null;
      await this.state.storage.delete('currentPlan');
      return new Response(JSON.stringify({ message: 'Plan cancelled' }));
    }

    return new Response(JSON.stringify({ plan: this.currentPlan }));
  }

  private async executePlan(): Promise<Response> {
    if (!this.currentPlan) {
      return new Response(JSON.stringify({ error: 'No plan to execute' }), { status: 400 });
    }

    this.currentPlan.status = 'executing';
    const smartAgents = new SmartAgents(this.env, this.managerState!.clientId);
    const results: any[] = [];

    for (const step of this.currentPlan.steps) {
      step.status = 'in_progress';
      await this.state.storage.put('currentPlan', this.currentPlan);

      try {
        const result = await smartAgents.executeAction(step.agentType, step.action, step.params);
        step.result = result;
        step.status = 'completed';
        results.push({ stepId: step.id, success: true, result });
      } catch (error: any) {
        step.status = 'failed';
        step.result = { error: error.message };
        results.push({ stepId: step.id, success: false, error: error.message });
      }
    }

    this.currentPlan.status = this.currentPlan.steps.every(s => s.status === 'completed')
      ? 'completed'
      : 'failed';

    await this.state.storage.put('currentPlan', this.currentPlan);

    return new Response(JSON.stringify({
      message: 'Plan executed',
      status: this.currentPlan.status,
      results
    }));
  }

  private async handleStatus(): Promise<Response> {
    if (!this.managerState) {
      this.managerState = await this.state.storage.get('managerState') as ManagerState;
    }

    return new Response(JSON.stringify({
      initialized: !!this.managerState,
      state: this.managerState,
      currentPlan: this.currentPlan
    }));
  }

  private generateWelcome(clientName: string, crmType: string): string {
    return `Welcome to Your Autonomous Agency, ${clientName}!

Your LIV8 OS is now fully provisioned and your AI Staff has been assembled.

I am your dedicated **AI Manager**. Here's what I've set up:

**Connected Systems:**
- ${crmType.toUpperCase()} CRM integration active
- Brand Brain initialized with your business context
- AI Staff team ready and standing by

**Your AI Staff:**
- Social Media Agent - Ready to create engaging content
- Email Specialist - Ready to draft campaigns
- Sales Agent - Ready to qualify and follow up with leads
- Support Agent - Ready to handle customer inquiries

What would you like to focus on first?`;
  }
}
