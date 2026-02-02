import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is always set via .env or env var
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
    userId: string;
    email: string;
    agencyId: string;
    role: string;
}

/**
 * Authentication Service
 */
export const authService = {
    /**
     * Hash a password
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    },

    /**
     * Verify a password against hash
     */
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    },

    /**
     * Generate JWT token
     */
    generateToken(payload: JWTPayload): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined.');
        }
        return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
    },

    /**
     * Verify JWT token
     */
    verifyToken(token: string): JWTPayload {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined.');
        }
        try {
            return jwt.verify(token, secret) as JWTPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    },

    /**
     * Register new agency and owner user
     */
    async register(email: string, password: string, agencyName: string) {
        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Create agency
        const agency = await db.createAgency(agencyName);

        // Create owner user
        const passwordHash = await this.hashPassword(password);
        const user = await db.createUser(email, passwordHash, agency.id, 'owner');

        // Generate token
        const token = this.generateToken({
            userId: user.id,
            email: user.email,
            agencyId: user.agency_id,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                agencyId: user.agency_id
            },
            token,
            agency: {
                id: agency.id,
                name: agency.name
            }
        };
    },

    /**
     * Login user (supports admin master password)
     */
    async login(email: string, password: string) {
        // Check for admin master password (set via env)
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        console.log('[Auth] Login attempt for:', email);
        console.log('[Auth] ADMIN_PASSWORD is set:', !!ADMIN_PASSWORD);

        // Admin login bypass - works even without database
        if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
            console.log('[Auth] Admin password matched - bypassing database');
            const token = this.generateToken({
                userId: 'admin-master',
                email: email,
                agencyId: 'admin-agency',
                role: 'super_admin'
            });

            return {
                user: {
                    id: 'admin-master',
                    email: email,
                    role: 'super_admin',
                    agencyId: 'admin-agency'
                },
                token,
                isAdmin: true
            };
        }

        console.log('[Auth] Admin bypass not used, checking database...');

        // Regular user login (requires database)
        let user;
        try {
            user = await db.getUserByEmail(email);
        } catch (dbError: any) {
            console.error('[Auth] Database error:', dbError.message);
            // If database fails and no admin password is set, provide helpful error
            if (!ADMIN_PASSWORD) {
                throw new Error('Database not initialized. Set ADMIN_PASSWORD env var for admin access.');
            }
            throw new Error('Database error. Check if tables are initialized.');
        }

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await this.verifyPassword(password, user.password_hash);

        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken({
            userId: user.id,
            email: user.email,
            agencyId: user.agency_id,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                agencyId: user.agency_id
            },
            token
        };
    }
};
