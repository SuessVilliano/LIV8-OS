import { AI_STAFF_TEMPLATES } from '../types.js';
import { BrandBrain } from '../../services/brand-scanner.js';
import { BuildPlan } from '../../services/snapshot-builder.js';

/**
 * Onboarding Agent Prompts
 *
 * These prompts guide the AI through each step of the onboarding process.
 */

/**
 * System prompt for the onboarding agent
 */
export const SYSTEM_PROMPT = `You are the LIV8 Setup Assistant, an expert AI that helps businesses configure their GoHighLevel CRM with AI-powered automation.

Your role is to:
1. Welcome new clients warmly
2. Gather information about their business
3. Help them select the right AI staff roles
4. Guide them through the build plan approval
5. Keep them informed during deployment

Communication style:
- Professional yet friendly
- Concise and clear
- Use bullet points for lists
- Celebrate small wins
- Be patient with questions

You're part of the LIV8 OS - an AI Operating System for GoHighLevel agencies.`;

/**
 * Greeting message
 */
export const GREETING_MESSAGE = `Welcome to LIV8 OS! I'm your AI Setup Assistant, and I'll help you configure your GoHighLevel account with intelligent automation.

Here's what we'll do together:
1. Analyze your business and brand
2. Select your AI Staff (virtual team members)
3. Generate a custom build plan
4. Deploy everything to your GHL account

Ready to get started? Please share your business website URL so I can learn about your brand.`;

/**
 * Format brand scan results for display
 */
export function formatBrandScanResult(brandBrain: BrandBrain, aeoScore: number): string {
    return `I've analyzed your website and here's what I learned about **${brandBrain.brand_name}**:

**Industry:** ${brandBrain.industry_niche}
**Location:** ${brandBrain.geographic_location}

**Key Services:**
${brandBrain.key_services.slice(0, 5).map(s => `- ${s}`).join('\n')}

**Brand Voice:** ${Math.round(brandBrain.tone_profile.professional * 100)}% Professional, ${Math.round(brandBrain.tone_profile.friendly * 100)}% Friendly

**AEO Score:** ${aeoScore}/100
${aeoScore >= 75 ? '(Excellent foundation for AI optimization!)' : '(We can improve this with the right setup)'}

Does this look accurate? If so, let's choose your AI Staff next!`;
}

/**
 * AI Staff selection prompt
 */
export function getStaffSelectionPrompt(): string {
    const staffList = AI_STAFF_TEMPLATES.map(staff => {
        const badge = staff.recommended ? ' (Recommended)' : '';
        return `- **${staff.name}**${badge}: ${staff.description}`;
    }).join('\n');

    return `Now let's build your AI team! These virtual staff members will work 24/7 to grow your business.

**Available AI Staff:**
${staffList}

Which roles would you like to activate? You can select multiple (e.g., "AI Receptionist, Missed Call Recovery, Review Collector") or just say "recommended" for my top picks.`;
}

/**
 * Goals collection prompt
 */
export function getGoalsPrompt(selectedStaff: string[]): string {
    return `Excellent choices! You've selected ${selectedStaff.length} AI staff member${selectedStaff.length > 1 ? 's' : ''}:
${selectedStaff.map(s => `- ${s}`).join('\n')}

Now, what are your main business goals? For example:
- Increase lead response time
- Book more appointments
- Get more reviews
- Re-engage old leads
- Improve customer communication

Share 2-3 goals and I'll optimize your setup accordingly.`;
}

/**
 * Format build plan for approval
 */
export function formatBuildPlanForApproval(buildPlan: BuildPlan): string {
    const pipelinesCount = buildPlan.assets.pipelines?.length || 0;
    const workflowsCount = buildPlan.assets.workflows?.length || 0;
    const emailSeqCount = buildPlan.assets.emailSequences?.length || 0;
    const smsSeqCount = buildPlan.assets.smsSequences?.length || 0;
    const pagesCount = buildPlan.assets.pages?.length || 0;

    const workflowsList = buildPlan.assets.workflows?.slice(0, 5).map(w =>
        `- **${w.name}**: ${w.description}`
    ).join('\n') || 'None';

    return `Here's your customized Build Plan:

**${buildPlan.summary}**

**Business Profile:**
- Niche: ${buildPlan.businessProfile.niche}
- Location: ${buildPlan.businessProfile.geo}
- Voice: ${buildPlan.businessProfile.brandVoice}

**AI Staff (${buildPlan.aiStaff.length}):**
${buildPlan.aiStaff.map(s => `- ${s.role}`).join('\n')}

**Assets to Deploy:**
- ${pipelinesCount} Pipeline${pipelinesCount !== 1 ? 's' : ''}
- ${workflowsCount} Workflow${workflowsCount !== 1 ? 's' : ''}
- ${emailSeqCount} Email Sequence${emailSeqCount !== 1 ? 's' : ''}
- ${smsSeqCount} SMS Sequence${smsSeqCount !== 1 ? 's' : ''}
- ${pagesCount} Landing Page${pagesCount !== 1 ? 's' : ''}

**Key Workflows:**
${workflowsList}

**AEO Impact:** ${buildPlan.aeo_score.impact}
**Estimated Setup Time:** ${buildPlan.deployment.estimatedTime}

Type **"approve"** to deploy, or tell me what you'd like to change.`;
}

/**
 * Deployment in progress message
 */
export const DEPLOYMENT_STARTED_MESSAGE = `Your build plan has been approved! Starting deployment now...

I'll create everything in your GoHighLevel account. This usually takes about 5-10 minutes.

Please don't close this window - I'll update you on the progress.`;

/**
 * Format deployment result
 */
export function formatDeploymentResult(result: {
    success: boolean;
    deployed: any;
    errors: any[];
}): string {
    if (result.success) {
        const pipelinesCreated = result.deployed?.pipelines?.length || 0;
        const workflowsCreated = result.deployed?.workflows?.length || 0;

        return `Deployment complete!

**Successfully Created:**
- ${pipelinesCreated} Pipeline${pipelinesCreated !== 1 ? 's' : ''}
- ${workflowsCreated} Workflow${workflowsCreated !== 1 ? 's' : ''}

Your GoHighLevel account is now configured with AI-powered automation. Your AI Staff is ready to work!

**Next Steps:**
1. Check your GHL dashboard to see the new pipelines and workflows
2. Test your AI Receptionist by calling your business number
3. Add some contacts to see the automation in action

Need help with anything else?`;
    }

    const errorCount = result.errors?.length || 0;
    const errorList = result.errors?.slice(0, 3).map(e =>
        `- ${e.step}: ${e.error}`
    ).join('\n') || 'Unknown errors occurred';

    return `Deployment completed with ${errorCount} issue${errorCount !== 1 ? 's' : ''}:

${errorList}

Some components may not have been created. Would you like me to:
1. Retry the failed items
2. Continue with what was deployed
3. Start over with different settings

Just let me know how you'd like to proceed.`;
}

/**
 * Error recovery message
 */
export function getErrorRecoveryMessage(error: string, errorCount: number): string {
    if (errorCount >= 3) {
        return `I've encountered several issues: ${error}

It looks like we're having some technical difficulties. Would you like to:
1. Try again from the beginning
2. Contact support for assistance
3. Save your progress and continue later

What would you prefer?`;
    }

    return `I ran into a small issue: ${error}

No worries - let's try again. Could you provide the information once more?`;
}

/**
 * URL not found message
 */
export const URL_NOT_FOUND_MESSAGE = `I didn't catch a website URL in your message. Could you please share your business website?

For example: www.yourbusiness.com or https://yourbusiness.com

If you don't have a website yet, just say "no website" and I'll work with the information you can provide.`;

/**
 * No website fallback prompt
 */
export const NO_WEBSITE_PROMPT = `No problem! Let's gather some information manually.

Please tell me:
1. **Business Name:** What's your company called?
2. **Industry:** What type of business is it? (e.g., Roofing, HVAC, Real Estate, Dental)
3. **Location:** Where do you operate? (City/State or "Nationwide")
4. **Main Services:** What are your top 3 services?

Once I have these details, we can continue with the setup.`;

/**
 * Waiting for approval message
 */
export const WAITING_FOR_APPROVAL_MESSAGE = `I'm waiting for your approval on the build plan above.

- Type **"approve"** to start deployment
- Or tell me what changes you'd like to make

Take your time to review everything!`;

/**
 * Session expired message
 */
export const SESSION_EXPIRED_MESSAGE = `It looks like this session has been inactive for a while.

Your progress has been saved! To continue where you left off, just start a new session and I'll retrieve your information.`;

/**
 * Completion message
 */
export const COMPLETION_MESSAGE = `Congratulations! Your LIV8 OS setup is complete.

Your AI Staff is now active and ready to:
- Answer calls and messages 24/7
- Follow up with leads automatically
- Book appointments
- Collect reviews
- And much more!

If you have any questions or need adjustments, I'm here to help. Just start a new conversation anytime.

Welcome to the future of business automation!`;
