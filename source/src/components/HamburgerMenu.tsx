import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLanguage } from '../contexts/LanguageContext';
import HelpAbout from './HelpAbout';
import './HamburgerMenu.css';

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHelpAboutOpen, setIsHelpAboutOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout, loading } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { language, setLanguage, t, availableLanguages } = useLanguage();

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
      alert(t('login.localDevMessage'));
    }
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleHelpAbout = () => {
    setIsHelpAboutOpen(true);
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
            <span>{t('menu.darkMode')}</span>
          </label>
          <div className="menu-item menu-language">
            <label className="language-label">{t('menu.language')}:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'fr' | 'de' | 'ja')}
              className="language-select"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleHelpAbout} className="menu-item menu-help-about">
            {t('menu.helpAbout')}
          </button>
          {user ? (
            <button onClick={handleLogout} className="menu-item menu-logout">
              {t('menu.logout')}
            </button>
          ) : (
            <button onClick={handleLogin} className="menu-item menu-login">
              {t('menu.login')}
            </button>
          )}
        </div>
      )}
      <HelpAbout isOpen={isHelpAboutOpen} onClose={() => setIsHelpAboutOpen(false)} />
    </div>
  );
}
