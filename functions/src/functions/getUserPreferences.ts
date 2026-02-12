import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserPreferences } from '../shared/userPreferences';
import { addCorsHeaders } from '../shared/cors';
import { getClientPrincipal } from '../shared/auth';

export async function getUserPreferencesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const principal = getClientPrincipal(request);
    if (!principal) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: 'Unauthorized - authentication required' },
      });
    }

    const userId = principal.userId;
    const preferences = await getUserPreferences(userId);

    // Return default preferences if none exist
    const defaultPreferences = {
      id: userId,
      userId: userId,
      darkMode: false,
      updatedAt: new Date().toISOString(),
    };

    return addCorsHeaders({
      status: 200,
      jsonBody: preferences || defaultPreferences,
    });
  } catch (error: any) {
    context.error('Error getting user preferences:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('getUserPreferences', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'user/preferences',
  handler: getUserPreferencesHandler,
});
