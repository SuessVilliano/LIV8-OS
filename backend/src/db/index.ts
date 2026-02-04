import { sql, db as vercelDb } from '@vercel/postgres';
import * as crypto from 'crypto';

// Query function for raw SQL queries with parameters
export async function query(text: string, params?: any[]) {
  // Use tagged template for simple queries, or raw query for complex ones
  if (params && params.length > 0) {
    return vercelDb.query(text, params);
  }
  return vercelDb.query(text);
}

// Get a client from the connection pool for transactions
export async function getClient() {
  return vercelDb.connect();
}

// Re-export agent sessions for convenience
export { agentSessions } from './agent-sessions.js';
export type { AgentSession, AgentEvent, AgentSessionStatus } from './agent-sessions.js';

// Re-export business twin for convenience
export { businessTwin } from './business-twin.js';
export type { BusinessTwin, BusinessIdentity, BrandVoice, VerifiedFact, Constraint, SOP, ContentGuidelines, AgentConfig } from './business-twin.js';

// Check if database is configured
const isDatabaseConfigured = (): boolean => !!process.env.POSTGRES_URL;

// Encryption helpers for GHL tokens
const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fallback-key', 'salt', 32);

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Helper to check database availability before operations
function requireDatabase(operation: string): void {
  if (!isDatabaseConfigured()) {
    throw new Error(`Database not configured. Cannot perform ${operation}. Please set POSTGRES_URL environment variable.`);
  }
}

// Database query helpers
export const db = {
  // Check if database is available
  isConfigured: isDatabaseConfigured,

  // User operations
  async createUser(email: string, passwordHash: string, agencyId: string, role: string = 'operator') {
    requireDatabase('createUser');
    const result = await sql`
      INSERT INTO users (email, password_hash, agency_id, role)
      VALUES (${email}, ${passwordHash}, ${agencyId}, ${role})
      RETURNING id, email, role, agency_id, created_at
    `;
    return result.rows[0];
  },

  async getUserByEmail(email: string) {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    return result.rows[0];
  },

  async getUserById(userId: string) {
    const result = await sql`
      SELECT id, email, role, agency_id, created_at 
      FROM users WHERE id = ${userId}
    `;
    return result.rows[0];
  },

  // Agency operations
  async createAgency(name: string) {
    const result = await sql`
      INSERT INTO agencies (name)
      VALUES (${name})
      RETURNING id, name, created_at
    `;
    return result.rows[0];
  },

  // GHL Location operations
  async saveLocation(agencyId: string, ghlLocationId: string, name: string, accessToken: string) {
    const encrypted = encryptToken(accessToken);

    const result = await sql`
      INSERT INTO ghl_locations (agency_id, ghl_location_id, name, encrypted_access_token)
      VALUES (${agencyId}, ${ghlLocationId}, ${name}, ${encrypted})
      ON CONFLICT (ghl_location_id) 
      DO UPDATE SET 
        encrypted_access_token = ${encrypted},
        name = ${name},
        updated_at = NOW()
      RETURNING id, ghl_location_id, name
    `;
    return result.rows[0];
  },

  async getLocationToken(ghlLocationId: string): Promise<string | null> {
    const result = await sql`
      SELECT encrypted_access_token FROM ghl_locations 
      WHERE ghl_location_id = ${ghlLocationId}
    `;

    if (result.rows.length === 0) return null;

    return decryptToken(result.rows[0].encrypted_access_token);
  },

  async getLocationsByAgency(agencyId: string) {
    const result = await sql`
      SELECT id, ghl_location_id, name, created_at 
      FROM ghl_locations 
      WHERE agency_id = ${agencyId}
      ORDER BY created_at DESC
    `;
    return result.rows;
  },

  // Audit log
  async logAction(
    userId: string,
    agencyId: string,
    locationId: string,
    actionType: string,
    toolName: string,
    input: any,
    output: any,
    status: 'success' | 'failure',
    errorMessage?: string
  ) {
    await sql`
      INSERT INTO audit_log 
        (user_id, agency_id, location_id, action_type, tool_name, input, output, status, error_message)
      VALUES 
        (${userId}, ${agencyId}, ${locationId}, ${actionType}, ${toolName}, 
         ${JSON.stringify(input)}, ${JSON.stringify(output)}, ${status}, ${errorMessage || null})
    `;
  },

  async getAuditLogs(agencyId: string, limit: number = 100) {
    const result = await sql`
      SELECT 
        a.id, a.action_type, a.tool_name, a.status, a.timestamp,
        u.email as user_email, a.location_id
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.agency_id = ${agencyId}
      ORDER BY a.timestamp DESC
      LIMIT ${limit}
    `;
    return result.rows;
  },

  // Brand Brain operations
  async getBrandBrain(ghlLocationId: string) {
    const result = await sql`
      SELECT brain_data FROM brand_brains 
      WHERE location_id = ${ghlLocationId}
    `;
    return result.rows[0]?.brain_data || null;
  },

  async saveBrandBrain(ghlLocationId: string, brainData: any) {
    const result = await sql`
      INSERT INTO brand_brains (location_id, brain_data)
      VALUES (${ghlLocationId}, ${JSON.stringify(brainData)})
      ON CONFLICT (location_id) 
      DO UPDATE SET 
        brain_data = ${JSON.stringify(brainData)},
        updated_at = NOW()
      RETURNING id
    `;
    return result.rows[0];
  }
};
