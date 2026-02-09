import { useNavigate, Link } from 'react-router-dom';
import { createAsset } from '../api/assets';
import AssetForm from '../components/AssetForm';
import type { NewAsset } from '../types/asset';
import { useHouseholdId } from '../utils/auth';
import './AddAssetPage.css';

export default function AddAssetPage() {
  const navigate = useNavigate();
  const householdId = useHouseholdId();

  async function handleCreate(payload: NewAsset) {
    if (!householdId) {
      throw new Error('Not authenticated');
    }
    await createAsset(payload);
    navigate('/assets');
  }

  if (!householdId) {
    return <div className="error-message">Not authenticated</div>;
  }

  return (
    <div className="add-asset-page">
      <div className="page-header">
        <h1>Add New Asset</h1>
        <p>Expand your collection by adding a new valuable item</p>
      </div>

      <div className="back-link">
        <Link to="/assets" className="btn btn-secondary">
          ← Back to Assets
        </Link>
      </div>

      <div className="form-container">
        <AssetForm householdId={householdId} onCreate={handleCreate} />
      </div>
    </div>
  );
}
