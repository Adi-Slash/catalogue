import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserPreferences, upsertUserPreferences } from '../shared/userPreferences';
import { addCorsHeaders } from '../shared/cors';
import { getClientPrincipal } from '../shared/auth';
import type { UserPreferences } from '../shared/types';

export async function updateUserPreferencesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const principal = getClientPrincipal(request);
    if (!principal) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: 'Unauthorized - authentication required' },
      });
    }

    const userId = principal.userId;
    const body = await request.json() as Partial<UserPreferences>;

    context.log(`[UserPreferences] Updating preferences for userId: ${userId}, darkMode: ${body.darkMode}`);

    // Get existing preferences or create new
    const existing = await getUserPreferences(userId);
    context.log(`[UserPreferences] Existing preferences:`, existing);
    
    const preferences: UserPreferences = {
      id: userId,
      userId: userId,
      darkMode: body.darkMode !== undefined ? body.darkMode : (existing?.darkMode ?? false),
      updatedAt: new Date().toISOString(),
    };

    context.log(`[UserPreferences] Saving preferences:`, preferences);
    const updated = await upsertUserPreferences(preferences);
    context.log(`[UserPreferences] Successfully saved preferences:`, updated);
    
    return addCorsHeaders({
      status: 200,
      jsonBody: updated,
    });
  } catch (error: any) {
    context.error('Error updating user preferences:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('updateUserPreferences', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'user/preferences',
  handler: updateUserPreferencesHandler,
});
