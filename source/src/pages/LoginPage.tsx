import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, redirect to assets
    if (isAuthenticated) {
      navigate('/assets', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Use a direct anchor link to bypass React Router
  const getLoginUrl = () => {
    if (window.location.hostname === 'localhost') {
      return '#';
    }
    const redirectUrl = encodeURIComponent(window.location.origin + '/assets');
    return `/.auth/login/aad?post_login_redirect_uri=${redirectUrl}`;
  };

  const handleLoginClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.hostname === 'localhost') {
      e.preventDefault();
      alert('Authentication is only available when deployed to Azure Static Web Apps.\n\nIn local development, you can use the mock server with x-household-id header.');
      return;
    }
    console.log('Sign In link clicked, navigating to:', getLoginUrl());
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Asset Catalogue</h1>
        <p>Sign in to manage your household assets</p>
        <a 
          href={getLoginUrl()}
          onClick={handleLoginClick}
          className="btn btn-primary login-button"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          Sign In
        </a>
      </div>
    </div>
  );
}
