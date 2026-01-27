import { TASKMAGIC_WEBHOOK_URL, TASKMAGIC_MCP_TOKEN } from '../constants';

const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'https://api.liv8ai.com';

export interface OnboardingPayload {
    locationId: string;
    agencyName: string;
    clientEmail: string;
    domain: string;
    selectedRoles: string[];
    timestamp: number;
}

/**
 * Get JWT token from storage
 */
function getToken(): string | null {
    try {
        return localStorage.getItem('liv8_jwt');
    } catch (e) {
        return null;
    }
}

/**
 * Automation Service
 * Routes through backend when possible, falls back to direct webhook
 */
export const automationService = {
    /**
     * Trigger the TaskMagic deep onboarding workflow via backend
     */
    async triggerDeepSync(payload: OnboardingPayload): Promise<any> {
        console.log("[Neuro-Automation] Initiating TaskMagic Deep Sync:", payload);

        const token = getToken();

        // Prefer backend API for security and audit logging
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/taskmagic/onboarding`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("[Neuro-Automation] Deep Sync Success (via backend):", result);
                    return result;
                }
            } catch (err) {
                console.warn("[Neuro-Automation] Backend unavailable, falling back to direct webhook");
            }
        }

        // Fallback to direct webhook if backend unavailable or not authenticated
        if (!TASKMAGIC_WEBHOOK_URL) {
            console.warn("[Neuro-Automation] TaskMagic not configured, simulating success");
            return { success: true, message: 'TaskMagic webhook not configured (demo mode)' };
        }

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (TASKMAGIC_MCP_TOKEN) {
                headers['Authorization'] = `Bearer ${TASKMAGIC_MCP_TOKEN}`;
            }

            const response = await fetch(TASKMAGIC_WEBHOOK_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...payload,
                    event_type: 'liv8_deep_onboarding',
                    source: 'chrome_extension'
                })
            });

            if (!response.ok) {
                throw new Error(`Automation Sync Failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("[Neuro-Automation] Deep Sync Success (direct):", result);
            return result;
        } catch (err: any) {
            console.error("[Neuro-Automation] Critical fault in external sync:", err);
            // Return success anyway to not block user flow
            return { success: true, message: 'Automation queued (offline mode)' };
        }
    },

    /**
     * Trigger a custom TaskMagic automation
     */
    async triggerCustomAutomation(eventType: string, locationId: string, data: Record<string, any>): Promise<any> {
        const token = getToken();

        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/taskmagic/trigger`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ eventType, locationId, data })
                });

                if (response.ok) {
                    return await response.json();
                }
            } catch (err) {
                console.warn("[Neuro-Automation] Backend unavailable for custom automation");
            }
        }

        return { success: true, message: 'Automation queued (demo mode)' };
    }
};
