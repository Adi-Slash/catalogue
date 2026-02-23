Feature: Authentication and authorization

  Background:
    Given the application is deployed with Azure Static Web Apps and Azure Entra ID
    And the Static Web Apps proxy is linked to the Azure Functions app

  Scenario: Unauthenticated request to GET /api/assets returns 401
    When the client sends a GET request to "/api/assets" without x-ms-client-principal
    And the request has credentials "include"
    Then the response status code is 401
    And the response body is JSON with key "error" containing "Unauthorized"
    And the frontend does not render the asset list
    And the frontend may redirect to login or show not authenticated state

  Scenario: Unauthenticated request to POST /api/assets returns 401
    When the client sends a POST request to "/api/assets" without x-ms-client-principal
    And the request body is valid asset JSON
    Then the response status code is 401
    And the response body is JSON with key "error" containing "Unauthorized"
    And no asset is persisted in Cosmos DB

  Scenario: Authenticated request with valid x-ms-client-principal succeeds
    Given the client has a valid x-ms-client-principal header from Azure Static Web Apps
    And the principal contains userId, userDetails, identityProvider "aad", userRoles
    When the client sends a GET request to "/api/assets" with the principal header
    Then the response status code is 200
    And the response body is a JSON array of assets for that householdId

  Scenario: In production x-household-id header is ignored
    Given the environment is production
    And the request has x-household-id header but no x-ms-client-principal
    When the client sends a GET request to "/api/assets"
    Then the response status code is 401
    And the backend does not use x-household-id for authentication

  Scenario: Frontend calls /.auth/me to resolve user after login redirect
    Given the user has been redirected back from Entra ID login
    When the frontend sends GET to "/.auth/me" with credentials "include"
    Then the response status code is 200
    And the response body is JSON with key "clientPrincipal"
    And clientPrincipal contains userId and userDetails
    And the frontend sets user context and allows access to protected routes

  Scenario: Frontend receives no clientPrincipal when not authenticated
    When the frontend sends GET to "/.auth/me" without valid auth cookie
    Then the response may be 200 with clientPrincipal null or 401
    And the frontend sets user to null and shows login or restricted UI

  Scenario Outline: All protected API endpoints require authentication
    When the client sends a <method> request to "<endpoint>" without authentication
    Then the response status code is 401
    And the response body is JSON with key "error"

    Examples:
      | method | endpoint        |
      | GET    | /api/assets     |
      | GET    | /api/assets/1   |
      | POST   | /api/assets     |
      | PUT    | /api/assets/1   |
      | DELETE | /api/assets/1   |
      | POST   | /api/upload     |
      | GET    | /api/proxy-image?url=https://x.blob.core.windows.net/c/b |
      | POST   | /api/chat       |
      | GET    | /api/user/preferences  |
      | PUT    | /api/user/preferences  |

  Scenario: CORS preflight OPTIONS returns 204
    When the client sends an OPTIONS request to "/api/assets"
    Then the response status code is 204
    And the response includes header "Access-Control-Allow-Origin"
    And the response includes header "Access-Control-Max-Age" with value "86400"
