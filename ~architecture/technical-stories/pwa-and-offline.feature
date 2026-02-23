Feature: PWA and offline behavior

  Background:
    Given the application is built with vite-plugin-pwa and Workbox
    And the service worker is registered when the app loads

  Scenario: Service worker is registered in production build
    When the user loads the application from a production or preview build
    Then the frontend registers the service worker
    And the service worker may precache static assets and PWA icons
    And subsequent navigations may be served from cache when offline according to Workbox config

  Scenario: API calls require network and fail when offline
    Given the user is offline or the network is unavailable
    When the frontend sends GET to "/api/assets" or any API request
    Then the fetch fails with network error or does not complete
    And the frontend does not receive 200 or valid JSON
    And the frontend shows error state or retry option
    And no stub data is returned from service worker for API routes unless explicitly configured

  Scenario: Static assets and app shell may be served from cache when offline
    Given the user has previously loaded the app and the service worker has cached assets
    When the user goes offline and navigates to the app origin
    Then the service worker may serve the cached index and JS/CSS so the shell loads
    And the app may display cached UI but API-dependent data will not load
    And the user may see loading or error state for asset list and other API data

  Scenario: User attempts to add asset while offline
    Given the user is offline
    When the user fills the add-asset form and submits
    Then the POST /api/upload or POST /api/assets request fails
    And the frontend shows error message
    And no background sync is assumed unless implemented
    And the user may retry when back online

  Scenario: PWA manifest and icons are available for install
    Given the app is served over HTTPS with a valid web app manifest
    When the user visits the app on a supporting device
    Then the browser may offer Add to Home Screen or Install
    And the manifest includes name and icons such as pwa-192x192 and pwa-512x512
    And the app can be launched from home screen and run in standalone or browser

  Scenario: Authentication state is lost when offline or after long idle
    Given the user was authenticated and the session cookie or token is expired or unavailable offline
    When the user loads the app or triggers an API call
    Then /.auth/me or API may fail or return unauthenticated
    And the frontend shows login or not authenticated state
    And the user must sign in again when back online
