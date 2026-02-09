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

2. **Create a Client Secret:**
   - In your app registration, go to **Certificates & secrets**
   - Click **New client secret**
   - Description: `Static Web App Secret`
   - Expires: Choose expiration (recommend 24 months)
   - Click **Add**
   - **IMPORTANT**: Copy the secret value immediately - you won't be able to see it again

3. **Configure API Permissions (if needed):**
   - Go to **API permissions**
   - Add permissions as needed (e.g., Microsoft Graph API)
   - Click **Grant admin consent** if required

4. **Configure Static Web App Authentication:**
   - Navigate to your Static Web App in Azure Portal
   - Go to **Authentication** > **Add identity provider**
   - Select **Microsoft**
   - Choose **Advanced** configuration
   - Enter:
     - **Client ID**: Your application (client) ID from step 1
     - **Client secret**: The secret value from step 2
   - Click **Add**

## Step 2: Verify staticwebapp.config.json

The `staticwebapp.config.json` file is already configured to use Microsoft Entra ID authentication:

- Login route: `/.auth/login/aad`
- Logout route: `/.auth/logout`
- Protected routes: `/assets/*` requires authentication
- Unauthorized redirect: Redirects to `/login` on 401

No changes needed unless you want to customize the configuration.

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

### Users cannot sign in
- Verify the redirect URI in Microsoft Entra ID matches your Static Web App URL
- Check that authentication is enabled in the Static Web App
- Ensure the app registration is configured correctly

### 401 Unauthorized errors
- Verify users have access to the application in Microsoft Entra ID
- Check that the authentication provider is properly configured
- Ensure routes are correctly protected in `staticwebapp.config.json`

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
