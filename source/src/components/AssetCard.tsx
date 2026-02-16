import { useState, useEffect, useRef } from 'react';
import type { Asset as AssetType } from '../types/asset';
import { useLanguage } from '../contexts/LanguageContext';
import { getImageUrls } from '../utils/imageUtils';
import './AssetCard.css';

type Props = {
  asset: AssetType;
  onDelete?: (id: string) => void;
  onClick?: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AssetCard({ asset, onDelete, onClick }: Props) {
  const { t, formatCurrency } = useLanguage();
  // Use low-resolution images for list page (faster loading)
  const rawPaths = getImageUrls(asset, false);

  const imageUrls = rawPaths.map((p) => (p.startsWith('http') ? p : `${API_BASE}${p}`)).slice(0, 4);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const mainImageUrl = imageUrls[selectedIndex];
  const hasMultiple = imageUrls.length > 1;

  // Reset loading state when asset changes (not when image URL changes)
  // This ensures images reload when navigating back from edit page
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setSelectedIndex(0); // Reset to first image when asset changes
  }, [asset.id]);

  // Reset loading state when the displayed image URL changes (for navigation)
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    
    // Check if image is already cached and loaded (for instant display)
    if (mainImageUrl) {
      const img = new Image();
      img.onload = () => {
        // Image is cached, set loading to false immediately
        setImageLoading(false);
        setImageError(false);
      };
      img.onerror = () => {
        // Don't set error here - let the actual img element handle it
        // This is just a cache check
      };
      img.src = mainImageUrl;
    }
  }, [mainImageUrl]);

  // Reset loading state when image changes (for manual navigation)
  const handleImageChange = () => {
    setImageLoading(true);
    setImageError(false);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultiple) return;
    handleImageChange();
    setSelectedIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultiple) return;
    handleImageChange();
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
          aria-label={t('asset.deleteAssetAria')}
        >
          🗑️
        </button>
      </div>
      <div className="card-image">
        {mainImageUrl ? (
          <>
            {imageLoading && !imageError && (
              <div className="image-loading-placeholder">
                <div className="loading-spinner"></div>
              </div>
            )}
            <img
              ref={imgRef}
              key={`${asset.id}-${selectedIndex}-${mainImageUrl}`}
              src={mainImageUrl}
              alt={`${asset.make} ${asset.model}`}
              className={`asset-image ${imageLoading ? 'loading' : ''}`}
              loading="lazy"
              decoding="async"
              width={220}
              height={180}
              onLoad={() => {
                setImageLoading(false);
                setImageError(false);
              }}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {imageError && (
              <div className="image-error-placeholder">
                <span>{t('asset.imageLoadError') || 'Failed to load image'}</span>
              </div>
            )}
            {hasMultiple && (
              <div className="carousel-nav">
                <button
                  type="button"
                  className="carousel-btn prev"
                  aria-label={t('asset.previousImage')}
                  onClick={goPrev}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-btn next"
                  aria-label={t('asset.nextImage')}
                  onClick={goNext}
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-image">
            <span>{t('asset.noImage')}</span>
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
                handleImageChange();
                setSelectedIndex(index);
              }}
            >
              <img
                src={url}
                alt={`Thumbnail ${index + 1}`}
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
              />
            </button>
          ))}
        </div>
      )}

      <div className="card-content">
        <div className="asset-info">
          <div className="asset-property">
            <span className="property-label">{t('asset.make')}:</span>
            <span className="property-value">{asset.make}</span>
          </div>
          <div className="asset-property">
            <span className="property-label">{t('asset.model')}:</span>
            <span className="property-value">{asset.model}</span>
          </div>
          {asset.serialNumber && (
            <div className="asset-property">
              <span className="property-label">{t('asset.serialNumber')}:</span>
              <span className="property-value">{asset.serialNumber}</span>
            </div>
          )}
          <div className="asset-property">
            <span className="property-label">{t('asset.category')}:</span>
            <span className="property-value asset-category">{asset.category || t('assets.uncategorized')}</span>
          </div>
          <div className="asset-property">
            <span className="property-label">{t('asset.value')}:</span>
            <span className="property-value price">{formatCurrency(asset.value)}</span>
          </div>
        </div>
      </div>

      <div className="card-footer">
        <div className="asset-property">
          <span className="property-label">{t('asset.added')}:</span>
          <span className="property-value">{new Date(asset.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
