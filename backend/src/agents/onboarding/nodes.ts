import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { OnboardingState } from './state.js';
import { brandScanner } from '../../services/brand-scanner.js';
import { snapshotBuilder } from '../../services/snapshot-builder.js';
import { db } from '../../db/index.js';
import { AI_STAFF_TEMPLATES } from '../types.js';
import * as prompts from './prompts.js';

/**
 * Onboarding Agent Nodes
 *
 * Each node represents a step in the onboarding flow.
 * Nodes receive current state and return partial state updates.
 */

/**
 * Greet Node - Initial welcome message
 */
export async function greetNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: greet');

    return {
        messages: [new AIMessage(prompts.GREETING_MESSAGE)],
        currentStep: 'greet',
        awaitingUserInput: true
    };
}

/**
 * Collect Info Node - Extract website URL from user input
 */
export async function collectInfoNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: collect_info');

    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage?.content?.toString() || '';

    // Check for "no website" response
    if (content.toLowerCase().includes('no website') || content.toLowerCase().includes("don't have")) {
        return {
            messages: [new AIMessage(prompts.NO_WEBSITE_PROMPT)],
            currentStep: 'collect_info',
            awaitingUserInput: true
        };
    }

    // Try to extract URL
    const urlMatch = content.match(
        /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i
    );

    if (urlMatch) {
        let url = urlMatch[0];
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        return {
            websiteUrl: url,
            messages: [new AIMessage(`Great! I'll analyze **${url}** to understand your brand. This will take a moment...`)],
            currentStep: 'collect_info',
            awaitingUserInput: false
        };
    }

    return {
        messages: [new AIMessage(prompts.URL_NOT_FOUND_MESSAGE)],
        currentStep: 'collect_info',
        awaitingUserInput: true
    };
}

/**
 * Scan Brand Node - Analyze website and extract brand identity
 */
export async function scanBrandNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: scan_brand');

    if (!state.websiteUrl) {
        return {
            messages: [new AIMessage(prompts.URL_NOT_FOUND_MESSAGE)],
            currentStep: 'collect_info',
            awaitingUserInput: true,
            lastError: 'No website URL provided'
        };
    }

    try {
        const brandBrain = await brandScanner.scanWebsite(state.websiteUrl);
        const aeoScore = brandScanner.calculateAEOScore(brandBrain);

        // Save to database
        await db.saveBrandBrain(state.locationId, brandBrain);

        const summary = prompts.formatBrandScanResult(brandBrain, aeoScore.score);

        return {
            brandBrain,
            messages: [new AIMessage(summary)],
            currentStep: 'scan_brand',
            awaitingUserInput: true,
            lastError: null
        };

    } catch (error: any) {
        console.error('[Onboarding] Brand scan error:', error.message);

        return {
            lastError: error.message,
            errorCount: state.errorCount + 1,
            messages: [new AIMessage(prompts.getErrorRecoveryMessage(error.message, state.errorCount + 1))],
            currentStep: 'collect_info',
            awaitingUserInput: true
        };
    }
}

/**
 * Select Staff Node - Help user choose AI staff roles
 */
export async function selectStaffNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: select_staff');

    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage?.content?.toString()?.toLowerCase() || '';

    // If coming from scan_brand, show staff selection
    if (state.currentStep === 'scan_brand' || state.selectedStaff.length === 0) {
        // Check if user confirmed brand scan or wants to select staff
        if (content.includes('yes') || content.includes('correct') || content.includes('accurate') ||
            content.includes('staff') || content.includes('next') || content.includes('continue')) {

            return {
                messages: [new AIMessage(prompts.getStaffSelectionPrompt())],
                currentStep: 'select_staff',
                awaitingUserInput: true
            };
        }
    }

    // Parse staff selection from user input
    const selectedStaff: string[] = [];

    // Check for "recommended" shortcut
    if (content.includes('recommended') || content.includes('top picks') || content.includes('default')) {
        const recommended = AI_STAFF_TEMPLATES.filter(s => s.recommended).map(s => s.name);
        selectedStaff.push(...recommended);
    } else {
        // Match staff names in user input
        for (const staff of AI_STAFF_TEMPLATES) {
            const nameLower = staff.name.toLowerCase();
            const keyLower = staff.key.toLowerCase().replace(/_/g, ' ');

            if (content.includes(nameLower) || content.includes(keyLower)) {
                selectedStaff.push(staff.name);
            }
        }

        // Also check for keywords
        if (content.includes('receptionist')) selectedStaff.push('AI Receptionist');
        if (content.includes('missed call')) selectedStaff.push('Missed Call Recovery');
        if (content.includes('review')) selectedStaff.push('Review Collector');
        if (content.includes('qualifier') || content.includes('qualify')) selectedStaff.push('Lead Qualifier');
        if (content.includes('booking') || content.includes('appointment')) selectedStaff.push('Booking Assistant');
        if (content.includes('reengage') || content.includes('re-engage') || content.includes('cold')) selectedStaff.push('Re-engagement Agent');
    }

    // Remove duplicates
    const uniqueStaff = [...new Set(selectedStaff)];

    if (uniqueStaff.length === 0) {
        return {
            messages: [new AIMessage(`I didn't catch which AI staff you'd like. ${prompts.getStaffSelectionPrompt()}`)],
            currentStep: 'select_staff',
            awaitingUserInput: true
        };
    }

    return {
        selectedStaff: uniqueStaff,
        messages: [new AIMessage(prompts.getGoalsPrompt(uniqueStaff))],
        currentStep: 'select_staff',
        awaitingUserInput: true
    };
}

/**
 * Set Goals Node - Collect business goals
 */
export async function setGoalsNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: set_goals');

    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage?.content?.toString() || '';

    // Extract goals from user input
    const goals: string[] = [];

    // Common goal keywords
    const goalPatterns = [
        { pattern: /lead.*response|respond.*faster|speed.*lead/i, goal: 'Improve lead response time' },
        { pattern: /more.*appointment|book.*more|appointment.*booking/i, goal: 'Book more appointments' },
        { pattern: /review|testimonial/i, goal: 'Collect more reviews' },
        { pattern: /reengage|re-engage|old.*lead|cold.*lead|inactive/i, goal: 'Re-engage cold leads' },
        { pattern: /communication|customer.*service|support/i, goal: 'Improve customer communication' },
        { pattern: /automat|efficiency|save.*time/i, goal: 'Increase automation and efficiency' },
        { pattern: /revenue|sales|convert|conversion/i, goal: 'Increase sales and conversions' },
        { pattern: /follow.*up|followup/i, goal: 'Improve follow-up consistency' }
    ];

    for (const { pattern, goal } of goalPatterns) {
        if (pattern.test(content)) {
            goals.push(goal);
        }
    }

    // If no patterns matched, use the content as a custom goal
    if (goals.length === 0 && content.length > 10) {
        // Split by common delimiters
        const customGoals = content
            .split(/[,\n\-\d\.]+/)
            .map(g => g.trim())
            .filter(g => g.length > 5 && g.length < 100);

        goals.push(...customGoals.slice(0, 3));
    }

    if (goals.length === 0) {
        return {
            messages: [new AIMessage(`I'd like to understand your goals better. Could you share 2-3 things you want to achieve? For example:
- Get more appointments
- Respond to leads faster
- Collect more reviews

What matters most to your business?`)],
            currentStep: 'set_goals',
            awaitingUserInput: true
        };
    }

    return {
        goals,
        messages: [new AIMessage(`Perfect! I've noted your goals:
${goals.map(g => `- ${g}`).join('\n')}

Now I'll generate your custom build plan...`)],
        currentStep: 'set_goals',
        awaitingUserInput: false
    };
}

/**
 * Generate Plan Node - Create the build plan
 */
export async function generatePlanNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: generate_plan');

    if (!state.brandBrain) {
        return {
            messages: [new AIMessage("I don't have your brand information yet. Let's start by analyzing your website.")],
            currentStep: 'collect_info',
            awaitingUserInput: true,
            lastError: 'Missing brand brain'
        };
    }

    try {
        const buildPlan = await snapshotBuilder.generateBuildPlan(
            state.brandBrain,
            state.selectedStaff,
            state.goals,
            state.locationId
        );

        const approvalMessage = prompts.formatBuildPlanForApproval(buildPlan);

        return {
            buildPlan,
            messages: [new AIMessage(approvalMessage)],
            currentStep: 'generate_plan',
            awaitingUserInput: true,
            approvalStatus: 'pending'
        };

    } catch (error: any) {
        console.error('[Onboarding] Plan generation error:', error.message);

        return {
            lastError: error.message,
            errorCount: state.errorCount + 1,
            messages: [new AIMessage(prompts.getErrorRecoveryMessage(error.message, state.errorCount + 1))],
            currentStep: 'set_goals',
            awaitingUserInput: true
        };
    }
}

/**
 * Await Approval Node - Wait for user to approve build plan
 */
export async function awaitApprovalNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: await_approval');

    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage?.content?.toString()?.toLowerCase() || '';

    // Check for approval
    if (content.includes('approve') || content.includes('yes') ||
        content.includes('proceed') || content.includes('deploy') ||
        content.includes('go ahead') || content.includes("let's do it")) {

        return {
            approvalStatus: 'approved',
            messages: [new AIMessage(prompts.DEPLOYMENT_STARTED_MESSAGE)],
            currentStep: 'await_approval',
            awaitingUserInput: false
        };
    }

    // Check for rejection/changes
    if (content.includes('change') || content.includes('modify') ||
        content.includes('different') || content.includes('no') ||
        content.includes('reject') || content.includes('edit')) {

        return {
            approvalStatus: 'rejected',
            approvalNotes: content,
            messages: [new AIMessage(`I understand you'd like to make changes. What would you like to modify?

- **AI Staff**: Add or remove team members
- **Goals**: Update your business priorities
- **Start over**: Scan a different website

Just let me know what you'd like to change.`)],
            currentStep: 'await_approval',
            awaitingUserInput: true
        };
    }

    // Still waiting
    return {
        messages: [new AIMessage(prompts.WAITING_FOR_APPROVAL_MESSAGE)],
        currentStep: 'await_approval',
        awaitingUserInput: true
    };
}

/**
 * Deploy Node - Execute the build plan
 */
export async function deployNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: deploy');

    if (!state.buildPlan) {
        return {
            messages: [new AIMessage("I don't have a build plan to deploy. Let's create one first.")],
            currentStep: 'generate_plan',
            awaitingUserInput: false,
            lastError: 'Missing build plan'
        };
    }

    try {
        // Get GHL token
        const ghlToken = await db.getLocationToken(state.locationId);
        if (!ghlToken) {
            return {
                lastError: 'GHL location not connected',
                messages: [new AIMessage(`I can't deploy yet - your GoHighLevel location isn't connected.

Please connect your GHL account first, then come back to complete the setup.`)],
                currentStep: 'deploy',
                awaitingUserInput: true
            };
        }

        // Execute deployment
        const result = await snapshotBuilder.deployBuildPlan(
            state.buildPlan,
            state.locationId,
            ghlToken
        );

        const resultMessage = prompts.formatDeploymentResult(result);

        return {
            deploymentResult: result,
            messages: [new AIMessage(resultMessage)],
            currentStep: 'deploy',
            awaitingUserInput: false
        };

    } catch (error: any) {
        console.error('[Onboarding] Deployment error:', error.message);

        return {
            lastError: error.message,
            errorCount: state.errorCount + 1,
            deploymentResult: {
                success: false,
                deployed: {},
                errors: [{ step: 'deployment', error: error.message }]
            },
            messages: [new AIMessage(prompts.getErrorRecoveryMessage(error.message, state.errorCount + 1))],
            currentStep: 'deploy',
            awaitingUserInput: true
        };
    }
}

/**
 * Verify Node - Confirm deployment success and wrap up
 */
export async function verifyNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: verify');

    if (state.deploymentResult?.success) {
        return {
            messages: [new AIMessage(prompts.COMPLETION_MESSAGE)],
            currentStep: 'verify',
            awaitingUserInput: false
        };
    }

    // If deployment had errors, offer options
    return {
        messages: [new AIMessage(`Your setup is partially complete. Some items couldn't be deployed.

Would you like to:
1. **Retry** - Attempt to deploy the failed items again
2. **Continue** - Keep what was deployed and finish setup
3. **Support** - Get help from the LIV8 team

What would you prefer?`)],
        currentStep: 'verify',
        awaitingUserInput: true
    };
}

/**
 * Error Handler Node - Handle errors gracefully
 */
export async function errorHandlerNode(state: OnboardingState): Promise<Partial<OnboardingState>> {
    console.log('[Onboarding] Node: error_handler');

    if (state.errorCount >= 5) {
        return {
            messages: [new AIMessage(`I've encountered too many issues to continue automatically.

Don't worry - your progress has been saved. Please contact support for assistance, or try again later.

Error details: ${state.lastError || 'Unknown error'}`)],
            currentStep: 'error_handler',
            awaitingUserInput: true
        };
    }

    return {
        messages: [new AIMessage(prompts.getErrorRecoveryMessage(
            state.lastError || 'Something went wrong',
            state.errorCount
        ))],
        currentStep: state.currentStep,
        awaitingUserInput: true
    };
}
