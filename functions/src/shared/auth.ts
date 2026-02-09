import { HttpRequest } from '@azure/functions';

interface ClientPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
  claims: Record<string, string>;
}

/**
 * Extracts the client principal from the request headers.
 * Azure Static Web Apps forwards authentication information via the x-ms-client-principal header.
 */
export function getClientPrincipal(request: HttpRequest): ClientPrincipal | null {
  const clientPrincipalHeader = request.headers.get('x-ms-client-principal');
  if (!clientPrincipalHeader) {
    return null;
  }

  try {
    // The header is base64 encoded
    const decoded = Buffer.from(clientPrincipalHeader, 'base64').toString('utf-8');
    const principal: ClientPrincipal = JSON.parse(decoded);
    return principal;
  } catch (error) {
    console.error('Failed to parse client principal:', error);
    return null;
  }
}

/**
 * Gets the household ID from the authenticated user.
 * 
 * Priority:
 * 1. From Microsoft Entra ID client principal (x-ms-client-principal header) - uses userId as householdId
 * 2. From x-household-id header (for local development/mock server compatibility)
 * 
 * In production, you might want to use a custom claim from Microsoft Entra ID.
 */
export function getHouseholdId(request: HttpRequest): string | null {
  // First, try to get from Microsoft Entra ID client principal
  const principal = getClientPrincipal(request);
  if (principal) {
    // Use userId as householdId for now
    // In the future, you could extract from a custom claim like principal.claims['householdId']
    return principal.userId;
  }

  // Fallback to x-household-id header for local development
  const householdIdHeader = request.headers.get('x-household-id');
  if (householdIdHeader) {
    return householdIdHeader;
  }

  return null;
}

/**
 * Checks if the request is authenticated.
 * Returns true if either:
 * - Client principal is present (Microsoft Entra ID authentication)
 * - x-household-id header is present (local development)
 */
export function isAuthenticated(request: HttpRequest): boolean {
  return getHouseholdId(request) !== null;
}
