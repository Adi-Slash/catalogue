import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetById, updateAsset } from '../shared/cosmos';
import { addCorsHeaders } from '../shared/cors';
import { getHouseholdId } from '../shared/auth';
import type { Asset } from '../shared/types';

export async function updateAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const householdId = getHouseholdId(request);
    if (!householdId) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: 'Unauthorized - authentication required' },
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

    const body = await request.json() as Partial<Asset>;
    const updated: Asset = {
      ...existing,
      ...body,
      id: existing.id, // Ensure ID doesn't change
      householdId: existing.householdId, // Ensure householdId doesn't change
      updatedAt: new Date().toISOString(),
    };

    const result = await updateAsset(updated);
    return addCorsHeaders({
      status: 200,
      jsonBody: result,
    });
  } catch (error: any) {
    context.error('Error updating asset:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('updateAsset', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'assets/{id}',
  handler: updateAssetHandler,
});
