# Assets Catalogue – C4 Architecture

This folder contains C4 model diagrams (Context, Container, Component, Deployment) for the **Assets Catalogue** Azure-based application, in Mermaid C4 syntax.

## Application Summary

| Item | Description |
|------|-------------|
| **Name** | Assets Catalogue |
| **Purpose** | Store and manage household asset information for insurance purposes. |
| **Primary users** | Home owner (multi-tenant; each user maintains their own asset list). |
| **External systems** | None. |

## Diagram Index

| Diagram | File | Description |
|---------|------|-------------|
| **Context** | [01-c4-context.md](01-c4-context.md) | System boundary, users, and relationships. |
| **Container** | [02-c4-container.md](02-c4-container.md) | Breakdown into Azure services (SWA, Functions, Cosmos DB, Storage, etc.). |
| **Component** | [03-c4-component.md](03-c4-component.md) | Internal structure of the API (Azure Functions). |
| **Deployment** | [04-c4-deployment.md](04-c4-deployment.md) | Azure infrastructure, regions, and PaaS boundaries. |

## Assumptions and Conventions

- **Identity**: Authentication is via **Azure Entra ID**; Static Web Apps forwards the identity token to the backend. APIs require an authenticated user (multi-tenant by household/user).
- **Chatbot / AI**: The insurance chatbot can be backed by **OpenAI** or **Azure AI Foundry** (e.g. Azure OpenAI). The Container/Deployment diagrams show “Azure AI Foundry” as the chosen Azure-native option; implementation may use OpenAI API key or Azure OpenAI endpoint.
- **Observability**: **Application Insights** is the assumed observability backend for the Function App and (where applicable) Static Web Apps; it is shown in the deployment view.
- **Availability**: Target 99.9% availability; no explicit multi-region or scale-out requirements are assumed beyond single-region PaaS.
- **Regions**: All resources are assumed to be in a single Azure region (e.g. the resource group location) unless otherwise noted.
- **Networking**: No custom VNets/subnets are assumed; services use default PaaS endpoints and managed identity where applicable.

## How to View Diagrams

- Paste the Mermaid code blocks from each `.md` file into [Mermaid Live Editor](https://mermaid.live) or any editor/CI that supports Mermaid (e.g. GitHub, Azure DevOps, VS Code with a Mermaid extension).
- C4 diagram types used: `C4Context`, `C4Container`, `C4Component`, `C4Deployment`.

## References

- [C4 Model](https://c4model.com/)
- [Mermaid C4 syntax](https://mermaid.js.org/syntax/c4.html)
- [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) (syntax-aligned with Mermaid C4)
