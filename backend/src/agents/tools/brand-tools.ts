import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { brandScanner, BrandBrain } from '../../services/brand-scanner.js';
import { db } from '../../db/index.js';

/**
 * Scan Website Tool
 * Analyzes a website to extract brand identity
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const scanWebsiteTool = tool(
    async ({ url, locationId }: { url: string; locationId?: string }): Promise<{
        success: boolean;
        brandBrain?: BrandBrain;
        aeoScore?: { score: number; recommendations: string[] };
        error?: string;
    }> => {
        try {
            console.log(`[Tool: scan_website] Scanning ${url}...`);

            const brandBrain = await brandScanner.scanWebsite(url);
            const aeoScore = brandScanner.calculateAEOScore(brandBrain);

            // Save to database if locationId provided
            if (locationId) {
                await db.saveBrandBrain(locationId, brandBrain);
                console.log(`[Tool: scan_website] Saved brand brain for location ${locationId}`);
            }

            return {
                success: true,
                brandBrain,
                aeoScore
            };
        } catch (error: any) {
            console.error('[Tool: scan_website] Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },
    {
        name: 'scan_website',
        description: 'Analyze a website to extract brand identity, services, tone, and build a comprehensive BrandBrain profile for AI optimization.',
        schema: z.object({
            url: z.string().url().describe('The website URL to analyze'),
            locationId: z.string().optional().describe('GHL location ID to save results to')
        })
    }
);

/**
 * Get Brand Brain Tool
 * Retrieves stored brand brain for a location
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const getBrandBrainTool = tool(
    async ({ locationId }: { locationId: string }): Promise<{
        success: boolean;
        brandBrain?: BrandBrain;
        error?: string;
    }> => {
        try {
            console.log(`[Tool: get_brand_brain] Fetching for location ${locationId}...`);

            const brandBrain = await db.getBrandBrain(locationId);

            if (!brandBrain) {
                return {
                    success: false,
                    error: 'No brand brain found for this location'
                };
            }

            return {
                success: true,
                brandBrain
            };
        } catch (error: any) {
            console.error('[Tool: get_brand_brain] Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },
    {
        name: 'get_brand_brain',
        description: 'Retrieve the stored brand brain profile for a GHL location.',
        schema: z.object({
            locationId: z.string().describe('GHL location ID')
        })
    }
);

/**
 * Save Brand Brain Tool
 * Persists brand brain to database
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const saveBrandBrainTool = tool(
    async ({ locationId, brandBrain }: { locationId: string; brandBrain: any }): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            console.log(`[Tool: save_brand_brain] Saving for location ${locationId}...`);

            await db.saveBrandBrain(locationId, brandBrain);

            return { success: true };
        } catch (error: any) {
            console.error('[Tool: save_brand_brain] Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },
    {
        name: 'save_brand_brain',
        description: 'Save a brand brain profile to the database for a GHL location.',
        schema: z.object({
            locationId: z.string().describe('GHL location ID'),
            brandBrain: z.any().describe('The BrandBrain object to save')
        })
    }
);

/**
 * Calculate AEO Score Tool
 * Calculates Answer Engine Optimization score for a brand brain
 */
// @ts-expect-error - LangChain tool type inference is too deep
export const calculateAEOScoreTool = tool(
    async ({ brandBrain }: { brandBrain: BrandBrain }): Promise<{
        score: number;
        recommendations: string[];
    }> => {
        console.log(`[Tool: calculate_aeo_score] Calculating for ${brandBrain.brand_name}...`);

        const result = brandScanner.calculateAEOScore(brandBrain);

        return result;
    },
    {
        name: 'calculate_aeo_score',
        description: 'Calculate the Answer Engine Optimization (AEO) score for a brand brain, with recommendations for improvement.',
        schema: z.object({
            brandBrain: z.any().describe('The BrandBrain object to score')
        })
    }
);

/**
 * Export all brand tools
 */
export const brandTools = [
    scanWebsiteTool,
    getBrandBrainTool,
    saveBrandBrainTool,
    calculateAEOScoreTool
];
