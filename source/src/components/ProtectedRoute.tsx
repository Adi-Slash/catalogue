import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  
  // In local development, authentication endpoints don't exist
  // Allow access for local development
  const isLocalDev = window.location.hostname === 'localhost';

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // In local dev, allow access without authentication
  if (isLocalDev) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
