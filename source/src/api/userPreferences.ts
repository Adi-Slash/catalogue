import type { UserPreferences } from '../types/userPreferences';

// Determine a sensible default API base:
// - In local development, talk to the mock server on http://localhost:4000
// - In Azure Static Web Apps, use the same origin to go through SWA proxy (adds x-ms-client-principal header)
// - The Static Web App MUST be linked to the Functions app in Azure Portal for proxy to work
const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const DEFAULT_API_BASE = isLocalDev
  ? 'http://localhost:4000'
  : typeof window !== 'undefined'
  ? window.location.origin // Use Static Web Apps proxy
  : 'https://func-api-ak-aai-003.azurewebsites.net';

const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
// Azure Functions v4 adds /api prefix to routes, but the local mock server does not
// When using Static Web Apps proxy, also use /api prefix
const API_PREFIX = API_BASE.includes('localhost') ? '' : '/api';

async function handleRes(res: Response) {
  if (!res.ok) {
    let errorMessage = `${res.status} ${res.statusText}`;
    let errorData: any = null;
    try {
      errorData = await res.json();
      console.error('[UserPreferences] API Error Response:', errorData);
      if (errorData.error) {
        errorMessage = errorData.error;
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }
        if (errorData.code) {
          errorMessage += ` (code: ${errorData.code})`;
        }
      }
    } catch (parseError) {
      // If response is not JSON, try to get text
      try {
        const text = await res.text();
        console.error('[UserPreferences] API Error Response (text):', text);
        errorMessage = `${errorMessage}: ${text}`;
      } catch {
        // If response is not JSON, use status text
        console.error('[UserPreferences] API Error - could not parse response');
      }
    }
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).errorData = errorData;
    throw error;
  }
  return res.json();
}

export async function getUserPreferences(userId?: string): Promise<UserPreferences> {
  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const headers: HeadersInit = {};
  
  // For local dev, send userId as x-household-id header
  // In production, authentication is handled via Static Web Apps proxy (x-ms-client-principal header)
  if (isLocalDev && userId) {
    headers['x-household-id'] = userId;
  }
  
  console.log('[UserPreferences] Fetching preferences from:', `${API_BASE}${API_PREFIX}/user/preferences`, 'isLocalDev:', isLocalDev);
  const res = await fetch(`${API_BASE}${API_PREFIX}/user/preferences`, {
    headers,
    credentials: 'include', // Include cookies for authentication (Azure)
  });
  console.log('[UserPreferences] Response status:', res.status);
  return handleRes(res);
}

export async function updateUserPreferences(preferences: Partial<UserPreferences>, userId?: string): Promise<UserPreferences> {
  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  // For local dev, send userId as x-household-id header
  // In production, authentication is handled via Static Web Apps proxy (x-ms-client-principal header)
  if (isLocalDev && userId) {
    headers['x-household-id'] = userId;
  }
  
  const url = `${API_BASE}${API_PREFIX}/user/preferences`;
  console.log('[UserPreferences] Updating preferences:', preferences, 'URL:', url, 'isLocalDev:', isLocalDev);
  
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    credentials: 'include', // Include cookies for authentication (Azure)
    body: JSON.stringify(preferences),
  });
  
  console.log('[UserPreferences] Update response status:', res.status, res.statusText);
  
  // If we get 405, the function likely isn't deployed yet
  if (res.status === 405) {
    console.error('[UserPreferences] 405 Method Not Allowed - The updateUserPreferences function may not be deployed yet.');
    console.error('[UserPreferences] Please ensure the Functions app has been redeployed with the latest code.');
  }
  
  return handleRes(res);
}
