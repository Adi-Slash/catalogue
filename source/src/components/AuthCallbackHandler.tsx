import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

/**
 * Component to handle authentication callbacks
 * Detects when user is on an auth callback URL and redirects appropriately
 */
export default function AuthCallbackHandler() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // If we're on an auth-related URL
    if (location.pathname.startsWith('/.auth/')) {
      // Wait for auth check to complete
      if (!loading) {
        if (isAuthenticated) {
          // Extract redirect URL from query params or default to /assets
          const params = new URLSearchParams(location.search);
          const redirectUri = params.get('post_login_redirect_uri');
          
          let redirectTo = '/assets';
          if (redirectUri) {
            try {
              const decoded = decodeURIComponent(redirectUri);
              // Extract path from full URL if needed
              const url = new URL(decoded);
              redirectTo = url.pathname || '/assets';
            } catch {
              // If parsing fails, use default
              redirectTo = '/assets';
            }
          }
          
          console.log('Auth callback: authenticated, redirecting to:', redirectTo);
          // Use window.location.replace for full page navigation
          window.location.replace(redirectTo);
        }
        // If not authenticated and we're on login URL, that's expected - let it proceed
      }
    }
  }, [location.pathname, location.search, isAuthenticated, loading]);

  // Show loading message if we're on auth URL
  if (location.pathname.startsWith('/.auth/') && loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="loading">Completing authentication...</div>
      </div>
    );
  }

  // Don't render anything - this is just a handler
  return null;
}
