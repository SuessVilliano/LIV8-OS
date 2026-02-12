
import type { VaultToken } from "../types";
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
 * Refreshes the OS JWT token via the backend /api/auth/refresh endpoint.
 * For GHL API keys (manual static keys), no refresh is needed — they don't expire.
 * This handles the LIV8 OS session token refresh.
 */
export const refreshAuthToken = async (currentToken: string): Promise<VaultToken> => {
  if (!currentToken) {
    throw new AuthError("No token available for refresh.");
  }

  try {
    // Import dynamically to avoid circular dependency
    const { getBackendUrl } = await import('./api');
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      }
    });

    if (!response.ok) {
      throw new AuthError("Token refresh failed. Please log in again.");
    }

    const data = await response.json();
    logger.info("[Auth] Token refreshed successfully.");

    // Store the new token
    localStorage.setItem('os_token', data.token);

    return {
      accessToken: data.token,
      refreshToken: data.token, // OS uses single-token model
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days (matches backend JWT_EXPIRES_IN)
      scope: "full_access"
    };
  } catch (error: any) {
    logger.error("[Auth] Token refresh failed:", error);
    throw new AuthError("Session expired. Please log in again.", error);
  }
};
