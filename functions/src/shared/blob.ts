import { BlobServiceClient, ContainerClient, BlobSASPermissions } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const containerName = process.env.BLOB_CONTAINER_NAME || 'asset-images';
const connectionString = process.env.AzureWebJobsStorage || '';

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

export async function uploadImage(file: Buffer, contentType: string, originalName: string): Promise<string> {
  const container = getContainerClient();
  
  // Ensure container exists
  await container.createIfNotExists({ access: 'blob' });
  
  // Generate unique filename
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  const blobName = `${uuidv4()}${ext}`;
  
  // Upload blob
  const blockBlobClient = container.getBlockBlobClient(blobName);
  await blockBlobClient.upload(file, file.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  
  // Generate SAS URL (valid for 1 year, read-only)
  // The generateSasUrl method is available on BlobClient (which BlockBlobClient extends)
  const expiresOn = new Date();
  expiresOn.setFullYear(expiresOn.getFullYear() + 1);
  
  const sasUrl = blockBlobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'), // Read only
    expiresOn,
  });
  
  return sasUrl;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    const container = getContainerClient();
    // Extract blob name from URL (remove SAS token if present)
    const urlWithoutSas = imageUrl.split('?')[0];
    const urlParts = urlWithoutSas.split('/');
    const blobName = urlParts[urlParts.length - 1];
    const blockBlobClient = container.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    // Log but don't fail if blob deletion fails
    console.error('Failed to delete blob:', error);
  }
}
