import { useAuth } from '../contexts/AuthContext';

/**
 * Gets the household ID from the authenticated user.
 * For now, we use the user's ID as the household ID.
 * In the future, this could be derived from a custom claim or user attribute.
 * 
 * In local development without authentication, returns a default test household ID.
 */
export function useHouseholdId(): string | null {
  const { user } = useAuth();
  
  // In local development without auth, use a default test household ID
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!user && isLocalDev) {
    return 'adrian-test-household';
  }
  
  if (!user) return null;
  
  // Use userId as householdId for now (all users in same household share same userId pattern)
  // In production, you might want to use a custom claim like 'householdId' from Azure AD B2C
  return user.userId;
}

/**
 * Gets an authentication token for API calls.
 * Static Web Apps provides this via /.auth/me, but for API calls,
 * we need to get the access token from the authentication provider.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const response = await fetch('/.auth/me');
    if (response.ok) {
      // Static Web Apps provides access tokens in the clientPrincipal
      // For Azure AD B2C, we may need to get the token differently
      // For now, return null and let the API handle authentication via headers
      await response.json();
      return null;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  return null;
}
