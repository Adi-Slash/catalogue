import type { Asset } from '../types/asset';

const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const FUNCTIONS_DIRECT_URL = 'https://func-api-ak-aai-003.azurewebsites.net';
const DEFAULT_API_BASE = isLocalDev
  ? 'http://localhost:4000'
  : typeof window !== 'undefined'
  ? window.location.origin
  : FUNCTIONS_DIRECT_URL;

const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
const API_PREFIX = API_BASE.includes('localhost') ? '' : '/api';

export interface ChatRequest {
  message: string;
  assets: Asset[];
  language?: string;
}

export interface ChatResponse {
  response: string;
}

/**
 * Sends a chat message to the insurance advisor chatbot
 */
export async function sendChatMessage(message: string, assets: Asset[], language: string = 'en'): Promise<string> {
  const url = `${API_BASE}${API_PREFIX}/chat`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      message,
      assets: assets.map((asset) => ({
        id: asset.id,
        make: asset.make,
        model: asset.model,
        category: asset.category,
        value: asset.value,
        datePurchased: asset.datePurchased,
      })),
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get response' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ChatResponse = await response.json();
  return data.response;
}
