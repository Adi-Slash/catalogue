Feature: Error handling, security, and edge cases

  Background:
    Given the application is deployed with Static Web Apps and Azure Functions
    And API base is the SWA origin so requests go through the proxy

  Scenario: API returns 500 and frontend shows error message
    Given the backend returns status 500 with body { "error": "Internal server error", "details": "optional" }
    When the frontend receives the response after an API call
    Then the frontend does not assume success
    And the frontend shows an error message to the user or displays error state
    And the frontend may offer retry for idempotent operations

  Scenario: Frontend does not fallback to direct Functions URL in production
    Given the environment is production
    And a request via SWA proxy fails with 404 or network error
    When the frontend would otherwise call the Functions app URL directly
    Then the frontend must not call the Functions URL directly when credentials would bypass SWA token validation
    And the frontend may show configuration error or link SWA to Functions message
    And user preferences and other APIs follow the same rule

  Scenario: Asset list load failure leaves UI in loading or error state
    Given GET /api/assets is called and returns 500 or network error
    When the response is received or fetch rejects
    Then the frontend sets error state or shows error message
    And the asset list is not rendered with stale or empty data without user feedback
    And the user may retry or refresh

  Scenario: Create asset fails after uploads succeeded
    Given the user submitted add-asset form and POST /api/upload succeeded for all images
    And POST /api/assets is then sent and returns 500
    When the frontend receives the 500 response
    Then the frontend shows error message to the user
    And the frontend does not navigate away as if create succeeded
    And the blobs already uploaded may remain in storage until cleaned up or reused

  Scenario: Concurrency two users same householdId see only their data
    Given user A and user B share the same householdId in multi-tenant model
    When user A creates an asset and user B lists assets
    Then GET /api/assets for user B returns assets for that householdId including A's new asset when consistent
    And each request is authenticated with principal and householdId derived from it
    And no user can request another household's data by changing headers in production

  Scenario: Invalid JSON body returns 400 or 500
    When the client sends POST to "/api/assets" with authentication
    And the request body is not valid JSON or is malformed
    Then the backend may return 400 with error message or 500
    And the frontend does not assume 201 and does not update UI as if asset was created

  Scenario: OPTIONS preflight is sent before state-changing requests when CORS requires it
    Given the frontend runs in a browser that sends CORS preflight for POST or PUT with JSON
    When the frontend sends POST to "/api/assets" or PUT to "/api/assets/:id"
    Then the browser may send OPTIONS request first to the same URL
    And the backend responds with 204 and Allow and Access-Control-* headers
    And the actual request is sent only after successful preflight

  Scenario: Azure deployment slot or configuration does not expose unauthenticated API
    Given the Azure Functions app is deployed to a slot or production
    And the app setting for identity or SWA link is misconfigured
    When an unauthenticated client sends GET to the Functions app URL directly
    Then the API returns 401 for protected routes
    And the Functions app does not accept x-household-id in production to bypass auth
    And Application Insights may log authentication failures for diagnostics

  Scenario: Validation make and model required for asset create in frontend
    Given the user is on the add-asset form
    When the user submits without entering make or model
    Then the frontend validates and does not send POST /api/assets
    Or the frontend sends and backend accepts empty string; product owner may require backend validation
    And the user sees validation message for required fields

  Scenario: Value field accepts only numeric input for asset
    Given the user is on the add-asset or edit-asset form
    When the user enters a non-numeric value in the value field
    Then the frontend may restrict input to numbers or show validation on submit
    And if non-numeric value is sent to POST /api/assets the backend returns 400 Invalid value
    And the frontend does not persist invalid value

  Scenario: Id in URL path is used for get update delete and not overridden by body
    When the client sends PUT to "/api/assets/asset-123" with authentication
    And the request body contains a different "id" field
    Then the backend uses the path parameter id "asset-123" for lookup and update
    And the response body has id "asset-123"
    And the backend does not change the asset id from the body for security and consistency

  Scenario: householdId is never accepted from request body for create or update
    When the client sends POST to "/api/assets" with authentication
    And the request body contains "householdId" different from the principal's
    Then the backend sets householdId from the authenticated principal only
    And the created asset has householdId equal to the principal userId
    And when the client sends PUT to "/api/assets/:id" the backend does not update householdId from body
