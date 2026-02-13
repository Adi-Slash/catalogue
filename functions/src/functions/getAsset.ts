import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetById } from '../shared/cosmos';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';

export async function getAsset(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
