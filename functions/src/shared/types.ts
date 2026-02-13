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
   * Primary image URL for the asset (kept for backwards compatibility).
   * When multiple images are present, this should be the first entry in imageUrls.
   * @deprecated Use imageUrls with dual-resolution support instead
   */
  imageUrl?: string;
  /**
   * Optional list of up to four image URLs associated with the asset.
   * Can be either:
   * - Array of strings (legacy format - single URL per image)
   * - Array of ImageUrls objects (new format - dual resolution)
   */
  imageUrls?: (string | ImageUrls)[];
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
  /**
   * Primary image URL for the asset (kept for backwards compatibility).
   * When multiple images are present, this should be the first entry in imageUrls.
   * @deprecated Use imageUrls with dual-resolution support instead
   */
  imageUrl?: string;
  /**
   * Optional list of up to four image URLs associated with the asset.
   * Can be either:
   * - Array of strings (legacy format - single URL per image)
   * - Array of ImageUrls objects (new format - dual resolution)
   */
  imageUrls?: (string | ImageUrls)[];
}

export interface UserPreferences {
  id: string; // userId
  userId: string;
  darkMode: boolean;
  language?: string; // Language code: 'en' | 'fr' | 'de' | 'ja'
  updatedAt: string;
}
