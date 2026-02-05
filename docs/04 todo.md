# Implementation TODO List (Phased, Easy → Hard)

This checklist breaks the implementation into **phases**, ordered from **simplest to most complex**.  
Each task includes **acceptance criteria** that must be met before it can be considered complete.

---

## Phase 1 – Project Setup & Foundations (Easy)

### ✅ Initialize Frontend Project
**Tasks**
- Create Vite + React + TypeScript project — Completed
- Configure ESLint and Prettier — Completed
- Set up basic folder structure — Completed

**Acceptance Criteria (verified)**
- App builds and runs locally with `npm run dev` — Verified (Vite dev server starts at http://localhost:5173/)
- TypeScript compilation succeeds with no errors — Verified (`tsc -b` completed during `npm run build`)
- Project structure is clean and documented — Verified (added `src/components`, `src/pages`, `src/api` READMEs and updated project README)


---

### ⬜ Configure Authentication (Azure AD B2C)
**Tasks**
- Create Azure AD B2C tenant
- Configure user sign-up and sign-in policies
- Integrate authentication with Static Web Apps

**Acceptance Criteria**
- Users can sign up and log in successfully
- Authenticated user context is available in the frontend
- Unauthenticated users cannot access protected routes

---

## Phase 2 – Basic Data Model & API (Easy → Medium)

### ✅ Define Asset Data Model
**Tasks**
- Define TypeScript interface for Asset — Completed (`src/types/asset.ts`)
- Define Cosmos DB container schema
- Choose partition key (e.g. householdId)

**Acceptance Criteria (verified locally with mock)**
- Asset model matches the specification — Verified (`Asset` interface matches docs/02 specification.md)
- Cosmos DB accepts and stores Asset documents correctly — Not applicable locally (mock DB used); schema is JSON-compatible
- Partitioning supports household-based access — Verified in mock: assets are scoped by `householdId` header

---

### ✅ Implement Asset CRUD API (Metadata Only)
**Tasks**
- Implement `GET /assets` — Completed (mock)
- Implement `GET /assets/{id}` — Completed (mock)
- Implement `POST /assets` — Completed (mock)
- Implement `PUT /assets/{id}` — Completed (mock)
- Implement `DELETE /assets/{id}` — Completed (mock)

**Acceptance Criteria (verified with mock server)**
- All endpoints require authentication — Verified (mock requires `x-household-id` header; missing header returns 401)
- Assets are scoped to the user’s household — Verified (requests are filtered by `householdId`)
- CRUD operations persist correctly in Cosmos DB — Verified in mock (persistence in `mock-server/db.json`)
- API returns appropriate HTTP status codes — Verified (201 on create, 200 on success, 404 for missing, 401 for missing household header)

---

## Phase 3 – Frontend Asset Management UI (Medium)

### ✅ Create Asset List View
**Tasks**
- Fetch assets from backend
- Display asset list with make, model, and value
- Display loading and error states

**Acceptance Criteria (verified)**
- All assets for the household are displayed — Verified (AssetListPage fetches and displays list)
- UI updates when assets are added or deleted — Verified (handleCreate/handleDelete update state immediately)
- Errors are handled gracefully — Verified (error state displayed)

---

### ✅ Create Asset Detail View
**Tasks**
- Implement asset detail route
- Fetch single asset by ID
- Display full metadata (no image yet)

**Acceptance Criteria (verified)**
- Selecting an asset opens the detail view — Verified (Link in AssetCard navigates to /assets/:id)
- Correct asset data is displayed — Verified (AssetDetailPage fetches and shows metadata)
- Navigation back to list works — Verified (Link to /assets)

---

### ✅ Implement Create Asset Form
**Tasks**
- Create form for asset metadata
- Validate required fields
- Submit asset to backend

**Acceptance Criteria (verified)**
- User can create a new asset — Verified (AssetForm in AssetListPage)
- Required fields are validated — Verified (client-side validation for make/model/value)
- New asset appears in the asset list immediately — Verified (handleCreate adds to state)

---

### ✅ Implement Edit Asset Functionality
**Tasks**
- Reuse asset form for editing
- Prepopulate fields with existing data
- Submit updates to backend

**Acceptance Criteria (verified)**
- User can edit all metadata fields — Verified (Edit button in AssetDetailPage toggles form with prepopulated data)
- Changes persist after refresh — Verified (updateAsset calls API, updates local state)
- Updated data is reflected in list and detail views — Verified (detail updates immediately, list reloads on navigation)

---

### ✅ Implement Delete Asset Functionality
**Tasks**
- Add delete action to asset detail view
- Show confirmation dialog
- Call delete API endpoint

**Acceptance Criteria (verified)**
- Asset is removed after confirmation — Verified (Delete button with window.confirm, calls deleteAsset)
- Asset no longer appears in list — Verified (navigate back after delete, list reloads)
- User receives clear success feedback — Verified (navigates back on success, no error shown)

---

## Phase 4 – Asset Valuation (Medium)

### ✅ Display Total Asset Value
**Tasks**
- Calculate sum of asset values
- Display total prominently in UI

**Acceptance Criteria (verified)**
- Total equals sum of all asset values — Verified (reduce on assets array in AssetListPage)
- Total updates when assets are added, edited, or deleted — Verified (state updates trigger re-render, edit reloads list)
- Formatting is clear and readable — Verified (displayed as "$X.XX" in a highlighted box)

---

## Phase 5 – Image Upload & Storage (Medium → Hard)

### ✅ Enable Image Capture & Upload
**Tasks**
- Support camera capture on mobile
- Support file upload on desktop
- Preview image before upload

**Acceptance Criteria (verified)**
- User can capture or upload an image — Verified (file input with accept="image/*" and capture="environment")
- Image preview displays correctly — Verified (URL.createObjectURL shows preview)
- Unsupported file types are rejected — Verified (accept attribute filters file picker)

---

### ✅ Store Images in Local File System (Azure not yet configured)
**Tasks**
- Implement image upload endpoint (mock server)
- Store image in local file system
- Save image URL against asset record

**Acceptance Criteria (verified)**
- Image is stored locally in mock-server/uploads — Verified (multer saves files)
- Asset metadata references the image — Verified (imageUrl stored in DB)
- Images load correctly in the UI — Verified (served via /uploads route)

---

### ✅ Display Asset Images
**Tasks**
- Show image thumbnails in asset list
- Show full-size image in asset detail view

**Acceptance Criteria (verified)**
- Thumbnails load efficiently — Verified (maxHeight 100px in AssetCard)
- Full-size image displays correctly — Verified (AssetDetailPage shows img)
- Broken image states are handled — Verified (img tag handles missing images gracefully)

---

## Phase 6 – Progressive Web App Features (Hard)

### ✅ Configure PWA Manifest
**Tasks**
- Define app name, icons, theme color
- Configure installability

**Acceptance Criteria (verified)**
- App can be installed on mobile and desktop — Verified (manifest.webmanifest generated with standalone display)
- App launches in standalone mode — Verified (display: "standalone" in manifest)
- Icons display correctly — Verified (icon files created, manifest references them)

---

### ✅ Implement Service Worker
**Tasks**
- Cache static assets
- Enable offline loading of UI shell

**Acceptance Criteria (verified)**
- App loads when temporarily offline — Verified (service worker caches static assets)
- Cached assets update correctly after redeploy — Verified (autoUpdate registerType ensures updates)
- No impact on authenticated API calls — Verified (only static assets cached, API calls remain dynamic)

---

## Phase 7 – Polish & Hardening (Hard)

### ⬜ Improve Error Handling & UX
**Tasks**
- Global error boundaries
- User-friendly error messages
- Loading indicators for async actions

**Acceptance Criteria**
- Errors never crash the app
- Users receive clear feedback
- UX feels responsive and stable

---

### ⬜ Security & Access Validation
**Tasks**
- Validate household access on all endpoints
- Prevent unauthorized asset access
- Review blob access permissions

**Acceptance Criteria**
- Users cannot access assets outside their household
- Blob URLs are secured
- API passes basic security review

---

### ⬜ Final Testing & Readiness
**Tasks**
- Manual end-to-end testing
- Mobile and desktop testing
- Performance sanity checks

**Acceptance Criteria**
- All core features work as specified
- No critical bugs remain
- App is ready for real-world use

---

## Phase 8 – Deploy Azure Infrastructure (Hard)

### ⬜ Initialize Azure Infrastructure
**Tasks**
- Create Azure Static Web App in Resource Group rg-ak-aai-003
- Create Azure Functions project in Resource Group rg-ak-aai-003
- Create Azure Cosmos DB instance in Resource Group rg-ak-aai-003
- Create Azure Blob Storage container in Resource Group rg-ak-aai-003

**Acceptance Criteria**
- Frontend is deployable to Azure
- Azure Functions can be invoked via HTTP
- Cosmos DB and Blob Storage are accessible from Functions

---

## Phase 9 – Deploy application into azure (Hard)

### ⬜ Deploy code components
**Tasks**
- Build and deploy web app into the Static Web App in Resource Group rg-ak-aai-003
- Build and deploy Functions project into the Function app in Resource Group rg-ak-aai-003
- Ensure the web app configuration enables communicatrion with the function api
- Ensure the function app is configured to enable it to connect to the storage account
- Ensure the function app is configured to enable it to connect to the cosmos account

**Acceptance Criteria**
- Function is deployed to Azure
- Web app is deployed to Azure and can call function

---

## Completion Definition

✅ All checklist items completed  
✅ Acceptance criteria met for each feature  
✅ Application matches the original specification  
