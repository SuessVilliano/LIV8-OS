/**
 * Setup API Service
 * Handles communication with 백端 setup endpoints for brand scanning,
 * build plan generation, and deployment.
 */

import { apiCall } from './api';
import { BrandBrain, BuildPlan, ApprovalPack, RoleKey } from '../types';

export interface SetupApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BrandScanResult {
  brandBrain: BrandBrain;
  aeoScore: {
    score: number;
    impact: string;
  };
}

export interface BuildPlanResult {
  buildPlan: BuildPlan;
}

export interface DeployResult {
  success: boolean;
  deployed: any;
  errors: any[];
}

export interface StaffTemplate {
  key: string;
  label: string;
  description: string;
  recommended: boolean;
  icon: string;
}

/**
 * Setup API client
 */
export const setupApi = {
  /**
   * Scan a website to extract brand identity
   */
  async scanBrand(websiteUrl: string): Promise<BrandScanResult> {
    try {
      const result = await apiCall('/api/setup/scan-brand', {
        method: 'POST',
        body: JSON.stringify({ websiteUrl })
      });
      return result;
    } catch (error: any) {
      console.error('[SetupAPI] Brand scan failed:', error);
      throw error;
    }
  },

  /**
   * Generate a build plan from brand brain and selected options
   */
  async generateBuildPlan(
    brandBrain: BrandBrain,
    selectedStaff: RoleKey[],
    goals: string[],
    locationId: string
  ): Promise<BuildPlanResult> {
    try {
      const result = await apiCall('/api/setup/generate-build-plan', {
        method: 'POST',
        body: JSON.stringify({
          brandBrain,
          selectedStaff,
          goals,
          locationId
        })
      });
      return result;
    } catch (error: any) {
      console.error('[SetupAPI] Build plan generation failed:', error);
      throw error;
    }
  },

  /**
   * Deploy a build plan to the GHL location
   */
  async deploy(buildPlan: BuildPlan, locationId: string): Promise<DeployResult> {
    try {
      const result = await apiCall('/api/setup/deploy', {
        method: 'POST',
        body: JSON.stringify({
          buildPlan,
          locationId
        })
      });
      return result;
    } catch (error: any) {
      console.error('[SetupAPI] Deployment failed:', error);
      throw error;
    }
  },

  /**
   * Get available AI staff templates
   */
  async getStaffTemplates(): Promise<{ templates: StaffTemplate[] }> {
    try {
      const result = await apiCall('/api/setup/staff-templates');
      return result;
    } catch (error: any) {
      console.error('[SetupAPI] Failed to fetch staff templates:', error);
      throw error;
    }
  },

  /**
   * Save brand brain to backend database
   */
  async saveBrandBrain(locationId: string, brandBrain: BrandBrain): Promise<void> {
    try {
      await apiCall('/api/setup/save-brand-brain', {
        method: 'POST',
        body: JSON.stringify({
          locationId,
          brandBrain
        })
      });
    } catch (error: any) {
      console.error('[SetupAPI] Failed to save brand brain:', error);
      // Don't throw - allow local fallback
    }
  },

  /**
   * Get brand brain from backend database
   */
  async getBrandBrain(locationId: string): Promise<BrandBrain | null> {
    try {
      const result = await apiCall(`/api/setup/brand-brain/${locationId}`);
      return result.brandBrain || null;
    } catch (error: any) {
      console.warn('[SetupAPI] Failed to fetch brand brain:', error);
      return null;
    }
  }
};
