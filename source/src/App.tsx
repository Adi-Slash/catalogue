import { useState } from 'react';
import type { FormEvent } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import AssetListPage from './pages/AssetListPage';
import AssetDetailPage from './pages/AssetDetailPage';
import AddAssetPage from './pages/AddAssetPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import HamburgerMenu from './components/HamburgerMenu';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallbackHandler from './components/AuthCallbackHandler';

function AppRoutes() {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <BrowserRouter>
      <div id="root">
        <header className="header">
          <div className="header-content">
            <div className="header-row">
              <div className="header-left">
                <Link to="/" className="logo">
                  <span className="logo-line-1">Asset</span>
                  <span className="logo-line-2">Catalogue</span>
                </Link>
              </div>
              {user && (
                <div className="header-center">
                  <form className="search-bar" onSubmit={handleSearchSubmit}>
                    <input
                      type="text"
                      placeholder="Search assets..."
                      value={searchInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchInput(value);
                        setSearchTerm(value.trim());
                      }}
                    />
                    <button type="submit">🔍</button>
                  </form>
                </div>
              )}
              <div className="header-right">
                <HamburgerMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="app-container">
            <AuthCallbackHandler />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/assets"
                element={
                  <ProtectedRoute>
                    <AssetListPage searchTerm={searchTerm} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assets/add"
                element={
                  <ProtectedRoute>
                    <AddAssetPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assets/:id"
                element={
                  <ProtectedRoute>
                    <AssetDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AssetListPage searchTerm={searchTerm} />
                  </ProtectedRoute>
                }
              />
              {/* Catch-all for unknown routes - exclude /.auth/* paths */}
              <Route
                path="*"
                element={
                  (() => {
                    // Don't show 404 for authentication endpoints - let them handle redirects
                    const path = window.location.pathname;
                    if (path.startsWith('/.auth/')) {
                      // Show loading while auth processes
                      return (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                          <div className="loading">Completing authentication...</div>
                        </div>
                      );
                    }
                    return (
                      <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <h2>Page Not Found</h2>
                        <p>The page you're looking for doesn't exist.</p>
                        <Link to="/">Go to Home</Link>
                      </div>
                    );
                  })()
                }
              />
            </Routes>
          </div>
        </main>

        <footer className="footer">
          <div className="footer-content">
            <p>&copy; 2026 Asset Catalogue. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
