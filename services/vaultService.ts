
import { VaultToken } from "../types";
import { refreshAuthToken } from "./ghlAuth";
import { AuthError, AppError } from "./errors";
import { logger } from "./logger";

const VAULT_KEY_PREFIX = "liv8_vault_v1_";
const CLIENT_SECRET_MOCK = "liv8_internal_secret_key_change_in_prod";

const encrypt = (text: string): string => {
  try {
    const xor = text.split('').map((c, i) => 
      String.fromCharCode(c.charCodeAt(0) ^ CLIENT_SECRET_MOCK.charCodeAt(i % CLIENT_SECRET_MOCK.length))
    ).join('');
    return btoa(xor);
  } catch (e) {
    throw new AppError("Encryption failed during token storage", "AUTH", e);
  }
};

const decrypt = (cipher: string): string => {
  try {
    const xor = atob(cipher);
    return xor.split('').map((c, i) => 
      String.fromCharCode(c.charCodeAt(0) ^ CLIENT_SECRET_MOCK.charCodeAt(i % CLIENT_SECRET_MOCK.length))
    ).join('');
  } catch (e) {
    throw new AuthError("Failed to decrypt stored credentials.", e);
  }
};

export const saveToken = (locationId: string, token: VaultToken): void => {
  if (!locationId || !token) {
    logger.error("[Vault] Missing locationId or token for save");
    return;
  }
  
  try {
    const payload = JSON.stringify(token);
    const encrypted = encrypt(payload);
    localStorage.setItem(`${VAULT_KEY_PREFIX}${locationId}`, encrypted);
    logger.info(`[Vault] Credentials saved for ${locationId}`);
  } catch (e) {
    logger.error("[Vault] Save failed. Storage might be full or disabled.", e);
  }
};

export const clearToken = (locationId: string): void => {
  try {
    localStorage.removeItem(`${VAULT_KEY_PREFIX}${locationId}`);
    logger.info(`[Vault] Cleared credentials for ${locationId}`);
  } catch (e) {
    logger.warn("[Vault] Failed to clear token", e);
  }
};

export const getToken = async (locationId: string): Promise<VaultToken | null> => {
  if (!locationId) return null;

  let encrypted: string | null = null;
  try {
    encrypted = localStorage.getItem(`${VAULT_KEY_PREFIX}${locationId}`);
  } catch (e) {
    logger.error("[Vault] LocalStorage access denied", e);
    return null;
  }

  if (!encrypted) return null;

  let token: VaultToken;

  // 1. Decrypt
  try {
    const decrypted = decrypt(encrypted);
    token = JSON.parse(decrypted) as VaultToken;
  } catch (e) {
    logger.warn(`[Vault] Corrupt token data for ${locationId}. Clearing.`);
    clearToken(locationId);
    return null;
  }
  
  // 2. Check Expiration & Refresh
  const SAFETY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
  
  if (Date.now() > (token.expiresAt - SAFETY_BUFFER_MS)) {
    // If it's a static key (no refresh token), we check if it is expired. 
    // Usually static keys have very long expiresAt set during creation.
    if (!token.refreshToken) {
         // If a static key is expired, it means the forced expiry date passed (e.g. 10 years).
         // Or the system clock is wrong.
         logger.warn("[Vault] Static token expired.");
         clearToken(locationId);
         throw new AuthError("Session expired. Please reconnect.");
    }

    logger.info("[Vault] Token expired or nearing expiration. Attempting refresh...");
    
    try {
      const newToken = await refreshAuthToken(token.refreshToken);
      saveToken(locationId, newToken);
      logger.info("[Vault] Token refreshed successfully.");
      return newToken;
    } catch (refreshError) {
      logger.error("[Vault] Token refresh failed", refreshError);
      
      clearToken(locationId); 
      throw new AuthError("Session expired. Please reconnect.", refreshError);
    }
  }
  
  return token;
};

export const hasValidToken = async (locationId: string): Promise<boolean> => {
  try {
    const token = await getToken(locationId);
    return !!token;
  } catch (e) {
    return false;
  }
};
