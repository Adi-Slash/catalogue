import type { Asset as AssetType } from '../types/asset';
import './AssetCard.css';

type Props = {
  asset: AssetType;
  onDelete?: (id: string) => void;
  onClick?: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AssetCard({ asset, onDelete, onClick }: Props) {
  const primaryImagePath =
    (asset.imageUrls && asset.imageUrls.length > 0 && asset.imageUrls[0]) || asset.imageUrl;

  const imageUrl = primaryImagePath
    ? primaryImagePath.startsWith('http')
      ? primaryImagePath
      : `${API_BASE}${primaryImagePath}`
    : undefined;

  return (
    <div className="asset-card" onClick={onClick}>
      <div className="card-overlay">
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onDelete) {
              onDelete(asset.id);
            }
          }}
          aria-label="Delete asset"
        >
          🗑️
        </button>
      </div>
      <div className="card-image">
        {imageUrl ? (
          <img src={imageUrl} alt={`${asset.make} ${asset.model}`} className="asset-image" />
        ) : (
          <div className="no-image">
            <span>No Image</span>
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="asset-info">
          <div className="asset-property">
            <span className="property-label">Make:</span>
            <span className="property-value">{asset.make}</span>
          </div>
          <div className="asset-property">
            <span className="property-label">Model:</span>
            <span className="property-value">{asset.model}</span>
          </div>
          {asset.serialNumber && (
            <div className="asset-property">
              <span className="property-label">Serial Number:</span>
              <span className="property-value">{asset.serialNumber}</span>
            </div>
          )}
          <div className="asset-property">
            <span className="property-label">Category:</span>
            <span className="property-value asset-category">{asset.category || 'Uncategorized'}</span>
          </div>
          <div className="asset-property">
            <span className="property-label">Value:</span>
            <span className="property-value price">£{asset.value.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="card-footer">
        <div className="asset-property">
          <span className="property-label">Added:</span>
          <span className="property-value">{new Date(asset.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
