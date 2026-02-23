Feature: Assets CRUD API and frontend behavior

  Background:
    Given the client has a valid x-ms-client-principal header
    And the householdId is derived from the principal userId

  Scenario: GET /api/assets returns 200 and array of assets for household
    When the client sends GET to "/api/assets" with authentication
    Then the response status code is 200
    And the response body is a JSON array
    And each element may contain id, householdId, make, model, serialNumber, description, category, value, datePurchased, imageUrl, imageUrls, createdAt, updatedAt
    And only assets with matching householdId are returned
    And the frontend stores the array and renders asset list or empty state

  Scenario: GET /api/assets returns empty array when no assets exist
    Given the household has no assets in Cosmos DB
    When the client sends GET to "/api/assets" with authentication
    Then the response status code is 200
    And the response body is JSON array with length 0
    And the frontend shows empty state message

  Scenario: GET /api/assets/:id with valid id returns 200 and asset
    Given an asset exists with id "asset-123" and householdId matching the principal
    When the client sends GET to "/api/assets/asset-123" with authentication
    Then the response status code is 200
    And the response body is JSON with key "id" equal to "asset-123"
    And the response body contains make, model, value, imageUrls or imageUrl
    And the frontend displays asset detail and edit form

  Scenario: GET /api/assets/:id with missing id returns 400
    When the client sends GET to "/api/assets/" with authentication
    Then the response status code is 400
    And the response body is JSON with key "error" containing "Missing asset id"
    And the frontend does not update asset state

  Scenario: GET /api/assets/:id for non-existent asset returns 404
    Given no asset exists with id "nonexistent" for the household
    When the client sends GET to "/api/assets/nonexistent" with authentication
    Then the response status code is 404
    And the response body is JSON with key "error" containing "Not found"
    And the frontend shows asset not found or redirects to list

  Scenario: GET /api/assets/:id for asset belonging to another household returns 404
    Given an asset exists with id "other-asset" and a different householdId
    When the client sends GET to "/api/assets/other-asset" with authentication for household A
    Then the response status code is 404
    And the response body is JSON with key "error" containing "Not found"
    And no asset data is returned

  Scenario: POST /api/assets with valid payload creates asset and returns 201
    Given the request body is valid new asset JSON with make, model, value as number, optional imageUrls
    When the client sends POST to "/api/assets" with authentication
    And the body contains make "Apple", model "iPhone 15", value 999, category "electrical"
    Then the response status code is 201
    And the response body is JSON with key "id" present
    And the response body has householdId equal to the authenticated householdId
    And the response body has make "Apple", model "iPhone 15", value 999
    And the asset is persisted in Cosmos DB with partition key householdId
    And the frontend navigates to asset list or detail with the new asset

  Scenario: POST /api/assets with invalid value type returns 400
    When the client sends POST to "/api/assets" with authentication
    And the body contains value as string "999" instead of number
    Then the response status code is 400
    And the response body is JSON with key "error" containing "Invalid value"
    And no asset is persisted in Cosmos DB

  Scenario: POST /api/assets accepts imageUrls array of ImageUrls objects
    When the client sends POST to "/api/assets" with authentication
    And the body contains imageUrls as array of objects with "high" and "low" URL strings
    Then the response status code is 201
    And the response body contains imageUrls with same structure
    And the asset is persisted with imageUrls in Cosmos DB

  Scenario: PUT /api/assets/:id with valid payload updates asset and returns 200
    Given an asset exists with id "asset-123" for the household
    When the client sends PUT to "/api/assets/asset-123" with authentication
    And the body contains make "Updated Make", value 1200
    Then the response status code is 200
    And the response body is JSON with id "asset-123" and make "Updated Make", value 1200
    And the asset is updated in Cosmos DB and updatedAt is changed
    And the frontend updates the displayed asset

  Scenario: PUT /api/assets/:id with missing id returns 400
    When the client sends PUT to "/api/assets/" with authentication and valid body
    Then the response status code is 400
    And the response body is JSON with key "error" containing "Missing asset id"

  Scenario: PUT /api/assets/:id for non-existent asset returns 404
    Given no asset exists with id "nonexistent" for the household
    When the client sends PUT to "/api/assets/nonexistent" with authentication and valid body
    Then the response status code is 404
    And the response body is JSON with key "error" containing "Not found"
    And no asset is created or updated in Cosmos DB

  Scenario: DELETE /api/assets/:id deletes asset and blobs and returns 200
    Given an asset exists with id "asset-123" and has imageUrls pointing to blob storage
    When the client sends DELETE to "/api/assets/asset-123" with authentication
    Then the response status code is 200
    And the response body is JSON with key "deleted" true and key "id" "asset-123"
    And the asset document is removed from Cosmos DB
    And the associated blobs are deleted from Blob Storage
    And the frontend navigates to asset list or removes the asset from list

  Scenario: DELETE /api/assets/:id with missing id returns 400
    When the client sends DELETE to "/api/assets/" with authentication
    Then the response status code is 400
    And the response body is JSON with key "error" containing "Missing asset id"

  Scenario: DELETE /api/assets/:id for non-existent asset returns 404
    Given no asset exists with id "nonexistent" for the household
    When the client sends DELETE to "/api/assets/nonexistent" with authentication
    Then the response status code is 404
    And the response body is JSON with key "error" containing "Not found"
    And no deletion occurs in Cosmos DB or Blob Storage

  Scenario: Frontend filters asset list by category
    Given GET /api/assets returned assets with mixed categories
    When the user selects a category tab
    Then the frontend filters the in-memory array by category
    And only assets matching the selected category are displayed
    And no new API call is made for filtering

  Scenario: Frontend filters asset list by search term
    Given GET /api/assets returned a list of assets
    When the user enters a search term in the header search bar
    Then the frontend filters the list by make, model, or description matching the term
    And the displayed list updates without a new API call

  Scenario Outline: Asset category values are accepted
    When the client sends POST to "/api/assets" with authentication
    And the body contains category "<category>"
    Then the response status code is 201
    And the response body has category "<category>"

    Examples:
      | category   |
      | electrical |
      | fitness    |
      | furniture  |
      | instrument |
      | jewellery  |
      | tools      |
      | transport  |

  Scenario: Backend returns 500 on Cosmos DB failure
    Given Cosmos DB is unavailable or returns an error
    When the client sends GET to "/api/assets" with authentication
    Then the response status code is 500
    And the response body is JSON with key "error" containing "Internal server error"
    And the frontend shows error message or retry option
