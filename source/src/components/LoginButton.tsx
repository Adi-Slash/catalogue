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

  // Use a direct anchor link to bypass React Router
  // This ensures the navigation happens immediately without React Router interference
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
    // Let the anchor tag handle the navigation naturally
    console.log('Login link clicked, navigating to:', getLoginUrl());
  };

  return (
    <a 
      href={getLoginUrl()}
      onClick={handleLoginClick}
      className="login-btn"
      style={{ textDecoration: 'none', display: 'inline-block' }}
    >
      Login
    </a>
  );
}
