/**
 * Opportunities API Routes
 * Auto-syncs pipelines and deals from GHL and VBout CRM
 */

import express from 'express';
import { ghlService } from '../integrations/ghl.js';
import { vboutService } from '../services/vboutService.js';

const router = express.Router();

interface MappedOpportunity {
    id: string;
    name: string;
    email: string;
    phone: string;
    value: number;
    sentiment: string;
    status: 'Hot' | 'Warm' | 'Cold' | 'Won' | 'Lost';
    lastAction: string;
    lastActionTime: string;
    source: string;
    notes: string;
    tags: string[];
    crmType: 'ghl' | 'vbout' | 'demo';
    rawData?: any;
}

// Map GHL stage to UI status
function mapGHLStageToStatus(stageName: string, stageOrder?: number): MappedOpportunity['status'] {
    const lowerStage = stageName.toLowerCase();

    if (lowerStage.includes('won') || lowerStage.includes('closed') || lowerStage.includes('converted')) {
        return 'Won';
    }
    if (lowerStage.includes('lost') || lowerStage.includes('dead') || lowerStage.includes('abandoned')) {
        return 'Lost';
    }
    if (lowerStage.includes('hot') || lowerStage.includes('qualified') || lowerStage.includes('proposal') || lowerStage.includes('negotiat')) {
        return 'Hot';
    }
    if (lowerStage.includes('warm') || lowerStage.includes('interested') || lowerStage.includes('contacted')) {
        return 'Warm';
    }
    if (lowerStage.includes('cold') || lowerStage.includes('new') || lowerStage.includes('lead')) {
        return 'Cold';
    }

    // Fall back to order-based mapping
    if (stageOrder !== undefined) {
        if (stageOrder >= 4) return 'Hot';
        if (stageOrder >= 2) return 'Warm';
        return 'Cold';
    }

    return 'Warm'; // Default
}

// Format relative time
function formatRelativeTime(dateString: string): string {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

// Generate sentiment from deal data
function generateSentiment(deal: any, contact?: any): string {
    const sentiments = [
        'Highly Interested',
        'Ready to Book',
        'Questioning Pricing',
        'Busy / Follow-up',
        'Negotiating',
        'Contract Review',
        'Needs Information',
        'Comparing Options'
    ];

    // Try to derive from tags or custom fields
    if (contact?.tags?.some((t: string) => t.toLowerCase().includes('hot'))) {
        return 'Highly Interested';
    }
    if (contact?.tags?.some((t: string) => t.toLowerCase().includes('price'))) {
        return 'Questioning Pricing';
    }
    if (deal.status === 'won') {
        return 'Contract Review';
    }

    // Random sentiment based on deal ID for consistency
    const index = parseInt(deal.id.replace(/\D/g, '').slice(-2) || '0') % sentiments.length;
    return sentiments[index];
}

/**
 * GET /api/opportunities/sync
 * Fetch opportunities from connected CRM (GHL or VBout)
 */
router.get('/sync', async (req, res) => {
    try {
        const crmType = req.query.crm as string || 'ghl';
        const pipelineId = req.query.pipelineId as string;

        console.log(`[Opportunities] Syncing from ${crmType}...`);

        // Check if GHL is connected
        const ghlConnected = await ghlService.isConnected();
        const vboutConnected = await vboutService.isConnected();

        const opportunities: MappedOpportunity[] = [];

        if (crmType === 'ghl' && ghlConnected) {
            // Fetch pipelines and deals from GHL
            const pipelines = await ghlService.getPipelines();
            const deals = await ghlService.getDeals(pipelineId);

            // Create stage mapping
            const stageMap = new Map<string, { name: string; order: number }>();
            pipelines.forEach(p => {
                p.stages.forEach((s: any) => {
                    stageMap.set(s.id, { name: s.name, order: s.order || 0 });
                });
            });

            // Fetch contacts for deal enrichment
            const contactCache = new Map<string, any>();

            for (const deal of deals) {
                // Try to get contact data
                let contact = contactCache.get(deal.contactId);
                if (!contact && deal.contactId) {
                    try {
                        contact = await ghlService.getContact(deal.contactId);
                        if (contact) contactCache.set(deal.contactId, contact);
                    } catch (e) {
                        // Contact might be deleted
                    }
                }

                const stageInfo = stageMap.get(deal.stage);
                const status = deal.status === 'won' ? 'Won'
                    : deal.status === 'lost' ? 'Lost'
                    : mapGHLStageToStatus(stageInfo?.name || '', stageInfo?.order);

                opportunities.push({
                    id: deal.id,
                    name: contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || deal.name : deal.name,
                    email: contact?.email || '',
                    phone: contact?.phone || '',
                    value: deal.value || 0,
                    sentiment: generateSentiment(deal, contact),
                    status,
                    lastAction: 'Synced from GHL',
                    lastActionTime: formatRelativeTime(deal.createdAt),
                    source: contact?.source || 'GoHighLevel',
                    notes: `Pipeline: ${pipelines.find(p => p.id === deal.pipelineId)?.name || 'Unknown'}`,
                    tags: contact?.tags || [],
                    crmType: 'ghl',
                    rawData: { deal, contact }
                });
            }

            console.log(`[Opportunities] Fetched ${opportunities.length} deals from GHL`);

        } else if (crmType === 'vbout' && vboutConnected) {
            // Fetch contacts from VBout and map to opportunities
            // VBout doesn't have native pipelines, so we use contact status/tags
            const contacts = await vboutService.getContacts('default');

            for (const contact of contacts) {
                const tags = contact.tags || [];
                let status: MappedOpportunity['status'] = 'Cold';

                if (tags.some((t: string) => t.toLowerCase().includes('hot') || t.toLowerCase().includes('qualified'))) {
                    status = 'Hot';
                } else if (tags.some((t: string) => t.toLowerCase().includes('warm') || t.toLowerCase().includes('engaged'))) {
                    status = 'Warm';
                } else if (tags.some((t: string) => t.toLowerCase().includes('customer') || t.toLowerCase().includes('won'))) {
                    status = 'Won';
                }

                opportunities.push({
                    id: contact.id,
                    name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
                    email: contact.email || '',
                    phone: contact.phone || '',
                    value: contact.customFields?.deal_value || contact.customFields?.value || 0,
                    sentiment: generateSentiment({ id: contact.id }, contact),
                    status,
                    lastAction: 'Synced from VBout',
                    lastActionTime: formatRelativeTime(contact.dateUpdated || contact.dateAdded),
                    source: 'VBout CRM',
                    notes: contact.customFields?.notes || '',
                    tags,
                    crmType: 'vbout',
                    rawData: contact
                });
            }

            console.log(`[Opportunities] Fetched ${opportunities.length} contacts from VBout`);

        } else {
            // Return demo data if no CRM connected
            console.log('[Opportunities] No CRM connected, returning demo data');

            const demoData: MappedOpportunity[] = [
                { id: '1', name: 'James Wilson', email: 'james@example.com', phone: '+1 555-0101', value: 2400, sentiment: 'Highly Interested', status: 'Hot', lastAction: 'AI Receptionist Handled Call', lastActionTime: '2h ago', source: 'Website Form', notes: 'Ready to close, needs pricing sheet', tags: ['priority', 'enterprise'], crmType: 'demo' },
                { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', phone: '+1 555-0102', value: 4800, sentiment: 'Questioning Pricing', status: 'Warm', lastAction: 'Recovery Agent Sent SMS', lastActionTime: '4h ago', source: 'Referral', notes: 'Follow up with case study', tags: ['follow-up'], crmType: 'demo' },
                { id: '3', name: 'Mike Ross', email: 'mike@example.com', phone: '+1 555-0103', value: 1200, sentiment: 'Ready to Book', status: 'Hot', lastAction: 'Appointment Setter Mapping Calendar', lastActionTime: '1h ago', source: 'LinkedIn', notes: 'Prefers afternoon calls', tags: ['priority'], crmType: 'demo' },
                { id: '4', name: 'Elena Rodriguez', email: 'elena@example.com', phone: '+1 555-0104', value: 3500, sentiment: 'Busy / Follow-up', status: 'Cold', lastAction: 'System Monitoring Active', lastActionTime: '1d ago', source: 'Cold Outreach', notes: 'CEO, decision maker', tags: ['executive'], crmType: 'demo' },
                { id: '5', name: 'David Kim', email: 'david@example.com', phone: '+1 555-0105', value: 6200, sentiment: 'Negotiating', status: 'Warm', lastAction: 'Proposal Sent', lastActionTime: '3h ago', source: 'Trade Show', notes: 'Wants custom package', tags: ['enterprise', 'custom'], crmType: 'demo' },
                { id: '6', name: 'Lisa Park', email: 'lisa@example.com', phone: '+1 555-0106', value: 8500, sentiment: 'Contract Review', status: 'Hot', lastAction: 'Contract Uploaded', lastActionTime: '30m ago', source: 'Partner Referral', notes: 'Legal review in progress', tags: ['closing', 'enterprise'], crmType: 'demo' },
            ];

            return res.json({
                success: true,
                opportunities: demoData,
                crmConnected: false,
                source: 'demo',
                message: 'Connect your CRM in Settings to see real data'
            });
        }

        res.json({
            success: true,
            opportunities,
            crmConnected: true,
            source: crmType,
            total: opportunities.length
        });

    } catch (error: any) {
        console.error('[Opportunities] Sync error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync opportunities'
        });
    }
});

/**
 * GET /api/opportunities/pipelines
 * Get available pipelines from GHL
 */
router.get('/pipelines', async (req, res) => {
    try {
        const ghlConnected = await ghlService.isConnected();

        if (!ghlConnected) {
            return res.json({
                success: true,
                pipelines: [],
                message: 'GHL not connected'
            });
        }

        const pipelines = await ghlService.getPipelines();

        res.json({
            success: true,
            pipelines
        });

    } catch (error: any) {
        console.error('[Opportunities] Get pipelines error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch pipelines'
        });
    }
});

/**
 * PUT /api/opportunities/:id/stage
 * Update opportunity stage in CRM
 */
router.put('/:id/stage', async (req, res) => {
    try {
        const { id } = req.params;
        const { stageId, status } = req.body;

        const ghlConnected = await ghlService.isConnected();

        if (ghlConnected && stageId) {
            // Update in GHL
            const updated = await ghlService.updateDealStage(id, stageId);

            return res.json({
                success: true,
                deal: updated,
                message: 'Stage updated in GHL'
            });
        }

        // Return success for demo mode
        res.json({
            success: true,
            message: 'Stage updated (demo mode)'
        });

    } catch (error: any) {
        console.error('[Opportunities] Update stage error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update stage'
        });
    }
});

/**
 * POST /api/opportunities
 * Create new opportunity in CRM
 */
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, value, pipelineId, stageId, tags, source } = req.body;

        const ghlConnected = await ghlService.isConnected();

        if (ghlConnected) {
            // First create contact if doesn't exist
            let contact;
            try {
                const contacts = await ghlService.getContacts({ query: email, limit: 1 });
                contact = contacts[0];
            } catch (e) {
                // Contact search failed
            }

            if (!contact) {
                const nameParts = name.split(' ');
                contact = await ghlService.createContact({
                    firstName: nameParts[0] || name,
                    lastName: nameParts.slice(1).join(' ') || '',
                    email,
                    phone,
                    tags,
                    source: source || 'LIV8-OS'
                });
            }

            // Create deal
            const deal = await ghlService.createDeal({
                name: name || `${contact.firstName}'s Deal`,
                contactId: contact.id,
                pipelineId,
                stage: stageId,
                value: value || 0
            });

            return res.json({
                success: true,
                opportunity: {
                    id: deal.id,
                    name,
                    email,
                    phone,
                    value: deal.value,
                    status: 'Cold',
                    crmType: 'ghl'
                },
                message: 'Opportunity created in GHL'
            });
        }

        // Demo mode
        res.json({
            success: true,
            opportunity: {
                id: `demo_${Date.now()}`,
                name,
                email,
                phone,
                value,
                status: 'Cold',
                crmType: 'demo'
            },
            message: 'Opportunity created (demo mode)'
        });

    } catch (error: any) {
        console.error('[Opportunities] Create error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create opportunity'
        });
    }
});

/**
 * GET /api/opportunities/summary
 * Get pipeline summary statistics
 */
router.get('/summary', async (req, res) => {
    try {
        const ghlConnected = await ghlService.isConnected();

        if (ghlConnected) {
            const data = await ghlService.syncPipelineData();

            return res.json({
                success: true,
                summary: {
                    totalDeals: data.summary.totalDeals,
                    totalValue: data.summary.totalValue,
                    byStage: data.summary.byStage,
                    pipelineCount: data.pipelines.length
                },
                crmConnected: true
            });
        }

        // Demo summary
        res.json({
            success: true,
            summary: {
                totalDeals: 6,
                totalValue: 26100,
                byStage: {
                    'Cold': 1,
                    'Warm': 2,
                    'Hot': 3,
                    'Won': 0
                },
                pipelineCount: 1
            },
            crmConnected: false
        });

    } catch (error: any) {
        console.error('[Opportunities] Summary error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get summary'
        });
    }
});

export default router;
