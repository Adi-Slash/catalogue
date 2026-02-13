import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetById, updateAsset } from '../shared/cosmos';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';
import type { Asset } from '../shared/types';

export async function updateAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = await request.json() as Partial<Asset>;
    
    // Handle imageUrls - if provided, ensure imageUrl is also set to the first element
    let imageUrls: string[] | undefined;
    let imageUrl: string | undefined;
    
    if (Array.isArray(body.imageUrls)) {
      // imageUrls is explicitly provided (could be empty array)
      imageUrls = body.imageUrls;
      imageUrl = imageUrls.length > 0 ? imageUrls[0] : body.imageUrl || existing.imageUrl || '';
    } else if (body.imageUrl) {
      // Only imageUrl is provided, create imageUrls array from it
      imageUrl = body.imageUrl;
      imageUrls = [body.imageUrl];
    } else {
      // Neither is provided, preserve existing values
      imageUrl = existing.imageUrl;
      imageUrls = existing.imageUrls;
    }
    
    const updated: Asset = {
      ...existing,
      ...body,
      id: existing.id, // Ensure ID doesn't change
      householdId: existing.householdId, // Ensure householdId doesn't change
      imageUrl: imageUrl || '',
      imageUrls: imageUrls,
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
