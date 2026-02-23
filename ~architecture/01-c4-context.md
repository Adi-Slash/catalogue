# C4 Level 1 – System Context Diagram

## Diagram

```mermaid
C4Context
    title System Context Diagram - Assets Catalogue

    Person(homeowner, "Home Owner", "Uses the catalogue to store and manage household assets for insurance purposes")

    System_Boundary(assets_catalogue, "Assets Catalogue System") {
        System(ac_system, "Assets Catalogue", "Stores household asset information, photos, and supports insurance claim PDFs and an insurance guidance chatbot. Multi-tenant; each user maintains their own asset list.")
    }

    Rel(homeowner, ac_system, "Uses", "HTTPS")
```

## Explanation

- **Home Owner**: The only primary user; they use the system to catalogue household assets (with up to 4 photos per asset), assign categories and values, generate insurance claim PDFs, and use the insurance chatbot. Access is authenticated (e.g. via Azure Entra ID).
- **Assets Catalogue**: The software system in scope. There are no external systems; the system is self-contained for identity (Entra ID), storage (Cosmos DB, Blob), compute (Functions, Static Web Apps), and optional AI (Azure AI Foundry / OpenAI).
- **Relationship**: The home owner uses the system over HTTPS. All API access is restricted to authenticated users.
