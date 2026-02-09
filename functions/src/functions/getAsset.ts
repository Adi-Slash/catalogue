import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetById } from '../shared/cosmos';
import { addCorsHeaders } from '../shared/cors';
import { getHouseholdId } from '../shared/auth';

export async function getAsset(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const asset = await getAssetById(id, householdId);
    if (!asset) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { error: 'Not found' },
      });
    }

    return addCorsHeaders({
      status: 200,
      jsonBody: asset,
    });
  } catch (error: any) {
    context.error('Error getting asset:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('getAsset', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'assets/{id}',
  handler: getAsset,
});
