import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                agencyId: string;
                role: string;
            };
        }
    }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const decoded = authService.verifyToken(token);

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            agencyId: decoded.agencyId,
            role: decoded.role
        };

        next();
    } catch (error: any) {
        console.error('Authentication error:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Optional authentication middleware
 * Allows requests without token but attaches user if present
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = authService.verifyToken(token);
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    agencyId: decoded.agencyId,
                    role: decoded.role
                };
            }
        }

        next();
    } catch (error) {
        // Token invalid but continue anyway for optional auth
        next();
    }
};
