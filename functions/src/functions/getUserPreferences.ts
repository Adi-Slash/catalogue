import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserPreferences } from '../shared/userPreferences';
import { addCorsHeaders } from '../shared/cors';
import { getClientPrincipal } from '../shared/auth';

export async function getUserPreferencesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const principal = getClientPrincipal(request);
    // Fallback to x-household-id header for testing/direct API calls
    const householdIdHeader = request.headers.get('x-household-id');
    const userId = principal?.userId || householdIdHeader;
    
    if (!userId) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: 'Unauthorized - authentication required. Provide x-ms-client-principal or x-household-id header.' },
      });
    }
    context.log(`[UserPreferences] Getting preferences for userId: ${userId}`);
    const preferences = await getUserPreferences(userId);
    context.log(`[UserPreferences] Retrieved preferences:`, preferences);

    // Return default preferences if none exist
    const defaultPreferences = {
      id: userId,
      userId: userId,
      darkMode: false,
      language: undefined,
      updatedAt: new Date().toISOString(),
    };

    const result = preferences || defaultPreferences;
    context.log(`[UserPreferences] Returning preferences:`, result);
    
    return addCorsHeaders({
      status: 200,
      jsonBody: result,
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
