# Asset Catalog API - Azure Functions

This is the backend API for the Asset Catalog application, built with Azure Functions v4 (Node.js/TypeScript).

## Prerequisites

- Node.js 20.x
- Azure Functions Core Tools v4
- Azure subscription with resources deployed via Bicep template

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `local.settings.json` (not committed to git):
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://...;AccountKey=...;",
       "BLOB_ACCOUNT_NAME": "your-storage-account-name",
       "BLOB_CONTAINER_NAME": "asset-images"
     }
   }
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run locally:
   ```bash
   npm start
   ```

## Environment Variables

The following environment variables are required (set in Azure Function App Configuration):

- `AzureWebJobsStorage`: Storage account connection string for Functions runtime
- `COSMOS_CONNECTION_STRING`: Cosmos DB connection string
- `BLOB_ACCOUNT_NAME`: Storage account name for blob storage
- `BLOB_CONTAINER_NAME`: Blob container name (default: `asset-images`)

## API Endpoints

All endpoints require the `x-household-id` header for authentication.

- `GET /api/assets` - List all assets for a household
- `GET /api/assets/{id}` - Get a single asset
- `POST /api/assets` - Create a new asset
- `PUT /api/assets/{id}` - Update an asset
- `DELETE /api/assets/{id}` - Delete an asset
- `POST /api/upload` - Upload an image file

## Deployment

The Functions are automatically built and deployed via GitHub Actions when code is pushed to the `master` branch.

Manual deployment:
```bash
func azure functionapp publish func-api-ak-aai-003
```

## CORS Configuration

CORS must be configured in the Azure Function App settings to allow requests from the Static Web App frontend. Configure allowed origins in the Azure Portal under Function App > CORS settings.
