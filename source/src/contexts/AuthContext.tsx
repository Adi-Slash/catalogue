import { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    // Check authentication status on mount
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Static Web Apps provides authentication info at /.auth/me
      // This endpoint only exists when deployed to Azure Static Web Apps
      // In local development, it will fail gracefully
      const response = await fetch('/.auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        // Check if response is actually JSON (not HTML error page)
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.clientPrincipal) {
            setUser({
              userId: data.clientPrincipal.userId,
              userDetails: data.clientPrincipal.userDetails,
              identityProvider: data.clientPrincipal.identityProvider,
              userRoles: data.clientPrincipal.userRoles || [],
              claims: data.clientPrincipal.claims || {},
            });
          } else {
            setUser(null);
          }
        } else {
          // Response is not JSON (likely HTML error page in local dev)
          setUser(null);
        }
      } else {
        // 401 or other error - user is not authenticated
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
      // Use window.location.href for full page navigation (bypasses React Router)
      const redirectUrl = encodeURIComponent(window.location.origin + '/assets');
      const loginUrl = `/.auth/login/aad?post_login_redirect_uri=${redirectUrl}`;
      
      console.log('Redirecting to login:', loginUrl);
      // Full page navigation - this will bypass React Router
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Error during login redirect:', error);
      // Fallback: try simple redirect
      window.location.href = '/.auth/login/aad';
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
