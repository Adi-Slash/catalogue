# Troubleshooting Login Issues

## Issue: Login button doesn't redirect to login screen

### Symptoms
- Clicking the "Login" button doesn't redirect to Microsoft Entra ID
- No error messages appear
- Page doesn't change

### Possible Causes and Solutions

#### 1. Authentication Not Configured in Azure Portal

**Check:**
- Go to Azure Portal → Your Static Web App → Authentication
- Verify that Microsoft Entra ID is configured as an identity provider
- Check that the application settings are configured:
  - `AZURE_CLIENT_ID`
  - `AZURE_CLIENT_SECRET_APP_SETTING_NAME`

**Solution:**
- Configure Microsoft Entra ID authentication in Azure Portal
- Ensure application settings match the values in `staticwebapp.config.json`

#### 2. Redirect URI Not Configured in Entra ID App Registration

**Check:**
- Go to Azure Portal → Microsoft Entra ID → App registrations → Your app
- Navigate to Authentication
- Verify redirect URIs include:
  - `https://<your-static-web-app-name>.azurestaticapps.net/.auth/login/aad/callback`

**Solution:**
- Add the correct redirect URI to your Entra ID app registration
- The URI must match exactly (including protocol and domain)

#### 3. Browser Console Errors

**Check:**
- Open browser developer tools (F12)
- Check the Console tab for errors
- Check the Network tab to see if requests to `/.auth/login/aad` are being made

**Common Errors:**
- CORS errors: Check that the redirect URI is configured correctly
- 404 errors: Verify the authentication endpoint is accessible
- 401 errors: Check application settings

#### 4. Configuration File Not Deployed

**Check:**
- Verify `staticwebapp.config.json` is in the `dist` folder after build
- Check that the file is deployed to Azure Static Web Apps

**Solution:**
- Ensure the build process copies `staticwebapp.config.json` to `dist`
- Verify the file is included in the deployment

#### 5. JavaScript Errors Preventing Redirect

**Check:**
- Open browser developer tools → Console
- Look for JavaScript errors that might prevent the redirect

**Solution:**
- Fix any JavaScript errors
- Ensure React Router is not interfering with the redirect

### Testing Steps

1. **Test Authentication Endpoint Directly:**
   ```
   Navigate to: https://<your-app>.azurestaticapps.net/.auth/login/aad
   ```
   - Should redirect to Microsoft Entra ID login
   - If it doesn't, authentication is not configured correctly

2. **Test with Browser Console:**
   - Open browser console
   - Click login button
   - Check for console.log messages: "Login button clicked" and "Redirecting to login"
   - Verify the redirect URL is correct

3. **Check Network Requests:**
   - Open Network tab in developer tools
   - Click login button
   - Look for request to `/.auth/login/aad`
   - Check response status and headers

### Quick Fixes

1. **Try Direct Navigation:**
   ```javascript
   window.location.href = '/.auth/login/aad';
   ```

2. **Check Application Settings:**
   - Verify `AZURE_CLIENT_ID` is set
   - Verify `AZURE_CLIENT_SECRET_APP_SETTING_NAME` is set
   - Ensure values match your Entra ID app registration

3. **Verify Tenant ID:**
   - Check that the tenant ID in `staticwebapp.config.json` matches your Entra ID tenant
   - Current tenant ID: `feb0dacb-1322-4fe2-bee7-bcd1eb07fb95`

4. **Test Authentication Status:**
   - Navigate to: `https://<your-app>.azurestaticapps.net/.auth/me`
   - Should return JSON with authentication status
   - If it returns 401, authentication is working but user is not logged in
   - If it returns 404 or error, authentication is not configured

### Expected Behavior

When clicking the login button:
1. Console should log: "Login button clicked"
2. Console should log: "Redirecting to login: /.auth/login/aad?post_login_redirect_uri=..."
3. Browser should navigate to `/.auth/login/aad`
4. User should be redirected to Microsoft Entra ID login page
5. After successful login, user should be redirected back to the app

### Still Not Working?

1. Check Azure Static Web Apps logs in Azure Portal
2. Verify the app registration has correct permissions
3. Ensure the Static Web App is using the Standard plan (required for custom authentication)
4. Check that the authentication provider is enabled in Azure Portal
