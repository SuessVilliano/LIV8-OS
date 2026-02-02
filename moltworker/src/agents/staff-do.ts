/**
 * Agent Staff Durable Object
 *
 * Maintains persistent state for individual AI Staff agents.
 * Handles action history, configuration, and metrics.
 */

import { Env, STAFF_TEMPLATES } from '../index';

interface AgentState {
  id: string;
  clientId: string;
  type: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'error' | 'paused';
  configuration: Record<string, any>;
  actionHistory: ActionRecord[];
  metrics: AgentMetrics;
  createdAt: string;
  lastActiveAt: string;
}

interface ActionRecord {
  id: string;
  action: string;
  params: Record<string, any>;
  result: any;
  success: boolean;
  duration: number;
  timestamp: string;
}

interface AgentMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  averageResponseTime: number;
  lastDayActions: number;
  lastWeekActions: number;
}

export class AgentStaffDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private agentState: AgentState | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/init':
        return this.handleInit(request);
      case '/action':
        return this.handleAction(request);
      case '/status':
        return this.handleStatus();
      case '/metrics':
        return this.handleMetrics();
      case '/configure':
        return this.handleConfigure(request);
      case '/pause':
        return this.handlePause();
      case '/resume':
        return this.handleResume();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleInit(request: Request): Promise<Response> {
    const { clientId, type } = await request.json() as any;

    const template = STAFF_TEMPLATES[type as keyof typeof STAFF_TEMPLATES];
    if (!template) {
      return new Response(JSON.stringify({ error: 'Unknown agent type' }), { status: 400 });
    }

    this.agentState = {
      id: `${clientId}_${type}`,
      clientId,
      type,
      name: template.name,
      role: template.role,
      status: 'active',
      configuration: {
        systemPrompt: template.systemPrompt,
        capabilities: template.capabilities,
        customInstructions: []
      },
      actionHistory: [],
      metrics: {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        averageResponseTime: 0,
        lastDayActions: 0,
        lastWeekActions: 0
      },
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    await this.state.storage.put('agentState', this.agentState);

    return new Response(JSON.stringify({ success: true, agent: this.agentState }));
  }

  private async handleAction(request: Request): Promise<Response> {
    const { action, params, result, success, duration } = await request.json() as any;

    await this.loadState();
    if (!this.agentState) {
      return new Response(JSON.stringify({ error: 'Agent not initialized' }), { status: 400 });
    }

    // Record action
    const record: ActionRecord = {
      id: `action_${Date.now()}`,
      action,
      params,
      result,
      success,
      duration,
      timestamp: new Date().toISOString()
    };

    this.agentState.actionHistory.push(record);

    // Keep only last 100 actions
    if (this.agentState.actionHistory.length > 100) {
      this.agentState.actionHistory = this.agentState.actionHistory.slice(-100);
    }

    // Update metrics
    this.agentState.metrics.totalActions++;
    if (success) {
      this.agentState.metrics.successfulActions++;
    } else {
      this.agentState.metrics.failedActions++;
    }

    // Update average response time
    const totalTime = this.agentState.metrics.averageResponseTime * (this.agentState.metrics.totalActions - 1);
    this.agentState.metrics.averageResponseTime = (totalTime + duration) / this.agentState.metrics.totalActions;

    // Update time-based metrics
    this.updateTimeBasedMetrics();

    this.agentState.lastActiveAt = new Date().toISOString();
    await this.state.storage.put('agentState', this.agentState);

    return new Response(JSON.stringify({ success: true, actionId: record.id }));
  }

  private async handleStatus(): Promise<Response> {
    await this.loadState();

    if (!this.agentState) {
      return new Response(JSON.stringify({ initialized: false }));
    }

    return new Response(JSON.stringify({
      initialized: true,
      id: this.agentState.id,
      name: this.agentState.name,
      role: this.agentState.role,
      status: this.agentState.status,
      lastActiveAt: this.agentState.lastActiveAt,
      recentActions: this.agentState.actionHistory.slice(-5)
    }));
  }

  private async handleMetrics(): Promise<Response> {
    await this.loadState();

    if (!this.agentState) {
      return new Response(JSON.stringify({ error: 'Agent not initialized' }), { status: 400 });
    }

    this.updateTimeBasedMetrics();

    return new Response(JSON.stringify({
      metrics: this.agentState.metrics,
      uptime: this.calculateUptime(),
      successRate: this.calculateSuccessRate()
    }));
  }

  private async handleConfigure(request: Request): Promise<Response> {
    const config = await request.json() as Record<string, any>;

    await this.loadState();
    if (!this.agentState) {
      return new Response(JSON.stringify({ error: 'Agent not initialized' }), { status: 400 });
    }

    // Merge configuration
    this.agentState.configuration = {
      ...this.agentState.configuration,
      ...config
    };

    await this.state.storage.put('agentState', this.agentState);

    return new Response(JSON.stringify({ success: true, configuration: this.agentState.configuration }));
  }

  private async handlePause(): Promise<Response> {
    await this.loadState();
    if (!this.agentState) {
      return new Response(JSON.stringify({ error: 'Agent not initialized' }), { status: 400 });
    }

    this.agentState.status = 'paused';
    await this.state.storage.put('agentState', this.agentState);

    return new Response(JSON.stringify({ success: true, status: 'paused' }));
  }

  private async handleResume(): Promise<Response> {
    await this.loadState();
    if (!this.agentState) {
      return new Response(JSON.stringify({ error: 'Agent not initialized' }), { status: 400 });
    }

    this.agentState.status = 'active';
    await this.state.storage.put('agentState', this.agentState);

    return new Response(JSON.stringify({ success: true, status: 'active' }));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async loadState(): Promise<void> {
    if (!this.agentState) {
      this.agentState = await this.state.storage.get('agentState') as AgentState | null;
    }
  }

  private updateTimeBasedMetrics(): void {
    if (!this.agentState) return;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    this.agentState.metrics.lastDayActions = this.agentState.actionHistory.filter(
      a => new Date(a.timestamp) > oneDayAgo
    ).length;

    this.agentState.metrics.lastWeekActions = this.agentState.actionHistory.filter(
      a => new Date(a.timestamp) > oneWeekAgo
    ).length;
  }

  private calculateUptime(): string {
    if (!this.agentState) return '0d 0h';

    const created = new Date(this.agentState.createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return `${days}d ${hours}h`;
  }

  private calculateSuccessRate(): string {
    if (!this.agentState || this.agentState.metrics.totalActions === 0) return '0%';

    const rate = (this.agentState.metrics.successfulActions / this.agentState.metrics.totalActions) * 100;
    return `${rate.toFixed(1)}%`;
  }
}
