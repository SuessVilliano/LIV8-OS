import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { brandScanner } from '../services/brand-scanner.js';
import { snapshotBuilder } from '../services/snapshot-builder.js';
import { db } from '../db/index.js';

const router = express.Router();

/**
 * Middleware: Verify JWT
 */
const authenticate = (req: Request, res: Response, next: any) => {
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
 * POST /api/setup/scan-brand
 * Scan website and extract brand identity
 */
router.post('/scan-brand', authenticate, async (req: Request, res: Response) => {
    try {
        const { websiteUrl } = req.body;

        if (!websiteUrl) {
            return res.status(400).json({ error: 'websiteUrl required' });
        }

        const brandBrain = await brandScanner.scanWebsite(websiteUrl);
        const aeoScore = brandScanner.calculateAEOScore(brandBrain);

        res.json({
            brandBrain,
            aeoScore
        });

    } catch (error: any) {
        console.error('[Setup API] Brand scan error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/setup/generate-build-plan
 * Generate complete build plan from brand brain
 */
router.post('/generate-build-plan', authenticate, async (req: Request, res: Response) => {
    try {
        const { brandBrain, selectedStaff, goals, locationId } = req.body;

        if (!brandBrain || !selectedStaff || !goals || !locationId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const buildPlan = await snapshotBuilder.generateBuildPlan(
            brandBrain,
            selectedStaff,
            goals,
            locationId
        );

        res.json({ buildPlan });

    } catch (error: any) {
        console.error('[Setup API] Build plan generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/setup/deploy
 * Deploy build plan to GHL location
 */
router.post('/deploy', authenticate, async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
        const { buildPlan, locationId } = req.body;

        if (!buildPlan || !locationId) {
            return res.status(400).json({ error: 'Missing buildPlan or locationId' });
        }

        // Get GHL token for this location
        const ghlToken = await db.getLocationToken(locationId);

        if (!ghlToken) {
            return res.status(404).json({ error: 'Location not connected. Please connect GHL location first.' });
        }

        // Deploy the build plan
        const result = await snapshotBuilder.deployBuildPlan(
            buildPlan,
            locationId,
            ghlToken
        );

        // Log the deployment
        await db.logAction(
            user.userId,
            user.agencyId,
            locationId,
            'deploy_build_plan',
            'setup.deploy',
            { buildPlan: buildPlan.summary },
            result,
            result.success ? 'success' : 'failure',
            result.errors.length > 0 ? JSON.stringify(result.errors) : undefined
        );

        res.json(result);

    } catch (error: any) {
        console.error('[Setup API] Deployment error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/setup/save-brand-brain
 * Save brand brain to database
 */
router.post('/save-brand-brain', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId, brandBrain } = req.body;

        if (!locationId || !brandBrain) {
            return res.status(400).json({ error: 'Missing locationId or brandBrain' });
        }

        await db.saveBrandBrain(locationId, brandBrain);

        res.json({ success: true, message: 'Brand brain saved' });

    } catch (error: any) {
        console.error('[Setup API] Save brand brain error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/setup/brand-brain/:locationId
 * Get brand brain from database
 */
router.get('/brand-brain/:locationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { locationId } = req.params;

        if (!locationId) {
            return res.status(400).json({ error: 'Missing locationId' });
        }

        const brandBrain = await db.getBrandBrain(locationId);

        res.json({ brandBrain });

    } catch (error: any) {
        console.error('[Setup API] Get brand brain error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/setup/staff-templates
 * Get available AI staff templates
 */
router.get('/staff-templates', (req: Request, res: Response) => {
    const templates = [
        {
            key: 'AI_RECEPTIONIST',
            label: 'AI Receptionist',
            description: 'Answers inbound calls 24/7, handles FAQs, filters spam',
            recommended: true,
            icon: '📞'
        },
        {
            key: 'MISSED_CALL_RECOVERY',
            label: 'Missed Call Recovery',
            description: 'Instantly texts back missed calls to save the lead',
            recommended: true,
            icon: '💬'
        },
        {
            key: 'REVIEW_COLLECTOR',
            label: 'Review Collector',
            description: 'Automatically requests reviews after successful service',
            recommended: true,
            icon: '⭐'
        },
        {
            key: 'LEAD_QUALIFIER',
            label: 'Lead Qualifier',
            description: 'Asks qualification questions via SMS/IG before booking',
            recommended: false,
            icon: '🎯'
        },
        {
            key: 'BOOKING_ASSISTANT',
            label: 'Booking Assistant',
            description: 'Negotiates times and books directly to your calendar',
            recommended: false,
            icon: '📅'
        },
        {
            key: 'REENGAGEMENT_AGENT',
            label: 'Re-engagement Agent',
            description: 'Wakes up cold leads from 90+ days ago',
            recommended: false,
            icon: '🔄'
        }
    ];

    res.json({ templates });
});

export default router;
