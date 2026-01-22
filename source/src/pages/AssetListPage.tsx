import { useEffect, useState } from 'react';
import { getAssets, deleteAsset } from '../api/assets';
import AssetCard from '../components/AssetCard';
import type { Asset } from '../types/asset';
import { useNavigate, Link } from 'react-router-dom';
import './AssetListPage.css';

const HOUSEHOLD = 'house-1';
const CATEGORIES = ['All', 'Electrical', 'Jewelry', 'Furniture', 'Instrument', 'Tools', 'Fitness'];

export default function AssetListPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const a = await getAssets(HOUSEHOLD);
      setAssets(a);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    try {
      await deleteAsset(id, HOUSEHOLD);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete asset';
      setError(errorMessage);
    }
  }

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  const filteredAssets =
    activeTab === 'All' ? assets : assets.filter((a) => a.category === activeTab);
  const tabValue =
    activeTab === 'All' ? totalValue : filteredAssets.reduce((sum, a) => sum + a.value, 0);

  return (
    <div className="asset-list-page">
      <div className="page-header">
        <h1>Asset Catalogue</h1>
        <div className="stats-card">
          <div className="stat">
            <span className="stat-label">Total Portfolio Value</span>
            <span className="stat-value">${totalValue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="actions-bar">
        <Link to="/assets/add" className="btn btn-primary">
          + Add New Asset
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            className={`tab-button ${activeTab === category ? 'active' : ''}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-summary">
        <span className="summary-text">
          {activeTab} Assets • ${tabValue.toFixed(2)} total value
        </span>
      </div>

      {loading && <div className="loading">Loading assets...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && filteredAssets.length === 0 && (
        <div className="empty-state">
          <h3>No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}assets found</h3>
          <p>Start building your collection by adding your first asset.</p>
          <Link to="/assets/add" className="btn btn-primary">
            Add Asset
          </Link>
        </div>
      )}

      <div className="assets-grid">
        {filteredAssets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onDelete={handleDelete}
            onClick={() => navigate(`/assets/${asset.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
