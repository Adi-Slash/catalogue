# C4 Level 2 – Container Diagram

## Diagram

```mermaid
C4Container
    title Container Diagram - Assets Catalogue

    Person(homeowner, "Home Owner", "Catalogues assets and uses insurance features")

    Container_Boundary(assets_catalogue, "Assets Catalogue System") {
        Container(swa, "Web App", "Azure Static Web Apps, React", "SPA: asset list, add/edit asset, detail view, insurance claim PDF, chatbot UI. Localisation (EN/FR/DE/JA), light/dark mode.")
        Container(api, "Backend API", "Azure Functions (Node.js)", "REST API: assets CRUD, image upload, image proxy, user preferences, chat. Validates Entra ID token.")
        ContainerDb(cosmos, "Asset & Preferences Store", "Azure Cosmos DB (SQL API)", "Assets and user preferences; partitioned by householdId for multi-tenancy.")
        ContainerDb(blob, "Asset Images Store", "Azure Blob Storage", "Asset photos (e.g. low/high res); private access via SAS or API proxy.")
        Container(identity, "Identity", "Azure Entra ID", "Authentication; SWA forwards client principal to API.")
        Container(ai, "Insurance Chat", "Azure AI Foundry / OpenAI", "Insurance guidance chatbot; optional OpenAI API or Azure OpenAI.")
    }

    Rel(homeowner, swa, "Uses", "HTTPS")
    Rel(swa, identity, "Authenticates via", "OAuth2/OpenID Connect")
    Rel(swa, api, "Calls", "HTTPS (via SWA proxy)")
    Rel(api, identity, "Validates token", "JWT")
    Rel(api, cosmos, "Reads/Writes", "Cosmos SDK")
    Rel(api, blob, "Upload/Read/Delete", "Storage SDK, SAS")
    Rel(api, ai, "Sends chat requests", "HTTPS/OpenAI API")
```

## Explanation

- **Web App (Static Web Apps)**: Single-page React app. Provides asset list, add/edit, detail view, insurance claim PDF generation, and chatbot UI. Handles locale and theme; all API calls go through SWA proxy with authentication.
- **Backend API (Azure Functions)**: Node.js v4 model. Handles assets CRUD, image upload, image proxy (for CORS/PDF), user preferences, and chat. Authenticates requests using the identity provided by SWA (Entra ID).
- **Cosmos DB**: Persists assets and user preferences. Partition key `householdId` enforces multi-tenancy.
- **Blob Storage**: Stores asset images (e.g. up to 4 per asset); access is private (SAS or via proxy).
- **Identity (Entra ID)**: All user access is authenticated; no anonymous API access.
- **Insurance Chat**: Implemented via Azure AI Foundry or OpenAI; the API forwards user messages and optional context (e.g. asset summary) and returns assistant replies.

Technology choices are Azure-native and align with the prescribed stack: Entra ID, Functions, Cosmos DB, Application Insights (observability, implied), Azure AI Foundry, Storage, Static Web Apps.
