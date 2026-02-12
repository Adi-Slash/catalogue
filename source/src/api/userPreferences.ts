import type { UserPreferences } from '../types/userPreferences';

// Determine a sensible default API base:
// - In local development, talk to the mock server on http://localhost:4000
// - In Azure, talk directly to the deployed Function App
const DEFAULT_API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://func-api-ak-aai-003.azurewebsites.net';

const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
// Azure Functions v4 adds /api prefix to routes, but the local mock server does not
const API_PREFIX = API_BASE.includes('localhost') ? '' : '/api';

async function handleRes(res: Response) {
  if (!res.ok) {
    let errorMessage = `${res.status} ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }
      }
    } catch {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function getUserPreferences(userId?: string): Promise<UserPreferences> {
  const isLocalDev = API_BASE.includes('localhost');
  const headers: HeadersInit = {};
  
  // For local dev, send userId as x-household-id header
  if (isLocalDev && userId) {
    headers['x-household-id'] = userId;
  }
  
  const res = await fetch(`${API_BASE}${API_PREFIX}/user/preferences`, {
    headers,
    credentials: 'include', // Include cookies for authentication (Azure)
  });
  return handleRes(res);
}

export async function updateUserPreferences(preferences: Partial<UserPreferences>, userId?: string): Promise<UserPreferences> {
  const isLocalDev = API_BASE.includes('localhost');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  // For local dev, send userId as x-household-id header
  if (isLocalDev && userId) {
    headers['x-household-id'] = userId;
  }
  
  const res = await fetch(`${API_BASE}${API_PREFIX}/user/preferences`, {
    method: 'PUT',
    headers,
    credentials: 'include', // Include cookies for authentication (Azure)
    body: JSON.stringify(preferences),
  });
  return handleRes(res);
}
