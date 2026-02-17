import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';

const containerName = process.env.BLOB_CONTAINER_NAME || 'asset-images';
const connectionString = process.env.AzureWebJobsStorage || '';

/**
 * Extracts blob name from a blob storage URL
 */
function extractBlobNameFromUrl(url: string): string | null {
  try {
    // Parse URL to extract blob name
    // Format: https://{account}.blob.core.windows.net/{container}/{blob-name}?{sas-token}
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    if (pathParts.length >= 2) {
      // pathParts[0] is container name, pathParts[1+] is blob name
      return pathParts.slice(1).join('/');
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function proxyImageHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Require authentication - validates token via Azure Static Web Apps
    try {
      requireAuthentication(request);
    } catch (authError: any) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: authError.message || 'Unauthorized - authentication required' },
      });
    }

    // Get image URL from query parameter
    const imageUrl = request.query.get('url');
    
    if (!imageUrl) {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'Missing url query parameter' },
      });
    }

    // Extract blob name from URL
    const blobName = extractBlobNameFromUrl(imageUrl);
    
    if (!blobName) {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'Invalid blob storage URL format' },
      });
    }

    // Get blob from storage
    if (!connectionString) {
      return addCorsHeaders({
        status: 500,
        jsonBody: { error: 'AzureWebJobsStorage connection string not configured' },
      });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { error: 'Image not found' },
      });
    }

    // Download blob
    const downloadResponse = await blockBlobClient.download(0);
    const blobData = await streamToBuffer(downloadResponse.readableStreamBody!);
    
    // Get content type from blob properties
    const contentType = downloadResponse.contentType || 'image/jpeg';

    // Return image with CORS headers
    // Azure Functions v4 supports Buffer in body for binary data
    return addCorsHeaders({
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
      body: blobData,
    });
  } catch (error: any) {
    context.error('Error proxying image:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

/**
 * Converts a readable stream to a buffer
 */
async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data: Buffer) => {
      chunks.push(data);
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

app.http('proxyImage', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'proxy-image',
  handler: proxyImageHandler,
});
