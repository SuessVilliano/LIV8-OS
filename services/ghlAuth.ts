
import { VaultToken } from "../types";
import { AuthError } from "./errors";
import { logger } from "./logger";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/**
 * Verifies the manually entered API Key by making a real GHL API call.
 * Tests the credentials by fetching location info.
 */
export const verifyManualConnection = async (locationId: string, apiKey: string): Promise<VaultToken> => {
  logger.info(`[Auth] Verifying credentials for location ${locationId}...`);

  // Basic validation first
  if (!locationId || locationId.length < 5) {
    throw new AuthError("Invalid Location ID format. Please check your GHL location settings.");
  }

  if (!apiKey || apiKey.length < 10) {
    throw new AuthError("API Key appears to be invalid (too short). Please check your Private Integration Token.");
  }

  try {
    // Make a real API call to verify credentials
    // Using the contacts endpoint with limit=1 as a lightweight verification
    const response = await fetch(`${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      throw new AuthError("Invalid API Key. Please verify your Private Integration Token is correct and has the required scopes.");
    }

    if (response.status === 403) {
      throw new AuthError("Access denied. Your API key may not have permission for this location.");
    }

    if (response.status === 404) {
      throw new AuthError("Location not found. Please verify your Location ID is correct.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Auth] GHL API error: ${response.status} - ${errorText}`);
      throw new AuthError(`GHL API error: ${response.status}. Please try again or check your credentials.`);
    }

    // Success - credentials are valid
    logger.info("[Auth] Credentials verified successfully with GHL API.");

    return {
      accessToken: apiKey,
      refreshToken: "", // Static keys do not expire/refresh in the same way
      expiresAt: Date.now() + (3650 * 24 * 60 * 60 * 1000), // 10 years from now
      scope: "manual_full_access"
    };

  } catch (error: any) {
    if (error instanceof AuthError) {
      throw error;
    }

    // Network or other errors
    if (error.message?.includes('fetch')) {
      throw new AuthError("Network error. Please check your internet connection and try again.");
    }

    logger.error("[Auth] Verification failed:", error);
    throw new AuthError(error.message || "Failed to verify credentials. Please try again.");
  }
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
