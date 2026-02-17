import jsPDF from 'jspdf';
import type { Asset } from '../types/asset';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Loads an image from a URL and returns it as a data URL
 * Uses canvas-based approach for better mobile compatibility and CORS handling
 */
async function loadImageAsDataUrl(url: string): Promise<string> {
  try {
    // Handle blob URLs - convert to data URL using canvas
    if (url.startsWith('blob:')) {
      return await convertBlobToDataUrl(url);
    }
    
    // Handle relative URLs
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    
    // Method 1: Try fetch first (works for same-origin or CORS-enabled images)
    try {
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (fetchError) {
      console.warn('Fetch failed, trying canvas method:', fetchError);
    }
    
    // Method 2: Use canvas-based approach (works better on mobile and handles CORS)
    return await convertImageUrlToDataUrl(fullUrl);
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
}

/**
 * Converts a blob URL to a data URL using canvas
 */
async function convertBlobToDataUrl(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      // Fallback: try to fetch the blob URL directly
      fetch(blobUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    };
    
    img.src = blobUrl;
  });
}

/**
 * Converts an image URL to a data URL using canvas
 * This method works better on mobile browsers and handles CORS
 * Tries to use existing DOM images first to avoid CORS issues
 */
async function convertImageUrlToDataUrl(url: string): Promise<string> {
  // First, try to find the image in the DOM (already loaded, no CORS issues)
  const existingImg = document.querySelector(`img[src="${url}"], img[src*="${url.split('/').pop()}"]`) as HTMLImageElement;
  if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = existingImg.naturalWidth;
      canvas.height = existingImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(existingImg, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.95);
      }
    } catch (error) {
      console.warn('Failed to use existing DOM image, trying load method:', error);
    }
  }

  // If not in DOM, load it with canvas method
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Set crossOrigin to handle CORS - try anonymous first
    img.crossOrigin = 'anonymous';
    
    // Add timeout for mobile browsers
    const timeout = setTimeout(() => {
      reject(new Error(`Image load timeout: ${url}`));
    }, 30000); // 30 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        // Convert to JPEG with high quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      // If anonymous fails, try without crossOrigin (for same-origin images)
      if (img.crossOrigin === 'anonymous') {
        const imgRetry = new Image();
        const retryTimeout = setTimeout(() => {
          reject(new Error(`Image load timeout: ${url}`));
        }, 30000);
        
        imgRetry.onload = () => {
          clearTimeout(retryTimeout);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = imgRetry.naturalWidth || imgRetry.width;
            canvas.height = imgRetry.naturalHeight || imgRetry.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }
            ctx.drawImage(imgRetry, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          } catch (err) {
            reject(err);
          }
        };
        imgRetry.onerror = () => {
          clearTimeout(retryTimeout);
          reject(new Error(`Failed to load image: ${url}`));
        };
        imgRetry.src = url;
      } else {
        reject(new Error(`Failed to load image: ${url}`));
      }
    };
    
    img.src = url;
  });
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

    // Load and add images
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageDataUrl = await loadImageAsDataUrl(imageUrls[i]);
        
        // Calculate image dimensions to fit within page width
        const maxImageWidth = contentWidth;
        const maxImageHeight = 80; // Max height per image
        
        // Create a temporary image element to get dimensions
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageDataUrl;
        });

        let imgWidth = img.width;
        let imgHeight = img.height;
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
        console.error(`Error loading image ${i + 1}:`, error);
        // Continue with next image even if one fails
        checkPageBreak(15);
        doc.setFontSize(9);
        doc.setTextColor(200, 0, 0);
        doc.text(`Photo ${i + 1}: Failed to load`, margin, yPosition);
        yPosition += 10;
      }
    }
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
