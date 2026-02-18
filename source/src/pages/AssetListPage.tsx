import { useEffect, useState } from 'react';
import { getAssets, deleteAsset } from '../api/assets';
import AssetCard from '../components/AssetCard';
import InsuranceChatbot from '../components/InsuranceChatbot';
import type { Asset } from '../types/asset';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useHouseholdId } from '../utils/auth';
import { useLanguage } from '../contexts/LanguageContext';
import './AssetListPage.css';

type Props = {
  searchTerm: string;
};

export default function AssetListPage({ searchTerm }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const householdId = useHouseholdId();
  const { t, formatCurrency } = useLanguage();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Store activeTab as English category code, not translated string
  // This ensures filtering works correctly when locale changes
  const [activeTab, setActiveTab] = useState<string>('All');

  // Translated category labels for display (code is English, label is translated)
  const CATEGORIES = [
    { code: 'All', label: t('categories.all') },
    { code: 'Electrical', label: t('categories.electrical') },
    { code: 'Fitness', label: t('categories.fitness') },
    { code: 'Furniture', label: t('categories.furniture') },
    { code: 'Instrument', label: t('categories.instrument') },
    { code: 'Jewellery', label: t('categories.jewellery') },
    { code: 'Tools', label: t('categories.tools') },
    { code: 'Transport', label: t('categories.transport') },
  ];

  async function load() {
    if (!householdId) {
      setError(t('auth.notAuthenticated'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const a = await getAssets(householdId);
      setAssets(a);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('auth.failedToLoad');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [householdId]);

  // Reload assets when navigating back to this page (e.g., from edit page)
  useEffect(() => {
    if (location.pathname === '/assets' && householdId) {
      load();
    }
  }, [location.pathname, householdId]);

  async function handleDelete(id: string) {
    if (!householdId) return;
    try {
      await deleteAsset(id, householdId);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('errors.failedToDelete');
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

  // Filter assets by activeTab (which is already in English)
  const assetsByCategory =
    activeTab === 'All' ? assets : assets.filter((a) => a.category === activeTab);

  const filteredAssets = assetsByCategory.filter(matchesSearch);

  return (
    <div className="asset-list-page">
      <div className="page-header">
        <div className="stats-card">
          <div className="stat">
            <span className="stat-label">{t('assets.totalPortfolioValue')}</span>
            <span className="stat-value">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </div>

      <div className="actions-bar">
        <Link to="/assets/add" className="btn btn-primary">
          {t('assets.addNewAsset')}
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORIES.map((category) => (
          <button
            key={category.code}
            onClick={() => setActiveTab(category.code)}
            className={`tab-button ${activeTab === category.code ? 'active' : ''}`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {loading && <div className="loading">{t('assets.loading')}</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && filteredAssets.length === 0 && (
        <div className="empty-state">
          <h3>
            {activeTab === 'All'
              ? t('assets.noAssets')
              : t('assets.noAssetsInCategory', { category: CATEGORIES.find(c => c.code === activeTab)?.label.toLowerCase() || activeTab.toLowerCase() })}
          </h3>
          <p>{t('assets.startBuilding')}</p>
          <Link to="/assets/add" className="btn btn-primary">
            {t('assets.addAsset')}
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

      {/* Insurance Chatbot */}
      <InsuranceChatbot assets={assets} />
    </div>
  );
}
