import { OnboardingState } from './state.js';
import { END } from '@langchain/langgraph';

/**
 * Onboarding Agent Edge Functions
 *
 * These functions determine which node to execute next based on current state.
 * They implement the conditional routing logic for the onboarding flow.
 */

/**
 * After Greet - Always go to collect_info
 */
export function afterGreet(_state: OnboardingState): string {
    return 'collect_info';
}

/**
 * After Collect Info - Go to scan_brand if URL found, else stay
 */
export function afterCollectInfo(state: OnboardingState): string {
    if (state.websiteUrl && !state.awaitingUserInput) {
        return 'scan_brand';
    }
    // Stay in collect_info waiting for input
    return 'collect_info';
}

/**
 * After Scan Brand - Go to select_staff if successful
 */
export function afterScanBrand(state: OnboardingState): string {
    if (state.brandBrain && !state.lastError) {
        return 'select_staff';
    }

    if (state.errorCount >= 3) {
        return 'error_handler';
    }

    // Go back to collect info for retry
    return 'collect_info';
}

/**
 * After Select Staff - Go to set_goals if staff selected
 */
export function afterSelectStaff(state: OnboardingState): string {
    if (state.selectedStaff.length > 0 && !state.awaitingUserInput) {
        return 'set_goals';
    }
    // Stay in select_staff waiting for input
    return 'select_staff';
}

/**
 * After Set Goals - Go to generate_plan if goals set
 */
export function afterSetGoals(state: OnboardingState): string {
    if (state.goals.length > 0 && !state.awaitingUserInput) {
        return 'generate_plan';
    }
    // Stay in set_goals waiting for input
    return 'set_goals';
}

/**
 * After Generate Plan - Go to await_approval if plan created
 */
export function afterGeneratePlan(state: OnboardingState): string {
    if (state.buildPlan) {
        return 'await_approval';
    }

    if (state.errorCount >= 3) {
        return 'error_handler';
    }

    // Go back to set_goals for retry
    return 'set_goals';
}

/**
 * After Await Approval - Go to deploy if approved, handle rejection
 */
export function afterAwaitApproval(state: OnboardingState): string {
    if (state.approvalStatus === 'approved' && !state.awaitingUserInput) {
        return 'deploy';
    }

    if (state.approvalStatus === 'rejected') {
        // Go back to let user make changes
        // Check what they want to change based on approvalNotes
        const notes = state.approvalNotes?.toLowerCase() || '';

        if (notes.includes('staff') || notes.includes('team')) {
            return 'select_staff';
        }
        if (notes.includes('goal') || notes.includes('objective')) {
            return 'set_goals';
        }
        if (notes.includes('website') || notes.includes('brand') || notes.includes('start over')) {
            return 'collect_info';
        }

        // Default: go back to staff selection
        return 'select_staff';
    }

    // Stay in await_approval waiting for input
    return 'await_approval';
}

/**
 * After Deploy - Go to verify
 */
export function afterDeploy(state: OnboardingState): string {
    if (state.deploymentResult) {
        return 'verify';
    }

    if (state.errorCount >= 3) {
        return 'error_handler';
    }

    // Retry deployment
    return 'deploy';
}

/**
 * After Verify - End or handle issues
 */
export function afterVerify(state: OnboardingState): string | typeof END {
    if (state.deploymentResult?.success && !state.awaitingUserInput) {
        return END;
    }

    // If user is being asked about partial deployment, stay
    if (state.awaitingUserInput) {
        return 'verify';
    }

    return END;
}

/**
 * After Error Handler - Return to previous step or end
 */
export function afterError(state: OnboardingState): string | typeof END {
    if (state.errorCount >= 5) {
        return END;
    }

    // Return to appropriate step based on current step
    switch (state.currentStep) {
        case 'collect_info':
        case 'scan_brand':
            return 'collect_info';
        case 'select_staff':
            return 'select_staff';
        case 'set_goals':
            return 'set_goals';
        case 'generate_plan':
            return 'set_goals';
        case 'await_approval':
            return 'await_approval';
        case 'deploy':
            return 'await_approval';
        case 'verify':
            return 'verify';
        default:
            return 'greet';
    }
}

/**
 * Route based on awaiting user input
 * Used for interrupt/resume pattern
 */
export function routeOnAwaitingInput(state: OnboardingState): string | typeof END {
    if (state.awaitingUserInput) {
        // Interrupt and wait for user
        return END;
    }

    // Continue to next step based on current step
    switch (state.currentStep) {
        case 'greet':
            return 'collect_info';
        case 'collect_info':
            return state.websiteUrl ? 'scan_brand' : 'collect_info';
        case 'scan_brand':
            return state.brandBrain ? 'select_staff' : 'collect_info';
        case 'select_staff':
            return state.selectedStaff.length > 0 ? 'set_goals' : 'select_staff';
        case 'set_goals':
            return state.goals.length > 0 ? 'generate_plan' : 'set_goals';
        case 'generate_plan':
            return state.buildPlan ? 'await_approval' : 'set_goals';
        case 'await_approval':
            return state.approvalStatus === 'approved' ? 'deploy' : 'await_approval';
        case 'deploy':
            return 'verify';
        case 'verify':
            return END;
        default:
            return 'greet';
    }
}
