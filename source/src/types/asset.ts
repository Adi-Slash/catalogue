export interface Asset {
  id: string;
  householdId: string;
  make: string;
  model: string;
  serialNumber?: string;
  description?: string;
  category?: string;
  value: number;
  /**
   * Primary image URL for the asset (kept for backwards compatibility).
   * When multiple images are present, this should be the first entry in imageUrls.
   */
  imageUrl?: string;
  /**
   * Optional list of up to four image URLs associated with the asset.
   */
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export type NewAsset = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;
