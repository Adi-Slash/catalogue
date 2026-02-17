import jsPDF from 'jspdf';
import type { Asset } from '../types/asset';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Preloads an image into the DOM and returns a promise that resolves when loaded
 * This ensures images are available for canvas conversion without CORS issues
 * Handles both regular URLs and blob URLs
 * Uses fetch as fallback if Image element fails
 */
async function preloadImageIntoDOM(url: string): Promise<HTMLImageElement> {
  // Handle blob URLs specially
  if (url.startsWith('blob:')) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.style.display = 'none';
      img.style.position = 'absolute';
      img.style.left = '-9999px';
      
      const timeout = setTimeout(() => {
        if (img.parentNode) {
          document.body.removeChild(img);
        }
        reject(new Error('Blob URL load timeout'));
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        if (img.parentNode) {
          document.body.removeChild(img);
        }
        reject(new Error('Failed to load blob URL'));
      };

      document.body.appendChild(img);
      img.src = url;
    });
  }

  // Handle regular URLs
  return new Promise(async (resolve, reject) => {
    // Check if image already exists in DOM
    const allImages = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    const existingImg = allImages.find(
      (img) => {
        const imgSrc = img.src;
        const urlToCheck = url.split('?')[0]; // Remove query params for comparison
        return imgSrc === url || 
               imgSrc.includes(url.split('/').pop() || '') || 
               imgSrc.includes(urlToCheck) ||
               (url.includes('?') && imgSrc.includes(url.split('?')[0]));
      }
    );
    
    if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
      resolve(existingImg);
      return;
    }

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

    console.log(`[PDF] Attempting to load image: ${fullUrl.substring(0, 80)}...`);

    // Try Image element first
    const img = document.createElement('img');
    img.style.display = 'none';
    img.style.position = 'absolute';
    img.style.left = '-9999px';
    
    const timeout = setTimeout(() => {
      if (img.parentNode) {
        document.body.removeChild(img);
      }
      // Try fetch as fallback before rejecting
      tryFetchFallback(fullUrl, resolve, reject);
    }, 20000); // Reduced timeout to try fetch sooner

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };

    img.onerror = async () => {
      clearTimeout(timeout);
      if (img.parentNode) {
        document.body.removeChild(img);
      }
      console.warn(`[PDF] Image element failed, trying fetch fallback for: ${fullUrl.substring(0, 80)}...`);
      // Try fetch as fallback
      tryFetchFallback(fullUrl, resolve, reject);
    };

    // Add to DOM before setting src (helps with some mobile browsers)
    document.body.appendChild(img);
    img.src = fullUrl;
  });
}

/**
 * Fallback method using fetch to load image and create Image element from blob
 */
async function tryFetchFallback(
  url: string,
  resolve: (img: HTMLImageElement) => void,
  reject: (error: Error) => void
): Promise<void> {
  try {
    console.log(`[PDF] Fetching image via fetch API: ${url.substring(0, 80)}...`);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const img = document.createElement('img');
    img.style.display = 'none';
    img.style.position = 'absolute';
    img.style.left = '-9999px';

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      if (img.parentNode) {
        document.body.removeChild(img);
      }
      reject(new Error(`Fetch fallback timeout for: ${url.substring(0, 50)}...`));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl); // Clean up blob URL
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      if (img.parentNode) {
        document.body.removeChild(img);
      }
      reject(new Error(`Failed to load image via fetch fallback: ${url.substring(0, 50)}...`));
    };

    document.body.appendChild(img);
    img.src = blobUrl;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    reject(new Error(`Failed to load image. URL may be invalid or inaccessible. ${errorMsg}`));
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
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        ctx.drawImage(img, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
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
      if (img.parentNode) {
        document.body.removeChild(img);
      }
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
