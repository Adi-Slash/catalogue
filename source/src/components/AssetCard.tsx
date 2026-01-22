import type { Asset as AssetType } from '../types/asset';
import './AssetCard.css';

type Props = {
  asset: AssetType;
  onDelete?: (id: string) => void;
  onClick?: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AssetCard({ asset, onDelete, onClick }: Props) {
  const imageUrl = asset.imageUrl?.startsWith('http')
    ? asset.imageUrl
    : `${API_BASE}${asset.imageUrl}`;

  return (
    <div className="asset-card" onClick={onClick}>
      <div className="card-image">
        {asset.imageUrl ? (
          <img src={imageUrl} alt={`${asset.make} ${asset.model}`} className="asset-image" />
        ) : (
          <div className="no-image">
            <span>No Image</span>
          </div>
        )}
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
      </div>

      <div className="card-content">
        <div className="asset-info">
          <h3 className="asset-title">
            {asset.make} {asset.model}
          </h3>
          {asset.serialNumber && <p className="asset-serial">SN: {asset.serialNumber}</p>}
          <span className="asset-category">{asset.category || 'Uncategorized'}</span>
        </div>

        <div className="asset-price">
          <span className="price">${asset.value.toFixed(2)}</span>
        </div>
      </div>

      <div className="card-footer">
        <span className="asset-date">Added {new Date(asset.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
