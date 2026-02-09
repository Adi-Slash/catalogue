# Azure AD B2C Authentication Setup Guide

This guide explains how to set up Azure AD B2C authentication for the Asset Catalogue application.

## Prerequisites

- Azure subscription
- Azure CLI installed and configured
- Access to create Azure AD B2C tenants

## Step 1: Create Azure AD B2C Tenant

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Search for "Azure AD B2C" and select it
3. Click "Create a new B2C tenant" or "Create new tenant"
4. Fill in the required information:
   - **Organization name**: Your organization name
   - **Initial domain name**: Choose a unique domain (e.g., `yourorgname.b2clogin.com`)
   - **Country/Region**: Select your region
   - **Resource group**: Create a new resource group or use existing
5. Click "Create" and wait for the tenant to be created

## Step 2: Register Application in Azure AD B2C

1. In the Azure Portal, navigate to your B2C tenant
2. Go to **App registrations** > **New registration**
3. Configure the application:
   - **Name**: Asset Catalogue App
   - **Supported account types**: Accounts in any identity provider or organizational directory
   - **Redirect URI**: 
     - Platform: Web
     - URI: `https://swa-ak-aai-003.azurestaticapps.net/.auth/login/aadb2c/callback`
     - For local development: `http://localhost:5173/.auth/login/aadb2c/callback`
4. Click "Register"
5. Note down the **Application (client) ID** - you'll need this later
6. Go to **Certificates & secrets** > **New client secret**
   - Description: Static Web App Secret
   - Expires: Choose an expiration (recommend 24 months)
   - Click "Add"
   - **IMPORTANT**: Copy the secret value immediately - you won't be able to see it again

## Step 3: Create User Flow (Sign-up and Sign-in)

1. In your B2C tenant, go to **User flows** > **New user flow**
2. Select **Sign up and sign in**
3. Select **Recommended** version
4. Configure the user flow:
   - **Name**: `B2C_1_signupsignin1` (or your preferred name)
   - **Identity providers**: 
     - Enable "Email signup"
     - Optionally enable social providers (Google, Facebook, etc.)
   - **User attributes and token claims**:
     - **Collect attributes**: Select attributes you want to collect (e.g., Display Name, Email Address)
     - **Return claims**: Select claims to return in the token (e.g., Display Name, Email Addresses, User's Object ID)
5. Click "Create"

## Step 4: Configure Static Web App Environment Variables

The Static Web App needs the following environment variables configured:

1. Navigate to your Static Web App in Azure Portal
2. Go to **Configuration** > **Application settings**
3. Add the following application settings:

   - **AADB2C_CLIENT_ID**: Your application (client) ID from Step 2
   - **AADB2C_CLIENT_SECRET**: The client secret value from Step 2
   - **AADB2C_OPENID_CONFIG**: The OpenID Connect configuration endpoint URL
     - Format: `https://<your-tenant-name>.b2clogin.com/<your-tenant-name>.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=<your-user-flow-name>`
     - Example: `https://yourorgname.b2clogin.com/yourorgname.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=B2C_1_signupsignin1`

4. Click "Save" to apply the changes

## Step 5: Update staticwebapp.config.json

The `staticwebapp.config.json` file is already configured to use Azure AD B2C authentication. It references the environment variables set in Step 4.

The configuration:
- Sets up routes for `/login` and `/logout`
- Protects `/assets/*` routes to require authentication
- Configures the custom OpenID Connect provider named `aadb2c`

## Step 6: Verify Authentication

1. Deploy your application to Azure Static Web Apps
2. Navigate to your application URL
3. You should be redirected to the login page
4. Click "Sign In" and you should be redirected to Azure AD B2C
5. Sign up or sign in with a test account
6. After successful authentication, you should be redirected back to your application

## Local Development

For local development, the authentication flow will not work exactly as in production because Static Web Apps authentication endpoints are not available locally. You can:

1. Use the mock server which accepts `x-household-id` header
2. Or configure a local redirect URI in Azure AD B2C and use a local authentication proxy

## Troubleshooting

### Users cannot sign in
- Verify the redirect URI in Azure AD B2C matches your Static Web App URL
- Check that environment variables are correctly set
- Verify the OpenID configuration URL is correct

### 401 Unauthorized errors
- Ensure the user flow name matches in the OpenID configuration URL
- Verify the client secret hasn't expired
- Check that the application is properly registered in Azure AD B2C

### Token validation issues
- Ensure the Functions app is configured to validate tokens from Azure AD B2C
- Check that the token issuer matches your B2C tenant domain

## Next Steps

After setting up authentication:
1. Update Azure Functions to validate Azure AD B2C tokens
2. Extract household ID from user claims or user attributes
3. Test the full authentication flow end-to-end
