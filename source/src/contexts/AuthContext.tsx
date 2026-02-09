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
      const response = await fetch('/.auth/me');
      if (response.ok) {
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
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function login() {
    // Redirect to Static Web Apps login endpoint for Microsoft Entra ID
    window.location.href = '/.auth/login/aad';
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
