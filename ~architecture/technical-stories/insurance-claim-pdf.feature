Feature: Insurance claim PDF generation and image loading

  Background:
    Given the user is authenticated and viewing an asset detail page
    And the asset has one or more image URLs

  Scenario: User triggers insurance claim PDF and confirms
    Given the asset has at least one image
    When the user clicks the Insurance Claim button
    Then the frontend shows a confirmation dialog
    And when the user confirms the frontend starts PDF generation
    And the frontend uses jsPDF or equivalent to create a PDF document client-side
    And the PDF includes asset details and embedded images

  Scenario: Frontend loads images via proxy for Azure Blob URLs during PDF generation
    Given the asset imageUrls contain URLs with ".blob.core.windows.net"
    When the PDF generator loads each image for embedding
    Then the frontend requests GET /api/proxy-image?url=<encoded-blob-url> with authentication
    And the frontend receives 200 with image bytes and Content-Type image
    And the frontend draws the image to canvas and embeds in PDF without tainted canvas error
    And the frontend does not fetch blob URL directly from the client to avoid CORS

  Scenario: Frontend handles blob URL images without proxy
    Given the asset has an imageUrl that is a blob URL from browser FileReader
    When the PDF generator loads that image
    Then the frontend may load it directly or via object URL without calling proxy-image
    And the image is embedded in the PDF if same-origin or blob URL allows

  Scenario: PDF generation fails when proxy-image returns 404 for an image
    Given one of the asset image URLs points to a blob that no longer exists
    When the frontend requests GET /api/proxy-image for that URL
    Then the response status code is 404
    And the frontend handles the error and may show "Failed to load" for that image in PDF or abort with message
    And the user is informed that some images could not be included

  Scenario: User triggers insurance claim when asset has no images
    Given the asset has no imageUrls and no imageUrl
    When the user clicks the Insurance Claim button
    Then the frontend does not start PDF generation or shows validation message
    And the frontend displays message that asset has no images and user should add images first
    And no GET /api/proxy-image requests are sent

  Scenario: PDF includes localized currency for asset value
    Given the user has selected a locale with currency formatting
    When the PDF is generated
    Then the asset value in the PDF is formatted using the same locale currency format as the UI
    And the frontend passes formatCurrency or equivalent to the PDF generator

  Scenario: PDF generation completes and triggers download
    Given all images loaded successfully or were skipped with error handling
    When the PDF document is fully built
    Then the frontend triggers a file download with a filename such as insurance-claim-<assetId>.pdf
    And the user sees success message or download prompt
    And the frontend does not navigate away from the asset detail page unless by user action

  Scenario: Frontend cleans up DOM or object URLs after PDF generation
    Given the PDF generator created temporary image elements or object URLs for loading
    When the PDF generation completes or fails
    Then the frontend removes temporary nodes from DOM and revokes object URLs if applicable
    And no memory leak or "removeChild" error occurs during cleanup
