Feature: User preferences API and frontend behavior

  Background:
    Given the client has a valid x-ms-client-principal header
    And the userId is derived from the principal

  Scenario: GET /api/user/preferences returns 200 and preferences or defaults
    When the client sends GET to "/api/user/preferences" with authentication
    Then the response status code is 200
    And the response body is JSON with keys "id", "userId", "darkMode", "updatedAt"
    And the response body may contain "language" with value one of "en", "fr", "de", "ja"
    And if no preferences exist in Cosmos DB the backend returns default preferences with darkMode false and language "en"
    And the frontend applies darkMode to theme and language to locale

  Scenario: GET /api/user/preferences without authentication returns 401
    When the client sends GET to "/api/user/preferences" without authentication
    Then the response status code is 401
    And the response body is JSON with key "error" containing "Unauthorized"
    And the frontend uses default theme and locale or prompts login

  Scenario: PUT /api/user/preferences with darkMode updates and returns 200
    When the client sends PUT to "/api/user/preferences" with authentication
    And the request body is JSON with "darkMode" true
    Then the response status code is 200
    And the response body is JSON with "darkMode" true and "userId" matching principal
    And the preferences are persisted in Cosmos DB for that userId
    And the frontend toggles to dark theme and re-renders

  Scenario: PUT /api/user/preferences with language updates and returns 200
    When the client sends PUT to "/api/user/preferences" with authentication
    And the request body is JSON with "language" "fr"
    Then the response status code is 200
    And the response body is JSON with "language" "fr"
    And the preferences are persisted in Cosmos DB
    And the frontend switches locale to French and re-renders translated content

  Scenario: PUT /api/user/preferences merges with existing preferences
    Given the user has existing preferences with darkMode true and language "de"
    When the client sends PUT to "/api/user/preferences" with authentication
    And the request body is JSON with only "language" "ja"
    Then the response status code is 200
    And the response body has "language" "ja" and "darkMode" true
    And the backend did not overwrite darkMode with default

  Scenario: Frontend loads preferences on app init when user is authenticated
    Given the user is authenticated and the app has just loaded
    When the AuthContext and LanguageContext or DarkModeContext initialize
    Then the frontend sends GET /api/user/preferences with credentials include
    And the frontend applies the returned darkMode and language before or after first paint
    And if the request fails the frontend uses defaults and may show error

  Scenario: Frontend updates preferences when user toggles dark mode
    Given the user is on the asset list page
    When the user opens the hamburger menu and toggles dark mode
    Then the frontend sends PUT /api/user/preferences with body { "darkMode": "<newValue>" }
    And on 200 the frontend updates local state and applies the new theme
    And on error the frontend may revert the toggle and show error

  Scenario: Frontend updates preferences when user changes language
    Given the user is on any page
    When the user opens the hamburger menu and selects a different language
    Then the frontend sends PUT /api/user/preferences with body { "language": "<code>" }
    And on 200 the frontend updates locale and re-renders with new translations
    And on error the frontend may keep previous language and show error

  Scenario: Backend returns 500 when Cosmos DB fails for preferences
    Given Cosmos DB is unavailable for user preferences container
    When the client sends GET to "/api/user/preferences" with authentication
    Then the response status code is 500
    And the response body is JSON with key "error" containing "Internal server error"
    And the frontend uses default preferences and may show error or retry

  Scenario Outline: Language code is accepted and persisted
    When the client sends PUT to "/api/user/preferences" with authentication
    And the request body is JSON with "language" "<code>"
    Then the response status code is 200
    And the response body has "language" "<code>"

    Examples:
      | code |
      | en   |
      | fr   |
      | de   |
      | ja   |
