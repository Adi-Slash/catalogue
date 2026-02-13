import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetsByHousehold } from '../shared/cosmos';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';

export async function getAssets(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const assets = await getAssetsByHousehold(householdId);
    return addCorsHeaders({
      status: 200,
      jsonBody: assets,
    });
  } catch (error: any) {
    context.error('Error getting assets:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('getAssets', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'assets',
  handler: getAssets,
});
