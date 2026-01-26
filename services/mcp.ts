
import { RoleKey } from "../types";

// Simulated delay to mimic API latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface MCPResponse {
  success: boolean;
  resourceId?: string;
  message: string;
}

export const GHL = {
  async createPipeline(locationId: string, name: string, stages: string[]): Promise<MCPResponse> {
    await delay(800);
    console.log(`[MCP] Created Pipeline: ${name} in ${locationId}`, stages);
    return { success: true, resourceId: `pipe_${Date.now()}`, message: `Pipeline '${name}' created` };
  },

  async createWorkflow(locationId: string, name: string, trigger: string): Promise<MCPResponse> {
    await delay(1200);
    console.log(`[MCP] Created Workflow: ${name} (Trigger: ${trigger})`);
    return { success: true, resourceId: `wf_${Date.now()}`, message: `Workflow '${name}' active` };
  },

  async configureNumber(locationId: string, type: 'sms' | 'voice'): Promise<MCPResponse> {
    await delay(600);
    console.log(`[MCP] Configured ${type} capability for ${locationId}`);
    return { success: true, message: `${type.toUpperCase()} channel ready` };
  },

  async deployAgent(locationId: string, role: RoleKey, config: any): Promise<MCPResponse> {
    await delay(1500);
    console.log(`[MCP] Deployed Agent: ${role}`, config);
    return { success: true, resourceId: `bot_${role.toLowerCase()}`, message: `AI Agent '${role}' online` };
  },

  async uploadKnowledgeBase(locationId: string, brandDomain: string, faqs: any[]): Promise<MCPResponse> {
    await delay(2000);
    console.log(`[MCP] Uploaded Knowledge Base for ${brandDomain}`);
    return { success: true, message: `Knowledge Base synced (${faqs.length} items)` };
  }
};
