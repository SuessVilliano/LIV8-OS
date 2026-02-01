import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { snapshotBuilder, BuildPlan } from '../../services/snapshot-builder.js';
import { BrandBrain } from '../../services/brand-scanner.js';
import { db } from '../../db/index.js';

/**
 * Generate Build Plan Tool
 * Creates a comprehensive GHL system build plan from brand brain
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const generateBuildPlanTool = tool(
    async ({ brandBrain, selectedStaff, goals, locationId }: { brandBrain: BrandBrain; selectedStaff: string[]; goals: string[]; locationId: string }): Promise<{
        success: boolean;
        buildPlan?: BuildPlan;
        error?: string;
    }> => {
        try {
            console.log(`[Tool: generate_build_plan] Generating for ${brandBrain.brand_name}...`);

            const buildPlan = await snapshotBuilder.generateBuildPlan(
                brandBrain,
                selectedStaff,
                goals,
                locationId
            );

            return {
                success: true,
                buildPlan
            };
        } catch (error: any) {
            console.error('[Tool: generate_build_plan] Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },
    {
        name: 'generate_build_plan',
        description: 'Generate a comprehensive GoHighLevel business system build plan including pipelines, workflows, sequences, and pages based on brand identity.',
        schema: z.object({
            brandBrain: z.any().describe('The BrandBrain profile to base the plan on'),
            selectedStaff: z.array(z.string()).describe('Array of AI staff role keys to include'),
            goals: z.array(z.string()).describe('Business goals to optimize for'),
            locationId: z.string().describe('GHL location ID for deployment')
        })
    }
);

/**
 * Deploy Build Plan Tool
 * Executes a build plan against GHL
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const deployBuildPlanTool = tool(
    async ({ buildPlan, locationId }: { buildPlan: BuildPlan; locationId: string }): Promise<{
        success: boolean;
        deployed?: any;
        errors?: any[];
        error?: string;
    }> => {
        try {
            console.log(`[Tool: deploy_build_plan] Deploying to location ${locationId}...`);

            // Get GHL token for location
            const ghlToken = await db.getLocationToken(locationId);
            if (!ghlToken) {
                return {
                    success: false,
                    error: 'GHL location not connected - no access token found'
                };
            }

            const result = await snapshotBuilder.deployBuildPlan(
                buildPlan,
                locationId,
                ghlToken
            );

            return {
                success: result.success,
                deployed: result.deployed,
                errors: result.errors
            };
        } catch (error: any) {
            console.error('[Tool: deploy_build_plan] Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },
    {
        name: 'deploy_build_plan',
        description: 'Deploy a build plan to a GoHighLevel location, creating pipelines, workflows, and other assets.',
        schema: z.object({
            buildPlan: z.any().describe('The BuildPlan to deploy'),
            locationId: z.string().describe('GHL location ID to deploy to')
        })
    }
);

/**
 * Get Default Assets Tool
 * Returns default asset templates for a build plan
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const getDefaultAssetsTool = tool(
    async ({ brandBrain, selectedStaff }: { brandBrain: BrandBrain; selectedStaff: string[] }): Promise<{
        pipelines: any[];
        workflows: any[];
        emailSequences: any[];
        smsSequences: any[];
        pages: any[];
    }> => {
        console.log(`[Tool: get_default_assets] Getting defaults for ${brandBrain.brand_name}...`);

        const assets = snapshotBuilder.getDefaultAssets(brandBrain, selectedStaff);

        return assets;
    },
    {
        name: 'get_default_assets',
        description: 'Get default asset templates (pipelines, workflows, sequences, pages) for a brand and selected AI staff.',
        schema: z.object({
            brandBrain: z.any().describe('The BrandBrain profile'),
            selectedStaff: z.array(z.string()).describe('Array of AI staff role keys')
        })
    }
);

/**
 * Validate Build Plan Tool
 * Validates a build plan before deployment
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const validateBuildPlanTool = tool(
    async ({ buildPlan, locationId }: { buildPlan: BuildPlan; locationId: string }): Promise<{
        valid: boolean;
        issues: string[];
        warnings: string[];
    }> => {
        console.log(`[Tool: validate_build_plan] Validating plan for ${locationId}...`);

        const issues: string[] = [];
        const warnings: string[] = [];

        // Check required fields
        if (!buildPlan.businessProfile) {
            issues.push('Missing businessProfile');
        }
        if (!buildPlan.assets) {
            issues.push('Missing assets');
        }
        if (!buildPlan.deployment) {
            issues.push('Missing deployment configuration');
        }

        // Check assets
        if (buildPlan.assets) {
            if (!buildPlan.assets.pipelines || buildPlan.assets.pipelines.length === 0) {
                warnings.push('No pipelines defined');
            }
            if (!buildPlan.assets.workflows || buildPlan.assets.workflows.length === 0) {
                warnings.push('No workflows defined');
            }
        }

        // Check AI staff
        if (!buildPlan.aiStaff || buildPlan.aiStaff.length === 0) {
            warnings.push('No AI staff configured');
        }

        // Check GHL connection
        const ghlToken = await db.getLocationToken(locationId);
        if (!ghlToken) {
            issues.push('GHL location not connected');
        }

        return {
            valid: issues.length === 0,
            issues,
            warnings
        };
    },
    {
        name: 'validate_build_plan',
        description: 'Validate a build plan for completeness and check GHL connection before deployment.',
        schema: z.object({
            buildPlan: z.any().describe('The BuildPlan to validate'),
            locationId: z.string().describe('GHL location ID')
        })
    }
);

/**
 * Export all build tools
 */
export const buildTools = [
    generateBuildPlanTool,
    deployBuildPlanTool,
    getDefaultAssetsTool,
    validateBuildPlanTool
];
