import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { db } from '../db/index.js';
import { initializeTables } from '../db/init-tables.js';

const router = express.Router();

/**
 * POST /api/auth/init-db
 * Initialize database tables (admin only)
 */
router.post('/init-db', async (req: Request, res: Response) => {
    try {
        // Check for admin password
        const adminPassword = req.headers['x-admin-password'] || req.body.adminPassword;
        if (adminPassword !== process.env.ADMIN_PASSWORD) {
            return res.status(403).json({ error: 'Admin password required' });
        }

        const result = await initializeTables();
        res.json({ success: true, message: 'Database tables initialized', result });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/auth/register
 * Register new agency and owner user
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, agencyName } = req.body;

        if (!email || !password || !agencyName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await authService.register(email, password, agencyName);

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/login
 * Login user and get JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        const result = await authService.login(email, password);

        res.json(result);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

/**
 * POST /api/auth/connect-location
 * Save GHL location PIT token (encrypted in database)
 */
router.post('/connect-location', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);

        const { locationId, locationName, ghlToken } = req.body;

        if (!locationId || !ghlToken) {
            return res.status(400).json({ error: 'Missing locationId or ghlToken' });
        }

        // Save location with encrypted token
        const location = await db.saveLocation(
            payload.agencyId,
            locationId,
            locationName || 'Unnamed Location',
            ghlToken
        );

        res.json({
            success: true,
            location: {
                id: location.id,
                ghlLocationId: location.ghl_location_id,
                name: location.name
            }
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);

        // Handle admin users (no database record needed)
        if (payload.role === 'super_admin') {
            return res.json({
                user: {
                    id: payload.userId,
                    email: payload.email,
                    role: payload.role,
                    agencyId: payload.agencyId
                },
                locations: [],
                isAdmin: true
            });
        }

        const user = await db.getUserById(payload.userId);
        const locations = await db.getLocationsByAgency(payload.agencyId);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                agencyId: user.agency_id
            },
            locations
        });
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (issues new token if current one is still valid)
 */
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);

        // Issue a fresh token with the same claims
        const newToken = authService.generateToken({
            userId: payload.userId,
            email: payload.email,
            agencyId: payload.agencyId,
            role: payload.role
        });

        res.json({
            token: newToken,
            user: {
                id: payload.userId,
                email: payload.email,
                role: payload.role,
                agencyId: payload.agencyId
            }
        });
    } catch (error: any) {
        res.status(401).json({ error: 'Token expired or invalid. Please log in again.' });
    }
});

/**
 * POST /api/auth/logout
 * Server-side logout acknowledgment.
 * Note: JWT tokens are stateless, so this primarily serves as a signal.
 * In production, add the token to a blocklist (Redis) for remaining TTL.
 */
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // TODO: In production, add token to Redis blocklist
            // await redis.setex(`blocklist:${token}`, JWT_EXPIRES_IN_SECONDS, '1');
            console.log('[Auth] Logout acknowledged, token should be discarded by client');
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
        // Logout should never fail from the client's perspective
        res.json({ success: true, message: 'Logged out' });
    }
});

export default router;
