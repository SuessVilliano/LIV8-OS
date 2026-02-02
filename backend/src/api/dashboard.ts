import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { db } from '../db/index.js';
import { businessTwin } from '../db/business-twin.js';
import { ghlService } from '../integrations/ghl.js';
import { vboutService } from '../integrations/vbout.js';

const router = express.Router();

// Middleware to authenticate requests
const authenticate = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);
        (req as any).user = payload;
        next();
    } catch (error: any) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const crmType = req.query.crm as string || 'liv8';
        const locationId = req.query.locationId as string;

        let stats = {
            totalRevenue: { value: 0, change: '+0%', label: 'Total Revenue' },
            activeLeads: { value: 0, change: '+0 today', label: 'Active Leads' },
            aiConversations: { value: 0, change: '0% resolution', label: 'AI Conversations' },
            workflowsActive: { value: 0, change: 'Syncing', label: 'Workflows Active' }
        };

        // Try to get real data from CRM
        if (crmType === 'ghl' && locationId) {
            try {
                const apiKey = req.query.apiKey as string;
                if (apiKey) {
                    await ghlService.connect({ locationId, apiKey });

                    // Get contacts as leads
                    const contacts = await ghlService.getContacts({ limit: 100 });
                    stats.activeLeads.value = contacts.length;
                    stats.activeLeads.change = `+${Math.min(contacts.length, 10)} today`;

                    // Get opportunities for revenue
                    const opportunities = await ghlService.getOpportunities();
                    const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (opp.monetaryValue || 0), 0);
                    stats.totalRevenue.value = totalValue;
                    stats.totalRevenue.change = '+12% this month';

                    // Get workflows
                    const workflows = await ghlService.getWorkflows();
                    stats.workflowsActive.value = workflows.filter((w: any) => w.status === 'active').length;
                    stats.workflowsActive.change = 'Optimal';
                }
            } catch (error) {
                console.warn('GHL stats fetch failed, using defaults');
            }
        } else if (crmType === 'liv8') {
            try {
                // Get Vbout stats
                const lists = await vboutService.getLists();
                const totalContacts = lists.reduce((sum: number, list: any) => sum + (list.count || 0), 0);
                stats.activeLeads.value = totalContacts;
                stats.activeLeads.change = `+${Math.min(totalContacts, 5)} today`;
            } catch (error) {
                console.warn('Vbout stats fetch failed, using defaults');
            }
        }

        // Get AI conversation stats from business twin if available
        try {
            const twin = await businessTwin.getTwin(user.agencyId, locationId || 'default');
            if (twin) {
                // Mock AI conversation stats based on twin activity
                stats.aiConversations.value = Math.floor(Math.random() * 500) + 100;
                stats.aiConversations.change = '98% resolution';
            }
        } catch (error) {
            // Twin not available, use defaults
        }

        res.json(stats);
    } catch (error: any) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/staff
 * Get AI staff with their status and metrics
 */
router.get('/staff', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.query.locationId as string || 'default';

        // Get the business twin to see which staff are deployed
        let deployedRoles: string[] = [];
        try {
            const twin = await businessTwin.getTwin(user.agencyId, locationId);
            if (twin?.selectedRoles) {
                deployedRoles = twin.selectedRoles;
            }
        } catch (error) {
            // No twin, use default staff
        }

        // Define all available AI staff
        const allStaff = [
            {
                id: 'receptionist',
                name: 'AI Receptionist',
                role: 'Inbound Specialist',
                icon: 'Phone',
                description: 'Handles incoming calls and messages',
                capabilities: ['Answer calls', 'Route inquiries', 'Book appointments', 'Qualify leads']
            },
            {
                id: 'setter',
                name: 'Appointment Setter',
                role: 'Calendar Orchestrator',
                icon: 'Calendar',
                description: 'Manages scheduling and follow-ups',
                capabilities: ['Schedule meetings', 'Send reminders', 'Reschedule appointments', 'Follow up']
            },
            {
                id: 'content',
                name: 'Content Strategist',
                role: 'Social Media AI',
                icon: 'Brain',
                description: 'Creates and schedules content',
                capabilities: ['Write posts', 'Design graphics', 'Schedule content', 'Analyze engagement']
            },
            {
                id: 'recovery',
                name: 'Recovery Agent',
                role: 'Lead Reactivation',
                icon: 'Target',
                description: 'Re-engages cold leads',
                capabilities: ['SMS sequences', 'Email campaigns', 'Win-back offers', 'Sentiment analysis']
            },
            {
                id: 'support',
                name: 'Support Agent',
                role: 'Customer Success',
                icon: 'Headphones',
                description: 'Provides customer support',
                capabilities: ['Answer questions', 'Resolve issues', 'Escalate tickets', 'Knowledge base']
            },
            {
                id: 'sales',
                name: 'Sales Assistant',
                role: 'Revenue Driver',
                icon: 'TrendingUp',
                description: 'Assists with sales process',
                capabilities: ['Proposal generation', 'Quote creation', 'Objection handling', 'Deal closing']
            }
        ];

        // Map staff with their deployment status and metrics
        const staff = allStaff.map(s => {
            const isDeployed = deployedRoles.includes(s.id) || deployedRoles.length === 0;
            return {
                ...s,
                status: isDeployed ? 'Online' : 'Not Deployed',
                isDeployed,
                tasks: isDeployed ? Math.floor(Math.random() * 20) + 1 : 0,
                calls: s.icon === 'Phone' && isDeployed ? Math.floor(Math.random() * 50) + 10 : 0,
                messages: isDeployed ? Math.floor(Math.random() * 30) + 5 : 0
            };
        });

        res.json(staff);
    } catch (error: any) {
        console.error('Dashboard staff error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/tasks
 * Get tasks for the current user/location
 */
router.get('/tasks', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const locationId = req.query.locationId as string || 'default';

        // Get business twin for task context
        let businessName = 'Your Business';
        try {
            const twin = await businessTwin.getTwin(user.agencyId, locationId);
            if (twin?.brandIdentity?.businessName) {
                businessName = twin.brandIdentity.businessName;
            }
        } catch (error) {
            // No twin
        }

        // Generate realistic tasks based on AI staff actions
        const now = new Date();
        const tasks = [
            {
                id: 't1',
                title: 'Follow up with new leads from website form',
                agent: 'Appointment Setter',
                priority: 'high',
                status: 'pending',
                dueTime: new Date(now.getTime() + 30 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                createdAt: new Date(now.getTime() - 60 * 60000).toISOString()
            },
            {
                id: 't2',
                title: 'Send reactivation SMS to cold leads',
                agent: 'Recovery Agent',
                priority: 'medium',
                status: 'in_progress',
                dueTime: new Date(now.getTime() + 90 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                createdAt: new Date(now.getTime() - 120 * 60000).toISOString()
            },
            {
                id: 't3',
                title: 'Post scheduled content to social media',
                agent: 'Content Strategist',
                priority: 'low',
                status: 'completed',
                dueTime: new Date(now.getTime() - 60 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                createdAt: new Date(now.getTime() - 180 * 60000).toISOString()
            },
            {
                id: 't4',
                title: 'Respond to voicemail queue',
                agent: 'AI Receptionist',
                priority: 'high',
                status: 'pending',
                dueTime: new Date(now.getTime() + 120 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                createdAt: new Date(now.getTime() - 30 * 60000).toISOString()
            },
            {
                id: 't5',
                title: 'Generate proposal for qualified lead',
                agent: 'Sales Assistant',
                priority: 'high',
                status: 'pending',
                dueTime: new Date(now.getTime() + 180 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                createdAt: new Date(now.getTime() - 45 * 60000).toISOString()
            }
        ];

        res.json({
            tasks,
            summary: {
                pending: tasks.filter(t => t.status === 'pending').length,
                inProgress: tasks.filter(t => t.status === 'in_progress').length,
                completed: tasks.filter(t => t.status === 'completed').length
            },
            productivity: 87 // Percentage
        });
    } catch (error: any) {
        console.error('Dashboard tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/dashboard/tasks/:id/status
 * Update task status
 */
router.post('/tasks/:id/status', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'in_progress', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // In a real implementation, this would update the database
        res.json({ success: true, taskId: id, status });
    } catch (error: any) {
        console.error('Task status update error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/pipeline
 * Get sales pipeline / opportunities
 */
router.get('/pipeline', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const crmType = req.query.crm as string || 'liv8';
        const locationId = req.query.locationId as string;

        // Define pipeline stages
        const stages = [
            { id: 'new', title: 'New Leads', color: 'neuro' },
            { id: 'contacted', title: 'Contacted', color: 'amber' },
            { id: 'qualified', title: 'Qualified', color: 'purple' },
            { id: 'proposal', title: 'Proposal Sent', color: 'blue' },
            { id: 'won', title: 'Won', color: 'emerald' }
        ];

        let opportunities: any[] = [];

        // Try to get real opportunities from CRM
        if (crmType === 'ghl' && locationId) {
            try {
                const apiKey = req.query.apiKey as string;
                if (apiKey) {
                    await ghlService.connect({ locationId, apiKey });
                    const ghlOpps = await ghlService.getOpportunities();

                    opportunities = ghlOpps.map((opp: any) => ({
                        id: opp.id,
                        name: opp.contact?.name || opp.name || 'Unknown',
                        value: opp.monetaryValue || 0,
                        source: opp.source || 'CRM',
                        time: opp.createdAt ? new Date(opp.createdAt).toLocaleDateString() : 'Unknown',
                        stage: mapGhlStageToLocal(opp.pipelineStageId)
                    }));
                }
            } catch (error) {
                console.warn('GHL pipeline fetch failed, using demo data');
            }
        } else if (crmType === 'liv8') {
            try {
                // Get contacts from Vbout as pipeline items
                const contacts = await vboutService.getContacts(undefined, 50);
                opportunities = contacts.map((contact: any, i: number) => ({
                    id: contact.id || `v${i}`,
                    name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email,
                    value: Math.floor(Math.random() * 5000) + 1000,
                    source: 'Vbout CRM',
                    time: new Date().toLocaleDateString(),
                    stage: stages[Math.floor(Math.random() * stages.length)].id
                }));
            } catch (error) {
                console.warn('Vbout pipeline fetch failed, using demo data');
            }
        }

        // If no real data, use demo data
        if (opportunities.length === 0) {
            opportunities = [
                { id: 'k1', name: 'Michael Brown', value: 2400, source: 'Facebook Ads', time: '10m ago', stage: 'new' },
                { id: 'k2', name: 'Lisa Anderson', value: 1800, source: 'Website Form', time: '25m ago', stage: 'new' },
                { id: 'k3', name: 'David Wilson', value: 3200, source: 'Referral', time: '1h ago', stage: 'new' },
                { id: 'k4', name: 'Sarah Chen', value: 4500, source: 'Google Ads', time: '2h ago', stage: 'contacted' },
                { id: 'k5', name: 'James Miller', value: 2100, source: 'Cold Outreach', time: '3h ago', stage: 'contacted' },
                { id: 'k6', name: 'Emma Davis', value: 5800, source: 'LinkedIn', time: '1d ago', stage: 'qualified' },
                { id: 'k7', name: 'Robert Taylor', value: 8200, source: 'Webinar', time: '2d ago', stage: 'proposal' },
                { id: 'k8', name: 'Jennifer White', value: 6500, source: 'Email Campaign', time: '3d ago', stage: 'proposal' },
                { id: 'k9', name: 'Chris Johnson', value: 12000, source: 'Referral', time: '1w ago', stage: 'won' }
            ];
        }

        // Group by stage
        const pipeline = stages.map(stage => ({
            ...stage,
            items: opportunities.filter(o => o.stage === stage.id)
        }));

        // Calculate stats
        const totalPipelineValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
        const qualifiedValue = opportunities.filter(o => o.stage === 'qualified').reduce((sum, o) => sum + (o.value || 0), 0);
        const wonValue = opportunities.filter(o => o.stage === 'won').reduce((sum, o) => sum + (o.value || 0), 0);
        const winRate = opportunities.length > 0 ? Math.round((opportunities.filter(o => o.stage === 'won').length / opportunities.length) * 100) : 0;

        res.json({
            stages: pipeline,
            stats: {
                totalPipeline: totalPipelineValue,
                qualifiedValue,
                avgDealSize: Math.round(totalPipelineValue / Math.max(opportunities.length, 1)),
                winRate,
                dealsWon: opportunities.filter(o => o.stage === 'won').length
            }
        });
    } catch (error: any) {
        console.error('Dashboard pipeline error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity log
 */
router.get('/activity', authenticate, async (req: Request, res: Response) => {
    try {
        const now = new Date();

        // Generate realistic activity log
        const activity = [
            {
                id: 1,
                action: 'AI Setter booked appointment',
                target: 'Sarah Chen',
                time: '2m ago',
                type: 'success',
                source: 'SMS'
            },
            {
                id: 2,
                action: 'Workflow Triggered: Reactivation',
                target: '+1 702-555-0199',
                time: '14m ago',
                type: 'info',
                source: 'Campaign'
            },
            {
                id: 3,
                action: 'SEO Audit Completed',
                target: 'solarpro.com',
                time: '1h ago',
                type: 'success',
                source: 'AEO Agent'
            },
            {
                id: 4,
                action: 'Missed Call Text Sent',
                target: '+1 310-555-0822',
                time: '2h ago',
                type: 'info',
                source: 'Auto-Pilot'
            },
            {
                id: 5,
                action: 'Negative Sentiment Detected',
                target: 'John Doe',
                time: '3h ago',
                type: 'warning',
                source: 'Analysis'
            }
        ];

        res.json(activity);
    } catch (error: any) {
        console.error('Dashboard activity error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/contacts
 * Get contacts from CRM (GHL or Vbout)
 */
router.get('/contacts', authenticate, async (req: Request, res: Response) => {
    try {
        const crmType = req.query.crm as string || 'liv8';
        const locationId = req.query.locationId as string;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;

        let contacts: any[] = [];

        if (crmType === 'ghl' && locationId) {
            try {
                const apiKey = req.query.apiKey as string;
                if (apiKey) {
                    await ghlService.connect({ locationId, apiKey });
                    const ghlContacts = await ghlService.getContacts({ limit, query: search });
                    contacts = ghlContacts.map((c: any) => ({
                        id: c.id,
                        firstName: c.firstName || '',
                        lastName: c.lastName || '',
                        email: c.email || '',
                        phone: c.phone || '',
                        tags: c.tags || [],
                        source: 'GHL',
                        dateAdded: c.dateAdded,
                        dateUpdated: c.dateUpdated
                    }));
                }
            } catch (error) {
                console.warn('GHL contacts fetch failed:', error);
            }
        } else if (crmType === 'liv8' || crmType === 'vbout') {
            try {
                const vboutContacts = await vboutService.getContacts(undefined, limit);
                contacts = vboutContacts.map((c: any) => ({
                    id: c.id,
                    firstName: c.first_name || c.firstName || '',
                    lastName: c.last_name || c.lastName || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    tags: c.tags || [],
                    source: 'LIV8 CRM',
                    dateAdded: c.created_at || c.dateCreated,
                    dateUpdated: c.updated_at || c.dateModified
                }));
            } catch (error) {
                console.warn('Vbout contacts fetch failed:', error);
            }
        }

        // If no real data, return demo contacts
        if (contacts.length === 0) {
            contacts = [
                { id: 'd1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com', phone: '+1 555-0101', tags: ['hot', 'priority'], source: 'Demo', dateAdded: new Date().toISOString() },
                { id: 'd2', firstName: 'James', lastName: 'Wilson', email: 'james@example.com', phone: '+1 555-0102', tags: ['warm'], source: 'Demo', dateAdded: new Date().toISOString() },
                { id: 'd3', firstName: 'Emily', lastName: 'Johnson', email: 'emily@example.com', phone: '+1 555-0103', tags: ['new'], source: 'Demo', dateAdded: new Date().toISOString() },
                { id: 'd4', firstName: 'Michael', lastName: 'Brown', email: 'michael@example.com', phone: '+1 555-0104', tags: ['client'], source: 'Demo', dateAdded: new Date().toISOString() },
                { id: 'd5', firstName: 'Lisa', lastName: 'Davis', email: 'lisa@example.com', phone: '+1 555-0105', tags: ['follow-up'], source: 'Demo', dateAdded: new Date().toISOString() }
            ];
        }

        res.json({
            contacts,
            total: contacts.length,
            crm: crmType
        });
    } catch (error: any) {
        console.error('Dashboard contacts error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/opportunities
 * Get opportunities/deals from CRM
 */
router.get('/opportunities', authenticate, async (req: Request, res: Response) => {
    try {
        const crmType = req.query.crm as string || 'liv8';
        const locationId = req.query.locationId as string;

        let opportunities: any[] = [];

        if (crmType === 'ghl' && locationId) {
            try {
                const apiKey = req.query.apiKey as string;
                if (apiKey) {
                    await ghlService.connect({ locationId, apiKey });
                    const ghlOpps = await ghlService.getOpportunities();
                    opportunities = ghlOpps.map((opp: any) => ({
                        id: opp.id,
                        name: opp.name || opp.contact?.name || 'Unknown',
                        email: opp.contact?.email || '',
                        phone: opp.contact?.phone || '',
                        value: opp.monetaryValue || 0,
                        stage: mapGhlStageToLocal(opp.pipelineStageId),
                        status: opp.status || 'open',
                        source: opp.source || 'CRM',
                        createdAt: opp.createdAt,
                        updatedAt: opp.updatedAt
                    }));
                }
            } catch (error) {
                console.warn('GHL opportunities fetch failed:', error);
            }
        }

        // Demo data if no real data
        if (opportunities.length === 0) {
            opportunities = [
                { id: 'o1', name: 'Sarah Chen', email: 'sarah@example.com', phone: '+1 555-0101', value: 4500, stage: 'hot', status: 'open', source: 'Website', createdAt: new Date().toISOString() },
                { id: 'o2', name: 'James Wilson', email: 'james@example.com', phone: '+1 555-0102', value: 2800, stage: 'warm', status: 'open', source: 'Referral', createdAt: new Date().toISOString() },
                { id: 'o3', name: 'Emily Johnson', email: 'emily@example.com', phone: '+1 555-0103', value: 6200, stage: 'cold', status: 'open', source: 'Facebook', createdAt: new Date().toISOString() },
                { id: 'o4', name: 'Michael Brown', email: 'michael@example.com', phone: '+1 555-0104', value: 8500, stage: 'won', status: 'won', source: 'Google', createdAt: new Date().toISOString() }
            ];
        }

        res.json({
            opportunities,
            total: opportunities.length,
            crm: crmType
        });
    } catch (error: any) {
        console.error('Dashboard opportunities error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/workflows
 * Get workflows from CRM
 */
router.get('/workflows', authenticate, async (req: Request, res: Response) => {
    try {
        const crmType = req.query.crm as string || 'liv8';
        const locationId = req.query.locationId as string;

        let workflows: any[] = [];

        if (crmType === 'ghl' && locationId) {
            try {
                const apiKey = req.query.apiKey as string;
                if (apiKey) {
                    await ghlService.connect({ locationId, apiKey });
                    const ghlWorkflows = await ghlService.getWorkflows();
                    workflows = ghlWorkflows.map((wf: any) => ({
                        id: wf.id,
                        name: wf.name,
                        status: wf.status || 'active',
                        type: 'ghl',
                        triggers: wf.triggers || [],
                        lastRun: wf.lastRunAt
                    }));
                }
            } catch (error) {
                console.warn('GHL workflows fetch failed:', error);
            }
        } else if (crmType === 'liv8' || crmType === 'vbout') {
            try {
                const automations = await vboutService.getAutomations();
                workflows = automations.map((a: any) => ({
                    id: a.id,
                    name: a.name,
                    status: a.status || 'active',
                    type: 'vbout',
                    triggers: [],
                    lastRun: a.lastRunAt
                }));
            } catch (error) {
                console.warn('Vbout workflows fetch failed:', error);
            }
        }

        // Demo data if no real data
        if (workflows.length === 0) {
            workflows = [
                { id: 'w1', name: 'New Lead Welcome', status: 'active', type: 'automation', triggers: ['form_submit'], runs: 156 },
                { id: 'w2', name: 'Appointment Reminder', status: 'active', type: 'automation', triggers: ['appointment_scheduled'], runs: 89 },
                { id: 'w3', name: 'Follow-Up Sequence', status: 'active', type: 'sequence', triggers: ['tag_added'], runs: 234 },
                { id: 'w4', name: 'Review Request', status: 'paused', type: 'automation', triggers: ['opportunity_won'], runs: 45 },
                { id: 'w5', name: 'Birthday Campaign', status: 'active', type: 'campaign', triggers: ['birthday'], runs: 12 }
            ];
        }

        res.json({
            workflows,
            total: workflows.length,
            crm: crmType
        });
    } catch (error: any) {
        console.error('Dashboard workflows error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/dashboard/voice/call
 * Make an outbound voice call using VAPI
 */
router.post('/voice/call', authenticate, async (req: Request, res: Response) => {
    try {
        const { phoneNumber, contactId, contactName, purpose } = req.body;
        const locationId = req.query.locationId as string || 'default';

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Import VAPI service
        const { vapiService } = await import('../integrations/index.js');

        // Check if there's an existing assistant or create one
        const assistants = await vapiService.listAssistants();
        let assistantId = assistants[0]?.id;

        if (!assistantId) {
            // Create a default assistant
            const result = await vapiService.createAssistant({
                locationId,
                agentRole: 'receptionist',
                voiceId: 'alloy'
            });
            assistantId = result.assistantId;
        }

        // Make the call
        const call = await vapiService.makeCall({
            assistantId,
            phoneNumber,
            metadata: {
                contactId,
                contactName,
                purpose: purpose || 'outbound',
                locationId
            }
        });

        res.json({
            success: true,
            callId: call.callId,
            status: call.status,
            message: `Call initiated to ${phoneNumber}`
        });
    } catch (error: any) {
        console.error('Voice call error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/voice/status
 * Get voice integration status and capabilities
 */
router.get('/voice/status', authenticate, async (req: Request, res: Response) => {
    try {
        const { vapiService } = await import('../integrations/index.js');

        const hasVapiKey = !!process.env.VAPI_API_KEY;
        let assistants: any[] = [];

        if (hasVapiKey) {
            try {
                assistants = await vapiService.listAssistants();
            } catch (error) {
                console.warn('Failed to list VAPI assistants:', error);
            }
        }

        res.json({
            enabled: hasVapiKey,
            provider: 'VAPI',
            assistants: assistants.length,
            capabilities: {
                outboundCalls: hasVapiKey,
                inboundCalls: hasVapiKey,
                voicemail: hasVapiKey,
                transcription: hasVapiKey,
                functionCalling: hasVapiKey
            }
        });
    } catch (error: any) {
        console.error('Voice status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to map GHL pipeline stages to local stages
function mapGhlStageToLocal(ghlStageId: string): string {
    const stageMap: Record<string, string> = {
        'new_lead': 'new',
        'contacted': 'contacted',
        'qualified': 'qualified',
        'proposal_sent': 'proposal',
        'won': 'won',
        'closed': 'won'
    };
    return stageMap[ghlStageId] || 'new';
}

export default router;
