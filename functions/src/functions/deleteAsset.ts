import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetById, deleteAsset } from '../shared/cosmos';
import { deleteImage } from '../shared/blob';

export async function deleteAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const householdId = request.headers.get('x-household-id');
    if (!householdId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing x-household-id header' },
      };
    }

    const id = request.params.id;
    if (!id) {
      return {
        status: 400,
        jsonBody: { error: 'Missing asset id' },
      };
    }

    const existing = await getAssetById(id, householdId);
    if (!existing) {
      return {
        status: 404,
        jsonBody: { error: 'Not found' },
      };
    }

    // Delete the image from blob storage if it exists
    if (existing.imageUrl) {
      await deleteImage(existing.imageUrl);
    }

    // Delete the asset from Cosmos DB
    await deleteAsset(id, householdId);

    return {
      status: 200,
      jsonBody: { deleted: true, id },
    };
  } catch (error: any) {
    context.log.error('Error deleting asset:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('deleteAsset', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'assets/{id}',
  handler: deleteAssetHandler,
});
