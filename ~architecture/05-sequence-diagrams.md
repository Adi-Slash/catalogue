# Sequence Diagrams – User Interactions

This document contains Mermaid sequence diagrams for each major user interaction in the **Assets Catalogue** application. Participants are the main components: **User** (browser), **Web App** (Static Web App / React), **API** (Azure Functions), **Cosmos DB**, **Blob Storage**, **Entra ID**, and **AI** (Azure AI Foundry / OpenAI) where relevant.

---

## 1. Sign in (Authentication)

User initiates sign-in; SWA redirects to Entra ID and, after login, redirects back. The app then checks auth via `/.auth/me`.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant Entra as Entra ID

    User->>WebApp: Click Sign In
    WebApp->>User: Redirect to /.auth/login/aad
    User->>Entra: Authenticate (login)
    Entra->>User: Redirect back to SWA (with auth cookie)
    User->>WebApp: Load app (e.g. /assets)
    WebApp->>WebApp: GET /.auth/me (credentials: include)
    Note over WebApp: SWA returns clientPrincipal from cookie
    WebApp->>User: Render app with user context
```

---

## 2. Load asset list

User opens the assets page; the app fetches the list for the current household and optionally applies client-side search/filter.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant Cosmos as Cosmos DB

    User->>WebApp: Navigate to /assets (or /)
    WebApp->>WebApp: Resolve user/householdId (from auth)
    WebApp->>API: GET /api/assets (credentials: include)
    Note over API: SWA proxy adds x-ms-client-principal
    API->>API: Validate auth, extract householdId
    API->>Cosmos: Query assets by partition (householdId)
    Cosmos-->>API: Assets[]
    API-->>WebApp: 200 OK, JSON assets
    WebApp->>User: Render asset list (cards, categories, search)
```

---

## 3. Add new asset (with photos)

User fills the add-asset form and submits. The app uploads each photo first, then creates the asset with the returned image URLs.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant Blob as Blob Storage
    participant Cosmos as Cosmos DB

    User->>WebApp: Fill form, add up to 4 photos, Submit
    loop For each photo
        WebApp->>API: POST /api/upload (FormData image)
        API->>API: Validate auth, householdId
        API->>Blob: Upload image (low + high res)
        Blob-->>API: URLs
        API-->>WebApp: 200 OK, imageUrls { high, low }
    end
    WebApp->>WebApp: Build payload (metadata + imageUrls[])
    WebApp->>API: POST /api/assets (JSON payload)
    API->>API: Validate auth, householdId
    API->>Cosmos: Insert asset (partition: householdId)
    Cosmos-->>API: Created asset
    API-->>WebApp: 201 Created, asset
    WebApp->>User: Navigate to /assets
```

---

## 4. View asset detail

User opens a single asset to view (and optionally edit) its details.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant Cosmos as Cosmos DB

    User->>WebApp: Click asset card (navigate to /assets/:id)
    WebApp->>API: GET /api/assets/:id (credentials: include)
    API->>API: Validate auth, householdId
    API->>Cosmos: Get asset by id (partition: householdId)
    Cosmos-->>API: Asset or 404
    API-->>WebApp: 200 OK (asset) or 404
    WebApp->>User: Render detail (images, metadata, edit form, Insurance Claim, Delete)
```

---

## 5. Edit asset

User updates asset details and/or photos on the detail page and saves.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant Blob as Blob Storage
    participant Cosmos as Cosmos DB

    User->>WebApp: Edit fields/photos, Click Save
    loop For each new/replaced photo
        WebApp->>API: POST /api/upload (FormData)
        API->>Blob: Store image(s)
        Blob-->>API: URLs
        API-->>WebApp: imageUrls
    end
    WebApp->>API: PATCH /api/assets/:id (JSON payload)
    API->>API: Validate auth, householdId
    API->>Cosmos: Upsert asset (replace by id)
    Cosmos-->>API: Updated asset
    API-->>WebApp: 200 OK, asset
    WebApp->>User: Update UI / stay on detail
```

---

## 6. Delete asset

User deletes an asset from the detail page (or list). API removes the asset document and optionally blob data.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant Cosmos as Cosmos DB
    participant Blob as Blob Storage

    User->>WebApp: Click Delete, Confirm
    WebApp->>API: DELETE /api/assets/:id (credentials: include)
    API->>API: Validate auth, householdId
    API->>Cosmos: Delete asset by id (partition: householdId)
    API->>Blob: Delete blob(s) for asset images (if applicable)
    Blob-->>API: OK
    Cosmos-->>API: OK
    API-->>WebApp: 204 No Content
    WebApp->>User: Navigate to /assets (or remove from list)
```

---

## 7. Generate insurance claim PDF

User triggers “Insurance Claim” on the asset detail page. The app generates the PDF in the browser; for Azure Blob image URLs it uses the proxy to avoid CORS/tainted canvas.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant Blob as Blob Storage

    User->>WebApp: Click Insurance Claim, Confirm
    WebApp->>WebApp: Start PDF generation (jsPDF, client-side)
    loop For each asset image URL
        alt URL is Azure Blob
            WebApp->>API: GET /api/proxy-image?url=<blob-url>
            API->>API: Validate auth
            API->>Blob: Get blob (by URL / key)
            Blob-->>API: Image bytes
            API-->>WebApp: 200 OK, image (CORS headers)
        else Local/blob URL
            WebApp->>WebApp: Fetch or use blob URL
        end
    end
    WebApp->>WebApp: Draw images to canvas, add to PDF
    WebApp->>User: Download PDF (insurance claim document)
```

---

## 8. Insurance chatbot (send message)

User types a message in the chatbot; the app sends it (with optional asset context and language) to the API, which calls AI and returns the reply.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant AI as Azure AI / OpenAI

    User->>WebApp: Type message, Send
    WebApp->>API: POST /api/chat (message, assets[], language)
    API->>API: Validate auth
    API->>AI: Chat completion (system + user message, optional asset summary)
    AI-->>API: Assistant reply
    API-->>WebApp: 200 OK, { response }
    WebApp->>User: Append assistant message to chat
```

---

## 9. Load and update user preferences (language, dark mode)

On load, the app fetches user preferences; when the user changes language or dark mode, it updates preferences via the API.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant WebApp as Web App (SWA)
    participant API as Backend API
    participant Cosmos as Cosmos DB

    Note over WebApp: App load (user authenticated)
    WebApp->>API: GET /api/user-preferences (credentials: include)
    API->>API: Validate auth, resolve userId
    API->>Cosmos: Get user preferences (by userId)
    Cosmos-->>API: Preferences or default
    API-->>WebApp: 200 OK, { language, darkMode, ... }
    WebApp->>User: Apply theme and locale

    User->>WebApp: Toggle dark mode / change language
    WebApp->>API: PATCH /api/user-preferences (body: { darkMode } or { language })
    API->>Cosmos: Upsert user preferences
    Cosmos-->>API: OK
    API-->>WebApp: 200 OK, updated preferences
    WebApp->>User: Re-render with new theme/locale
```

---

## Summary of interactions

| # | Interaction            | Main components involved                                      |
|---|------------------------|---------------------------------------------------------------|
| 1 | Sign in                | User, Web App, Entra ID                                       |
| 2 | Load asset list        | User, Web App, API, Cosmos DB                                |
| 3 | Add new asset          | User, Web App, API, Blob Storage, Cosmos DB                  |
| 4 | View asset detail      | User, Web App, API, Cosmos DB                                |
| 5 | Edit asset             | User, Web App, API, Blob Storage, Cosmos DB                  |
| 6 | Delete asset           | User, Web App, API, Cosmos DB, Blob Storage                  |
| 7 | Generate claim PDF     | User, Web App, API (proxy-image), Blob Storage              |
| 8 | Chat (insurance)       | User, Web App, API, Azure AI / OpenAI                        |
| 9 | User preferences       | User, Web App, API, Cosmos DB                                |

All API calls from the Web App go through the Static Web Apps proxy when deployed, which forwards the authenticated client principal to the Backend API.
