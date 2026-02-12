import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import './HamburgerMenu.css';

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout, loading } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogin = () => {
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const loginUrl = isLocalDev
      ? null
      : `${window.location.origin}/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.origin + '/assets')}`;

    if (loginUrl) {
      window.location.href = loginUrl;
    } else {
      alert(
        'Authentication is only available when deployed to Azure Static Web Apps.\n\nIn local development, you can use the mock server with x-household-id header.'
      );
    }
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (loading) {
    return null;
  }

  return (
    <div className="hamburger-menu" ref={menuRef}>
      <button
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      {isOpen && (
        <div className="hamburger-menu-content">
          {user && (
            <div className="menu-user-info">
              {user.userDetails}
            </div>
          )}
          <label className="menu-item menu-dark-mode">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={toggleDarkMode}
              className="dark-mode-checkbox"
            />
            <span>Dark Mode</span>
          </label>
          {user ? (
            <button onClick={handleLogout} className="menu-item menu-logout">
              Logout
            </button>
          ) : (
            <button onClick={handleLogin} className="menu-item menu-login">
              Login
            </button>
          )}
        </div>
      )}
    </div>
  );
}
