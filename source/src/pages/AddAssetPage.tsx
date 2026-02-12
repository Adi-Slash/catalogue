import { useNavigate, Link } from 'react-router-dom';
import { createAsset } from '../api/assets';
import AssetForm from '../components/AssetForm';
import type { NewAsset } from '../types/asset';
import { useHouseholdId } from '../utils/auth';
import { useLanguage } from '../contexts/LanguageContext';
import './AddAssetPage.css';

export default function AddAssetPage() {
  const navigate = useNavigate();
  const householdId = useHouseholdId();
  const { t } = useLanguage();

  async function handleCreate(payload: NewAsset) {
    if (!householdId) {
      throw new Error(t('auth.notAuthenticated'));
    }
    await createAsset(payload);
    navigate('/assets');
  }

  if (!householdId) {
    return <div className="error-message">{t('auth.notAuthenticated')}</div>;
  }

  return (
    <div className="add-asset-page">
      <div className="page-header">
        <h1>{t('assets.addAsset')}</h1>
        <p>{t('assets.startBuilding')}</p>
      </div>

      <div className="back-link">
        <Link to="/assets" className="btn btn-secondary">
          ← {t('asset.backToAssets')}
        </Link>
      </div>

      <div className="form-container">
        <AssetForm householdId={householdId} onCreate={handleCreate} />
      </div>
    </div>
  );
}
