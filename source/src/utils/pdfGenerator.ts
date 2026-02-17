import jsPDF from 'jspdf';
import type { Asset } from '../types/asset';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/**
 * Loads an image from a URL and returns it as a data URL
 * Handles CORS and blob URLs
 */
async function loadImageAsDataUrl(url: string): Promise<string> {
  try {
    // Handle blob URLs (already data URLs)
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // Handle relative URLs
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    
    // Use fetch with credentials for CORS
    const response = await fetch(fullUrl, {
      credentials: 'include',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
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
