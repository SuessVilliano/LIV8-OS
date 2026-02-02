/**
 * Slack Bot Handler for LIV8 Moltworker
 */

import { Env } from '../index';

interface SlackEvent {
  type: string;
  event?: {
    type: string;
    user: string;
    text: string;
    channel: string;
    ts: string;
  };
  challenge?: string;
}

export class SlackHandler {
  private env: Env;
  private clientId: string;

  constructor(env: Env, clientId: string) {
    this.env = env;
    this.clientId = clientId;
  }

  async handleEvent(payload: SlackEvent): Promise<any> {
    // URL verification challenge
    if (payload.challenge) {
      return { challenge: payload.challenge };
    }

    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event;

      if (event.type === 'message' || event.type === 'app_mention') {
        return this.handleMessage(event);
      }
    }

    return { ok: true };
  }

  private async handleMessage(event: any): Promise<any> {
    const text = event.text || '';
    const userId = event.user;
    const channel = event.channel;

    // Skip bot messages
    if (event.bot_id) {
      return { ok: true };
    }

    // Get AI Manager response
    const managerId = this.env.AI_MANAGER.idFromName(this.clientId);
    const manager = this.env.AI_MANAGER.get(managerId);

    const response = await manager.fetch(new Request('https://internal/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        context: { platform: 'slack', userId, channel }
      })
    }));

    const result = await response.json() as any;

    // Send response to Slack
    await this.postMessage(channel, result.message);

    return { ok: true };
  }

  private async postMessage(channel: string, text: string): Promise<void> {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.SLACK_BOT_TOKEN}`
      },
      body: JSON.stringify({ channel, text, mrkdwn: true })
    });
  }
}
