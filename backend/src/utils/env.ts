// GHL-AGENTS/backend/src/utils/env.ts
// This file centralizes environment variable access, making them type-safe and providing defaults.

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Helper function to get an environment variable with optional default
// No longer throws - returns empty string if not found (graceful degradation)
function getEnv(key: string, defaultValue: string = ''): string {
    const value = process.env[key];
    if (value === undefined && defaultValue === '') {
        console.warn(`⚠️ Environment variable ${key} is not set.`);
    }
    return value || defaultValue;
}

// Helper to check if required env vars are configured
export function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
    const required = ['POSTGRES_URL', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    return { valid: missing.length === 0, missing };
}

// Database
export const POSTGRES_URL = getEnv('POSTGRES_URL');

// Authentication
export const JWT_SECRET = getEnv('JWT_SECRET');

// Gemini AI
export const GEMINI_API_KEY = getEnv('GEMINI_API_KEY');

// GHL API (for testing - real tokens stored encrypted in DB)
export const GHL_TEST_TOKEN = getEnv('GHL_TEST_TOKEN', '');
export const GHL_TEST_LOCATION_ID = getEnv('GHL_TEST_LOCATION_ID', '');

// HighLevel MCP Endpoint
export const HIGHLEVEL_MCP_URL = getEnv('HIGHLEVEL_MCP_URL', 'https://services.leadconnectorhq.com/mcp/');

// Vbout.com Integration
export const VBOUT_API_KEY = getEnv('VBOUT_API_KEY', '');
export const VBOUT_APP_KEY = getEnv('VBOUT_APP_KEY', ''); // Vbout App Key (Client ID)
export const VBOUT_OAUTH_TOKEN = getEnv('VBOUT_OAUTH_TOKEN', '');
export const VBOUT_CLIENT_SECRET = getEnv('VBOUT_CLIENT_SECRET', '');

// Server
export const PORT = parseInt(getEnv('PORT', '3001'), 10);
export const NODE_ENV = getEnv('NODE_ENV', 'development');

// TaskMagic Integration
export const TASKMAGIC_WEBHOOK_URL = getEnv('TASKMAGIC_WEBHOOK_URL', '');
export const TASKMAGIC_MCP_TOKEN = getEnv('TASKMAGIC_MCP_TOKEN', '');
