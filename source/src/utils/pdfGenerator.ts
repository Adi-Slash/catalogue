import jsPDF from 'jspdf';
import type { Asset } from '../types/asset';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Preloads an image into the DOM and returns a promise that resolves when loaded
 * Uses fetch API to avoid CORS/tainted canvas issues
 * Handles both regular URLs and blob URLs
 */
async function preloadImageIntoDOM(url: string): Promise<HTMLImageElement> {
  // Handle blob URLs specially - these don't need CORS
  if (url.startsWith('blob:')) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.style.display = 'none';
      img.style.position = 'absolute';
      img.style.left = '-9999px';
      
      const timeout = setTimeout(() => {
        safeRemoveChild(img);
        reject(new Error('Blob URL load timeout'));
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        safeRemoveChild(img);
        reject(new Error('Failed to load blob URL'));
      };

      document.body.appendChild(img);
      img.src = url;
    });
  }

  // For all other URLs, use fetch to avoid CORS/tainted canvas issues
  // This ensures the image can be drawn to canvas without tainting
  return await loadImageViaFetch(url);
}

/**
 * Checks if a URL is an Azure Blob Storage URL
 */
function isAzureBlobStorageUrl(url: string): boolean {
  return url.includes('.blob.core.windows.net');
}

/**
 * Gets the proxy URL for an image
 */
function getProxyUrl(imageUrl: string): string {
  // Determine API base URL
  const isProduction = !API_BASE.includes('localhost');
  const apiBase = isProduction 
    ? window.location.origin // Use same origin in production (SWA proxies to Functions)
    : API_BASE;
  
  // Encode the image URL for the query parameter
  const encodedUrl = encodeURIComponent(imageUrl);
  return `${apiBase}/api/proxy-image?url=${encodedUrl}`;
}

/**
 * Loads an image using fetch API to avoid CORS/tainted canvas issues
 * Uses proxy endpoint for Azure Blob Storage URLs to bypass CORS
 */
async function loadImageViaFetch(url: string): Promise<HTMLImageElement> {
  // Handle relative URLs - ensure we have a full URL
  let fullUrl = url;
  if (!url.startsWith('http') && !url.startsWith('blob:')) {
    // Check if it's a relative path
    if (url.startsWith('/')) {
      // Absolute path - use current origin
      fullUrl = `${window.location.origin}${url}`;
    } else {
      // Relative path - use API_BASE
      fullUrl = `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    }
  }

  // If this is an Azure Blob Storage URL, use proxy endpoint to avoid CORS issues
  const fetchUrl = isAzureBlobStorageUrl(fullUrl) ? getProxyUrl(fullUrl) : fullUrl;

  console.log(`[PDF] Loading image via ${isAzureBlobStorageUrl(fullUrl) ? 'proxy' : 'direct'} fetch: ${fetchUrl.substring(0, 80)}...`);

  try {
    // Use fetch to get the image as a blob (handles CORS properly)
    const response = await fetch(fetchUrl, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Create image from blob URL (no CORS issues since it's a blob)
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.style.display = 'none';
      img.style.position = 'absolute';
      img.style.left = '-9999px';
      img.crossOrigin = 'anonymous'; // Not needed for blob URLs, but safe to set

      const timeout = setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        safeRemoveChild(img);
        reject(new Error(`Image load timeout: ${fullUrl.substring(0, 50)}...`));
      }, 30000);

      img.onload = () => {
        clearTimeout(timeout);
        // Don't revoke blob URL here - we need it for canvas conversion
        // It will be cleaned up after canvas conversion
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(blobUrl);
        safeRemoveChild(img);
        reject(new Error(`Failed to load image: ${fullUrl.substring(0, 50)}...`));
      };

      document.body.appendChild(img);
      img.src = blobUrl;
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch image: ${errorMsg}`);
  }
}

/**
 * Safely removes a child node if it exists
 */
function safeRemoveChild(node: Node | null): void {
  if (node && node.parentNode) {
    try {
      node.parentNode.removeChild(node);
    } catch (e) {
      // Ignore errors - node may have already been removed
      console.warn('[PDF] Could not remove node (may already be removed):', e);
    }
  }
}


/**
 * Generates an insurance claim PDF for an asset
 * @param asset - The asset to generate a claim for
 * @param imageUrls - Array of image URLs to include in the PDF
 */
export async function generateInsuranceClaimPDF(
  asset: Asset,
  imageUrls: string[]
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Insurance Claim Document', margin, yPosition);
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 10;

  // Claim statement
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Claim Statement', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const claimText = [
    'This document serves as an official insurance claim request for the following asset.',
    'The asset listed below has been reported as lost or damaged and requires',
    'insurance coverage processing.',
    '',
    'Please process this claim according to your standard procedures.',
  ];
  
  claimText.forEach((line) => {
    checkPageBreak(8);
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Asset Information Section
  checkPageBreak(40);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Asset Information', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const assetInfo = [
    { label: 'Make:', value: asset.make },
    { label: 'Model:', value: asset.model },
    { label: 'Serial Number:', value: asset.serialNumber || 'N/A' },
    { label: 'Category:', value: asset.category || 'Uncategorized' },
    { label: 'Estimated Value:', value: `$${asset.value.toLocaleString()}` },
  ];

  assetInfo.forEach((info) => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(info.value, margin + 50, yPosition);
    yPosition += 7;
  });

  if (asset.description) {
    checkPageBreak(15);
    yPosition += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', margin, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(asset.description, contentWidth);
    descriptionLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
  }

  yPosition += 10;

  // Asset Photos Section
  if (imageUrls.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Photographs', margin, yPosition);
    yPosition += 10;

    // Preload all images first (better for mobile)
    console.log(`[PDF] Preloading ${imageUrls.length} images for PDF...`);
    const preloadedImages: HTMLImageElement[] = [];
    const failedImages: number[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageUrl = imageUrls[i];
        console.log(`[PDF] Preloading image ${i + 1}/${imageUrls.length}: ${imageUrl.substring(0, 100)}...`);
        const img = await preloadImageIntoDOM(imageUrl);
        preloadedImages[i] = img;
        console.log(`[PDF] ✓ Image ${i + 1} preloaded successfully (${img.naturalWidth}x${img.naturalHeight})`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[PDF] ✗ Failed to preload image ${i + 1}:`, errorMsg);
        console.error(`[PDF] Image URL was: ${imageUrls[i]}`);
        failedImages.push(i);
      }
    }

    if (failedImages.length > 0) {
      console.warn(`[PDF] ${failedImages.length} of ${imageUrls.length} images failed to load`);
    }

    // Load and add images
    for (let i = 0; i < imageUrls.length; i++) {
      if (failedImages.includes(i)) {
        // Skip failed images
        checkPageBreak(15);
        doc.setFontSize(9);
        doc.setTextColor(200, 0, 0);
        doc.text(`Photo ${i + 1}: Failed to load`, margin, yPosition);
        yPosition += 10;
        continue;
      }

      try {
        // Use preloaded image or load fresh
        const img = preloadedImages[i] || await preloadImageIntoDOM(imageUrls[i]);
        
        // Convert to data URL using canvas
        // Since we loaded via fetch->blob, the canvas won't be tainted
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        // Draw image to canvas (should not be tainted since loaded via blob)
        ctx.drawImage(img, 0, 0);
        
        // Convert to data URL (should work now since canvas is not tainted)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        // Clean up blob URL if it's a blob URL
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
        
        // Calculate image dimensions to fit within page width
        const maxImageWidth = contentWidth;
        const maxImageHeight = 80; // Max height per image
        
        let imgWidth = img.naturalWidth || img.width;
        let imgHeight = img.naturalHeight || img.height;
        const aspectRatio = imgWidth / imgHeight;

        // Scale to fit
        if (imgWidth > maxImageWidth) {
          imgWidth = maxImageWidth;
          imgHeight = imgWidth / aspectRatio;
        }
        if (imgHeight > maxImageHeight) {
          imgHeight = maxImageHeight;
          imgWidth = imgHeight * aspectRatio;
        }

        checkPageBreak(imgHeight + 15);
        
        // Add image label
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Photo ${i + 1}`, margin, yPosition);
        yPosition += 5;

        // Add image
        doc.addImage(imageDataUrl, 'JPEG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;

        // Add new page if we have more images and we're running out of space
        if (i < imageUrls.length - 1 && yPosition + maxImageHeight + 20 > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
        // Continue with next image even if one fails
        checkPageBreak(15);
        doc.setFontSize(9);
        doc.setTextColor(200, 0, 0);
        doc.text(`Photo ${i + 1}: Failed to process`, margin, yPosition);
        yPosition += 10;
      }
    }

    // Clean up preloaded images
    preloadedImages.forEach((img) => {
      // Clean up blob URL if present
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
      // Safely remove from DOM
      safeRemoveChild(img);
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const filename = `Insurance_Claim_${asset.make}_${asset.model}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Save the PDF
  doc.save(filename);
}
