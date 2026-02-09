import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetsByHousehold } from '../shared/cosmos';
import { addCorsHeaders } from '../shared/cors';

export async function getAssets(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const householdId = request.headers.get('x-household-id');
    if (!householdId) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: 'Missing x-household-id header' },
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
