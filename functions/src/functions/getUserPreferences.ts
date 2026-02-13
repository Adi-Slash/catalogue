import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserPreferences } from '../shared/userPreferences';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';

export async function getUserPreferencesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Require authentication - validates token via Azure Static Web Apps
    let userId: string;
    try {
      userId = requireAuthentication(request);
    } catch (authError: any) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: authError.message || 'Unauthorized - authentication required' },
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
      language: 'en', // Default to English
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
