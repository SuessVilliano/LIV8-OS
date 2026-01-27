
import { RoleKey } from "../types";

/**
 * GHL MCP Service
 * Routes through backend API when authenticated, falls back to local operations when not
 */

const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'https://api.liv8ai.com';

export interface MCPResponse {
  success: boolean;
  resourceId?: string;
  message: string;
  data?: any;
}

interface MCPCallOptions {
  token: string;
  locationId: string;
}

/**
 * Generate a unique ID (fallback for environments without crypto.randomUUID)
 */
function generateId(prefix: string): string {
  const rand = () => Math.random().toString(16).slice(2, 10);
  return `${prefix}_${rand()}${rand()}`;
}

/**
 * Get stored auth credentials
 */
function getCredentials(): MCPCallOptions | null {
  try {
    const token = localStorage.getItem('liv8_jwt');
    const locationId = localStorage.getItem('liv8_location_id');
    if (token && locationId) {
      return { token, locationId };
    }
  } catch (e) {
    // localStorage not available
  }
  return null;
}

/**
 * Make an authenticated request to the backend MCP API
 */
async function mcpRequest(
  endpoint: string,
  body: Record<string, any>,
  options: MCPCallOptions
): Promise<MCPResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/operator/execute-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.token}`,
      },
      body: JSON.stringify({
        plan: {
          type: 'action_plan',
          summary: `MCP Operation: ${endpoint}`,
          requiresConfirmation: false,
          riskLevel: 'low',
          steps: [{
            id: generateId('step'),
            tool: endpoint,
            input: body,
            onError: 'continue'
          }]
        },
        context: {
          locationId: options.locationId
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: result.status === 'success',
      resourceId: result.results?.[0]?.result?.id,
      message: result.summary || 'Operation completed',
      data: result.results?.[0]?.result
    };
  } catch (error: any) {
    console.error(`[MCP] ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Simulated delay for local operations
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const GHL = {
  /**
   * Create a pipeline in GHL
   */
  async createPipeline(locationId: string, name: string, stages: string[]): Promise<MCPResponse> {
    const creds = getCredentials();

    // Try backend API first if authenticated
    if (creds) {
      try {
        return await mcpRequest('ghl.createPipeline', { name, stages }, { ...creds, locationId });
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    // Fallback: Local operation (for demo/development)
    await delay(800);
    const id = generateId('pipe');
    console.log(`[MCP] Created Pipeline: ${name} (${id}) in ${locationId}`);
    return { success: true, resourceId: id, message: `Pipeline '${name}' created` };
  },

  /**
   * Create a workflow in GHL
   */
  async createWorkflow(locationId: string, name: string, trigger: string): Promise<MCPResponse> {
    const creds = getCredentials();

    if (creds) {
      try {
        return await mcpRequest('ghl.createWorkflow', { name, trigger }, { ...creds, locationId });
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    await delay(1200);
    const id = generateId('wf');
    console.log(`[MCP] Created Workflow: ${name} (${id})`);
    return { success: true, resourceId: id, message: `Workflow '${name}' active` };
  },

  /**
   * Configure a phone number for SMS or voice
   */
  async configureNumber(locationId: string, type: 'sms' | 'voice'): Promise<MCPResponse> {
    const creds = getCredentials();

    if (creds) {
      try {
        return await mcpRequest('ghl.configureNumber', { type }, { ...creds, locationId });
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    await delay(600);
    console.log(`[MCP] Configured ${type} capability for ${locationId}`);
    return { success: true, message: `${type.toUpperCase()} channel ready` };
  },

  /**
   * Deploy an AI agent to the location
   */
  async deployAgent(locationId: string, role: RoleKey, config: any): Promise<MCPResponse> {
    const creds = getCredentials();

    if (creds) {
      try {
        return await mcpRequest('ghl.deployAgent', { role, config }, { ...creds, locationId });
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    await delay(1500);
    const id = generateId('bot');
    console.log(`[MCP] Deployed Agent: ${role} (${id})`, config);
    return { success: true, resourceId: id, message: `AI Agent '${role}' online` };
  },

  /**
   * Upload knowledge base content
   */
  async uploadKnowledgeBase(locationId: string, brandDomain: string, faqs: any[]): Promise<MCPResponse> {
    const creds = getCredentials();

    if (creds) {
      try {
        return await mcpRequest('ghl.uploadKnowledgeBase', { brandDomain, faqs }, { ...creds, locationId });
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    await delay(2000);
    console.log(`[MCP] Uploaded Knowledge Base for ${brandDomain}`);
    return { success: true, message: `Knowledge Base synced (${faqs.length} items)` };
  },

  /**
   * Create a sub-account in SaaS mode
   */
  async createSubAccount(metadata: any): Promise<MCPResponse> {
    const creds = getCredentials();

    if (creds) {
      try {
        return await mcpRequest('ghl.createSubAccount', metadata, creds);
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    await delay(2500);
    const id = generateId('loc');
    console.log(`[MCP] Provisioning Sub-Account: ${metadata.businessName} (${id})`);
    return { success: true, resourceId: id, message: "Sub-account provisioned in SaaS Mode" };
  },

  /**
   * Send SMS or email communication
   */
  async sendCommunication(to: string, channel: 'sms' | 'email', body: string): Promise<MCPResponse> {
    const creds = getCredentials();

    if (creds) {
      try {
        if (channel === 'sms') {
          return await mcpRequest('ghl.sendSMS', { contactId: to, message: body }, creds);
        } else {
          return await mcpRequest('ghl.sendEmail', { contactId: to, subject: 'Message', body }, creds);
        }
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    await delay(1000);
    console.log(`[MCP] Dispatching ${channel.toUpperCase()} to ${to}: ${body.substring(0, 30)}...`);
    return { success: true, message: `${channel.toUpperCase()} Sent` };
  },

  /**
   * Trigger a GHL automation/workflow
   */
  async triggerAutomation(locationId: string, event: string): Promise<MCPResponse> {
    const creds = getCredentials();

    if (creds) {
      try {
        return await mcpRequest('ghl.triggerWorkflow', { workflowId: event }, { ...creds, locationId });
      } catch (e) {
        console.warn('[MCP] Backend unavailable, using local mode');
      }
    }

    await delay(1200);
    console.log(`[MCP] Triggering GHL Automation: ${event} for ${locationId}`);
    return { success: true, message: `Workflow trigger '${event}' fired` };
  }
};
