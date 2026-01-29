/**
 * LangGraph Tool Bindings
 *
 * This module exports all tools available to LangGraph agents.
 * Tools wrap existing services to provide a consistent interface.
 */

// Brand tools
export {
    scanWebsiteTool,
    getBrandBrainTool,
    saveBrandBrainTool,
    calculateAEOScoreTool,
    brandTools
} from './brand-tools.js';

// Build tools
export {
    generateBuildPlanTool,
    deployBuildPlanTool,
    getDefaultAssetsTool,
    validateBuildPlanTool,
    buildTools
} from './build-tools.js';

// Combined tool collections
import { brandTools } from './brand-tools.js';
import { buildTools } from './build-tools.js';

/**
 * All available tools for agents
 */
export const allTools = [
    ...brandTools,
    ...buildTools
];

/**
 * Tool map for lookup by name
 */
export const toolMap = new Map(
    allTools.map(tool => [tool.name, tool])
);

/**
 * Get a tool by name
 */
export function getTool(name: string) {
    return toolMap.get(name);
}
