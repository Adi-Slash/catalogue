import { useState } from 'react';
import type { FormEvent } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import AssetListPage from './pages/AssetListPage';
import AssetDetailPage from './pages/AssetDetailPage';
import AddAssetPage from './pages/AddAssetPage';

function AppRoutes() {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <BrowserRouter>
      <div id="root">
        <header className="header">
          <div className="header-content">
            <Link to="/" className="logo">
              AssetCatalogue
            </Link>
            <nav className="nav-links">
              <Link to="/assets">Browse Assets</Link>
              <Link to="/assets/add">Add Asset</Link>
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
            </nav>
          </div>
        </header>

        <main className="main-content">
          <div className="app-container">
            <Routes>
              <Route path="/assets" element={<AssetListPage searchTerm={searchTerm} />} />
              <Route path="/assets/add" element={<AddAssetPage />} />
              <Route path="/assets/:id" element={<AssetDetailPage />} />
              <Route path="/" element={<AssetListPage searchTerm={searchTerm} />} />
            </Routes>
          </div>
        </main>

        <footer className="footer">
          <div className="footer-content">
            <p>&copy; 2026 AssetCatalogue. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default AppRoutes;
