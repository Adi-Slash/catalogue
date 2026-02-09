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

  const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const loginUrl = isLocalDev
    ? null
    : `${window.location.origin}/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.origin + '/assets')}`;

  const handleLocalDevClick = () => {
    alert(
      'Authentication is only available when deployed to Azure Static Web Apps.\n\nIn local development, you can use the mock server with x-household-id header.'
    );
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Asset Catalogue</h1>
        <p>Sign in to manage your household assets</p>
        {loginUrl ? (
          <a
            href={loginUrl}
            className="btn btn-primary login-button"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Sign In
          </a>
        ) : (
          <button type="button" onClick={handleLocalDevClick} className="btn btn-primary login-button">
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}
