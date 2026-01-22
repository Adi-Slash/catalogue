import { useNavigate, Link } from 'react-router-dom';
import { createAsset } from '../api/assets';
import AssetForm from '../components/AssetForm';
import type { NewAsset } from '../types/asset';
import './AddAssetPage.css';

const HOUSEHOLD = 'house-1';

export default function AddAssetPage() {
  const navigate = useNavigate();

  async function handleCreate(payload: NewAsset) {
    await createAsset(payload);
    navigate('/assets');
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
        <AssetForm householdId={HOUSEHOLD} onCreate={handleCreate} />
      </div>
    </div>
  );
}
