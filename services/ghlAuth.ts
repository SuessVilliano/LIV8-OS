
import { VaultToken } from "../types";
import { AuthError } from "./errors";
import { logger } from "./logger";

/**
 * Verifies the manually entered API Key and creates a session token.
 * In a real app, this would make a test request to GHL API to validate credentials.
 */
export const verifyManualConnection = async (locationId: string, apiKey: string): Promise<VaultToken> => {
  logger.info(`[Auth] Verifying manual credentials for ${locationId}`);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Basic validation
      if (!locationId || locationId.length < 5) {
        reject(new AuthError("Invalid Location ID format."));
        return;
      }

      if (!apiKey || apiKey.length < 10) {
        reject(new AuthError("API Key appears to be invalid (too short)."));
        return;
      }

      logger.info("[Auth] Credentials verified (simulated).");
      
      resolve({
        accessToken: apiKey,
        refreshToken: "", // Static keys do not expire/refresh in the same way
        expiresAt: Date.now() + (3650 * 24 * 60 * 60 * 1000), // 10 years from now (essentially never expires for this session)
        scope: "manual_full_access"
      });
    }, 1200);
  });
};

/**
 * Refreshes token if a refresh token exists.
 * For manual static keys, this simply returns the current token if possible, or throws if strictly required.
 */
export const refreshAuthToken = async (refreshToken: string): Promise<VaultToken> => {
  if (!refreshToken) {
    throw new AuthError("No refresh token available for this session type.");
  }
  
  // This would only be used if we implemented full OAuth later
  return {
    accessToken: `ghl_access_${Math.random().toString(36).substring(2)}`,
    refreshToken: `ghl_refresh_${Math.random().toString(36).substring(2)}`,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), 
    scope: "refreshed_scope"
  };
};
