/**
 * Brand Sync Service
 *
 * Ensures onboarding data syncs to Brand Brain universally.
 * Syncs localStorage brand data with the Business Twin backend.
 */

import { getBackendUrl } from './api';

const API_BASE = getBackendUrl();

export interface BrandData {
    businessName: string;
    domain: string;
    industry: string;
    tagline: string;
    brandVoice: string;
    personality: string[];
    writingStyle: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
    };
    logoUrl: string;
    faviconUrl: string;
    socialLinks: Record<string, string>;
    seoSettings: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string;
        targetAudience?: string;
        uniqueValue?: string;
    };
    goals: string;
    painPoints: string;
    selectedStaff: string[];
    onboardingComplete: boolean;
    lastUpdated?: string;
    version?: number;
}

class BrandSyncService {
    private syncInterval: number | null = null;
    private lastSyncTime: number = 0;
    private isSyncing: boolean = false;

    /**
     * Initialize brand sync on app startup
     * Fetches brand data from server and updates localStorage
     */
    async initialize(): Promise<BrandData | null> {
        const locationId = localStorage.getItem('os_loc_id');
        const token = localStorage.getItem('os_token');

        if (!locationId || !token) {
            console.log('[BrandSync] No location ID or token - skipping sync');
            return this.getLocalBrandData();
        }

        try {
            const response = await fetch(`${API_BASE}/api/brand/sync?locationId=${locationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-location-id': locationId
                }
            });

            if (!response.ok) {
                console.warn('[BrandSync] Server sync failed, using local data');
                return this.getLocalBrandData();
            }

            const data = await response.json();

            if (data.success && data.exists && data.brandData) {
                // Update localStorage with server data
                this.saveBrandDataLocally(data.brandData);
                console.log('[BrandSync] Synced brand data from server');
                return data.brandData;
            } else if (!data.exists) {
                // No server data, check if we have local data to push
                const localData = this.getLocalBrandData();
                if (localData && localData.businessName) {
                    await this.pushToServer(localData);
                }
                return localData;
            }

            return this.getLocalBrandData();

        } catch (error) {
            console.error('[BrandSync] Sync error:', error);
            return this.getLocalBrandData();
        }
    }

    /**
     * Get brand data from localStorage
     */
    getLocalBrandData(): BrandData | null {
        try {
            const stored = localStorage.getItem('os_brand');
            if (stored) {
                return JSON.parse(stored);
            }

            // Try to build from individual localStorage items
            const businessName = localStorage.getItem('businessName') || localStorage.getItem('os_brand_name');
            if (businessName) {
                const partialData: Partial<BrandData> = {
                    businessName,
                    domain: localStorage.getItem('os_domain') || '',
                    industry: localStorage.getItem('os_industry') || '',
                    onboardingComplete: localStorage.getItem('os_onboarding_complete') === 'true'
                };
                return partialData as BrandData;
            }

            return null;
        } catch (error) {
            console.error('[BrandSync] Error reading local data:', error);
            return null;
        }
    }

    /**
     * Save brand data to localStorage (multiple keys for compatibility)
     */
    saveBrandDataLocally(data: BrandData): void {
        // Store comprehensive brand object
        localStorage.setItem('os_brand', JSON.stringify(data));

        // Also store individual keys for backward compatibility
        if (data.businessName) {
            localStorage.setItem('businessName', data.businessName);
            localStorage.setItem('os_brand_name', data.businessName);
        }
        if (data.domain) {
            localStorage.setItem('os_domain', data.domain);
        }
        if (data.industry) {
            localStorage.setItem('os_industry', data.industry);
        }
        if (data.colors) {
            localStorage.setItem('os_colors', JSON.stringify(data.colors));
        }
        if (data.onboardingComplete) {
            localStorage.setItem('os_onboarding_complete', 'true');
        }

        this.lastSyncTime = Date.now();
    }

    /**
     * Push local brand data to server
     */
    async pushToServer(data: BrandData): Promise<boolean> {
        if (this.isSyncing) return false;

        const locationId = localStorage.getItem('os_loc_id');
        const token = localStorage.getItem('os_token');

        if (!locationId || !token) {
            return false;
        }

        this.isSyncing = true;

        try {
            const response = await fetch(`${API_BASE}/api/brand/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-location-id': locationId
                },
                body: JSON.stringify({
                    locationId,
                    brandData: data
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('[BrandSync] Pushed brand data to server');
                this.lastSyncTime = Date.now();
                return true;
            }

            return false;

        } catch (error) {
            console.error('[BrandSync] Push error:', error);
            return false;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Update brand data locally and sync to server
     */
    async updateBrandData(updates: Partial<BrandData>): Promise<void> {
        const current = this.getLocalBrandData() || {} as BrandData;
        const updated = { ...current, ...updates };

        this.saveBrandDataLocally(updated);

        // Debounced push to server (don't push on every keystroke)
        if (Date.now() - this.lastSyncTime > 5000) {
            await this.pushToServer(updated);
        }
    }

    /**
     * Force sync - push current localStorage data to server
     */
    async forceSync(): Promise<boolean> {
        const data = this.getLocalBrandData();
        if (!data) return false;
        return this.pushToServer(data);
    }

    /**
     * Start periodic sync (every 5 minutes)
     */
    startPeriodicSync(): void {
        if (this.syncInterval) return;

        this.syncInterval = window.setInterval(async () => {
            const data = this.getLocalBrandData();
            if (data && data.businessName) {
                await this.pushToServer(data);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Stop periodic sync
     */
    stopPeriodicSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Get brand context for AI agents
     */
    getBrandContext(): string {
        const data = this.getLocalBrandData();
        if (!data) return '';

        let context = '';

        if (data.businessName) {
            context += `Business: ${data.businessName}\n`;
        }
        if (data.industry) {
            context += `Industry: ${data.industry}\n`;
        }
        if (data.tagline) {
            context += `Tagline: ${data.tagline}\n`;
        }
        if (data.brandVoice) {
            context += `Brand Voice: ${data.brandVoice}\n`;
        }
        if (data.goals) {
            context += `Goals: ${data.goals}\n`;
        }

        return context;
    }
}

// Export singleton instance
export const brandSync = new BrandSyncService();
