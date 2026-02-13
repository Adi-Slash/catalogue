import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetById, deleteAsset } from '../shared/cosmos';
import { deleteImage } from '../shared/blob';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';

export async function deleteAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Require authentication - validates token via Azure Static Web Apps
    let householdId: string;
    try {
      householdId = requireAuthentication(request);
    } catch (authError: any) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: authError.message || 'Unauthorized - authentication required' },
      });
    }

    const id = request.params.id;
    if (!id) {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'Missing asset id' },
      });
    }

    const existing = await getAssetById(id, householdId);
    if (!existing) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { error: 'Not found' },
      });
    }

    // Delete all images from blob storage
    // Handle legacy imageUrl
    if (existing.imageUrl) {
      await deleteImage(existing.imageUrl);
    }
    
    // Handle imageUrls array (can contain strings or ImageUrls objects)
    if (existing.imageUrls && Array.isArray(existing.imageUrls)) {
      await Promise.all(
        existing.imageUrls.map(async (img) => {
          if (typeof img === 'string') {
            await deleteImage(img);
          } else if (img && typeof img === 'object' && 'high' in img) {
            // ImageUrls object
            await deleteImage(img);
          }
        })
      );
    }

    // Delete the asset from Cosmos DB
    await deleteAsset(id, householdId);

    return addCorsHeaders({
      status: 200,
      jsonBody: { deleted: true, id },
    });
  } catch (error: any) {
    context.error('Error deleting asset:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('deleteAsset', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'assets/{id}',
  handler: deleteAssetHandler,
});
