import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const { isAuthenticated, login, loading } = useAuth();
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

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Asset Catalogue</h1>
        <p>Sign in to manage your household assets</p>
        <button 
          onClick={(e) => {
            e.preventDefault();
            console.log('Sign In button clicked');
            login();
          }} 
          className="btn btn-primary login-button"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
