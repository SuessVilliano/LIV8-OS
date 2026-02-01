import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { businessTwin, BusinessIdentity, BrandVoice, ContentGuidelines } from '../db/business-twin.js';
import { knowledgeScraper } from '../services/knowledge-scraper.js';
import { getSOPsForRole, defaultConstraints, defaultAgentConfigs } from '../services/sop-templates.js';

const router = Router();

// Auth middleware
const authenticate = (req: Request, res: Response, next: any) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized - no token' });
        }

        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);

        (req as any).userId = payload.userId;
        (req as any).agencyId = payload.agencyId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Create or update a Business Twin
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, crmType, identity } = req.body;

        if (!locationId || !crmType) {
            return res.status(400).json({ error: 'locationId and crmType are required' });
        }

        if (!['ghl', 'liv8'].includes(crmType)) {
            return res.status(400).json({ error: 'crmType must be "ghl" or "liv8"' });
        }

        const twin = await businessTwin.create({
            locationId,
            crmType,
            identity: identity || {}
        });

        res.status(201).json({ success: true, twin });

    } catch (error: any) {
        console.error('[Twin API] Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get Business Twin by location ID
 */
router.get('/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        const twin = await businessTwin.getByLocationId(locationId);

        if (!twin) {
            return res.status(404).json({ error: 'Business Twin not found' });
        }

        // Also fetch knowledge base
        const knowledge = await businessTwin.getKnowledge(locationId);

        res.json({
            ...twin,
            knowledgeBase: knowledge
        });

    } catch (error: any) {
        console.error('[Twin API] Get error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update Business Identity
 */
router.put('/:locationId/identity', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const identity: Partial<BusinessIdentity> = req.body;

        await businessTwin.updateIdentity(locationId, identity);

        res.json({ success: true, message: 'Identity updated' });

    } catch (error: any) {
        console.error('[Twin API] Update identity error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update Brand Voice
 */
router.put('/:locationId/voice', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const brandVoice: Partial<BrandVoice> = req.body;

        await businessTwin.updateBrandVoice(locationId, brandVoice);

        res.json({ success: true, message: 'Brand voice updated' });

    } catch (error: any) {
        console.error('[Twin API] Update voice error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Add knowledge fact
 */
router.post('/:locationId/knowledge', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { category, fact, source, sourceType, confidence } = req.body;

        if (!category || !fact) {
            return res.status(400).json({ error: 'category and fact are required' });
        }

        const id = await businessTwin.addKnowledge({
            locationId,
            category,
            fact,
            source: source || 'manual_entry',
            sourceType: sourceType || 'manual',
            confidence: confidence || 100
        });

        res.status(201).json({ success: true, id });

    } catch (error: any) {
        console.error('[Twin API] Add knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get knowledge base (optionally filtered by category)
 */
router.get('/:locationId/knowledge', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { category } = req.query;

        const knowledge = await businessTwin.getKnowledge(
            locationId,
            category as string | undefined
        );

        res.json({ knowledge });

    } catch (error: any) {
        console.error('[Twin API] Get knowledge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Add constraint
 */
router.post('/:locationId/constraints', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { type, rule, reason, severity, appliesTo } = req.body;

        if (!type || !rule) {
            return res.status(400).json({ error: 'type and rule are required' });
        }

        await businessTwin.upsertConstraint(locationId, {
            type,
            rule,
            reason,
            severity: severity || 'medium',
            appliesTo: appliesTo || ['*']
        });

        res.status(201).json({ success: true });

    } catch (error: any) {
        console.error('[Twin API] Add constraint error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Add SOP
 */
router.post('/:locationId/sops', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { name, description, triggerConditions, steps, appliesTo, priority } = req.body;

        if (!name || !steps) {
            return res.status(400).json({ error: 'name and steps are required' });
        }

        const id = await businessTwin.upsertSOP(locationId, {
            name,
            description: description || '',
            triggerConditions: triggerConditions || [],
            steps,
            appliesTo: appliesTo || ['*'],
            priority: priority || 50,
            isActive: true
        });

        res.status(201).json({ success: true, id });

    } catch (error: any) {
        console.error('[Twin API] Add SOP error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update content guidelines (AEO/GEO/SEO)
 */
router.put('/:locationId/content-guidelines', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const guidelines: Partial<ContentGuidelines> = req.body;

        await businessTwin.updateContentGuidelines(locationId, guidelines);

        res.json({ success: true, message: 'Content guidelines updated' });

    } catch (error: any) {
        console.error('[Twin API] Update guidelines error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update agent config
 */
router.put('/:locationId/agents/:role', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, role } = req.params;
        const config = req.body;

        await businessTwin.updateAgentConfig(locationId, role, config);

        res.json({ success: true, message: `Agent config for ${role} updated` });

    } catch (error: any) {
        console.error('[Twin API] Update agent config error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate agent context (system prompt additions)
 */
router.get('/:locationId/agents/:role/context', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, role } = req.params;

        const context = await businessTwin.generateAgentContext(locationId, role);

        res.json({ context });

    } catch (error: any) {
        console.error('[Twin API] Generate context error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Scan website and populate knowledge base
 */
router.post('/:locationId/scan', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { domain, maxPages } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'domain is required' });
        }

        // Start the scan (this could be made async for larger sites)
        const result = await knowledgeScraper.fullSiteScan({
            locationId,
            domain,
            maxPages: maxPages || 10
        });

        res.json({
            success: true,
            ...result
        });

    } catch (error: any) {
        console.error('[Twin API] Scan error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get scraped content
 */
router.get('/:locationId/scraped', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        const content = await businessTwin.getScrapedContent(locationId);

        res.json({ content });

    } catch (error: any) {
        console.error('[Twin API] Get scraped error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate AEO questions
 */
router.get('/:locationId/aeo-questions', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        const questions = await knowledgeScraper.generateAEOQuestions(locationId);

        res.json({ questions });

    } catch (error: any) {
        console.error('[Twin API] AEO questions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Mark onboarding complete
 */
router.post('/:locationId/complete-onboarding', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        await businessTwin.completeOnboarding(locationId);

        res.json({ success: true, message: 'Onboarding completed' });

    } catch (error: any) {
        console.error('[Twin API] Complete onboarding error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Initialize twin with default SOPs, constraints, and agent configs
 * Call this after creating the twin to set up all the operational rules
 */
router.post('/:locationId/initialize-defaults', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;
        const { selectedRoles } = req.body; // e.g., ['marketing', 'sales', 'support']

        const roles = selectedRoles || ['marketing', 'sales', 'support', 'operations', 'manager', 'assistant'];
        let sopsAdded = 0;
        let constraintsAdded = 0;
        let agentsConfigured = 0;

        // 1. Add default constraints
        for (const constraint of defaultConstraints) {
            await businessTwin.upsertConstraint(locationId, constraint);
            constraintsAdded++;
        }

        // 2. Add SOPs for each selected role
        for (const role of roles) {
            const sops = getSOPsForRole(role);
            for (const sop of sops) {
                await businessTwin.upsertSOP(locationId, sop);
                sopsAdded++;
            }
        }

        // 3. Configure agents for each selected role
        for (const role of roles) {
            const config = defaultAgentConfigs[role];
            if (config) {
                await businessTwin.updateAgentConfig(locationId, role, {
                    role,
                    ...config
                });
                agentsConfigured++;
            }
        }

        res.json({
            success: true,
            initialized: {
                constraints: constraintsAdded,
                sops: sopsAdded,
                agents: agentsConfigured,
                roles
            }
        });

    } catch (error: any) {
        console.error('[Twin API] Initialize defaults error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Full onboarding flow - creates twin, scans website, initializes defaults
 * This is the all-in-one endpoint for the onboarding UI
 */
router.post('/onboard', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            locationId,
            crmType,
            identity,
            brandVoice,
            domain,
            selectedRoles,
            goals,
            painPoints
        } = req.body;

        if (!locationId || !crmType) {
            return res.status(400).json({ error: 'locationId and crmType are required' });
        }

        const results: any = {
            steps: []
        };

        // Step 1: Create Business Twin
        const twin = await businessTwin.create({
            locationId,
            crmType,
            identity: identity || {}
        });
        results.steps.push({ step: 'create_twin', success: true });
        results.twinId = twin.id;

        // Step 2: Update brand voice if provided
        if (brandVoice) {
            await businessTwin.updateBrandVoice(locationId, brandVoice);
            results.steps.push({ step: 'set_brand_voice', success: true });
        }

        // Step 3: Add goals and pain points as knowledge
        if (goals) {
            await businessTwin.addKnowledge({
                locationId,
                category: 'company',
                fact: `Business goals: ${goals}`,
                source: 'onboarding',
                sourceType: 'manual',
                confidence: 100
            });
        }

        if (painPoints) {
            await businessTwin.addKnowledge({
                locationId,
                category: 'company',
                fact: `Key challenges: ${painPoints}`,
                source: 'onboarding',
                sourceType: 'manual',
                confidence: 100
            });
        }

        // Step 4: Scan website if domain provided
        if (domain) {
            try {
                const scanResult = await knowledgeScraper.fullSiteScan({
                    locationId,
                    domain,
                    maxPages: 10
                });
                results.steps.push({
                    step: 'scan_website',
                    success: true,
                    pagesScraped: scanResult.pagesScraped,
                    factsExtracted: scanResult.factsExtracted
                });
            } catch (scanError: any) {
                results.steps.push({
                    step: 'scan_website',
                    success: false,
                    error: scanError.message
                });
            }
        }

        // Step 5: Initialize default SOPs, constraints, and agent configs
        const roles = selectedRoles || ['marketing', 'sales', 'support'];
        let sopsAdded = 0;
        let constraintsAdded = 0;

        for (const constraint of defaultConstraints) {
            await businessTwin.upsertConstraint(locationId, constraint);
            constraintsAdded++;
        }

        for (const role of roles) {
            const sops = getSOPsForRole(role);
            for (const sop of sops) {
                await businessTwin.upsertSOP(locationId, sop);
                sopsAdded++;
            }

            const config = defaultAgentConfigs[role];
            if (config) {
                await businessTwin.updateAgentConfig(locationId, role, {
                    role,
                    ...config
                });
            }
        }

        results.steps.push({
            step: 'initialize_defaults',
            success: true,
            sops: sopsAdded,
            constraints: constraintsAdded,
            roles
        });

        // Step 6: Mark onboarding complete
        await businessTwin.completeOnboarding(locationId);
        results.steps.push({ step: 'complete_onboarding', success: true });

        results.success = true;
        results.message = 'Business Twin created and initialized successfully';

        res.status(201).json(results);

    } catch (error: any) {
        console.error('[Twin API] Onboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
