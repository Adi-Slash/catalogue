import { useEffect, useState } from 'react';
import { getAssets, deleteAsset } from '../api/assets';
import AssetCard from '../components/AssetCard';
import type { Asset } from '../types/asset';
import { useNavigate, Link } from 'react-router-dom';
import { useHouseholdId } from '../utils/auth';
import './AssetListPage.css';

const CATEGORIES = ['All', 'Electrical', 'Fitness', 'Furniture', 'Instrument', 'Jewellery', 'Tools', 'Transport'];

type Props = {
  searchTerm: string;
};

export default function AssetListPage({ searchTerm }: Props) {
  const navigate = useNavigate();
  const householdId = useHouseholdId();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  async function load() {
    if (!householdId) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const a = await getAssets(householdId);
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
  }, [householdId]);

  async function handleDelete(id: string) {
    if (!householdId) return;
    try {
      await deleteAsset(id, householdId);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete asset';
      setError(errorMessage);
    }
  }

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const matchesSearch = (asset: Asset) => {
    if (!normalizedSearch) return true;
    const haystack = [
      asset.make,
      asset.model,
      asset.serialNumber,
      asset.description,
      asset.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  };

  const assetsByCategory =
    activeTab === 'All' ? assets : assets.filter((a) => a.category === activeTab);

  const filteredAssets = assetsByCategory.filter(matchesSearch);

  return (
    <div className="asset-list-page">
      <div className="page-header">
        <div className="stats-card">
          <div className="stat">
            <span className="stat-label">Total Portfolio Value</span>
            <span className="stat-value">£{totalValue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="actions-bar">
        <Link to="/assets/add" className="btn btn-primary">
          + Add Asset
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
