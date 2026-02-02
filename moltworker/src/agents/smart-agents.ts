/**
 * SmartAgents - AI Staff Team Builder and Orchestrator
 *
 * Creates and manages specialized AI agents from templates.
 * Each agent has specific capabilities and tool access.
 */

import { Env, STAFF_TEMPLATES } from '../index';
import { BrandBrain } from '../utils/brand-brain';
import { GHLIntegration } from '../integrations/ghl';
import { VboutIntegration } from '../integrations/vbout';

interface AgentInstance {
  id: string;
  type: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'error';
  lastAction: string;
  lastActionTime: string;
  capabilities: string[];
}

interface ChatContext {
  brandKnowledge?: any[];
  crmType?: string;
  contactId?: string;
  conversationHistory?: any[];
}

interface ActionResult {
  success: boolean;
  result?: any;
  error?: string;
  suggestedFollowUp?: string;
}

export class SmartAgents {
  private env: Env;
  private clientId: string;
  private agents: Map<string, AgentInstance> = new Map();

  constructor(env: Env, clientId: string) {
    this.env = env;
    this.clientId = clientId;
  }

  /**
   * Build a team of AI agents from templates
   */
  async buildAgentTeam(agentTypes: string[]): Promise<AgentInstance[]> {
    const instances: AgentInstance[] = [];

    for (const type of agentTypes) {
      const template = STAFF_TEMPLATES[type as keyof typeof STAFF_TEMPLATES];
      if (!template) continue;

      const instance: AgentInstance = {
        id: `${this.clientId}_${type}`,
        type,
        name: template.name,
        role: template.role,
        status: 'active',
        lastAction: 'Initialized',
        lastActionTime: new Date().toISOString(),
        capabilities: template.capabilities
      };

      this.agents.set(type, instance);
      instances.push(instance);
    }

    // Store in KV
    await this.env.CLIENT_CONFIG.put(
      `agents:${this.clientId}`,
      JSON.stringify(instances)
    );

    return instances;
  }

  /**
   * Build a single agent
   */
  async buildAgent(agentType: string): Promise<AgentInstance | null> {
    const template = STAFF_TEMPLATES[agentType as keyof typeof STAFF_TEMPLATES];
    if (!template) return null;

    const instance: AgentInstance = {
      id: `${this.clientId}_${agentType}`,
      type: agentType,
      name: template.name,
      role: template.role,
      status: 'active',
      lastAction: 'Initialized',
      lastActionTime: new Date().toISOString(),
      capabilities: template.capabilities
    };

    this.agents.set(agentType, instance);
    return instance;
  }

  /**
   * Get status of all AI staff
   */
  async getStaffStatus(): Promise<AgentInstance[]> {
    const stored = await this.env.CLIENT_CONFIG.get(`agents:${this.clientId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    return Array.from(this.agents.values());
  }

  /**
   * Chat with a specific agent
   */
  async chat(agentType: string, message: string, context: ChatContext): Promise<{
    response: string;
    suggestedActions?: any[];
  }> {
    const template = STAFF_TEMPLATES[agentType as keyof typeof STAFF_TEMPLATES];
    if (!template) {
      return { response: 'Agent type not found.' };
    }

    // Build the prompt with Brand Brain context
    const brain = new BrandBrain(this.env, this.clientId);
    const relevantKnowledge = context.brandKnowledge || await brain.query(message, 3);

    const systemPrompt = this.buildSystemPrompt(template, relevantKnowledge, context.crmType);

    // Call AI (using Cloudflare AI Gateway for security)
    const response = await this.callAI(systemPrompt, message, context.conversationHistory);

    // Update agent status
    await this.updateAgentStatus(agentType, `Responded to: ${message.substring(0, 50)}...`);

    // Extract any suggested actions from the response
    const suggestedActions = this.extractActions(response, agentType);

    return { response, suggestedActions };
  }

  /**
   * Execute a specific action with an agent
   */
  async executeAction(agentType: string, action: string, params: Record<string, any>): Promise<ActionResult> {
    const template = STAFF_TEMPLATES[agentType as keyof typeof STAFF_TEMPLATES];
    if (!template) {
      return { success: false, error: 'Agent type not found' };
    }

    // Check if agent has this capability
    if (!template.capabilities.includes(action)) {
      return { success: false, error: `Agent doesn't have capability: ${action}` };
    }

    try {
      let result: any;

      switch (agentType) {
        case 'social-media':
          result = await this.executeSocialAction(action, params);
          break;
        case 'email-specialist':
          result = await this.executeEmailAction(action, params);
          break;
        case 'sales-agent':
          result = await this.executeSalesAction(action, params);
          break;
        case 'support-agent':
          result = await this.executeSupportAction(action, params);
          break;
        case 'operations-agent':
          result = await this.executeOperationsAction(action, params);
          break;
        default:
          result = await this.executeGenericAction(action, params);
      }

      await this.updateAgentStatus(agentType, `Executed: ${action}`);
      return { success: true, result };
    } catch (error: any) {
      await this.updateAgentStatus(agentType, `Failed: ${action}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // AGENT-SPECIFIC ACTIONS
  // ============================================

  private async executeSocialAction(action: string, params: any): Promise<any> {
    const brain = new BrandBrain(this.env, this.clientId);

    switch (action) {
      case 'create_post': {
        const brandVoice = await brain.getBrandVoice();
        const content = await this.generateSocialContent(params.topic, params.platform || 'linkedin', brandVoice);
        return { content, platform: params.platform, status: 'draft' };
      }
      case 'schedule_content': {
        // Would integrate with social scheduling API
        return { scheduled: true, time: params.scheduledTime };
      }
      case 'analyze_engagement': {
        // Would fetch analytics from social platforms
        return { engagement: 'high', suggestions: ['Post more video content', 'Optimal time: 10am-2pm'] };
      }
      default:
        return { action, params, status: 'executed' };
    }
  }

  private async executeEmailAction(action: string, params: any): Promise<any> {
    const brain = new BrandBrain(this.env, this.clientId);

    switch (action) {
      case 'draft_email': {
        const brandVoice = await brain.getBrandVoice();
        const email = await this.generateEmailContent(params.subject || params.purpose, brandVoice);
        return { subject: email.subject, body: email.body, status: 'draft' };
      }
      case 'create_sequence': {
        return { sequenceId: `seq_${Date.now()}`, emails: 5, status: 'created' };
      }
      default:
        return { action, params, status: 'executed' };
    }
  }

  private async executeSalesAction(action: string, params: any): Promise<any> {
    // Get CRM integration
    const credsRaw = await this.env.CLIENT_CONFIG.get(`creds:${this.clientId}`);
    const creds = credsRaw ? JSON.parse(credsRaw) : {};

    switch (action) {
      case 'qualify_leads': {
        // Fetch leads from CRM and analyze
        return { qualified: 5, hot: 2, warm: 3 };
      }
      case 'suggest_followups': {
        return {
          followups: [
            { contactId: 'c1', name: 'Sarah Chen', reason: 'Hot lead, no response in 48h', urgency: 'high' },
            { contactId: 'c2', name: 'Mike Ross', reason: 'Proposal sent, follow up due', urgency: 'medium' }
          ]
        };
      }
      case 'follow_up': {
        const message = await this.generateFollowUpMessage(params.contactId, params.context);
        return { contactId: params.contactId, message, status: 'ready_to_send' };
      }
      default:
        return { action, params, status: 'executed' };
    }
  }

  private async executeSupportAction(action: string, params: any): Promise<any> {
    const brain = new BrandBrain(this.env, this.clientId);

    switch (action) {
      case 'answer_faqs': {
        const answer = await brain.query(params.question, 1);
        return { question: params.question, answer: answer[0]?.content || 'No answer found in knowledge base.' };
      }
      case 'troubleshoot': {
        return { issue: params.issue, steps: ['Step 1', 'Step 2', 'Step 3'], escalateIf: 'Issue persists after step 3' };
      }
      default:
        return { action, params, status: 'executed' };
    }
  }

  private async executeOperationsAction(action: string, params: any): Promise<any> {
    switch (action) {
      case 'manage_pipeline': {
        return { pipelineHealth: 'good', staleLeads: 3, suggestions: ['Move 2 leads to lost', 'Update 5 contact records'] };
      }
      case 'generate_reports': {
        return {
          report: {
            period: 'weekly',
            newLeads: 12,
            conversions: 3,
            revenue: '$4,500',
            highlights: ['Best week for conversions', 'Email open rate up 15%']
          }
        };
      }
      default:
        return { action, params, status: 'executed' };
    }
  }

  private async executeGenericAction(action: string, params: any): Promise<any> {
    return { action, params, status: 'executed', timestamp: new Date().toISOString() };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private buildSystemPrompt(template: any, knowledge: any[], crmType?: string): string {
    let prompt = template.systemPrompt;

    if (knowledge.length > 0) {
      prompt += `\n\n### Brand Knowledge\n`;
      knowledge.forEach(k => {
        prompt += `- ${k.type}: ${k.content}\n`;
      });
    }

    if (crmType) {
      prompt += `\n\n### CRM Integration\nYou have access to the client's ${crmType.toUpperCase()} CRM. You can read contacts, opportunities, and trigger automations.`;
    }

    return prompt;
  }

  private async callAI(systemPrompt: string, userMessage: string, history?: any[]): Promise<string> {
    // Use Cloudflare AI Gateway to route to Claude/Gemini
    const aiGatewayUrl = this.env.AI_GATEWAY_BASE_URL || 'https://gateway.ai.cloudflare.com/v1';

    try {
      // Try Claude first
      const response = await fetch(`${aiGatewayUrl}/anthropic/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...(history || []),
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        return data.content[0].text;
      }

      // Fallback to Gemini
      return this.callGemini(systemPrompt, userMessage);
    } catch (error) {
      console.error('AI call failed:', error);
      return this.generateFallbackResponse(userMessage);
    }
  }

  private async callGemini(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.env.GOOGLE_AI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }] }]
        })
      }
    );

    if (response.ok) {
      const data = await response.json() as any;
      return data.candidates[0].content.parts[0].text;
    }

    return this.generateFallbackResponse(userMessage);
  }

  private generateFallbackResponse(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('post') || lower.includes('social')) {
      return "I'd be happy to help create social media content. Could you share the topic or key points you'd like to highlight?";
    }
    if (lower.includes('email')) {
      return "I can draft an email for you. What's the purpose and who is the target audience?";
    }
    if (lower.includes('lead') || lower.includes('follow')) {
      return "I can help with lead follow-up. Would you like me to identify priority contacts or draft a follow-up message?";
    }

    return "I'm here to help. Could you provide more details about what you'd like me to do?";
  }

  private extractActions(response: string, agentType: string): any[] {
    const actions: any[] = [];

    // Simple extraction based on response content
    if (response.includes('schedule') || response.includes('post')) {
      actions.push({ type: 'schedule_content', agent: agentType });
    }
    if (response.includes('send') || response.includes('email')) {
      actions.push({ type: 'send_email', agent: agentType });
    }
    if (response.includes('follow up') || response.includes('contact')) {
      actions.push({ type: 'follow_up', agent: agentType });
    }

    return actions;
  }

  private async updateAgentStatus(agentType: string, action: string): Promise<void> {
    const stored = await this.env.CLIENT_CONFIG.get(`agents:${this.clientId}`);
    if (!stored) return;

    const agents: AgentInstance[] = JSON.parse(stored);
    const agent = agents.find(a => a.type === agentType);
    if (agent) {
      agent.lastAction = action;
      agent.lastActionTime = new Date().toISOString();
      await this.env.CLIENT_CONFIG.put(`agents:${this.clientId}`, JSON.stringify(agents));
    }
  }

  private async generateSocialContent(topic: string, platform: string, brandVoice: any): Promise<string> {
    const prompt = `Create a ${platform} post about: ${topic}. Brand voice: ${brandVoice?.tone || 'professional'}`;
    return this.callAI(STAFF_TEMPLATES['social-media'].systemPrompt, prompt);
  }

  private async generateEmailContent(purpose: string, brandVoice: any): Promise<{ subject: string; body: string }> {
    const response = await this.callAI(
      STAFF_TEMPLATES['email-specialist'].systemPrompt,
      `Draft an email for: ${purpose}. Include subject line and body. Brand voice: ${brandVoice?.tone || 'professional'}`
    );

    // Parse response (simple extraction)
    const lines = response.split('\n');
    const subjectLine = lines.find(l => l.toLowerCase().includes('subject:')) || 'Your subject here';
    const body = lines.filter(l => !l.toLowerCase().includes('subject:')).join('\n');

    return {
      subject: subjectLine.replace(/subject:/i, '').trim(),
      body: body.trim()
    };
  }

  private async generateFollowUpMessage(contactId: string, context?: string): Promise<string> {
    return this.callAI(
      STAFF_TEMPLATES['sales-agent'].systemPrompt,
      `Draft a follow-up message for contact ${contactId}. Context: ${context || 'general check-in'}`
    );
  }
}
