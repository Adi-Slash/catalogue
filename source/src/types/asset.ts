export interface Asset {
  id: string
  householdId: string
  make: string
  model: string
  serialNumber?: string
  description?: string
  value: number
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export type NewAsset = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>
