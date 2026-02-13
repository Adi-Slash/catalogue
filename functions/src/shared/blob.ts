import { BlobServiceClient, ContainerClient, BlobSASPermissions } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import type { ImageUrls } from './types';

const containerName = process.env.BLOB_CONTAINER_NAME || 'asset-images';
const connectionString = process.env.AzureWebJobsStorage || '';

// Image resolution settings
const HIGH_RES_MAX_WIDTH = 1920;
const HIGH_RES_MAX_HEIGHT = 1920;
const HIGH_RES_QUALITY = 90;
const LOW_RES_MAX_WIDTH = 400;
const LOW_RES_MAX_HEIGHT = 400;
const LOW_RES_QUALITY = 80;

let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (!containerClient) {
    if (!connectionString) {
      throw new Error('AzureWebJobsStorage (connection string) environment variable is not set');
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  return containerClient;
}

/**
 * Generates a SAS URL for a blob
 */
async function generateSasUrl(blobName: string): Promise<string> {
  const container = getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  
  const expiresOn = new Date();
  expiresOn.setFullYear(expiresOn.getFullYear() + 1);
  
  return blockBlobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'), // Read only
    expiresOn,
  });
}

/**
 * Uploads an image and creates both high-resolution and low-resolution versions.
 * Returns an ImageUrls object with both URLs.
 */
export async function uploadImage(file: Buffer, contentType: string, originalName: string): Promise<ImageUrls> {
  const container = getContainerClient();
  
  // Ensure container exists
  await container.createIfNotExists();
  
  // Generate unique base filename
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  const baseName = uuidv4();
  
  // Determine if image format is supported by sharp
  const isImage = contentType.startsWith('image/');
  if (!isImage) {
    throw new Error(`Unsupported file type: ${contentType}. Only images are supported.`);
  }
  
  try {
    // Process image with sharp to create both resolutions
    const image = sharp(file);
    const metadata = await image.metadata();
    
    // Create high-resolution version (max 1920x1920, quality 90)
    const highResBuffer = await image
      .clone()
      .resize(HIGH_RES_MAX_WIDTH, HIGH_RES_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: HIGH_RES_QUALITY, mozjpeg: true })
      .toBuffer();
    
    // Create low-resolution version (max 400x400, quality 80)
    const lowResBuffer = await image
      .clone()
      .resize(LOW_RES_MAX_WIDTH, LOW_RES_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: LOW_RES_QUALITY, mozjpeg: true })
      .toBuffer();
    
    // Upload both versions
    const highResBlobName = `${baseName}-high.jpg`;
    const lowResBlobName = `${baseName}-low.jpg`;
    
    const highResClient = container.getBlockBlobClient(highResBlobName);
    const lowResClient = container.getBlockBlobClient(lowResBlobName);
    
    await Promise.all([
      highResClient.upload(highResBuffer, highResBuffer.length, {
        blobHTTPHeaders: { blobContentType: 'image/jpeg' },
      }),
      lowResClient.upload(lowResBuffer, lowResBuffer.length, {
        blobHTTPHeaders: { blobContentType: 'image/jpeg' },
      }),
    ]);
    
    // Generate SAS URLs for both
    const [highUrl, lowUrl] = await Promise.all([
      generateSasUrl(highResBlobName),
      generateSasUrl(lowResBlobName),
    ]);
    
    return {
      high: highUrl,
      low: lowUrl,
    };
  } catch (error: any) {
    // If sharp processing fails, fall back to uploading original as high-res only
    console.warn('[Blob] Image processing failed, uploading original:', error.message);
    
    const blobName = `${baseName}${ext}`;
    const blockBlobClient = container.getBlockBlobClient(blobName);
    await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    
    const url = await generateSasUrl(blobName);
    
    // Return same URL for both (fallback - no low-res version)
    return {
      high: url,
      low: url,
    };
  }
}

/**
 * Legacy function for backwards compatibility - returns high-res URL as string
 * @deprecated Use uploadImage which returns ImageUrls object
 */
export async function uploadImageLegacy(file: Buffer, contentType: string, originalName: string): Promise<string> {
  const urls = await uploadImage(file, contentType, originalName);
  return urls.high;
}

/**
 * Deletes an image from blob storage.
 * If the URL is a high-res image (ends with -high.jpg), also deletes the corresponding low-res version.
 * If the URL is a low-res image (ends with -low.jpg), also deletes the corresponding high-res version.
 * Legacy single URLs are deleted as-is.
 */
export async function deleteImage(imageUrl: string | ImageUrls): Promise<void> {
  try {
    const container = getContainerClient();
    
    // Handle ImageUrls object (new format)
    if (typeof imageUrl === 'object' && imageUrl.high && imageUrl.low) {
      await Promise.all([
        deleteImageByUrl(imageUrl.high),
        deleteImageByUrl(imageUrl.low),
      ]);
      return;
    }
    
    // Handle string URL (legacy or single URL)
    const url = typeof imageUrl === 'string' ? imageUrl : imageUrl.high || imageUrl.low;
    if (!url) return;
    
    await deleteImageByUrl(url);
    
    // If this is a high-res or low-res image, try to delete the corresponding version
    const urlWithoutSas = url.split('?')[0];
    const blobName = urlWithoutSas.split('/').pop() || '';
    
    if (blobName.endsWith('-high.jpg')) {
      // Delete corresponding low-res version
      const lowResBlobName = blobName.replace('-high.jpg', '-low.jpg');
      const lowResClient = container.getBlockBlobClient(lowResBlobName);
      await lowResClient.deleteIfExists();
    } else if (blobName.endsWith('-low.jpg')) {
      // Delete corresponding high-res version
      const highResBlobName = blobName.replace('-low.jpg', '-high.jpg');
      const highResClient = container.getBlockBlobClient(highResBlobName);
      await highResClient.deleteIfExists();
    }
  } catch (error) {
    // Log but don't fail if blob deletion fails
    console.error('Failed to delete blob:', error);
  }
}

/**
 * Helper function to delete a single image by URL
 */
async function deleteImageByUrl(imageUrl: string): Promise<void> {
  const container = getContainerClient();
  const urlWithoutSas = imageUrl.split('?')[0];
  const urlParts = urlWithoutSas.split('/');
  const blobName = urlParts[urlParts.length - 1];
  const blockBlobClient = container.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}
