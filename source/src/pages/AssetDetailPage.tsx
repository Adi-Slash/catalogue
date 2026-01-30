import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAsset, updateAsset, deleteAsset } from '../api/assets';
import AssetForm from '../components/AssetForm';
import type { Asset } from '../types/asset';

const HOUSEHOLD = 'house-1';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const a = await getAsset(id, HOUSEHOLD);
      setAsset(a);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(payload: Partial<Asset>) {
    if (!asset) return;
    const updated = await updateAsset(asset.id, payload, HOUSEHOLD);
    setAsset(updated);
    setEditing(false);
  }

  async function handleDelete() {
    if (!asset) return;
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    await deleteAsset(asset.id, HOUSEHOLD);
    navigate('/assets');
  }

  if (loading)
    return (
      <div className="asset-detail-page">
        <div className="loading">Loading asset details...</div>
      </div>
    );

  if (error)
    return (
      <div className="asset-detail-page">
        <div className="error-message">{error}</div>
      </div>
    );

  if (!asset)
    return (
      <div className="asset-detail-page">
        <div className="empty-state">
          <h2>Asset Not Found</h2>
          <p>The asset you're looking for doesn't exist.</p>
          <Link to="/assets" className="btn btn-primary">
            Back to Assets
          </Link>
        </div>
      </div>
    );

  const imageUrl = asset.imageUrl?.startsWith('http')
    ? asset.imageUrl
    : `${API_BASE}${asset.imageUrl}`;

  return (
    <div className="asset-detail-page">
      <div className="page-header">
        <h1>Asset Details</h1>
        <div className="back-link">
          <Link to="/assets" className="btn btn-secondary">
            ← Back to Assets
          </Link>
        </div>
      </div>

      {!editing ? (
        <div className="asset-details">
          <div className="asset-header">
            <div className="asset-title-section">
              <h2 className="asset-title">
                {asset.make} {asset.model}
              </h2>
              <span className="asset-category">{asset.category || 'Uncategorized'}</span>
            </div>
            <div className="asset-value">
              <span className="price">£{asset.value.toFixed(2)}</span>
            </div>
          </div>

          {asset.imageUrl && (
            <div className="asset-image-section">
              <img src={imageUrl} alt={`${asset.make} ${asset.model}`} className="asset-image" />
            </div>
          )}

          <div className="asset-info-grid">
            {asset.serialNumber && (
              <div className="info-item">
                <label>Serial Number</label>
                <span>{asset.serialNumber}</span>
              </div>
            )}

            {asset.description && (
              <div className="info-item full-width">
                <label>Description</label>
                <span>{asset.description}</span>
              </div>
            )}

            <div className="info-item">
              <label>Created</label>
              <span>{new Date(asset.createdAt).toLocaleString()}</span>
            </div>

            <div className="info-item">
              <label>Last Updated</label>
              <span>{new Date(asset.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="asset-actions">
            <button onClick={() => setEditing(true)} className="btn btn-secondary">
              Edit Asset
            </button>
            <button onClick={handleDelete} className="btn btn-danger">
              Delete Asset
            </button>
          </div>
        </div>
      ) : (
        <div className="edit-form-container">
          <AssetForm
            householdId={HOUSEHOLD}
            onCreate={() => Promise.resolve()} // Not used in edit
            onUpdate={handleUpdate}
            initialAsset={asset}
          />
          <div className="form-actions">
            <button onClick={() => setEditing(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
