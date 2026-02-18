import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createAsset } from '../shared/cosmos';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';
import { v4 as uuidv4 } from 'uuid';
import type { Asset, ImageUrls } from '../shared/types';

export async function createAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = await request.json() as Partial<Asset>;
    if (typeof body.value !== 'number') {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'Invalid value' },
      });
    }

    const now = new Date().toISOString();
    // Handle imageUrls array - if provided, use it; otherwise fall back to imageUrl
    const bodyImageUrls: (string | ImageUrls)[] = Array.isArray(body.imageUrls)
      ? body.imageUrls
      : body.imageUrl
      ? [body.imageUrl]
      : [];
    
    // Extract high-res URL for legacy imageUrl field
    const firstImageUrl = bodyImageUrls.length > 0
      ? (typeof bodyImageUrls[0] === 'string' ? bodyImageUrls[0] : bodyImageUrls[0].high)
      : body.imageUrl || '';
    
    const asset: Asset = {
      id: uuidv4(),
      householdId,
      make: body.make || '',
      model: body.model || '',
      serialNumber: body.serialNumber || '',
      description: body.description || '',
      category: body.category || '',
      value: body.value,
      datePurchased: body.datePurchased || undefined,
      imageUrl: firstImageUrl, // Legacy field - use high-res URL from first image
      imageUrls: bodyImageUrls, // New field - can contain ImageUrls objects or strings
      createdAt: now,
      updatedAt: now,
    };

    const created = await createAsset(asset);
    return addCorsHeaders({
      status: 201,
      jsonBody: created,
    });
  } catch (error: any) {
    context.error('Error creating asset:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('createAsset', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'assets',
  handler: createAssetHandler,
});
