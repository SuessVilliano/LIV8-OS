/**
 * Discord Bot Handler for LIV8 Moltworker
 */

import { Env } from '../index';

interface DiscordInteraction {
  id: string;
  type: number;
  token: string;
  data?: {
    name: string;
    options?: Array<{ name: string; value: any }>;
  };
  member?: { user: { id: string; username: string } };
  user?: { id: string; username: string };
  channel_id: string;
  guild_id?: string;
}

export class DiscordHandler {
  private env: Env;
  private clientId: string;

  constructor(env: Env, clientId: string) {
    this.env = env;
    this.clientId = clientId;
  }

  async handleInteraction(interaction: DiscordInteraction): Promise<any> {
    // Verify interaction type
    if (interaction.type === 1) {
      // Ping/Pong verification
      return { type: 1 };
    }

    if (interaction.type === 2) {
      // Application command
      return this.handleCommand(interaction);
    }

    return { type: 4, data: { content: 'Unknown interaction type' } };
  }

  private async handleCommand(interaction: DiscordInteraction): Promise<any> {
    const command = interaction.data?.name;
    const user = interaction.member?.user || interaction.user;
    const userId = user?.id || 'unknown';

    switch (command) {
      case 'status':
        return this.getStatus();
      case 'staff':
        return this.getStaff();
      case 'chat':
        const message = interaction.data?.options?.find(o => o.name === 'message')?.value || '';
        return this.chat(message, userId);
      case 'post':
        const topic = interaction.data?.options?.find(o => o.name === 'topic')?.value || '';
        return this.quickAction('social-media', 'create_post', { topic });
      default:
        return { type: 4, data: { content: `Unknown command: ${command}` } };
    }
  }

  private async getStatus(): Promise<any> {
    const managerId = this.env.AI_MANAGER.idFromName(this.clientId);
    const manager = this.env.AI_MANAGER.get(managerId);

    const response = await manager.fetch(new Request('https://internal/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'status report', context: { platform: 'discord' } })
    }));

    const result = await response.json() as any;
    return { type: 4, data: { content: result.message } };
  }

  private async getStaff(): Promise<any> {
    const agentsRaw = await this.env.CLIENT_CONFIG.get(`agents:${this.clientId}`);
    if (!agentsRaw) {
      return { type: 4, data: { content: 'No AI Staff configured yet.' } };
    }

    const agents = JSON.parse(agentsRaw);
    let content = '**Your AI Staff Team**\n\n';
    agents.forEach((agent: any) => {
      content += `**${agent.name}** (${agent.status})\n`;
      content += `Last: ${agent.lastAction}\n\n`;
    });

    return { type: 4, data: { content } };
  }

  private async chat(message: string, userId: string): Promise<any> {
    const managerId = this.env.AI_MANAGER.idFromName(this.clientId);
    const manager = this.env.AI_MANAGER.get(managerId);

    const response = await manager.fetch(new Request('https://internal/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        context: { platform: 'discord', userId }
      })
    }));

    const result = await response.json() as any;
    return { type: 4, data: { content: result.message } };
  }

  private async quickAction(agentType: string, action: string, params: any): Promise<any> {
    const managerId = this.env.AI_MANAGER.idFromName(this.clientId);
    const manager = this.env.AI_MANAGER.get(managerId);

    const response = await manager.fetch(new Request('https://internal/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: `${action}: ${JSON.stringify(params)}`,
        context: { agentType, action, params }
      })
    }));

    const result = await response.json() as any;
    return { type: 4, data: { content: result.message } };
  }
}
