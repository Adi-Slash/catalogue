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

  const loginUrl =
    window.location.hostname === 'localhost'
      ? null
      : `${window.location.origin}/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.origin + '/assets')}`;

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.hostname === 'localhost') {
      alert('Authentication is only available when deployed to Azure Static Web Apps.\n\nIn local development, you can use the mock server with x-household-id header.');
      return;
    }
    if (loginUrl) {
      // Force navigation so nothing can block it
      window.location.assign(loginUrl);
    }
  };

  if (loginUrl) {
    return (
      <a
        href={loginUrl}
        onClick={handleLoginClick}
        className="login-btn"
        style={{ textDecoration: 'none', display: 'inline-block' }}
      >
        Login
      </a>
    );
  }

  return (
    <button type="button" onClick={handleLoginClick} className="login-btn">
      Login
    </button>
  );
}
