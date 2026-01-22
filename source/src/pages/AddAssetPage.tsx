import { useNavigate, Link } from 'react-router-dom';
import { createAsset } from '../api/assets';
import AssetForm from '../components/AssetForm';
import type { NewAsset } from '../types/asset';

const HOUSEHOLD = 'house-1';

export default function AddAssetPage() {
  const navigate = useNavigate();

  async function handleCreate(payload: NewAsset) {
    await createAsset(payload);
    navigate('/assets');
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto' }}>
      <h2>Add New Asset</h2>
      <Link to="/assets">← Back to Assets</Link>
      <AssetForm householdId={HOUSEHOLD} onCreate={handleCreate} />
    </div>
  );
}
