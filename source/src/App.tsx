import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import AssetListPage from './pages/AssetListPage'
import AssetDetailPage from './pages/AssetDetailPage'

function AppRoutes() {
  return (
    <BrowserRouter>
      <div style={{ padding: 12 }}>
        <header style={{ marginBottom: 12 }}>
          <Link to="/assets">Assets</Link>
        </header>
        <Routes>
          <Route path="/assets" element={<AssetListPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/" element={<AssetListPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default AppRoutes
