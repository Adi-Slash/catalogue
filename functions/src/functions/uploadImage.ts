import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { uploadImage } from '../shared/blob';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';

export async function uploadImageHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'No file uploaded' },
      });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to blob storage
    const blobUrl = await uploadImage(buffer, file.type, file.name);

    // Return the full blob URL
    return addCorsHeaders({
      status: 200,
      jsonBody: { imageUrl: blobUrl },
    });
  } catch (error: any) {
    context.error('Error uploading image:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('uploadImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'upload',
  handler: uploadImageHandler,
});
