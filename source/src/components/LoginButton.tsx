import { useAuth } from '../contexts/AuthContext';
import './LoginButton.css';

export default function LoginButton() {
  const { user, login, logout, loading } = useAuth();

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

  return (
    <button onClick={login} className="login-btn">
      Login
    </button>
  );
}
