# Security Implementation

## Authentication & Authorization

### Token Validation Flow

1. **User Login**: User authenticates with Microsoft Entra ID via Azure Static Web Apps (SWA)
2. **Token Validation**: Azure Static Web Apps validates the ID token from Microsoft Entra ID
3. **Session Creation**: SWA creates a secure session cookie
4. **Request Forwarding**: When SWA proxies requests to Azure Functions, it adds the `x-ms-client-principal` header containing validated user claims
5. **Function Validation**: Azure Functions validate the client principal structure and trust SWA's validation

### Security Layers

#### Layer 1: Azure Static Web Apps (SWA)
- ✅ Validates Microsoft Entra ID ID tokens
- ✅ Creates secure session cookies
- ✅ Only forwards authenticated requests to Functions
- ✅ Adds `x-ms-client-principal` header with validated user claims

#### Layer 2: Azure Functions
- ✅ Validates client principal structure
- ✅ Verifies identity provider is from trusted sources (aad, azureActiveDirectory, microsoft)
- ✅ Requires authentication for all operations
- ✅ Rejects unauthenticated requests with 401

### Client Principal Validation

The `x-ms-client-principal` header is validated to ensure:
- Header is present and properly base64 encoded
- Contains required fields: `userId`, `userDetails`, `identityProvider`, `userRoles`
- `identityProvider` is from a trusted source
- Structure matches expected format

### Local Development

For local development, the `x-household-id` header is allowed **only** when:
- `AZURE_FUNCTIONS_ENVIRONMENT === 'Development'` OR
- `WEBSITE_SITE_NAME` is undefined OR
- `ALLOW_LOCAL_AUTH === 'true'`

**⚠️ Security Note**: The `x-household-id` header is **NOT validated** and should **NEVER** be used in production. It's only for local testing.

### Production Security

In production:
- ✅ Only `x-ms-client-principal` header is accepted
- ✅ `x-household-id` header is ignored and logged as a security warning
- ✅ All requests must come through Azure Static Web Apps proxy
- ✅ Direct calls to Functions URL require proper authentication

## API Security

### All Functions Require Authentication

All Azure Functions use `requireAuthentication()` which:
- Validates the client principal from SWA
- Returns 401 if authentication is missing or invalid
- Provides clear error messages

### Functions Updated

The following functions now use secure authentication:
- `getUserPreferences` - Get user preferences
- `updateUserPreferences` - Update user preferences
- `getAssets` - List assets
- `getAsset` - Get single asset
- `createAsset` - Create asset
- `updateAsset` - Update asset
- `deleteAsset` - Delete asset
- `uploadImage` - Upload image

## Security Best Practices

1. **Never bypass SWA proxy in production** - Always use the SWA proxy which validates tokens
2. **Don't use x-household-id in production** - This header can be spoofed
3. **Validate all user inputs** - Functions validate authentication but still validate business logic
4. **Log security events** - Invalid authentication attempts are logged
5. **Use HTTPS only** - All communication must be encrypted

## Testing Authentication

### Local Development
Set environment variable: `ALLOW_LOCAL_AUTH=true` to enable `x-household-id` header for testing.

### Production Testing
1. Deploy to Azure Static Web Apps
2. Log in via Microsoft Entra ID
3. Requests will automatically include `x-ms-client-principal` header
4. Functions will validate and process requests

## Troubleshooting

### 401 Unauthorized Errors

**Cause**: Missing or invalid authentication

**Solutions**:
1. Ensure user is logged in via Azure Static Web Apps
2. Check that `x-ms-client-principal` header is present
3. Verify Azure Static Web Apps is properly linked to Functions app
4. Check Application Insights logs for authentication errors

### Direct Function Calls Failing

**Cause**: Direct calls bypass SWA authentication

**Solution**: Always use Azure Static Web Apps proxy URL (`/api/*`) instead of direct Functions URL

## Security Audit

### What Changed

1. ✅ Removed unvalidated `x-household-id` fallback in production
2. ✅ Added client principal structure validation
3. ✅ Added identity provider validation
4. ✅ Added environment detection for local dev
5. ✅ Updated all functions to use `requireAuthentication()`
6. ✅ Added security logging for invalid attempts

### Security Improvements

- **Before**: Functions accepted unvalidated `x-household-id` header in production
- **After**: Functions only accept validated `x-ms-client-principal` from SWA in production

This prevents unauthorized access via header spoofing.
