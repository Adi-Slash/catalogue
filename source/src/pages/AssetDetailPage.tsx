import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAsset, updateAsset, deleteAsset } from '../api/assets';
import AssetForm from '../components/AssetForm';
import type { Asset } from '../types/asset';
import { useHouseholdId } from '../utils/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { getImageUrls } from '../utils/imageUtils';
import { generateInsuranceClaimPDF } from '../utils/pdfGenerator';
import './AssetDetailPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const householdId = useHouseholdId();
  const { t, formatCurrency } = useLanguage();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  // Move useState hook before any conditional returns to avoid hooks violation
  const [selectedIndex, setSelectedIndex] = useState(0);

  const load = useCallback(async () => {
    if (!id || !householdId) return;
    setLoading(true);
    setError(null);
    try {
      const a = await getAsset(id, householdId);
      setAsset(a);
      // Reset selectedIndex when asset changes
      setSelectedIndex(0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('auth.failedToLoad');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id, householdId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(payload: Partial<Asset>) {
    if (!asset || !householdId) return;
    const updated = await updateAsset(asset.id, payload, householdId);
    setAsset(updated);
    setEditing(false);
    // Reset selectedIndex when asset is updated
    setSelectedIndex(0);
  }

  async function handleDelete() {
    if (!asset || !householdId) return;
    if (!window.confirm(t('asset.deleteConfirm'))) return;
    await deleteAsset(asset.id, householdId);
    navigate('/assets');
  }

  async function handleGenerateClaim() {
    if (!asset) return;
    
    try {
      setGeneratingPDF(true);
      
      // Get high-resolution images for the PDF
      const highResImageUrls = getImageUrls(asset, true);
      
      console.log('[Claim] Asset image URLs:', highResImageUrls);
      
      if (highResImageUrls.length === 0) {
        alert(t('claim.noImages') || 'This asset has no images. Please add images before generating a claim document.');
        setGeneratingPDF(false);
        return;
      }

      // Show confirmation dialog
      const generating = window.confirm(
        t('claim.generateConfirm') || 
        'This will generate an insurance claim PDF document. Continue?'
      );
      
      if (!generating) {
        setGeneratingPDF(false);
        return;
      }

      // Show progress message
      const progressMsg = t('claim.generating') || 'Generating PDF... This may take a moment.';
      console.log(progressMsg);

      // Generate the PDF with localized currency formatting
      await generateInsuranceClaimPDF(asset, highResImageUrls, formatCurrency);
      
      // Success message
      alert(t('claim.generateSuccess') || 'Insurance claim PDF generated successfully!');
    } catch (error) {
      console.error('Error generating claim PDF:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(
        (t('claim.generateError') || 'Failed to generate claim document.') + 
        '\n\nError: ' + errorMsg +
        '\n\nPlease ensure images are accessible and try again.'
      );
    } finally {
      setGeneratingPDF(false);
    }
  }

  // Use high-resolution images for detail/edit page
  const rawPaths = asset ? getImageUrls(asset, true) : [];

  const imageUrls = rawPaths.map((p) => (p.startsWith('http') ? p : `${API_BASE}${p}`)).slice(0, 4);
  const mainImageUrl = imageUrls[selectedIndex] || undefined;
  const hasMultiple = imageUrls.length > 1;

  const goPrev = () => {
    if (!hasMultiple) return;
    setSelectedIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const goNext = () => {
    if (!hasMultiple) return;
    setSelectedIndex((prev) => (prev + 1) % imageUrls.length);
  };

  if (loading)
    return (
      <div className="asset-detail-page">
        <div className="loading">{t('common.loading')}</div>
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
          <h2>{t('asset.notFound')}</h2>
          <p>{t('asset.notFoundMessage')}</p>
          <Link to="/assets" className="btn btn-primary">
            {t('asset.backToAssets')}
          </Link>
        </div>
      </div>
    );

  return (
    <div className="asset-detail-page">
      <div className="page-header">
        <h1>{t('asset.details')}</h1>
        <div className="back-link">
          <Link to="/assets" className="btn btn-secondary">
            ← {t('asset.backToAssets')}
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
              <span className="asset-category">{asset.category || t('assets.uncategorized')}</span>
            </div>
            <div className="asset-value">
              <span className="price">{formatCurrency(asset.value)}</span>
            </div>
          </div>

          {mainImageUrl && (
            <div className="asset-image-section">
              <div className="asset-image-wrapper">
                <img
                  src={mainImageUrl}
                  alt={`${asset.make} ${asset.model}`}
                  className="asset-image"
                />
                {hasMultiple && (
                  <div className="asset-carousel-nav">
                    <button
                      type="button"
                      className="asset-carousel-btn prev"
                      aria-label={t('asset.previousImage')}
                      onClick={goPrev}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="asset-carousel-btn next"
                      aria-label={t('asset.nextImage')}
                      onClick={goNext}
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
              {imageUrls.length > 1 && (
                <div className="asset-image-thumbs">
                  {imageUrls.slice(0, 4).map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`thumb ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <img src={url} alt={`Asset thumbnail ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="asset-info-grid">

            <div className="info-item">
              <label>{t('asset.serialNumber')}</label>
              <span>{asset.serialNumber}</span>
            </div>

            <div className="info-item full-width">
              <label>{t('asset.description')}</label>
              <span>{asset.description}</span>
            </div>

            {asset.datePurchased && (
              <div className="info-item">
                <label>{t('asset.datePurchased')}</label>
                <span>{new Date(asset.datePurchased).toLocaleDateString()}</span>
              </div>
            )}

            <div className="info-item">
              <label>{t('asset.created')}</label>
              <span>{new Date(asset.createdAt).toLocaleString()}</span>
            </div>

            <div className="info-item">
              <label>{t('asset.lastUpdated')}</label>
              <span>{new Date(asset.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="asset-actions">
            <button onClick={() => setEditing(true)} className="btn btn-secondary" disabled={generatingPDF}>
              {t('asset.editAsset')}
            </button>
            <button 
              onClick={handleGenerateClaim} 
              className="btn btn-primary" 
              disabled={generatingPDF}
            >
              {generatingPDF 
                ? (t('claim.generating') || 'Generating PDF...') 
                : (t('claim.generateClaim') || 'Insurance Claim')}
            </button>
            <button onClick={handleDelete} className="btn btn-danger" disabled={generatingPDF}>
              {t('asset.deleteAsset')}
            </button>
          </div>
        </div>
      ) : (
        <div className="edit-form-container">
          {householdId && (
            <AssetForm
              householdId={householdId}
              onCreate={() => Promise.resolve()} // Not used in edit
              onUpdate={handleUpdate}
              initialAsset={asset}
            />
          )}
          <div className="form-actions">
            <button onClick={() => setEditing(false)} className="btn btn-secondary">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
