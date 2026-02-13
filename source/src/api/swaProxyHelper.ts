/**
 * Helper functions for Azure Static Web Apps proxy configuration
 */

/**
 * Checks if the user is authenticated via Azure Static Web Apps
 * @returns Promise resolving to userId if authenticated, null otherwise
 */
export async function checkSWAAuthentication(): Promise<string | null> {
  try {
    const authUrl = `${window.location.origin}/.auth/me`;
    const response = await fetch(authUrl, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.clientPrincipal?.userId) {
          return data.clientPrincipal.userId;
        }
      }
    }
  } catch (error) {
    console.error('[SWAProxy] Failed to check authentication:', error);
  }
  return null;
}

/**
 * Provides instructions for linking Static Web Apps to Functions app
 */
export function getSWALinkingInstructions(): string {
  return `
🔧 STATIC WEB APPS NOT LINKED TO FUNCTIONS APP

To fix this issue:

1. Go to Azure Portal → Your Static Web App
2. Navigate to Settings → Backends
3. Click "Link" or "Add backend"
4. Select your Functions app: func-api-ak-aai-003
5. Save the configuration
6. Wait 2-3 minutes for the link to propagate
7. Refresh this page

The Static Web Apps proxy must be linked to your Functions app for API calls to work.
Without this link, requests to /api/* return 404.

Current Status:
- SWA Proxy: Not linked (404 errors)
- Functions App: func-api-ak-aai-003.azurewebsites.net
- Required: Link SWA → Functions in Azure Portal

For more information, see:
https://learn.microsoft.com/en-us/azure/static-web-apps/backend-integration
`;
}
