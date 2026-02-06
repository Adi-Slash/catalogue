import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createAsset } from '../shared/cosmos';
import { v4 as uuidv4 } from 'uuid';
import type { Asset } from '../shared/types';

export async function createAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const householdId = request.headers.get('x-household-id');
    if (!householdId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing x-household-id header' },
      };
    }

    const body = await request.json() as Partial<Asset>;
    if (typeof body.value !== 'number') {
      return {
        status: 400,
        jsonBody: { error: 'Invalid value' },
      };
    }

    const now = new Date().toISOString();
    const asset: Asset = {
      id: uuidv4(),
      householdId,
      make: body.make || '',
      model: body.model || '',
      serialNumber: body.serialNumber || '',
      description: body.description || '',
      category: body.category || '',
      value: body.value,
      imageUrl: body.imageUrl || '',
      createdAt: now,
      updatedAt: now,
    };

    const created = await createAsset(asset);
    return {
      status: 201,
      jsonBody: created,
    };
  } catch (error: any) {
    context.error('Error creating asset:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('createAsset', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'assets',
  handler: createAssetHandler,
});
