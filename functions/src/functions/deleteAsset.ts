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

    // Delete the image from blob storage if it exists
    if (existing.imageUrl) {
      await deleteImage(existing.imageUrl);
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
