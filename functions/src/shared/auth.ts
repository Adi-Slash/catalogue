import { HttpRequest } from '@azure/functions';

interface ClientPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
  claims: Record<string, string>;
}

/**
 * Checks if we're running in local development mode.
 * In production, only authenticated requests via Azure Static Web Apps are allowed.
 */
function isLocalDevelopment(): boolean {
  // Check for local development indicators
  return (
    process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ||
    process.env.WEBSITE_SITE_NAME === undefined ||
    process.env.ALLOW_LOCAL_AUTH === 'true'
  );
}

/**
 * Validates the structure of a client principal object.
 * Ensures required fields are present and properly formatted.
 */
function validateClientPrincipal(principal: any): principal is ClientPrincipal {
  if (!principal || typeof principal !== 'object') {
    return false;
  }

  // Required fields
  if (
    typeof principal.userId !== 'string' ||
    principal.userId.length === 0 ||
    typeof principal.userDetails !== 'string' ||
    typeof principal.identityProvider !== 'string' ||
    !Array.isArray(principal.userRoles)
  ) {
    return false;
  }

  // Validate identity provider is from a trusted source
  const trustedProviders = ['aad', 'azureActiveDirectory', 'microsoft'];
  if (!trustedProviders.includes(principal.identityProvider.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Extracts and validates the client principal from the request headers.
 * Azure Static Web Apps forwards authentication information via the x-ms-client-principal header.
 * 
 * SECURITY: This header is only set by Azure Static Web Apps after validating the user's token.
 * The token validation happens at the SWA layer before the request reaches Functions.
 * 
 * @returns Validated client principal or null if not present/invalid
 */
export function getClientPrincipal(request: HttpRequest): ClientPrincipal | null {
  const clientPrincipalHeader = request.headers.get('x-ms-client-principal');
  if (!clientPrincipalHeader) {
    return null;
  }

  try {
    // The header is base64 encoded by Azure Static Web Apps
    const decoded = Buffer.from(clientPrincipalHeader, 'base64').toString('utf-8');
    const principal = JSON.parse(decoded);
    
    // Validate the structure and content
    if (!validateClientPrincipal(principal)) {
      console.error('Invalid client principal structure:', {
        hasUserId: !!principal?.userId,
        hasUserDetails: !!principal?.userDetails,
        identityProvider: principal?.identityProvider,
      });
      return null;
    }

    return principal as ClientPrincipal;
  } catch (error) {
    console.error('Failed to parse client principal:', error);
    return null;
  }
}

/**
 * Gets the user ID from an authenticated request.
 * 
 * SECURITY:
 * - In production: Only accepts validated client principal from Azure Static Web Apps
 * - In local dev: Allows x-household-id header for testing (when ALLOW_LOCAL_AUTH=true)
 * 
 * @returns User ID or null if not authenticated
 */
export function getUserId(request: HttpRequest): string | null {
  // First, try to get from validated Microsoft Entra ID client principal
  const principal = getClientPrincipal(request);
  if (principal) {
    return principal.userId;
  }

  // SECURITY: Only allow x-household-id fallback in local development
  if (isLocalDevelopment()) {
    const householdIdHeader = request.headers.get('x-household-id');
    if (householdIdHeader) {
      console.warn('[Auth] Using x-household-id header (local dev mode only)');
      return householdIdHeader;
    }
  } else {
    // In production, log if someone tries to use the insecure header
    if (request.headers.get('x-household-id')) {
      console.warn('[Auth] Security: x-household-id header ignored in production. Request must include x-ms-client-principal.');
    }
  }

  return null;
}

/**
 * Gets the household ID from the authenticated user.
 * Currently uses userId as householdId.
 * 
 * @deprecated Use getUserId() instead for clarity
 */
export function getHouseholdId(request: HttpRequest): string | null {
  return getUserId(request);
}

/**
 * Checks if the request is authenticated.
 * 
 * SECURITY:
 * - In production: Only returns true if client principal is present and validated
 * - In local dev: Also accepts x-household-id header
 * 
 * @returns true if request is authenticated, false otherwise
 */
export function isAuthenticated(request: HttpRequest): boolean {
  return getUserId(request) !== null;
}

/**
 * Validates that a request is authenticated and returns the user ID.
 * Throws an error if not authenticated.
 * 
 * @throws Error if request is not authenticated
 * @returns User ID
 */
export function requireAuthentication(request: HttpRequest): string {
  const userId = getUserId(request);
  if (!userId) {
    const isLocal = isLocalDevelopment();
    throw new Error(
      isLocal
        ? 'Unauthorized - authentication required. Provide x-ms-client-principal (from Azure Static Web Apps) or x-household-id (local dev only) header.'
        : 'Unauthorized - authentication required. Request must include x-ms-client-principal header from Azure Static Web Apps.'
    );
  }
  return userId;
}
