import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { uploadImage } from '../shared/blob';

export async function uploadImageHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const householdId = request.headers.get('x-household-id');
    if (!householdId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing x-household-id header' },
      };
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return {
        status: 400,
        jsonBody: { error: 'No file uploaded' },
      };
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to blob storage
    const blobUrl = await uploadImage(buffer, file.type, file.name);

    // Return the full blob URL
    return {
      status: 200,
      jsonBody: { imageUrl: blobUrl },
    };
  } catch (error: any) {
    context.error('Error uploading image:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('uploadImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'upload',
  handler: uploadImageHandler,
});
