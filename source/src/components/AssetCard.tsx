import { useState } from 'react';
import type { Asset as AssetType } from '../types/asset';
import './AssetCard.css';

type Props = {
  asset: AssetType;
  onDelete?: (id: string) => void;
  onClick?: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AssetCard({ asset, onDelete, onClick }: Props) {
  const rawPaths =
    (asset.imageUrls && asset.imageUrls.length > 0 && asset.imageUrls) ||
    (asset.imageUrl ? [asset.imageUrl] : []);

  const imageUrls = rawPaths.map((p) => (p.startsWith('http') ? p : `${API_BASE}${p}`)).slice(0, 4);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainImageUrl = imageUrls[selectedIndex];
  const hasMultiple = imageUrls.length > 1;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultiple) return;
    setSelectedIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultiple) return;
    setSelectedIndex((prev) => (prev + 1) % imageUrls.length);
  };

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
        {mainImageUrl ? (
          <>
            <img src={mainImageUrl} alt={`${asset.make} ${asset.model}`} className="asset-image" />
            {hasMultiple && (
              <div className="carousel-nav">
                <button
                  type="button"
                  className="carousel-btn prev"
                  aria-label="Previous image"
                  onClick={goPrev}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-btn next"
                  aria-label="Next image"
                  onClick={goNext}
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-image">
            <span>No Image</span>
          </div>
        )}
      </div>

      {imageUrls.length > 1 && (
        <div className="card-thumbnails" onClick={(e) => e.stopPropagation()}>
          {imageUrls.slice(0, 4).map((url, index) => (
            <button
              key={index}
              type="button"
              className={`thumbnail ${index === selectedIndex ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(index);
              }}
            >
              <img src={url} alt={`Thumbnail ${index + 1}`} />
            </button>
          ))}
        </div>
      )}

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
