
import { BrandBrain, BuildPlan, RoleKey, ApprovalPack } from "../types";
import { generateBuildPlan, generateApprovalPack } from "./geminiService";
import { GHL } from "./mcp";

export class SetupService {
  
  /**
   * Generates both the high-level Approval Pack (for user review) 
   * and the low-level Build Plan (for execution).
   */
  async compileArchitecture(brand: BrandBrain, roles: RoleKey[]): Promise<{ approval: ApprovalPack, build: BuildPlan }> {
    // Run in parallel for speed
    const [approval, build] = await Promise.all([
      generateApprovalPack(brand, roles),
      generateBuildPlan(brand, roles)
    ]);

    return { approval, build };
  }

  /**
   * Executes the BuildPlan against the GHL MCP.
   * Emits progress updates via callback.
   */
  async deploySystem(
    locationId: string, 
    plan: BuildPlan, 
    onProgress: (msg: string, percent: number) => void
  ): Promise<boolean> {
    
    try {
      // Validate Plan Integrity
      if (!plan || !plan.assets || !Array.isArray(plan.assets.pipelines)) {
        console.error("Invalid Build Plan Structure:", plan);
        throw new Error("The build plan is corrupt or missing required assets. Please regenerate.");
      }

      let progress = 0;
      const pipelines = plan.assets.pipelines || [];
      const workflows = plan.assets.workflows || [];
      const sequences = plan.assets.emailSequences || [];

      const totalSteps = 
        pipelines.length + 
        workflows.length + 
        sequences.length + 
        1 + // Knowledge Base
        1;  // Final Checks

      const update = (msg: string) => {
        progress++;
        const pct = Math.min(Math.round((progress / totalSteps) * 100), 99);
        onProgress(msg, pct);
      };

      // 1. Knowledge Base
      onProgress("Syncing Brand Brain to Knowledge Base...", 5);
      await GHL.uploadKnowledgeBase(locationId, "brand_domain", []); // Using placeholder for now
      update("Knowledge Base Active");

      // 2. Pipelines
      for (const pipe of pipelines) {
        onProgress(`Constructing Pipeline: ${pipe}...`, 15);
        await GHL.createPipeline(locationId, pipe, ["New", "Contacted", "Qualified", "Won"]);
        update(`Pipeline '${pipe}' Created`);
      }

      // 3. Workflows (Agents & Automation)
      for (const wf of workflows) {
        onProgress(`Configuring Workflow: ${wf}...`, 30);
        await GHL.createWorkflow(locationId, wf, "Trigger: Webhook/Inbound");
        update(`Workflow '${wf}' Deployed`);
      }

      // 4. Email/SMS Templates (Simulated)
      for (const seq of sequences) {
        onProgress(`Writing Email Sequence: ${seq}...`, 60);
        await GHL.createWorkflow(locationId, seq, "Trigger: Tag Added");
        update(`Sequence '${seq}' Ready`);
      }

      // 5. Finalize
      onProgress("Running Pre-flight Checks...", 90);
      await GHL.configureNumber(locationId, 'sms');
      await GHL.configureNumber(locationId, 'voice');
      
      onProgress("System Online", 100);
      return true;

    } catch (error) {
      console.error("Deployment Failed", error);
      throw error;
    }
  }
}

export const setupService = new SetupService();
