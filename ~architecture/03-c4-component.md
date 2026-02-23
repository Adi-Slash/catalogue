# C4 Level 3 – Component Diagram (Backend API)

## Diagram

```mermaid
C4Component
    title Component Diagram - Backend API (Azure Functions)

    Container_Boundary(api, "Backend API - Azure Functions") {
        Component(opt, "Options Handler", "Node.js", "Handles CORS preflight OPTIONS for all routes")
        Component(assets_api, "Assets API", "Node.js", "getAssets, getAsset, createAsset, updateAsset, deleteAsset; validates auth and householdId")
        Component(upload, "Upload & Proxy", "Node.js", "uploadImage: store in Blob; proxyImage: fetch Blob and return with CORS for PDF/client")
        Component(chat_fn, "Chat Function", "Node.js", "chat: accepts message + optional assets context; calls OpenAI/Azure AI or rule-based fallback")
        Component(prefs_api, "User Preferences API", "Node.js", "getUserPreferences, updateUserPreferences; locale and theme per user")
        Component(auth, "Auth", "Node.js", "requireAuthentication: validates x-ms-client-principal / JWT from SWA")
        Component(cosmos_sdk, "Cosmos Client", "Node.js", "Cosmos DB read/write for assets and user preferences")
        Component(blob_sdk, "Blob Client", "Node.js", "Blob Storage upload, delete, SAS generation; optional sharp for image processing")
    }

    Component_Ext(ai_ext, "Azure AI Foundry / OpenAI", "HTTPS", "Insurance chatbot model")

    Rel(opt, auth, "Uses")
    Rel(assets_api, auth, "Uses")
    Rel(assets_api, cosmos_sdk, "Reads/Writes")
    Rel(assets_api, blob_sdk, "References URLs / delete")
    Rel(upload, auth, "Uses")
    Rel(upload, blob_sdk, "Upload/Read")
    Rel(chat_fn, auth, "Uses")
    Rel(chat_fn, ai_ext, "Calls", "OpenAI/Azure OpenAI")
    Rel(prefs_api, auth, "Uses")
    Rel(prefs_api, cosmos_sdk, "Reads/Writes")
```

## Explanation

- **Options Handler**: Responds to OPTIONS for CORS; typically registered first so preflight succeeds for all routes.
- **Assets API**: Implements CRUD for assets. Uses Auth for identity and householdId; persists data via Cosmos Client; coordinates with Blob for image URLs and delete.
- **Upload & Proxy**: Upload stores files in Blob (with optional resizing); proxy fetches from Blob and returns the response with CORS headers so the client (e.g. PDF generator) can load images without tainting.
- **Chat Function**: Authenticated; takes user message and optional asset context; calls Azure AI Foundry / OpenAI for replies or falls back to rule-based responses.
- **User Preferences API**: Get/update user preferences (e.g. language, dark mode) stored in Cosmos, keyed by user/household.
- **Auth**: Shared middleware that requires a valid client principal (from Static Web Apps) or JWT; used by all business functions.
- **Cosmos Client / Blob Client**: Shared data access; Blob Client may use sharp for image processing (e.g. thumbnails) where applicable.

The diagram shows the API as the container and its major components; the external AI service is shown as `Container_Ext` to keep the diagram within the C4 component scope of the backend.
