import type { Asset, NewAsset } from '../types/asset'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

async function handleRes(res: Response) {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function getAssets(householdId: string): Promise<Asset[]> {
  const res = await fetch(`${API_BASE}/assets`, { headers: { 'x-household-id': householdId } })
  return handleRes(res)
}

export async function getAsset(id: string, householdId: string): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets/${id}`, { headers: { 'x-household-id': householdId } })
  return handleRes(res)
}

export async function createAsset(payload: NewAsset): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-household-id': payload.householdId },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export async function updateAsset(id: string, payload: Partial<NewAsset>, householdId: string): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-household-id': householdId },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export async function deleteAsset(id: string, householdId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/assets/${id}`, {
    method: 'DELETE',
    headers: { 'x-household-id': householdId },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
}

export async function uploadImage(file: File, householdId: string): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'x-household-id': householdId },
    body: formData,
  })
  const data = await handleRes(res)
  return `${API_BASE}${data.imageUrl}`
}
