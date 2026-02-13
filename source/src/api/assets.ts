import type { Asset, NewAsset } from '../types/asset';

// Determine a sensible default API base:
// - In local development, talk to the mock server on http://localhost:4000
// - In Azure Static Web Apps, use the SWA proxy (window.location.origin) which forwards x-ms-client-principal
// - The SWA proxy validates tokens and adds authentication headers automatically
const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const FUNCTIONS_DIRECT_URL = 'https://func-api-ak-aai-003.azurewebsites.net';
const DEFAULT_API_BASE = isLocalDev
  ? 'http://localhost:4000'
  : typeof window !== 'undefined'
  ? window.location.origin // Use Static Web Apps proxy (validates tokens and forwards x-ms-client-principal)
  : FUNCTIONS_DIRECT_URL;

const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
// Azure Functions v4 adds /api prefix to routes, but the local mock server does not
// When using Static Web Apps proxy, also use /api prefix
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

export async function getAssets(householdId: string): Promise<Asset[]> {
  const url = `${API_BASE}${API_PREFIX}/assets`;
  const headers: HeadersInit = {};
  
  // For local dev, send userId as x-household-id header
  // For production, use SWA proxy which adds x-ms-client-principal automatically
  if (isLocalDev) {
    headers['x-household-id'] = householdId;
  }
  
  console.log('[Assets] Fetching assets from:', url, 'isLocalDev:', isLocalDev);
  console.log('[Assets] Request headers:', headers);
  
  try {
    const res = await fetch(url, {
      headers,
      credentials: 'include', // Include cookies for SWA authentication
    });
    console.log('[Assets] Response status:', res.status, res.statusText);
    return handleRes(res);
  } catch (error) {
    console.error('[Assets] Fetch error:', error);
    console.error('[Assets] API_BASE:', API_BASE);
    console.error('[Assets] API_PREFIX:', API_PREFIX);
    console.error('[Assets] Full URL:', url);
    throw error;
  }
}

export async function getAsset(id: string, householdId: string): Promise<Asset> {
  const headers: HeadersInit = {};
  if (isLocalDev) {
    headers['x-household-id'] = householdId;
  }
  
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets/${id}`, {
    headers,
    credentials: 'include',
  });
  return handleRes(res);
}

export async function createAsset(payload: NewAsset): Promise<Asset> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (isLocalDev) {
    headers['x-household-id'] = payload.householdId;
  }
  
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function updateAsset(
  id: string,
  payload: Partial<NewAsset>,
  householdId: string
): Promise<Asset> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (isLocalDev) {
    headers['x-household-id'] = householdId;
  }
  
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets/${id}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function deleteAsset(id: string, householdId: string): Promise<void> {
  const headers: HeadersInit = {};
  if (isLocalDev) {
    headers['x-household-id'] = householdId;
  }
  
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets/${id}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export async function uploadImage(file: File, householdId: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  
  const headers: HeadersInit = {};
  if (isLocalDev) {
    headers['x-household-id'] = householdId;
  }
  // Don't set Content-Type for FormData - browser sets it automatically with boundary
  
  const res = await fetch(`${API_BASE}${API_PREFIX}/upload`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });
  const data = await handleRes(res);
  // If imageUrl is already a full URL (starts with http), use it directly
  // Otherwise, prepend API_BASE for relative paths (mock server compatibility)
  return data.imageUrl.startsWith('http') ? data.imageUrl : `${API_BASE}${data.imageUrl}`;
}
