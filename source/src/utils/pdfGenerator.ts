import jsPDF from 'jspdf';
import type { Asset } from '../types/asset';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Preloads an image into the DOM and returns a promise that resolves when loaded
 * This ensures images are available for canvas conversion without CORS issues
 * Handles both regular URLs and blob URLs
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
  return new Promise((resolve, reject) => {
    // Check if image already exists in DOM
    const allImages = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    const existingImg = allImages.find(
      (img) => img.src === url || img.src.includes(url.split('/').pop() || '') || img.src.includes(url.split('?')[0])
    );
    
    if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
      resolve(existingImg);
      return;
    }

    // Handle relative URLs
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

    // Create a hidden image element to preload
    const img = document.createElement('img');
    img.style.display = 'none';
    img.style.position = 'absolute';
    img.style.left = '-9999px';
    
    // Don't set crossOrigin initially - let browser handle it naturally
    // This works better with Azure Blob Storage SAS URLs
    
    const timeout = setTimeout(() => {
      if (img.parentNode) {
        document.body.removeChild(img);
      }
      reject(new Error(`Image load timeout: ${fullUrl.substring(0, 50)}...`));
    }, 30000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      if (img.parentNode) {
        document.body.removeChild(img);
      }
      reject(new Error(`Failed to load image: ${fullUrl.substring(0, 50)}...`));
    };

    // Add to DOM before setting src (helps with some mobile browsers)
    document.body.appendChild(img);
    img.src = fullUrl;
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

    // Preload all images first (better for mobile)
    console.log(`Preloading ${imageUrls.length} images for PDF...`);
    const preloadedImages: HTMLImageElement[] = [];
    const failedImages: number[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        console.log(`Preloading image ${i + 1}/${imageUrls.length}...`);
        const img = await preloadImageIntoDOM(imageUrls[i]);
        preloadedImages[i] = img;
        console.log(`✓ Image ${i + 1} preloaded successfully`);
      } catch (error) {
        console.error(`✗ Failed to preload image ${i + 1}:`, error);
        failedImages.push(i);
      }
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
