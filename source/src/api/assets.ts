import type { Asset, NewAsset } from '../types/asset';

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

export async function getAssets(householdId: string): Promise<Asset[]> {
  const url = `${API_BASE}${API_PREFIX}/assets`;
  console.log('Fetching assets from:', url);
  try {
    const res = await fetch(url, { headers: { 'x-household-id': householdId } });
    console.log('Response status:', res.status, res.statusText);
    return handleRes(res);
  } catch (error) {
    console.error('Fetch error:', error);
    console.error('API_BASE:', API_BASE);
    console.error('API_PREFIX:', API_PREFIX);
    console.error('Full URL:', url);
    throw error;
  }
}

export async function getAsset(id: string, householdId: string): Promise<Asset> {
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets/${id}`, {
    headers: { 'x-household-id': householdId },
  });
  return handleRes(res);
}

export async function createAsset(payload: NewAsset): Promise<Asset> {
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-household-id': payload.householdId },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function updateAsset(
  id: string,
  payload: Partial<NewAsset>,
  householdId: string
): Promise<Asset> {
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-household-id': householdId },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function deleteAsset(id: string, householdId: string): Promise<void> {
  const res = await fetch(`${API_BASE}${API_PREFIX}/assets/${id}`, {
    method: 'DELETE',
    headers: { 'x-household-id': householdId },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export async function uploadImage(file: File, householdId: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE}${API_PREFIX}/upload`, {
    method: 'POST',
    headers: { 'x-household-id': householdId },
    body: formData,
  });
  const data = await handleRes(res);
  // If imageUrl is already a full URL (starts with http), use it directly
  // Otherwise, prepend API_BASE for relative paths (mock server compatibility)
  return data.imageUrl.startsWith('http') ? data.imageUrl : `${API_BASE}${data.imageUrl}`;
}
