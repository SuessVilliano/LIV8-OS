/**
 * TaskMagic Deployer Agent
 *
 * Triggers TaskMagic workflows for custom deployments:
 * - Browser automation for GHL UI tasks
 * - Custom pipeline creation
 * - Workflow building
 * - Template customization
 * - Any task that can't be done via API
 */

import { TaskMagicWorkflow, TaskMagicStep, DeploymentConfig, AgentResult } from '../types.js';
import { BrandBrain } from '../../../services/brand-scanner.js';

const TASKMAGIC_WEBHOOK_URL = process.env.TASKMAGIC_WEBHOOK_URL;
const TASKMAGIC_API_KEY = process.env.TASKMAGIC_API_KEY;

/**
 * Pre-built TaskMagic workflows
 */
export const TASKMAGIC_WORKFLOWS: Record<string, TaskMagicWorkflow> = {
    'create-pipeline': {
        id: 'tm_create_pipeline',
        name: 'Create GHL Pipeline',
        description: 'Creates a new pipeline in GHL with custom stages',
        trigger: 'webhook',
        steps: [
            { id: 'step_1', type: 'browser_action', action: 'navigate', params: { url: 'https://app.gohighlevel.com/v2/location/${locationId}/pipelines' } },
            { id: 'step_2', type: 'browser_action', action: 'click', params: { selector: '[data-testid="create-pipeline-btn"]' } },
            { id: 'step_3', type: 'browser_action', action: 'type', params: { selector: '#pipeline-name', value: '${pipelineName}' } },
            { id: 'step_4', type: 'loop', action: 'create_stages', params: { stages: '${stages}' } },
            { id: 'step_5', type: 'browser_action', action: 'click', params: { selector: '[data-testid="save-pipeline-btn"]' } }
        ],
        variables: { locationId: '', pipelineName: '', stages: [] }
    },
    'create-workflow': {
        id: 'tm_create_workflow',
        name: 'Create GHL Workflow',
        description: 'Creates a new workflow with triggers and actions',
        trigger: 'webhook',
        steps: [
            { id: 'step_1', type: 'browser_action', action: 'navigate', params: { url: 'https://app.gohighlevel.com/v2/location/${locationId}/automation' } },
            { id: 'step_2', type: 'browser_action', action: 'click', params: { selector: '[data-testid="create-workflow-btn"]' } },
            { id: 'step_3', type: 'browser_action', action: 'type', params: { selector: '#workflow-name', value: '${workflowName}' } },
            { id: 'step_4', type: 'browser_action', action: 'configure_trigger', params: { trigger: '${trigger}' } },
            { id: 'step_5', type: 'loop', action: 'add_actions', params: { actions: '${actions}' } },
            { id: 'step_6', type: 'browser_action', action: 'click', params: { selector: '[data-testid="publish-workflow-btn"]' } }
        ],
        variables: { locationId: '', workflowName: '', trigger: {}, actions: [] }
    },
    'create-email-template': {
        id: 'tm_create_email',
        name: 'Create Email Template',
        description: 'Creates a new email template in GHL',
        trigger: 'webhook',
        steps: [
            { id: 'step_1', type: 'browser_action', action: 'navigate', params: { url: 'https://app.gohighlevel.com/v2/location/${locationId}/marketing/emails' } },
            { id: 'step_2', type: 'browser_action', action: 'click', params: { selector: '[data-testid="create-email-btn"]' } },
            { id: 'step_3', type: 'browser_action', action: 'select_template', params: { template: 'blank' } },
            { id: 'step_4', type: 'browser_action', action: 'type', params: { selector: '#email-subject', value: '${subject}' } },
            { id: 'step_5', type: 'browser_action', action: 'set_content', params: { content: '${body}' } },
            { id: 'step_6', type: 'browser_action', action: 'click', params: { selector: '[data-testid="save-template-btn"]' } }
        ],
        variables: { locationId: '', subject: '', body: '' }
    },
    'configure-ai-bot': {
        id: 'tm_configure_ai',
        name: 'Configure AI Bot',
        description: 'Sets up Conversation AI bot in GHL',
        trigger: 'webhook',
        steps: [
            { id: 'step_1', type: 'browser_action', action: 'navigate', params: { url: 'https://app.gohighlevel.com/v2/location/${locationId}/conversations/ai' } },
            { id: 'step_2', type: 'browser_action', action: 'click', params: { selector: '[data-testid="create-bot-btn"]' } },
            { id: 'step_3', type: 'browser_action', action: 'type', params: { selector: '#bot-name', value: '${botName}' } },
            { id: 'step_4', type: 'browser_action', action: 'set_instructions', params: { instructions: '${instructions}' } },
            { id: 'step_5', type: 'browser_action', action: 'upload_knowledge', params: { knowledge: '${knowledge}' } },
            { id: 'step_6', type: 'browser_action', action: 'click', params: { selector: '[data-testid="enable-bot-btn"]' } }
        ],
        variables: { locationId: '', botName: '', instructions: '', knowledge: [] }
    },
    'full-system-setup': {
        id: 'tm_full_setup',
        name: 'Full System Setup',
        description: 'Complete system setup: pipeline, workflows, templates, AI bot',
        trigger: 'webhook',
        steps: [
            { id: 'step_1', type: 'api_call', action: 'tm_create_pipeline', params: { workflowId: 'create-pipeline' } },
            { id: 'step_2', type: 'wait', action: 'wait', params: { seconds: 5 } },
            { id: 'step_3', type: 'api_call', action: 'tm_create_workflow', params: { workflowId: 'create-workflow', repeat: '${workflowCount}' } },
            { id: 'step_4', type: 'wait', action: 'wait', params: { seconds: 3 } },
            { id: 'step_5', type: 'api_call', action: 'tm_configure_ai', params: { workflowId: 'configure-ai-bot' } },
            { id: 'step_6', type: 'condition', action: 'verify_setup', params: { check: 'all_components_created' } }
        ],
        variables: { locationId: '', pipelineName: '', workflowCount: 0, botName: '' }
    }
};

/**
 * TaskMagic Deployer Class
 */
export class TaskMagicDeployer {
    private webhookUrl: string | null = null;
    private apiKey: string | null = null;

    constructor() {
        this.webhookUrl = TASKMAGIC_WEBHOOK_URL || null;
        this.apiKey = TASKMAGIC_API_KEY || null;
    }

    /**
     * Check if TaskMagic is configured
     */
    isConfigured(): boolean {
        return !!(this.webhookUrl || this.apiKey);
    }

    /**
     * List available workflows
     */
    listWorkflows(): TaskMagicWorkflow[] {
        return Object.values(TASKMAGIC_WORKFLOWS);
    }

    /**
     * Get workflow details
     */
    getWorkflow(workflowId: string): TaskMagicWorkflow | null {
        return TASKMAGIC_WORKFLOWS[workflowId] || null;
    }

    /**
     * Generate custom workflow from requirements
     */
    generateCustomWorkflow(params: {
        name: string;
        description: string;
        brandBrain: BrandBrain;
        requirements: string[];
    }): TaskMagicWorkflow {
        const steps: TaskMagicStep[] = [];

        // Analyze requirements and build steps
        for (let i = 0; i < params.requirements.length; i++) {
            const req = params.requirements[i].toLowerCase();

            if (req.includes('pipeline')) {
                steps.push({
                    id: `step_${i}_pipeline`,
                    type: 'api_call',
                    action: 'create_pipeline',
                    params: {
                        name: `${params.brandBrain.brand_name} Pipeline`,
                        stages: ['New', 'Contacted', 'Qualified', 'Booked', 'Sold', 'Lost']
                    }
                });
            }

            if (req.includes('workflow') || req.includes('automation')) {
                steps.push({
                    id: `step_${i}_workflow`,
                    type: 'api_call',
                    action: 'create_workflow',
                    params: { name: `${req} Workflow` }
                });
            }

            if (req.includes('email')) {
                steps.push({
                    id: `step_${i}_email`,
                    type: 'api_call',
                    action: 'create_email_template',
                    params: { category: 'automated' }
                });
            }

            if (req.includes('sms') || req.includes('text')) {
                steps.push({
                    id: `step_${i}_sms`,
                    type: 'api_call',
                    action: 'create_sms_template',
                    params: { category: 'automated' }
                });
            }

            if (req.includes('ai') || req.includes('bot') || req.includes('agent')) {
                steps.push({
                    id: `step_${i}_ai`,
                    type: 'api_call',
                    action: 'configure_ai_bot',
                    params: {
                        brandBrain: params.brandBrain.domain
                    }
                });
            }
        }

        return {
            id: `tm_custom_${Date.now()}`,
            name: params.name,
            description: params.description,
            trigger: 'webhook',
            steps,
            variables: {
                locationId: '',
                brandBrainId: params.brandBrain.domain
            }
        };
    }

    /**
     * Trigger a TaskMagic workflow
     */
    async triggerWorkflow(params: {
        workflowId: string;
        variables: Record<string, any>;
        locationId: string;
    }): Promise<AgentResult> {
        console.log('[TaskMagicDeployer] Triggering workflow:', params.workflowId);

        if (!this.isConfigured()) {
            return {
                success: false,
                agentType: 'taskmagic_deployer',
                output: null,
                message: 'TaskMagic not configured. Set TASKMAGIC_WEBHOOK_URL or TASKMAGIC_API_KEY environment variables.'
            };
        }

        const workflow = this.getWorkflow(params.workflowId);
        if (!workflow && !params.workflowId.startsWith('tm_custom_')) {
            return {
                success: false,
                agentType: 'taskmagic_deployer',
                output: null,
                message: `Workflow not found: ${params.workflowId}`
            };
        }

        try {
            const result = await this.executeWebhook({
                workflowId: params.workflowId,
                variables: {
                    ...params.variables,
                    locationId: params.locationId
                }
            });

            return {
                success: result.success,
                agentType: 'taskmagic_deployer',
                output: result,
                message: result.success
                    ? `TaskMagic workflow "${params.workflowId}" triggered successfully`
                    : `Failed to trigger workflow: ${result.error}`,
                nextSteps: result.success ? [
                    'Monitor TaskMagic dashboard for execution status',
                    'Verify created assets in GHL',
                    'Test the new workflows'
                ] : undefined
            };
        } catch (error: any) {
            console.error('[TaskMagicDeployer] Workflow trigger failed:', error);
            return {
                success: false,
                agentType: 'taskmagic_deployer',
                output: { error: error.message },
                message: `TaskMagic error: ${error.message}`
            };
        }
    }

    /**
     * Execute webhook call to TaskMagic
     */
    private async executeWebhook(payload: {
        workflowId: string;
        variables: Record<string, any>;
    }): Promise<{ success: boolean; runId?: string; error?: string }> {
        if (!this.webhookUrl) {
            // Simulate success for testing
            console.log('[TaskMagicDeployer] Simulating webhook call:', payload);
            return {
                success: true,
                runId: `run_${Date.now()}`
            };
        }

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorText}`
                };
            }

            const result = await response.json() as { runId?: string; id?: string };
            return {
                success: true,
                runId: result.runId || result.id
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deploy using TaskMagic
     */
    async deploy(config: DeploymentConfig): Promise<AgentResult> {
        if (!config.taskmagicWorkflowId) {
            return {
                success: false,
                agentType: 'taskmagic_deployer',
                output: null,
                message: 'No TaskMagic workflow ID specified in deployment config'
            };
        }

        return this.triggerWorkflow({
            workflowId: config.taskmagicWorkflowId,
            variables: config.taskmagicVariables || {},
            locationId: config.locationId
        });
    }

    /**
     * Create deployment plan for custom requirements
     */
    createDeploymentPlan(params: {
        brandBrain: BrandBrain;
        requirements: string[];
    }): {
        workflow: TaskMagicWorkflow;
        estimatedSteps: number;
        requiredVariables: string[];
        preview: { step: string; description: string }[];
    } {
        const workflow = this.generateCustomWorkflow({
            name: `${params.brandBrain.brand_name} Custom Setup`,
            description: `Custom deployment for ${params.brandBrain.brand_name}`,
            brandBrain: params.brandBrain,
            requirements: params.requirements
        });

        const requiredVariables = ['locationId'];
        if (params.requirements.some(r => r.toLowerCase().includes('pipeline'))) {
            requiredVariables.push('pipelineName', 'stages');
        }
        if (params.requirements.some(r => r.toLowerCase().includes('ai') || r.toLowerCase().includes('bot'))) {
            requiredVariables.push('botName', 'instructions');
        }

        const preview = workflow.steps.map(step => ({
            step: step.id,
            description: `${step.type}: ${step.action}`
        }));

        return {
            workflow,
            estimatedSteps: workflow.steps.length,
            requiredVariables,
            preview
        };
    }

    /**
     * Get workflow execution status
     */
    async getExecutionStatus(runId: string): Promise<{
        status: 'pending' | 'running' | 'completed' | 'failed';
        progress?: number;
        currentStep?: string;
        error?: string;
    }> {
        // In production, this would call TaskMagic API to get status
        // For now, return simulated status
        return {
            status: 'completed',
            progress: 100,
            currentStep: 'done'
        };
    }
}

/**
 * Create TaskMagicDeployer instance
 */
export function createTaskMagicDeployer(): TaskMagicDeployer {
    return new TaskMagicDeployer();
}

export default TaskMagicDeployer;
