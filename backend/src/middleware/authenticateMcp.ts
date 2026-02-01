import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js'; // Assuming db is exported
// Note: Agency and Location schemas would need to be defined if used

// Extend the Request object to include user property
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
            email: string;
            ghlToken?: string;
            ghlLocationId?: string;
            agencyId?: string;
        };
    }
}

export const authenticateMcp = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token not provided.' });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined in environment variables.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string; email: string; agencyId: string };

        // Retrieve the GHL location ID. For now, we'll try to use a default or the first one for the agency.
        // In a more sophisticated setup, the MCP call could include a 'locationId' argument
        // or the user's preference could be stored.
        const ghlLocations = await db.getLocationsByAgency(decoded.agencyId);

        if (ghlLocations.length === 0) {
            return res.status(401).json({ error: 'No GHL locations found for this agency.' });
        }

        // For simplicity, use the first available location.
        // TODO: Implement logic to select a specific location if multiple exist.
        const primaryGhlLocation = ghlLocations[0];
        const ghlAccessToken = await db.getLocationToken(primaryGhlLocation.ghl_location_id);

        if (!ghlAccessToken) {
            return res.status(401).json({ error: 'GHL access token not found for the primary location.' });
        }

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            agencyId: decoded.agencyId,
            ghlToken: ghlAccessToken,
            ghlLocationId: primaryGhlLocation.ghl_location_id,
        };

        next();
    } catch (error) {
        console.error('JWT verification failed or GHL token retrieval error:', error);
        return res.status(403).json({ error: 'Invalid or expired token, or GHL access issue.' });
    }
};
