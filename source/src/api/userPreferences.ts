import type { UserPreferences } from '../types/userPreferences';

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
  
  // For production, if we have userId and proxy might not work, prepare direct call headers
  const directUrl = `${FUNCTIONS_DIRECT_URL}/api/user/preferences`;
  const directHeaders: HeadersInit = {};
  
  // Use x-household-id header for direct Functions call (Functions now accept this as fallback)
  if (isProduction && userId && !isLocalDev) {
    directHeaders['x-household-id'] = userId;
  }
  
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
    
    // If proxy returns 404/405 or HTML response, try direct Functions URL as fallback
    if (tryProxyFirst && (res.status === 404 || res.status === 405 || (res.status === 200 && isHtmlResponse))) {
      console.warn('[UserPreferences] Static Web Apps proxy failed (status:', res.status, 'isHTML:', isHtmlResponse, '), trying direct Functions URL');
      console.log('[UserPreferences] Direct URL:', directUrl);
      console.log('[UserPreferences] Direct headers:', directHeaders);
      
      try {
        res = await fetch(directUrl, {
          headers: directHeaders,
          credentials: 'include',
        });
        console.log('[UserPreferences] Direct Functions response status:', res.status, res.statusText);
        console.log('[UserPreferences] Direct Functions response headers:', Object.fromEntries(res.headers.entries()));
      } catch (directError) {
        console.error('[UserPreferences] Direct Functions call failed:', directError);
        // Fall through to return default preferences
      }
    }
    
    // Check for common issues
    if (res.status === 404 || (res.status === 200 && res.headers.get('content-type')?.includes('text/html'))) {
      console.error('[UserPreferences] 404 Not Found or HTML response - Route may not be configured correctly.');
      console.error('[UserPreferences] Verify Static Web Apps is linked to Functions app in Azure Portal.');
      console.error('[UserPreferences] Returning default preferences.');
      
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
    
    // If proxy failed, try direct Functions URL as fallback
    if (tryProxyFirst && userId) {
      try {
        console.log('[UserPreferences] Trying direct Functions URL as fallback');
        const res = await fetch(directUrl, {
          headers: directHeaders,
          credentials: 'include',
        });
        if (res.ok) {
          return handleRes(res);
        }
      } catch (fallbackError) {
        console.error('[UserPreferences] Direct Functions call also failed:', fallbackError);
      }
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
  
  // For production, if we have userId and proxy might not work, prepare direct call headers
  const directUrl = `${FUNCTIONS_DIRECT_URL}/api/user/preferences`;
  const directHeaders: HeadersInit = { 'Content-Type': 'application/json' };
  
  // Use x-household-id header for direct Functions call (Functions now accept this as fallback)
  if (isProduction && userId && !isLocalDev) {
    directHeaders['x-household-id'] = userId;
  }
  
  console.log('[UserPreferences] Updating preferences:', preferences, 'URL:', url, 'isLocalDev:', isLocalDev, 'userId:', userId, 'tryProxyFirst:', tryProxyFirst);
  console.log('[UserPreferences] Request headers:', headers);
  console.log('[UserPreferences] Request body:', JSON.stringify(preferences));
  
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
    
    // If proxy returns 404/405 or HTML response, try direct Functions URL as fallback
    if (tryProxyFirst && (res.status === 404 || res.status === 405 || (res.status === 200 && isHtmlResponse))) {
      console.warn('[UserPreferences] Static Web Apps proxy failed (status:', res.status, 'isHTML:', isHtmlResponse, '), trying direct Functions URL');
      console.log('[UserPreferences] Direct URL:', directUrl);
      console.log('[UserPreferences] Direct headers:', directHeaders);
      
      try {
        res = await fetch(directUrl, {
          method: 'PUT',
          headers: directHeaders,
          credentials: 'include',
          body: JSON.stringify(preferences),
        });
        console.log('[UserPreferences] Direct Functions response status:', res.status, res.statusText);
        console.log('[UserPreferences] Direct Functions response headers:', Object.fromEntries(res.headers.entries()));
      } catch (directError) {
        console.error('[UserPreferences] Direct Functions call failed:', directError);
        throw directError; // Re-throw so outer catch can handle it
      }
    }
    
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
    
    // If proxy failed, try direct Functions URL as fallback
    if (tryProxyFirst && userId) {
      try {
        console.log('[UserPreferences] Trying direct Functions URL as fallback');
        const res = await fetch(directUrl, {
          method: 'PUT',
          headers: directHeaders,
          credentials: 'include',
          body: JSON.stringify(preferences),
        });
        if (res.ok) {
          return handleRes(res);
        }
      } catch (fallbackError) {
        console.error('[UserPreferences] Direct Functions call also failed:', fallbackError);
      }
    }
    
    throw error;
  }
}
