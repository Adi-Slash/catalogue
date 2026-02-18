/**
 * Image URLs with dual resolution support
 */
export interface ImageUrls {
  /** High resolution image URL (for detail/edit pages) */
  high: string;
  /** Low resolution image URL (for list pages - faster loading) */
  low: string;
}

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
   * Date when the asset was purchased (ISO 8601 format: YYYY-MM-DD)
   * Used for calculating asset age and price estimation
   */
  datePurchased?: string;
  /**
   * Primary image URL for the asset (kept for backwards compatibility).
   * When multiple images are present, this should be the first entry in imageUrls.
   * @deprecated Use imageUrls with dual-resolution support instead
   */
  imageUrl?: string;
  /**
   * Optional list of up to four image URLs associated with the asset.
   * Can be either:
   * - Array of strings (legacy format - single URL per image, treated as high-res)
   * - Array of ImageUrls objects (new format - dual resolution)
   */
  imageUrls?: (string | ImageUrls)[];
  createdAt: string;
  updatedAt: string;
}

export type NewAsset = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;
