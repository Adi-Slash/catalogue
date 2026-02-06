export interface Asset {
  id: string;
  householdId: string;
  make: string;
  model: string;
  serialNumber?: string;
  description?: string;
  category?: string;
  value: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewAsset {
  householdId: string;
  make: string;
  model: string;
  serialNumber?: string;
  description?: string;
  category?: string;
  value: number;
  imageUrl?: string;
}
