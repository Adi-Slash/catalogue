# Troubleshooting 503 Service Unavailable Error

## What a 503 Error Means

A "503 Service Unavailable" error indicates that the Azure Function App is not responding. This typically means:

1. **Function App is not deployed** - The Functions code hasn't been deployed successfully
2. **Function App failed to start** - There's a runtime error preventing the Functions from starting
3. **Cold start timeout** - On Consumption plan, the Function App is taking too long to start
4. **Configuration issue** - Missing environment variables or incorrect settings

## Steps to Diagnose

### 1. Check Function App Status in Azure Portal

1. Go to Azure Portal → Function App `func-api-ak-aai-003`
2. Check the **Overview** page - is the status "Running"?
3. Check **Functions** - are the functions listed? (getAssets, createAsset, etc.)
4. Check **Log stream** - are there any startup errors?

### 2. Check Deployment Status

1. Go to **Deployment Center** in the Function App
2. Check if the latest deployment succeeded
3. Check GitHub Actions workflow status

### 3. Check Application Insights / Logs

1. Go to **Log stream** in the Function App
2. Look for errors during startup
3. Common errors:
   - Missing environment variables (COSMOS_CONNECTION_STRING, AzureWebJobsStorage)
   - Module not found errors
   - Syntax errors in code

### 4. Verify Environment Variables

In Azure Portal → Function App → Configuration → Application settings, verify:

- `AzureWebJobsStorage` - Should be set to storage account connection string
- `FUNCTIONS_WORKER_RUNTIME` - Should be `node`
- `FUNCTIONS_EXTENSION_VERSION` - Should be `~4`
- `COSMOS_CONNECTION_STRING` - Should be set to Cosmos DB connection string
- `BLOB_ACCOUNT_NAME` - Should be set to storage account name
- `BLOB_CONTAINER_NAME` - Should be `asset-images`

### 5. Test Function Endpoint Directly

Try accessing the Function App directly:

```
https://func-api-ak-aai-003.azurewebsites.net/api/assets
```

With header: `x-household-id: house-1`

If this also returns 503, the Function App isn't starting.

## Common Fixes

### Fix 1: Restart Function App

1. Azure Portal → Function App → Overview
2. Click **Restart**
3. Wait 1-2 minutes
4. Try again

### Fix 2: Redeploy Functions

1. Push code changes to trigger GitHub Actions
2. Or manually deploy:
   ```bash
   cd functions
   func azure functionapp publish func-api-ak-aai-003
   ```

### Fix 3: Check Function App Logs

1. Azure Portal → Function App → Log stream
2. Look for errors mentioning:
   - "Cannot find module"
   - "COSMOS_CONNECTION_STRING"
   - "SyntaxError"
   - "TypeError"

### Fix 4: Verify Functions Are Registered

Check that `functions/src/index.ts` imports all functions:
- options
- getAssets
- getAsset
- createAsset
- updateAsset
- deleteAsset
- uploadImage

## Quick Test

Run this in browser console on your deployed app:

```javascript
fetch('https://func-api-ak-aai-003.azurewebsites.net/api/assets', {
  headers: { 'x-household-id': 'house-1' }
})
.then(r => console.log('Status:', r.status))
.catch(e => console.error('Error:', e));
```

If you get 503, the Function App isn't running.
If you get CORS error, CORS isn't configured (but Function App is running).
If you get 200, everything is working!
