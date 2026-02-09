import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { addCorsHeaders } from '../shared/cors';

export async function optionsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return addCorsHeaders({
    status: 200,
    jsonBody: { message: 'OK' },
  });
}

// Register OPTIONS handler for all routes
app.http('options', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: '{*catchall}',
  handler: optionsHandler,
});
