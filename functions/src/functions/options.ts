import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function optionsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Handle OPTIONS preflight requests with CORS headers
  return {
    status: 204, // No Content for OPTIONS
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-household-id',
      'Access-Control-Max-Age': '86400',
    },
  };
}

// Register OPTIONS handler for all routes - this is a catch-all for preflight requests
app.http('options', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: '{*catchall}',
  handler: optionsHandler,
});
