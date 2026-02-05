# Azure Infrastructure (Phase 8)

This folder contains an **Azure Bicep** template to provision the core infrastructure described in the specification and Phase 8 of `docs/04 todo.md`.

Resources created:

- Azure Storage Account (for Functions + Blob)
- Blob container `asset-images` (for asset photos)
- Azure Cosmos DB account, database `assetsdb`, container `assets` partitioned by `/householdId`
- Azure Functions App (HTTP API backend)
- Azure Static Web App (frontend hosting)

> **Note**  
> Actual Azure resources are **not created automatically** from this repository.  
> You must run the commands below in an Azure‑authenticated environment.

## Prerequisites

- Azure CLI installed (`az`)
- Logged in to Azure:  
  `az login`
- Target resource group created (from TODO: `rg-ak-aai-003`):  
  `az group create -n rg-ak-aai-003 -l westeurope`

## Deploying the Infrastructure

From the repository root:

```bash
cd source
az deployment group create \
  -g rg-ak-aai-003 \
  -f infra/main.bicep \
  -p baseName=ak-aai-003
```

This will:

- Create / update the storage account, blob container, Cosmos DB, Function App and Static Web App.
- Output:
  - `cosmosConnectionString`
  - `storageAccountName`
  - `staticWebUrl`

You can use the outputs to configure:

- Azure Functions `local.settings.json` / application settings.
- Frontend environment variables (e.g. API base URL, image base URL).

## Next Steps (Manual Verification)

To satisfy the Phase 8 acceptance criteria you should, in Azure:

1. **Deploy the frontend build** (`npm run build`) to the Static Web App.
2. **Deploy the Functions project** (HTTP‑triggered API) to the Function App.
3. Configure Function App application settings:
   - `COSMOS_CONNECTION_STRING` (from deployment output)
   - `BLOB_ACCOUNT_NAME` and `BLOB_CONTAINER_NAME` (match the template)
4. Confirm:
   - You can invoke an HTTP Function endpoint successfully.
   - The Function can read/write documents in the `assets` Cosmos container.
   - The Function can store and retrieve blobs from the `asset-images` container.

Once these checks pass in Azure, you can mark Phase 8 as ✅ in `docs/04 todo.md`.

