import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAssetsByHousehold } from '../shared/cosmos';

export async function getAssets(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const householdId = request.headers.get('x-household-id');
    if (!householdId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing x-household-id header' },
      };
    }

    const assets = await getAssetsByHousehold(householdId);
    return {
      status: 200,
      jsonBody: assets,
    };
  } catch (error: any) {
    context.log.error('Error getting assets:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('getAssets', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'assets',
  handler: getAssets,
});
