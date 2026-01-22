import type { Asset as AssetType } from '../types/asset';

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
    <div
      style={{
        border: '1px solid #ddd',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {asset.imageUrl && (
        <div style={{ marginBottom: 8 }}>
          <img
            src={imageUrl}
            alt={`${asset.make} ${asset.model}`}
            style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'cover' }}
          />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600 }}>
            {asset.make} {asset.model}
          </div>
          <div style={{ color: '#666' }}>{asset.serialNumber || ''}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{asset.category || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>${asset.value.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {new Date(asset.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onDelete) {
              onDelete(asset.id);
            }
          }}
          style={{
            color: 'white',
            background: '#e74c3c',
            border: 'none',
            padding: '6px 10px',
            borderRadius: 4,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
