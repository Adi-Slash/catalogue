# Asset Cataloging Web Application – Software Specification

## 1. Overview

The Asset Cataloging Application is a Progressive Web Application (PWA) designed to help users log and manage household assets for insurance purposes. The application allows multiple authenticated users belonging to a single household to catalogue items, attach photographs, store metadata, and view the total insured value of all assets.

The application is optimized for both mobile devices and desktop browsers and is designed to run as an installable PWA.

---

## 2. Goals & Objectives

- Provide a simple and reliable way to record household assets
- Support photo capture and upload on mobile and desktop devices
- Store asset data securely in Azure-hosted services
- Allow multiple household members to collaborate on a single asset catalogue
- Enable easy review, editing, and deletion of assets
- Display an aggregated total asset value for insurance estimation

---

## 3. Target Platform & Technology Stack

### Frontend
- Framework: React
- Language: TypeScript
- Build Tool: Vite
- UI: Responsive, mobile-first design
- Progressive Web App features:
  - Installable on mobile and desktop
  - Web app manifest
  - Service worker for static asset caching

### Backend (Azure-hosted)
- API: Azure Functions (HTTP-triggered REST API)
- Authentication: Microsoft Entra Id
- Database: Azure Cosmos DB (NoSQL / Core API)
- Image Storage: Azure Blob Storage
- Hosting:
  - Frontend: Azure Static Web Apps
  - Backend: Azure Functions

---

## 4. User Model & Authentication

- Users authenticate using Azure AD B2C
- Multiple users may log in to the same household
- All authenticated users share access to a single household asset catalogue
- Authorization is household-based, not per-user

---

## 5. Functional Requirements

### 5.1 Asset Management

#### Create Asset
- Users can add a new asset to the catalogue
- Required metadata fields:
  - Make
  - Model
  - Serial Number
  - Description
  - Estimated Value (numeric)
- Users can:
  - Capture a photo using the device camera
  - Upload an existing image file

#### View Asset List
- Display a list of all assets in the catalogue
- Each list item shows:
  - Thumbnail image
  - Make and model
  - Estimated value
- List updates dynamically when assets are added, edited, or deleted

#### View Asset Details
- Selecting an asset displays:
  - Full-size photograph
  - Complete metadata
- Asset detail view is read-only by default

#### Edit Asset
- Users can edit asset metadata
- Users can replace or update the associated photograph
- Changes are persisted immediately

#### Delete Asset
- Users can delete an asset from the catalogue
- Deletion removes:
  - Metadata from the database
  - Associated image from blob storage
- Deletion requires explicit user confirmation

---

### 5.2 Asset Valuation

- The application displays the total value of all assets
- The total updates automatically when:
  - Assets are added
  - Assets are edited
  - Assets are deleted

---

## 6. Data Model (High-Level)

### Asset
- id: string (UUID)
- householdId: string
- make: string
- model: string
- serialNumber: string
- description: string
- value: number
- imageUrl: string
- createdAt: datetime
- updatedAt: datetime

---

## 7. API Design (High-Level)

### REST Endpoints
- GET /assets  
  Returns all assets for the authenticated household

- GET /assets/{id}  
  Returns a single asset

- POST /assets  
  Creates a new asset

- PUT /assets/{id}  
  Updates an existing asset

- DELETE /assets/{id}  
  Deletes an asset and associated image

- POST /assets/{id}/image  
  Uploads or replaces an asset image

All endpoints:
- Require authentication
- Derive household context from the authenticated user

---

## 8. Non-Functional Requirements

### Performance
- Asset list loads within 2 seconds on typical mobile or broadband connections
- Image uploads provide progress feedback

### Security
- HTTPS enforced for all traffic
- Assets accessible only to authenticated household users
- Images stored privately and accessed via secured URLs

### Usability
- Mobile-first design
- Touch-friendly UI controls
- Clear visual feedback for save, edit, and delete actions

### Reliability
- Graceful handling of intermittent connectivity
- Offline usage is not required

---

## 9. Out of Scope

- Offline asset creation or synchronization
- Multiple households per user
- Insurance provider integrations
- Automatic valuation or depreciation
- Data export (PDF, CSV)

---

## 10. Assumptions & Constraints

- Each user belongs to exactly one household
- Internet connectivity is available during use
- Azure is the sole hosting platform
- Asset values are manually entered by users

---

## 11. Future Enhancements (Optional)

- Asset categorization (e.g. electronics, furniture)
- Exportable insurance reports (PDF)
- Change history and audit logging
- Role-based permissions (viewer/editor)
- Cloud backup and restore
