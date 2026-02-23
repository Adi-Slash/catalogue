Feature: Insurance chatbot API and frontend behavior

  Background:
    Given the client has a valid x-ms-client-principal header

  Scenario: POST /api/chat with valid message returns 200 and response text
    When the client sends POST to "/api/chat" with authentication
    And the request body is JSON with "message" "What is covered under my policy?"
    And optionally "assets" array and "language" string
    Then the response status code is 200
    And the response body is JSON with key "response" as string
    And the response string is non-empty
    And the frontend appends the response as assistant message in the chat UI

  Scenario: POST /api/chat with assets context includes asset summary in backend processing
    When the client sends POST to "/api/chat" with authentication
    And the request body contains "message" and "assets" array of objects with id make model category value datePurchased
    Then the response status code is 200
    And the backend may use the assets summary for context in AI or rule-based reply
    And the response body has key "response"

  Scenario: POST /api/chat with language parameter is passed to backend
    When the client sends POST to "/api/chat" with authentication
    And the request body contains "message" "Hello" and "language" "fr"
    Then the response status code is 200
    And the backend uses the language for localized reply when supported
    And the response body has key "response"

  Scenario: POST /api/chat with missing message returns 400
    When the client sends POST to "/api/chat" with authentication
    And the request body is JSON without "message" or with "message" null or empty string
    Then the response status code is 400
    And the response body is JSON with key "error" containing "Missing or invalid message"
    And the frontend does not add an assistant message and may show validation error

  Scenario: POST /api/chat without authentication returns 401
    When the client sends POST to "/api/chat" without x-ms-client-principal
    And the request body is JSON with "message" "Hello"
    Then the response status code is 401
    And the response body is JSON with key "error" containing "Unauthorized"
    And the frontend does not display a reply and may prompt login

  Scenario: Frontend sends chat message with credentials include
    Given the user has opened the chatbot and typed a message
    When the user sends the message
    Then the frontend sends POST to "/api/chat" with credentials "include"
    And the request body is JSON with message and assets array from current list and current language code
    And the frontend shows loading state until response or error
    And on 200 the frontend appends assistant message to the conversation
    And on 4xx or 5xx the frontend shows error message to the user

  Scenario: Backend returns 500 when AI or rule-based generation fails
    Given the OpenAI or Azure AI call fails or rule-based path throws
    When the client sends POST to "/api/chat" with authentication and valid message
    Then the response status code is 500
    And the response body is JSON with key "error" containing "Internal server error"
    And the frontend shows error state and may allow retry

  Scenario: Chat response is displayed in selected locale when supported
    Given the user has selected language "de"
    When the client sends POST to "/api/chat" with "language" "de" and a message
    And the backend supports German responses
    Then the response body "response" is in German or fallback message indicates API needed for localization
    And the frontend displays the response in the chat without changing app locale
