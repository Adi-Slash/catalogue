import { useAuth } from '../contexts/AuthContext';
import './LoginButton.css';

export default function LoginButton() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return <div className="login-button loading">Loading...</div>;
  }

  if (user) {
    return (
      <div className="login-button">
        <span className="user-name">{user.userDetails}</span>
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </div>
    );
  }

  // Treat localhost and 127.0.0.1 as local dev (no auth endpoints)
  const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const loginUrl = isLocalDev
    ? null
    : `${window.location.origin}/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.origin + '/assets')}`;

  const handleLocalDevClick = () => {
    alert(
      'Authentication is only available when deployed to Azure Static Web Apps.\n\nIn local development, you can use the mock server with x-household-id header.'
    );
  };

  // Use native <a> navigation so the browser does a full page load to the auth URL.
  // Do not preventDefault – that can block redirect in some SPA setups.
  if (loginUrl) {
    return (
      <a
        href={loginUrl}
        className="login-btn"
        style={{ textDecoration: 'none', display: 'inline-block' }}
      >
        Login
      </a>
    );
  }

  return (
    <button type="button" onClick={handleLocalDevClick} className="login-btn">
      Login
    </button>
  );
}
