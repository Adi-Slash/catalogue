import type { Asset, ImageUrls } from '../types/asset';

/**
 * Extracts image URLs from an asset, handling both legacy (string[]) and new (ImageUrls[]) formats.
 * Returns the appropriate resolution based on the useHighRes parameter.
 * 
 * @param asset - The asset object
 * @param useHighRes - If true, returns high-resolution URLs (for detail/edit pages). If false, returns low-resolution URLs (for list pages).
 * @returns Array of image URLs (strings) in the requested resolution
 */
export function getImageUrls(asset: Asset, useHighRes: boolean = false): string[] {
  const urls: string[] = [];
  
  // Prefer imageUrls array over legacy imageUrl
  if (asset.imageUrls && Array.isArray(asset.imageUrls) && asset.imageUrls.length > 0) {
    for (const img of asset.imageUrls) {
      if (typeof img === 'string') {
        // Legacy format: single string URL (treat as high-res)
        urls.push(img);
      } else if (img && typeof img === 'object' && 'high' in img && 'low' in img) {
        // New format: ImageUrls object with dual resolution
        urls.push(useHighRes ? img.high : img.low);
      }
    }
  } else if (asset.imageUrl) {
    // Fallback to legacy imageUrl field
    urls.push(asset.imageUrl);
  }
  
  return urls.slice(0, 4); // Limit to 4 images
}

/**
 * Converts an array of image URLs (strings or ImageUrls objects) to ImageUrls objects.
 * Legacy string URLs are treated as high-res (same URL for both high and low).
 */
export function normalizeImageUrls(urls: (string | ImageUrls)[]): ImageUrls[] {
  return urls.map((url) => {
    if (typeof url === 'string') {
      // Legacy format: treat as high-res, use same URL for low-res
      return {
        high: url,
        low: url,
      };
    }
    // Already ImageUrls object
    return url;
  });
}
