# Microsoft Entra ID Authentication Setup Guide

This guide explains how to set up Microsoft Entra ID (formerly Azure AD) authentication for the Asset Catalogue application.

## Overview

Azure Static Web Apps has built-in support for Microsoft Entra ID authentication. This makes setup much simpler than custom authentication providers. Users can authenticate using their Microsoft work or school accounts.

## Prerequisites

- Azure subscription
- Azure Static Web App deployed
- Microsoft Entra ID tenant (or access to one)

## Step 1: Configure Authentication in Azure Portal

### Option A: Use Built-in Microsoft Entra ID (Simplest)

Azure Static Web Apps provides Microsoft Entra ID authentication out of the box. No additional configuration is needed in the Azure Portal for basic authentication.

1. Navigate to your Static Web App in the [Azure Portal](https://portal.azure.com)
2. Go to **Authentication** in the left menu
3. Click **Add identity provider**
4. Select **Microsoft** from the provider list
5. Choose **Add** - this enables the built-in Microsoft Entra ID authentication

### Option B: Configure Custom Microsoft Entra ID App Registration (Advanced)

If you need more control or want to use a specific Entra ID application:

1. **Register an App in Microsoft Entra ID:**
   - Navigate to [Azure Portal](https://portal.azure.com) > **Microsoft Entra ID** > **App registrations**
   - Click **New registration**
   - Name: `Asset Catalogue App`
   - Supported account types: Choose based on your needs:
     - **Accounts in this organizational directory only** - Single tenant
     - **Accounts in any organizational directory** - Multi-tenant
   - Redirect URI: 
     - Platform: **Web**
     - URI: `https://<your-static-web-app-name>.azurestaticapps.net/.auth/login/aad/callback`
   - Click **Register**
   - Note the **Application (client) ID** - you'll need this

2. **Enable ID tokens (required for Static Web Apps):**
   - In your app registration, go to **Authentication**
   - Under **Implicit grant and hybrid flows**, enable **ID tokens**
   - This is required; otherwise you will get error **AADSTS700054: response_type 'id_token' is not enabled for the application**
   - Click **Save**

3. **Create a Client Secret:**
   - In your app registration, go to **Certificates & secrets**
   - Click **New client secret**
   - Description: `Static Web App Secret`
   - Expires: Choose expiration (recommend 24 months)
   - Click **Add**
   - **IMPORTANT**: Copy the secret value immediately - you won't be able to see it again

4. **Configure API Permissions (if needed):**
   - Go to **API permissions**
   - Add permissions as needed (e.g., Microsoft Graph API)
   - Click **Grant admin consent** if required

5. **Configure Static Web App Application Settings:**
   - Navigate to your Static Web App in Azure Portal
   - Go to **Configuration** > **Application settings** (or **Environment variables** in the portal)
   - Add the following application settings:
     - **AZURE_CLIENT_ID**: Your application (client) ID from step 1
     - **AZURE_CLIENT_SECRET**: The client secret *value* from step 2. The config uses `clientSecretSettingName: "AZURE_CLIENT_SECRET"`, so the platform reads the app setting named **AZURE_CLIENT_SECRET** and uses its value as the secret.
   - Click **Save** to apply the changes
   
   **Note:** The `staticwebapp.config.json` file is already configured to use these application setting names. The tenant ID (`feb0dacb-1322-4fe2-bee7-bcd1eb07fb95`) is hardcoded in the configuration file.

## Step 2: Configure staticwebapp.config.json

The `staticwebapp.config.json` file is configured to use Microsoft Entra ID authentication with a custom app registration:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/feb0dacb-1322-4fe2-bee7-bcd1eb07fb95/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  }
}
```

**Configuration details:**
- Login route: `/.auth/login/aad`
- Logout route: `/.auth/logout`
- Protected routes: `/assets/*` requires authentication
- Unauthorized redirect: Redirects to `/login` on 401
- Tenant ID: `feb0dacb-1322-4fe2-bee7-bcd1eb07fb95`

**Required Application Settings:**
You must configure the following application settings in your Static Web App:
- `AZURE_CLIENT_ID`: Your Microsoft Entra ID application (client) ID
- `AZURE_CLIENT_SECRET`: Your Microsoft Entra ID client secret value

## Step 3: Test Authentication

1. Deploy your application to Azure Static Web Apps
2. Navigate to your application URL
3. You should be redirected to the login page if not authenticated
4. Click "Sign In" and you should be redirected to Microsoft Entra ID
5. Sign in with a Microsoft work or school account
6. After successful authentication, you should be redirected back to your application

## Step 4: Configure User Access (Optional)

### Restrict Access to Specific Users/Groups

If you want to restrict access to specific users or groups:

1. In your Static Web App, go to **Authentication**
2. Click on the **Microsoft** identity provider
3. Under **Restrict access**, you can:
   - **Allow unauthenticated requests**: Keep enabled for public access
   - **Require authentication**: Enable to require all users to authenticate
   - **Action to take when request is not authenticated**: Choose redirect to login

### Use Role-Based Access Control

You can assign users to roles in Microsoft Entra ID and use those roles in your `staticwebapp.config.json`:

1. In Microsoft Entra ID, go to **App registrations** > Your app > **App roles**
2. Create custom roles (e.g., `Admin`, `User`)
3. Assign users to roles
4. Update `staticwebapp.config.json` to check for specific roles:
   ```json
   {
     "route": "/admin/*",
     "allowedRoles": ["Admin"]
   }
   ```

## Local Development

For local development, authentication will not work exactly as in production because Static Web Apps authentication endpoints are not available locally. You can:

1. Use the mock server which accepts `x-household-id` header
2. Or test authentication by deploying to Azure Static Web Apps

## Troubleshooting

### AADSTS700054: response_type 'id_token' is not enabled for the application

This error appears after clicking Sign in when the app registration does not allow ID token issuance.

**Fix:**
1. Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**
2. Open your application (the one whose Client ID is in `AZURE_CLIENT_ID`)
3. Go to **Authentication**
4. Under **Implicit grant and hybrid flows**, check **ID tokens**
5. Click **Save**

Static Web Apps uses the OpenID Connect flow and expects an ID token; this setting must be enabled.

### Users cannot sign in
- Verify the redirect URI in Microsoft Entra ID matches your Static Web App URL
- Check that authentication is enabled in the Static Web App
- Ensure the app registration is configured correctly
- Ensure **ID tokens** is enabled under Authentication → Implicit grant and hybrid flows

### 401 Unauthorized errors
- Verify users have access to the application in Microsoft Entra ID
- Check that the authentication provider is properly configured
- Ensure routes are correctly protected in `staticwebapp.config.json`

### clientPrincipal is null after logging in
If you sign in successfully but `/.auth/me` returns `clientPrincipal: null` (or the app never shows you as logged in), the session cookie was likely never set. Check the following:

1. **Callback URL in Entra ID**
   - In the app registration, **Authentication** → **Web** → **Redirect URIs** must include exactly:
     - `https://<your-static-web-app-host>/.auth/login/aad/callback`
   - Use the real host (e.g. `something.azurestaticapps.net` or your custom domain). No trailing slash.

2. **ID tokens**
   - In the app registration, **Authentication** → **Implicit grant and hybrid flows** → **ID tokens** must be enabled (see AADSTS700054 above).

3. **Application settings**
   - **AZURE_CLIENT_ID**: must be the Application (client) ID from the same app registration that has the redirect URI and ID tokens.
   - **AZURE_CLIENT_SECRET**: must be the client secret value from that app registration. If the callback returns 401, the secret or redirect URI is usually wrong.

4. **401 on the callback**
   - If you see a 401 or error page when redirected to `/.auth/login/aad/callback`, the login did not complete and no cookie is set. Fix redirect URI and secret; ensure ID tokens are enabled.

5. **Debug in the browser**
   - Open DevTools → Network. After login, check:
     - Request to `/.auth/login/aad/callback`: should return **302** to your app, not 401/500.
     - Request to `/.auth/me`: should return **200** with JSON containing `clientPrincipal` (not null). If you get 200 but `clientPrincipal` is null, the app logs the full response in the console for debugging.

### Token validation issues
- Ensure the Functions app is configured to validate tokens from Microsoft Entra ID
- Check that the token issuer matches your Entra ID tenant domain
- Verify the `x-ms-client-principal` header is being forwarded correctly

## Differences from Azure AD B2C

- **Simpler setup**: No need for user flows or custom OpenID Connect configuration
- **Built-in support**: Microsoft Entra ID is a first-class provider in Static Web Apps
- **Enterprise focus**: Designed for work/school accounts rather than customer-facing apps
- **No custom claims needed**: Standard claims are available out of the box

## Next Steps

After setting up authentication:
1. Verify Azure Functions can extract user information from the `x-ms-client-principal` header
2. Test the full authentication flow end-to-end
3. Configure user access restrictions if needed
4. Set up role-based access control if required
