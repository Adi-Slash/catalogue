import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface User {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
  claims: Record<string, string>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoggedNullPrincipal = useRef(false);

  useEffect(() => {
    // When landing after redirect from auth callback, the auth cookie may not be
    // visible to the first request yet. Delay the initial check slightly when
    // we might have just completed login (e.g. on /assets with referrer from .auth).
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const mightBePostLogin =
      window.location.pathname.startsWith('/assets') &&
      (referrer.includes('/.auth/') || referrer === '');
    const initialDelay = mightBePostLogin ? 400 : 0;

    const timeoutId = setTimeout(() => {
      checkAuth();
    }, initialDelay);

    // Also check auth status when URL changes (e.g., after login redirect)
    const handleLocationChange = () => {
      setTimeout(() => checkAuth(), 500);
    };

    window.addEventListener('popstate', handleLocationChange);

    // Check periodically if we're on an auth callback URL
    const interval = setInterval(() => {
      if (window.location.pathname.startsWith('/.auth/')) {
        checkAuth();
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  async function checkAuth() {
    try {
      // Static Web Apps provides authentication info at /.auth/me
      // This endpoint only exists when deployed to Azure Static Web Apps
      // In local development, it will fail gracefully
      const response = await fetch('/.auth/me', {
        credentials: 'include',
        cache: 'no-store', // Don't cache auth status
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        // Check if response is actually JSON (not HTML error page)
          if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.clientPrincipal) {
            const userData = {
              userId: data.clientPrincipal.userId,
              userDetails: data.clientPrincipal.userDetails,
              identityProvider: data.clientPrincipal.identityProvider,
              userRoles: data.clientPrincipal.userRoles || [],
              claims: data.clientPrincipal.claims || {},
            };
            console.log('User authenticated:', userData);
            setUser(userData);
          } else {
            setUser(null);
            // Log once per page load to avoid console spam when polling on /.auth/ path
            if (!hasLoggedNullPrincipal.current) {
              hasLoggedNullPrincipal.current = true;
              console.warn(
                '[Auth] /.auth/me returned 200 but clientPrincipal is null. The session cookie was not set or not sent.'
              );
              console.warn(
                '[Auth] Fix: 1) In Entra ID add Redirect URI exactly: https://' +
                  window.location.host +
                  '/.auth/login/aad/callback — 2) Enable ID tokens (Authentication). ' +
                  '3) In SWA set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET. ' +
                  '4) In Network tab after login, check /.auth/login/aad/callback returns 302 with Set-Cookie.'
              );
              console.warn(
                '[Auth] If you never saw the Microsoft sign-in page after clicking Login, open the Login link in a new tab or ensure you are on the deployed Azure Static Web Apps URL (not localhost).'
              );
            }
          }
        } else {
          // Response is not JSON (likely HTML error page in local dev)
          console.log('Response is not JSON, content-type:', contentType);
          setUser(null);
        }
      } else {
        // 401 or other error - user is not authenticated
        console.log('Auth check failed with status:', response.status);
        setUser(null);
      }
    } catch (error) {
      // Network error or other issue - assume not authenticated
      // In local development, /.auth/me doesn't exist, so this is expected
      if (window.location.hostname === 'localhost') {
        // In local dev, allow anonymous access
        console.log('Local development: Authentication endpoints not available');
      } else {
        console.error('Failed to check auth status:', error);
      }
      setUser(null);
    } finally {
      // Always set loading to false, even on error
      setLoading(false);
    }
  }

  function login() {
    try {
      // In local development, authentication endpoints don't exist
      // Show a message or handle gracefully
      if (window.location.hostname === 'localhost') {
        alert('Authentication is only available when deployed to Azure Static Web Apps.\n\nIn local development, you can use the mock server with x-household-id header.');
        console.warn('Local development: Authentication endpoints not available');
        return;
      }

      // Redirect to Static Web Apps login endpoint for Microsoft Entra ID
      // Use post_login_redirect_uri parameter (note: 'uri' not 'url')
      // Redirect to /assets after successful login
      const redirectUrl = encodeURIComponent(window.location.origin + '/assets');
      const loginUrl = `/.auth/login/aad?post_login_redirect_uri=${redirectUrl}`;
      
      console.log('Redirecting to login:', loginUrl);
      
      // Force a full page navigation that bypasses React Router
      // Using both methods to ensure it works
      if (window.location.replace) {
        window.location.replace(loginUrl);
      } else {
        window.location.href = loginUrl;
      }
    } catch (error) {
      console.error('Error during login redirect:', error);
      // Fallback: try simple redirect
      try {
        window.location.replace('/.auth/login/aad');
      } catch {
        window.location.href = '/.auth/login/aad';
      }
    }
  }

  function logout() {
    // Redirect to Static Web Apps logout endpoint
    window.location.href = '/.auth/logout';
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
