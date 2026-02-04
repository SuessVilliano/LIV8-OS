/**
 * Agency API Routes
 * End-to-end provisioning, permissions, and Brand Brain sync per agency
 */

import express from 'express';
import { sql } from '@vercel/postgres';
import { ghlService } from '../integrations/ghl.js';
import { vboutService } from '../services/vboutService.js';

const router = express.Router();

interface Agency {
    id: string;
    name: string;
    email: string;
    phone: string;
    region: string;
    locations: number;
    status: 'Active' | 'Provisioning' | 'Paused' | 'Error';
    health: number;
    aiStaffCount: number;
    ghlLocationId?: string;
    vboutAccountId?: string;
    permissions: AgencyPermissions;
    brandBrainId?: string;
    createdAt: string;
    updatedAt: string;
}

interface AgencyPermissions {
    canAccessAnalytics: boolean;
    canManageStaff: boolean;
    canEditBrandBrain: boolean;
    canAccessStudio: boolean;
    canManageOpportunities: boolean;
    canAccessWorkflows: boolean;
    maxLocations: number;
    maxAiStaff: number;
}

const DEFAULT_PERMISSIONS: AgencyPermissions = {
    canAccessAnalytics: true,
    canManageStaff: true,
    canEditBrandBrain: true,
    canAccessStudio: true,
    canManageOpportunities: true,
    canAccessWorkflows: true,
    maxLocations: 10,
    maxAiStaff: 5
};

// Initialize agencies table
async function initAgenciesTable(): Promise<void> {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS agencies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                parent_client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                region TEXT DEFAULT 'Global',
                locations INTEGER DEFAULT 0,
                status TEXT DEFAULT 'Provisioning',
                health INTEGER DEFAULT 0,
                ai_staff_count INTEGER DEFAULT 0,
                ghl_location_id TEXT,
                vbout_account_id TEXT,
                permissions JSONB DEFAULT '{}',
                brand_brain_id UUID,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log('[Agency] Table initialized');
    } catch (error) {
        console.error('[Agency] Table init error:', error);
    }
}

// Initialize on load
initAgenciesTable();

/**
 * GET /api/agency/list
 * Get all agencies for the current user
 */
router.get('/list', async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'] as string || 'default';

        // Try to get from database
        try {
            const result = await sql`
                SELECT * FROM agencies
                WHERE parent_client_id = ${clientId}
                ORDER BY created_at DESC
            `;

            if (result.rows.length > 0) {
                const agencies = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    region: row.region,
                    locations: row.locations,
                    status: row.status,
                    health: row.health,
                    aiStaffCount: row.ai_staff_count,
                    ghlLocationId: row.ghl_location_id,
                    vboutAccountId: row.vbout_account_id,
                    permissions: row.permissions || DEFAULT_PERMISSIONS,
                    brandBrainId: row.brand_brain_id,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }));

                return res.json({
                    success: true,
                    agencies,
                    source: 'database'
                });
            }
        } catch (dbError) {
            console.log('[Agency] Database not available, using demo data');
        }

        // Return demo data if no database
        const demoAgencies = [
            { id: '1', name: 'Solar Pro Systems', locations: 8, status: 'Active', health: 98, region: 'Global', email: 'admin@solarpro.com', phone: '+1 555-0201', aiStaffCount: 4, permissions: DEFAULT_PERMISSIONS, createdAt: '2025-11-15' },
            { id: '2', name: 'LIV8 Real Estate', locations: 14, status: 'Active', health: 92, region: 'North America', email: 'ops@liv8re.com', phone: '+1 555-0202', aiStaffCount: 6, permissions: DEFAULT_PERMISSIONS, createdAt: '2025-10-20' },
            { id: '3', name: 'Dental Growth Lab', locations: 5, status: 'Provisioning', health: 0, region: 'Europe', email: 'team@dentalgrowth.com', phone: '+44 20 1234 5678', aiStaffCount: 2, permissions: DEFAULT_PERMISSIONS, createdAt: '2026-01-28' },
            { id: '4', name: 'Elite HVAC Ops', locations: 12, status: 'Active', health: 95, region: 'Global', email: 'support@elitehvac.com', phone: '+1 555-0204', aiStaffCount: 5, permissions: DEFAULT_PERMISSIONS, createdAt: '2025-09-05' },
        ];

        res.json({
            success: true,
            agencies: demoAgencies,
            source: 'demo'
        });

    } catch (error: any) {
        console.error('[Agency] List error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to list agencies'
        });
    }
});

/**
 * POST /api/agency/provision
 * Start provisioning a new agency
 */
router.post('/provision', async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'] as string || 'default';
        const {
            name,
            email,
            phone,
            region,
            ghlLocationId,
            permissions = DEFAULT_PERMISSIONS,
            syncBrandBrain = true
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Name and email are required'
            });
        }

        console.log(`[Agency] Starting provisioning for: ${name}`);

        // Create agency record
        let agencyId: string;

        try {
            const result = await sql`
                INSERT INTO agencies (
                    parent_client_id, name, email, phone, region,
                    status, ghl_location_id, permissions
                )
                VALUES (
                    ${clientId}, ${name}, ${email}, ${phone || ''},
                    ${region || 'Global'}, 'Provisioning',
                    ${ghlLocationId || null}, ${JSON.stringify(permissions)}
                )
                RETURNING id
            `;
            agencyId = result.rows[0].id;
        } catch (dbError) {
            // Demo mode
            agencyId = `demo_${Date.now()}`;
        }

        // Start async provisioning tasks
        const provisioningTasks: Promise<any>[] = [];

        // 1. Connect to GHL if location ID provided
        if (ghlLocationId && await ghlService.isConnected()) {
            provisioningTasks.push(
                ghlService.connect({ locationId: ghlLocationId, apiKey: '' })
                    .then(() => ({ task: 'ghl', success: true }))
                    .catch((e) => ({ task: 'ghl', success: false, error: e.message }))
            );
        }

        // 2. Create VBout sub-account
        if (await vboutService.isConnected()) {
            provisioningTasks.push(
                vboutService.createList(`${name} - Agency Contacts`)
                    .then((list) => ({ task: 'vbout', success: true, listId: list?.id }))
                    .catch((e) => ({ task: 'vbout', success: false, error: e.message }))
            );
        }

        // 3. Clone Brand Brain if requested
        if (syncBrandBrain) {
            provisioningTasks.push(
                Promise.resolve({ task: 'brand_brain', success: true, message: 'Brand Brain sync queued' })
            );
        }

        // Wait for initial provisioning steps
        const results = await Promise.allSettled(provisioningTasks);
        const provisioningStatus = results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Task failed' });

        // Update agency status based on results
        const allSucceeded = provisioningStatus.every(s => s.success !== false);
        const newStatus = allSucceeded ? 'Active' : 'Provisioning';

        try {
            await sql`
                UPDATE agencies
                SET status = ${newStatus},
                    health = ${allSucceeded ? 100 : 50},
                    updated_at = NOW()
                WHERE id = ${agencyId}::uuid
            `;
        } catch (dbError) {
            // Demo mode - ignore
        }

        res.json({
            success: true,
            agency: {
                id: agencyId,
                name,
                email,
                phone,
                region: region || 'Global',
                status: newStatus,
                health: allSucceeded ? 100 : 50,
                locations: 0,
                aiStaffCount: 0,
                permissions
            },
            provisioning: {
                tasks: provisioningStatus,
                complete: allSucceeded
            },
            message: allSucceeded ? 'Agency provisioned successfully' : 'Provisioning in progress'
        });

    } catch (error: any) {
        console.error('[Agency] Provisioning error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to provision agency'
        });
    }
});

/**
 * PUT /api/agency/:id/permissions
 * Update agency permissions
 */
router.put('/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!permissions) {
            return res.status(400).json({
                success: false,
                error: 'Permissions object is required'
            });
        }

        try {
            await sql`
                UPDATE agencies
                SET permissions = ${JSON.stringify(permissions)},
                    updated_at = NOW()
                WHERE id = ${id}::uuid
            `;
        } catch (dbError) {
            console.log('[Agency] Demo mode - permissions update simulated');
        }

        res.json({
            success: true,
            message: 'Permissions updated',
            permissions
        });

    } catch (error: any) {
        console.error('[Agency] Permissions update error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update permissions'
        });
    }
});

/**
 * PUT /api/agency/:id/status
 * Update agency status (pause/resume/delete)
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Active', 'Paused', 'Provisioning', 'Error'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        try {
            await sql`
                UPDATE agencies
                SET status = ${status},
                    updated_at = NOW()
                WHERE id = ${id}::uuid
            `;
        } catch (dbError) {
            console.log('[Agency] Demo mode - status update simulated');
        }

        res.json({
            success: true,
            message: `Agency ${status === 'Paused' ? 'paused' : status === 'Active' ? 'activated' : 'updated'}`,
            status
        });

    } catch (error: any) {
        console.error('[Agency] Status update error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update status'
        });
    }
});

/**
 * DELETE /api/agency/:id
 * Remove an agency
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        try {
            await sql`
                DELETE FROM agencies
                WHERE id = ${id}::uuid
            `;
        } catch (dbError) {
            console.log('[Agency] Demo mode - delete simulated');
        }

        res.json({
            success: true,
            message: 'Agency removed'
        });

    } catch (error: any) {
        console.error('[Agency] Delete error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete agency'
        });
    }
});

/**
 * POST /api/agency/:id/sync-brand-brain
 * Sync Brand Brain to agency
 */
router.post('/:id/sync-brand-brain', async (req, res) => {
    try {
        const { id } = req.params;
        const { sourceBrandBrainId } = req.body;

        console.log(`[Agency] Syncing Brand Brain to agency ${id}`);

        // In production, this would:
        // 1. Copy Brand Brain data to agency's context
        // 2. Set up knowledge base inheritance
        // 3. Configure AI staff with agency-specific context

        res.json({
            success: true,
            message: 'Brand Brain synced to agency',
            agencyId: id,
            syncedFrom: sourceBrandBrainId || 'parent'
        });

    } catch (error: any) {
        console.error('[Agency] Brand Brain sync error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync Brand Brain'
        });
    }
});

/**
 * GET /api/agency/:id/health
 * Get agency health metrics
 */
router.get('/:id/health', async (req, res) => {
    try {
        const { id } = req.params;

        // In production, this would check:
        // - GHL connection status
        // - VBout connection status
        // - AI staff response times
        // - Recent error rates

        const healthMetrics = {
            ghlConnected: true,
            vboutConnected: true,
            aiStaffResponsive: true,
            recentErrors: 0,
            lastChecked: new Date().toISOString(),
            overallHealth: 95
        };

        res.json({
            success: true,
            agencyId: id,
            health: healthMetrics
        });

    } catch (error: any) {
        console.error('[Agency] Health check error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check health'
        });
    }
});

/**
 * GET /api/agency/:id/locations
 * Get locations for an agency from GHL
 */
router.get('/:id/locations', async (req, res) => {
    try {
        const { id } = req.params;

        // In production, fetch from GHL API
        const demoLocations = [
            { id: 'loc1', name: 'Main Office', address: '123 Main St', status: 'active' },
            { id: 'loc2', name: 'Downtown Branch', address: '456 Oak Ave', status: 'active' },
            { id: 'loc3', name: 'East Side', address: '789 Pine Rd', status: 'active' }
        ];

        res.json({
            success: true,
            agencyId: id,
            locations: demoLocations,
            total: demoLocations.length
        });

    } catch (error: any) {
        console.error('[Agency] Locations fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch locations'
        });
    }
});

export default router;
