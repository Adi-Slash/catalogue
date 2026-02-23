Feature: Image upload and proxy API

  Background:
    Given the client has a valid x-ms-client-principal header

  Scenario: POST /api/upload with valid image file returns 200 and imageUrls
    When the client sends POST to "/api/upload" with authentication
    And the request body is multipart form-data with field "image" containing an image file
    And the file has a valid image type
    Then the response status code is 200
    And the response body is JSON with key "imageUrl" as string
    And the response body is JSON with key "imageUrls" as object with "high" and "low" string URLs
    And the high and low resolution images are stored in Blob Storage
    And the frontend stores the returned URLs for use in asset create or update payload

  Scenario: POST /api/upload with no file returns 400
    When the client sends POST to "/api/upload" with authentication
    And the request body is multipart form-data without field "image" or with empty file
    Then the response status code is 400
    And the response body is JSON with key "error" containing "No file uploaded"
    And no blob is created in Blob Storage
    And the frontend does not add an image URL to the form

  Scenario: POST /api/upload without authentication returns 401
    When the client sends POST to "/api/upload" without x-ms-client-principal
    And the request body contains a valid image file
    Then the response status code is 401
    And no blob is created in Blob Storage

  Scenario: Frontend uploads up to four images before creating asset
    Given the user has added four image files to the add-asset form
    When the user submits the form
    Then the frontend sends POST /api/upload once per image in sequence or parallel
    And each successful response provides imageUrls
    And the frontend builds imageUrls array with at most four entries
    And the frontend sends POST /api/assets with the combined payload including imageUrls

  Scenario: Frontend enforces maximum four photos per asset
    Given the asset form already has four images
    When the user attempts to add another image
    Then the frontend prevents adding more or shows validation message
    And no fifth POST /api/upload is sent for that asset

  Scenario: GET /api/proxy-image with valid blob URL returns 200 and image bytes
    Given the client has a valid Azure Blob Storage URL for an image in the asset-images container
    When the client sends GET to "/api/proxy-image" with query parameter "url" equal to the blob URL
    And the request includes authentication
    Then the response status code is 200
    And the response header "Content-Type" is an image type
    And the response body is binary image data
    And the response includes CORS headers allowing the frontend origin to use the image

  Scenario: GET /api/proxy-image without url query parameter returns 400
    When the client sends GET to "/api/proxy-image" with authentication and no url parameter
    Then the response status code is 400
    And the response body is JSON with key "error" containing "Missing url query parameter"

  Scenario: GET /api/proxy-image with non-blob URL returns 400
    When the client sends GET to "/api/proxy-image?url=https://example.com/image.jpg" with authentication
    Then the response status code is 400
    And the response body is JSON with key "error" containing "Invalid blob storage URL format"

  Scenario: GET /api/proxy-image for non-existent blob returns 404
    Given the url parameter points to a valid blob URL format but the blob does not exist
    When the client sends GET to "/api/proxy-image" with that url and authentication
    Then the response status code is 404
    And the response body is JSON with key "error" containing "Image not found"

  Scenario: GET /api/proxy-image without authentication returns 401
    When the client sends GET to "/api/proxy-image?url=https://account.blob.core.windows.net/asset-images/name.jpg" without authentication
    Then the response status code is 401
    And no blob data is returned

  Scenario: Frontend uses proxy-image for PDF generation when image URL is Azure Blob
    Given the user has triggered insurance claim PDF generation for an asset with Azure Blob image URLs
    When the PDF generator loads each image
    Then for each URL containing ".blob.core.windows.net" the frontend requests GET /api/proxy-image?url=<encoded-url>
    And the frontend uses the returned image bytes to draw on canvas and embed in PDF
    And the frontend does not request blob URL directly to avoid CORS or tainted canvas

  Scenario: Upload returns dual resolution URLs for list and detail views
    When POST /api/upload completes successfully
    Then the response imageUrls.low is used by the frontend for asset list card thumbnails
    And the response imageUrls.high is used by the frontend for asset detail and edit view
    And both URLs point to the same blob container with different blob names or same blob for legacy

  Scenario: Backend returns 500 when Blob Storage fails during upload
    Given Blob Storage is unavailable or upload fails
    When the client sends POST to "/api/upload" with authentication and valid image
    Then the response status code is 500
    And the response body is JSON with key "error" containing "Internal server error"
    And the frontend shows upload error and may allow retry
