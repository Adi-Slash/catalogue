import type { UserPreferences } from '../types/userPreferences';
import { getSWALinkingInstructions } from './swaProxyHelper';

// Determine a sensible default API base:
// - In local development, talk to the mock server on http://localhost:4000
// - In Azure Static Web Apps, try Static Web Apps proxy first, fallback to direct Functions URL
// - The Static Web App MUST be linked to the Functions app in Azure Portal for proxy to work
const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const FUNCTIONS_DIRECT_URL = 'https://func-api-ak-aai-003.azurewebsites.net';
const DEFAULT_API_BASE = isLocalDev
  ? 'http://localhost:4000'
  : typeof window !== 'undefined'
  ? window.location.origin // Use Static Web Apps proxy (will fallback to direct if proxy fails)
  : FUNCTIONS_DIRECT_URL;

const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
// Azure Functions v4 adds /api prefix to routes, but the local mock server does not
// When using Static Web Apps proxy, also use /api prefix
const API_PREFIX = API_BASE.includes('localhost') ? '' : '/api';

async function handleRes(res: Response) {
  if (!res.ok) {
    let errorMessage = `${res.status} ${res.statusText}`;
    let errorData: any = null;
    
    // Check content type to determine if response is JSON or HTML
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    try {
      if (isJson) {
        errorData = await res.json();
        console.error('[UserPreferences] API Error Response (JSON):', errorData);
        if (errorData.error) {
          errorMessage = errorData.error;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
          if (errorData.code) {
            errorMessage += ` (code: ${errorData.code})`;
          }
        }
      } else {
        // Response is likely HTML (404 page from Static Web Apps)
        const text = await res.text();
        console.error('[UserPreferences] API Error Response (HTML/text):', text.substring(0, 200));
        
        if (res.status === 404) {
          errorMessage = `404 Not Found - The API endpoint /api/user/preferences was not found. ` +
            `This usually means: 1) Functions app is not deployed with getUserPreferences/updateUserPreferences functions, ` +
            `or 2) Static Web Apps is not linked to Functions app in Azure Portal. ` +
            `Check Application Insights for function invocations.`;
        } else {
          errorMessage = `${errorMessage}: ${text.substring(0, 100)}`;
        }
      }
    } catch (parseError) {
      console.error('[UserPreferences] Failed to parse error response:', parseError);
      errorMessage = `${errorMessage} - Could not parse response`;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).errorData = errorData;
    (error as any).isHtmlResponse = !isJson && res.status === 404;
    throw error;
  }
  return res.json();
}

export async function getUserPreferences(userId?: string): Promise<UserPreferences> {
  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const isProduction = !isLocalDev && typeof window !== 'undefined';
  
  // Try Static Web Apps proxy first, then fallback to direct Functions URL
  const tryProxyFirst = isProduction && API_BASE === window.location.origin;
  
  let url = `${API_BASE}${API_PREFIX}/user/preferences`;
  let headers: HeadersInit = {};
  
  // For local dev, send userId as x-household-id header
  if (isLocalDev && userId) {
    headers['x-household-id'] = userId;
  }
  
  // SECURITY: In production, we MUST use SWA proxy which validates tokens.
  // Direct calls to Functions URL are NOT allowed in production as they bypass token validation.
  // If proxy fails, we return defaults rather than making insecure direct calls.
  
  console.log('[UserPreferences] Fetching preferences from:', url, 'isLocalDev:', isLocalDev, 'userId:', userId, 'tryProxyFirst:', tryProxyFirst);
  console.log('[UserPreferences] Request headers:', headers);
  
  try {
    let res = await fetch(url, {
      headers,
      credentials: 'include', // Include cookies for authentication (Azure)
    });
    console.log('[UserPreferences] Response status:', res.status, res.statusText);
    console.log('[UserPreferences] Response headers:', Object.fromEntries(res.headers.entries()));
    
    // Check if response is HTML (proxy might return HTML 404 page even with 200 status)
    const contentType = res.headers.get('content-type') || '';
    const isHtmlResponse = contentType.includes('text/html');
    
    // SECURITY: If proxy fails, don't fallback to direct calls in production.
    // Direct calls bypass token validation and are insecure.
    // Return default preferences instead.
    if (tryProxyFirst && (res.status === 404 || res.status === 405 || (res.status === 200 && isHtmlResponse))) {
      console.error('[UserPreferences] ⚠️ Static Web Apps proxy failed (status:', res.status, 'isHTML:', isHtmlResponse, ')');
      console.error('[UserPreferences] 🔒 SECURITY: Cannot fallback to direct Functions URL - it bypasses token validation.');
      console.error(getSWALinkingInstructions());
      console.error('[UserPreferences] Returning default preferences. App will work but preferences won\'t persist until SWA is linked.');
      
      // Return default preferences instead of making insecure direct call
      return {
        id: userId || 'unknown',
        userId: userId || 'unknown',
        darkMode: false,
        language: 'en',
        updatedAt: new Date().toISOString(),
      };
    }
    
    // Check for common issues
    if (res.status === 404 || (res.status === 200 && res.headers.get('content-type')?.includes('text/html'))) {
      console.error('[UserPreferences] ⚠️ 404 Not Found or HTML response');
      console.error(getSWALinkingInstructions());
      console.error('[UserPreferences] Returning default preferences. App will work but preferences won\'t persist until SWA is linked.');
      
      // Return default preferences instead of throwing error
      return {
        id: userId || 'unknown',
        userId: userId || 'unknown',
        darkMode: false,
        language: 'en', // Default to English
        updatedAt: new Date().toISOString(),
      };
    }
    
    return handleRes(res);
  } catch (error: any) {
    console.error('[UserPreferences] Network error during fetch:', error);
    console.error('[UserPreferences] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      url: url,
      method: 'GET'
    });
    
    // SECURITY: Don't fallback to direct calls in production - they bypass token validation
    if (tryProxyFirst) {
      console.error('[UserPreferences] Network error - SWA proxy failed and direct calls are not allowed in production.');
      console.error('[UserPreferences] Returning default preferences. Check that SWA is linked to Functions app.');
    }
    
    // If it's a 404 error, return default preferences instead of throwing
    if (error.status === 404) {
      console.warn('[UserPreferences] 404 error - returning default preferences');
      return {
        id: userId || 'unknown',
        userId: userId || 'unknown',
        darkMode: false,
        language: 'en', // Default to English
        updatedAt: new Date().toISOString(),
      };
    }
    
    throw error;
  }
}

export async function updateUserPreferences(preferences: Partial<UserPreferences>, userId?: string): Promise<UserPreferences> {
  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const isProduction = !isLocalDev && typeof window !== 'undefined';
  
  // Try Static Web Apps proxy first, then fallback to direct Functions URL
  const tryProxyFirst = isProduction && API_BASE === window.location.origin;
  
  let url = `${API_BASE}${API_PREFIX}/user/preferences`;
  let headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  // For local dev, send userId as x-household-id header
  if (isLocalDev && userId) {
    headers['x-household-id'] = userId;
  }
  
  // SECURITY: In production, we MUST use SWA proxy which validates tokens.
  // Direct calls to Functions URL are NOT allowed in production as they bypass token validation.
  
  console.log('[UserPreferences] Updating preferences:', preferences, 'URL:', url, 'isLocalDev:', isLocalDev, 'userId:', userId, 'tryProxyFirst:', tryProxyFirst);
  console.log('[UserPreferences] Request headers:', headers);
  console.log('[UserPreferences] Request body:', JSON.stringify(preferences));
  console.log('[UserPreferences] Request body type check - darkMode:', typeof preferences.darkMode, 'language:', typeof preferences.language);
  
  try {
    let res = await fetch(url, {
      method: 'PUT',
      headers,
      credentials: 'include', // Include cookies for authentication (Azure)
      body: JSON.stringify(preferences),
    });
    
    console.log('[UserPreferences] Update response status:', res.status, res.statusText);
    console.log('[UserPreferences] Response headers:', Object.fromEntries(res.headers.entries()));
    
    // Check if response is HTML (proxy might return HTML 404 page even with 200 status)
    const contentType = res.headers.get('content-type') || '';
    const isHtmlResponse = contentType.includes('text/html');
    
    // SECURITY: If proxy fails, don't fallback to direct calls in production.
    // Direct calls bypass token validation and are insecure.
    if (tryProxyFirst && (res.status === 404 || res.status === 405 || (res.status === 200 && isHtmlResponse))) {
      console.error('[UserPreferences] ⚠️ Static Web Apps proxy failed (status:', res.status, 'isHTML:', isHtmlResponse, ')');
      console.error('[UserPreferences] 🔒 SECURITY: Cannot fallback to direct Functions URL - it bypasses token validation.');
      console.error(getSWALinkingInstructions());
      // Let handleRes throw the error with proper status code
    }
    
    // Check for error status codes before calling handleRes
    if (!res.ok) {
      // If we get 405, the function likely isn't deployed yet
      if (res.status === 405) {
        console.error('[UserPreferences] 405 Method Not Allowed - The updateUserPreferences function may not be deployed yet.');
        console.error('[UserPreferences] Please ensure the Functions app has been redeployed with the latest code.');
        console.error('[UserPreferences] Also verify that Static Web Apps is linked to Functions app in Azure Portal.');
      }
      
      // If we get 404, the route might not be configured correctly
      if (res.status === 404) {
        console.error('[UserPreferences] 404 Not Found - The route /api/user/preferences may not be configured correctly.');
        console.error('[UserPreferences] Check staticwebapp.config.json and ensure Functions app is linked.');
      }
      
      // handleRes will throw an error with details
      return handleRes(res);
    }
    
    // Response is OK, parse and return
    return handleRes(res);
  } catch (error: any) {
    console.error('[UserPreferences] Network error during update:', error);
    console.error('[UserPreferences] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      url: url,
      method: 'PUT'
    });
    
    // SECURITY: Don't fallback to direct calls in production - they bypass token validation
    if (tryProxyFirst) {
      console.error('[UserPreferences] ⚠️ Network error - SWA proxy failed');
      console.error('[UserPreferences] 🔒 SECURITY: Direct calls are not allowed in production - they bypass token validation.');
      console.error(getSWALinkingInstructions());
    }
    
    throw error;
  }
}
