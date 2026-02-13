import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserPreferences, upsertUserPreferences } from '../shared/userPreferences';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';
import type { UserPreferences } from '../shared/types';

export async function updateUserPreferencesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
    const body = await request.json() as Partial<UserPreferences>;

    context.log(`[UserPreferences] Updating preferences for userId: ${userId}`);
    context.log(`[UserPreferences] Request body - darkMode: ${body.darkMode} (type: ${typeof body.darkMode}), language: ${body.language} (type: ${typeof body.language})`);
    context.log(`[UserPreferences] Full request body:`, JSON.stringify(body));

    // Get existing preferences or create new
    const existing = await getUserPreferences(userId);
    context.log(`[UserPreferences] Existing preferences:`, existing ? JSON.stringify(existing) : 'null');
    
    const preferences: UserPreferences = {
      id: userId,
      userId: userId,
      darkMode: body.darkMode !== undefined ? body.darkMode : (existing?.darkMode ?? false),
      language: body.language !== undefined ? body.language : (existing?.language ?? 'en'), // Default to 'en' if not provided
      updatedAt: new Date().toISOString(),
    };

    context.log(`[UserPreferences] Computed preferences to save:`, JSON.stringify(preferences));
    context.log(`[UserPreferences] darkMode value: ${preferences.darkMode} (type: ${typeof preferences.darkMode})`);
    try {
      const updated = await upsertUserPreferences(preferences);
      context.log(`[UserPreferences] Successfully saved preferences:`, JSON.stringify(updated));
      
      return addCorsHeaders({
        status: 200,
        jsonBody: updated,
      });
    } catch (upsertError: any) {
      context.error('[UserPreferences] Upsert failed:', upsertError);
      context.error('[UserPreferences] Upsert error details:', {
        message: upsertError.message,
        code: upsertError.code,
        stack: upsertError.stack
      });
      throw upsertError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    context.error('[UserPreferences] Error updating user preferences:', error);
    context.error('[UserPreferences] Full error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name
    });
    return addCorsHeaders({
      status: 500,
      jsonBody: { 
        error: 'Internal server error', 
        details: error.message,
        code: error.code || 'UNKNOWN'
      },
    });
  }
}

app.http('updateUserPreferences', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'user/preferences',
  handler: updateUserPreferencesHandler,
});
