import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { uploadImage } from '../api/assets';
import type { NewAsset, Asset, ImageUrls } from '../types/asset';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeImageUrls } from '../utils/imageUtils';
import { estimateAssetPrice } from '../utils/priceEstimation';
import './AssetForm.css';

type Props = {
  householdId: string;
  onCreate: (payload: NewAsset) => Promise<void>;
  onUpdate?: (payload: Partial<NewAsset>) => Promise<void>;
  initialAsset?: Asset;
};

export default function AssetForm({ householdId, onCreate, onUpdate, initialAsset }: Props) {
  const { t, currencySymbol, formatCurrency } = useLanguage();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [value, setValue] = useState<number | ''>('');
  const [datePurchased, setDatePurchased] = useState('');
  const [estimating, setEstimating] = useState(false);
  // Support up to four images per asset
  // Use a ref to track files separately to avoid state synchronization issues
  const filesRef = useRef<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  // imageUrls can contain:
  // - ImageUrls objects (for existing uploaded images with dual resolution)
  // - Blob URLs as strings (for new photos being previewed before upload)
  const [imageUrls, setImageUrls] = useState<(string | ImageUrls)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0); // Key to force input reset on mobile
  const [selectedFileName, setSelectedFileName] = useState<string>(''); // Track selected file name
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false); // Prevent duplicate processing

  useEffect(() => {
    if (initialAsset) {
      setMake(initialAsset.make);
      setModel(initialAsset.model);
      setSerialNumber(initialAsset.serialNumber || '');
      setDescription(initialAsset.description || '');
      setCategory(initialAsset.category || '');
      setValue(initialAsset.value);
      setDatePurchased(initialAsset.datePurchased || '');
      // Load existing images - normalize to ImageUrls objects
      const existing =
        (initialAsset.imageUrls && initialAsset.imageUrls.length > 0 && initialAsset.imageUrls) ||
        (initialAsset.imageUrl ? [initialAsset.imageUrl] : []);
      // Normalize to ImageUrls objects (legacy strings become ImageUrls with same URL for high/low)
      const normalized = normalizeImageUrls(existing);
      setImageUrls(normalized);
      // Reset files when editing (existing assets don't have new files to upload)
      setFiles([]);
      filesRef.current = [];
      processingRef.current = false;
      setSelectedFileName(''); // Reset file name display
    } else {
      // Reset everything when creating new asset
      setFiles([]);
      filesRef.current = [];
      setImageUrls([]);
      setDatePurchased('');
      processingRef.current = false;
      setSelectedFileName(''); // Reset file name display
    }
  }, [initialAsset]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Prevent multiple submissions - set loading immediately
    if (loading) {
      console.log('[AssetForm] Submit already in progress, ignoring duplicate submission');
      return;
    }
    
    setError(null);
    setLoading(true); // Lock form immediately to prevent multiple submissions
    
    if (!make || !model || value === '') {
      setError(t('form.required') + ' ' + t('asset.make') + ', ' + t('asset.model') + ', ' + t('asset.value'));
      setLoading(false);
      return;
    }

    // Wait for any pending file processing to complete
    // This is critical on mobile where photos might be taken quickly before submit
    if (processingRef.current) {
      console.log('[AssetForm] Waiting for file processing to complete before submit...');
      let attempts = 0;
      const maxAttempts = 30; // Increased to allow more time for mobile
      while (processingRef.current && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        attempts++;
      }
      if (processingRef.current) {
        console.warn('[AssetForm] File processing still in progress after wait, proceeding anyway');
      } else {
        console.log('[AssetForm] File processing completed after', attempts, 'attempts');
      }
    }

    // Give React a moment to process any pending state updates
    // This ensures that if files were just added, the state has updated
    // Increased delay for mobile devices which might be slower
    await new Promise((resolve) => setTimeout(resolve, 200));

    // CRITICAL FIX: Wait for any pending imageUrls updates to complete
    // Since handleFileChange uses setTimeout to update imageUrls, we need to wait
    // for those timeouts to execute before reading the state
    // Wait a bit longer to ensure all setTimeout callbacks have executed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Separate existing ImageUrls objects from new blob URLs (files to upload)
    // Always prefer filesRef.current as it's updated synchronously in handleFileChange
    // The ref should have the latest files even if state hasn't updated yet
    const currentFiles = filesRef.current.length >= files.length ? filesRef.current : files;
    
    // Re-read imageUrls after waiting - it should now have all the blob URLs
    // Use a functional update to get the latest state
    let currentImageUrls = imageUrls;
    // Force a re-read by checking if we need to wait more
    // If filesRef has more files than imageUrls has blob URLs, wait a bit more
    const blobUrlsCount = imageUrls.filter((url) => typeof url === 'string' && url.startsWith('blob:')).length;
    if (currentFiles.length > blobUrlsCount && currentFiles.length > 0) {
      console.log('[AssetForm] Waiting for imageUrls state to catch up. Files:', currentFiles.length, 'Blob URLs:', blobUrlsCount);
      // Wait a bit more for state to update
      await new Promise((resolve) => setTimeout(resolve, 150));
      // Re-read imageUrls state - we can't use functional update here, so we'll rely on the wait
      // Actually, we'll just use filesRef.current which has all the files
    }
    
    // Separate existing ImageUrls objects from blob URLs (strings starting with 'blob:')
    const existingUrls = currentImageUrls.filter((url) => typeof url === 'object' || (typeof url === 'string' && !url.startsWith('blob:')));
    const blobUrls = currentImageUrls.filter((url) => typeof url === 'string' && url.startsWith('blob:'));
    
    console.log('[AssetForm] Submitting. Existing URLs:', existingUrls.length, 'Blob URLs:', blobUrls.length, 'Files (state):', files.length, 'Files (ref):', filesRef.current.length, 'Using files:', currentFiles.length);
    
    // Validation: blob URLs should match files count (each blob URL should have a corresponding file)
    // On mobile, if user takes photos quickly, blobUrls might not match currentFiles yet
    // In that case, we should still upload all files we have
    if (blobUrls.length !== currentFiles.length) {
      console.warn('[AssetForm] Mismatch detected! Blob URLs:', blobUrls.length, 'but Files:', currentFiles.length);
      if (currentFiles.length > blobUrls.length) {
        console.log('[AssetForm] Have more files than blob URLs - this is OK, will upload all files');
      } else {
        console.warn('[AssetForm] Have more blob URLs than files - some files might be missing');
      }
    }
    
    let finalImageUrls = existingUrls;

    // Upload new files and combine with existing URLs
    // CRITICAL: Always upload all files from currentFiles, even if blobUrls count doesn't match
    // This ensures we don't lose files on mobile when state hasn't updated yet
    // CRITICAL: Use filesRef.current directly to ensure we have all files
    const filesToUpload = filesRef.current.length > 0 ? filesRef.current : currentFiles;
    if (filesToUpload.length > 0) {
      try {
        console.log('[AssetForm] Uploading', filesToUpload.length, 'files...');
        const uploaded = await Promise.all(filesToUpload.map((f, idx) => {
          console.log('[AssetForm] Uploading file', idx + 1, 'of', filesToUpload.length, '-', f.name, f.size, 'bytes');
          return uploadImage(f, householdId);
        }));
        console.log('[AssetForm] Uploaded', uploaded.length, 'images. ImageUrls:', uploaded);
        // uploaded is now an array of ImageUrls objects
        finalImageUrls = [...existingUrls, ...uploaded].slice(0, 4);
        console.log('[AssetForm] Final image URLs count:', finalImageUrls.length);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : t('common.error');
        console.error('[AssetForm] Upload error:', err);
        setError(t('form.errorUploading') + ': ' + errorMessage);
        setLoading(false); // Unlock form on upload error
        return;
      }
    } else if (blobUrls.length > 0) {
      // We have blob URLs but no files - this shouldn't happen, but log it
      console.warn('[AssetForm] Warning: Have blob URLs but no files to upload. Blob URLs will be lost.');
    }
    // Extract high-res URL for legacy imageUrl field (backwards compatibility)
    const firstImageUrl = finalImageUrls.length > 0
      ? (typeof finalImageUrls[0] === 'string' ? finalImageUrls[0] : finalImageUrls[0].high)
      : undefined;
    
    const payload: Partial<NewAsset> = {
      householdId,
      make,
      model,
      serialNumber: serialNumber || undefined,
      description: description || undefined,
      category: category || undefined,
      value: Number(value),
      datePurchased: datePurchased || undefined,
      imageUrl: firstImageUrl, // Legacy field - use high-res URL
      imageUrls: finalImageUrls, // New field - array of ImageUrls objects or strings
    };
    // Loading is already set to true at the start of submit()
    try {
      if (initialAsset && onUpdate) {
        await onUpdate(payload);
      } else {
        await onCreate(payload as NewAsset);
      }
      // Reset form on success
      if (!initialAsset) {
        // Clean up blob URLs before resetting
        imageUrls.forEach((url) => {
          if (typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        setMake('');
        setModel('');
        setSerialNumber('');
        setDescription('');
        setCategory('');
        setValue('');
        setDatePurchased('');
        setFiles([]);
        filesRef.current = []; // Reset ref too
        setImageUrls([]);
        // Reset file input key to allow fresh captures
        setFileInputKey(0);
        // For create: navigation happens in onCreate, so component unmounts - no need to unlock
      } else {
        // For update: unlock form after successful update
        setLoading(false);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : (initialAsset ? t('form.errorUpdating') : t('form.errorCreating'));
      setError(errorMessage);
      setLoading(false); // Unlock form on error so user can retry
    }
  }

  async function handleEstimatePrice() {
    if (!make || !model) {
      setError(t('asset.estimateRequired') || 'Make and model are required for price estimation');
      return;
    }

    setEstimating(true);
    setError(null);

    try {
      const result = await estimateAssetPrice({
        make,
        model,
        category: category || undefined,
        serialNumber: serialNumber || undefined,
        description: description || undefined,
        datePurchased: datePurchased || undefined,
      });

      // Set the estimated value
      setValue(Math.round(result.estimatedValue * 100) / 100); // Round to 2 decimal places

      // Show success message with confidence level
      const confidenceMsg = result.confidence === 'high' 
        ? t('asset.estimateHighConfidence') || 'High confidence'
        : result.confidence === 'medium'
        ? t('asset.estimateMediumConfidence') || 'Medium confidence'
        : t('asset.estimateLowConfidence') || 'Low confidence';
      
      console.log(`[AssetForm] Price estimated: ${formatCurrency(result.estimatedValue)} (${confidenceMsg})`);
      
      if (result.notes) {
        console.log(`[AssetForm] Estimation notes: ${result.notes}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('asset.estimateError') || 'Failed to estimate price';
      setError(errorMessage);
      console.error('[AssetForm] Price estimation error:', err);
    } finally {
      setEstimating(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Prevent duplicate processing if handler is called multiple times
    if (processingRef.current) {
      console.log('[AssetForm] Already processing files, ignoring duplicate call');
      return;
    }

    // CRITICAL: Read files synchronously before any async operations
    // On mobile with camera capture, e.target.files contains only the most recent capture
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) {
      console.log('[AssetForm] No files in input');
      setSelectedFileName('');
      return;
    }

    // Update selected file name for display
    const fileNames = Array.from(inputFiles).map(f => f.name).join(', ');
    setSelectedFileName(fileNames);

    // Convert FileList to array immediately - this preserves the File objects
    const newFiles = Array.from(inputFiles);
    console.log('[AssetForm] File change detected. New files:', newFiles.length, 'File names:', newFiles.map(f => f.name), 'Sizes:', newFiles.map(f => f.size + ' bytes'));

    processingRef.current = true;

    // CRITICAL FIX: Read both states separately, calculate updates, then update both states separately
    // This avoids the race condition where nested state updates overwrite each other
    
    // Step 1: Read both states using functional updates to get current values
    // We'll calculate what needs to be added, then update both states separately (not nested)
    
    // First read imageUrls to check capacity
    setImageUrls((prevUrls) => {
      const totalImageCount = prevUrls.length;
      const remainingSlots = Math.max(0, 4 - totalImageCount);
      
      console.log('[AssetForm] Current state - URLs:', prevUrls.length, 'Remaining slots:', remainingSlots);
      
      if (remainingSlots === 0) {
        console.log('[AssetForm] Already at max capacity (4 images)');
        processingRef.current = false;
        setTimeout(() => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 0);
        return prevUrls;
      }

      // Now read files state to filter duplicates and calculate updates
      setFiles((prevFiles) => {
        console.log('[AssetForm] Current files (state):', prevFiles.length, 'Current files (ref):', filesRef.current.length);

        // Use the larger of state or ref to ensure we have latest files
        const currentFilesForCheck = filesRef.current.length > prevFiles.length ? filesRef.current : prevFiles;

        // Filter out files that are already in the array to prevent duplicates
        const existingFileKeys = new Set(
          currentFilesForCheck.map(f => `${f.name}-${f.size}-${f.lastModified}`)
        );
        const uniqueNewFiles = newFiles.filter(
          f => !existingFileKeys.has(`${f.name}-${f.size}-${f.lastModified}`)
        );

        if (uniqueNewFiles.length === 0) {
          console.log('[AssetForm] All files are duplicates, ignoring');
          processingRef.current = false;
          setTimeout(() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }, 0);
          return prevFiles;
        }

        // Take only as many unique files as we have slots remaining
        const filesToAdd = uniqueNewFiles.slice(0, remainingSlots);
        
        if (filesToAdd.length === 0) {
          console.log('[AssetForm] No files to add after filtering');
          processingRef.current = false;
          setTimeout(() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }, 0);
          return prevFiles;
        }

        // Create preview URLs (blob URLs) for new files
        const newPreviews = filesToAdd.map((file) => {
          const blobUrl = URL.createObjectURL(file);
          console.log('[AssetForm] Created blob URL for file:', file.name, 'Size:', file.size, 'bytes');
          return blobUrl;
        });

        // Calculate updated values
        const updatedFiles = [...prevFiles, ...filesToAdd];
        const updatedUrls = [...prevUrls, ...newPreviews];

        // CRITICAL: Update ref FIRST synchronously before any state updates
        // This ensures submit() can read the latest files even if state hasn't updated yet
        filesRef.current = updatedFiles;
        console.log('[AssetForm] Updated files array. Total files:', updatedFiles.length, 'Added:', filesToAdd.length, 'File names:', filesToAdd.map(f => f.name), 'Ref updated synchronously');
        console.log('[AssetForm] Updated image URLs. Total:', updatedUrls.length, 'Added:', newPreviews.length);

        // CRITICAL FIX: Update imageUrls state using a functional update
        // This ensures we merge correctly even if multiple updates happen quickly
        // Use setTimeout to ensure it happens after the outer callback returns
        setTimeout(() => {
          setImageUrls((currentUrls) => {
            // Merge: keep all existing URLs (ImageUrls objects or strings), add new previews (blob URL strings)
            // This ensures we don't lose blob URLs from previous handleFileChange calls
            const mergedUrls: (string | ImageUrls)[] = [...currentUrls, ...newPreviews].slice(0, 4);
            console.log('[AssetForm] Merged image URLs. Previous:', currentUrls.length, 'New previews:', newPreviews.length, 'Merged:', mergedUrls.length);
            return mergedUrls;
          });
        }, 0);

        // Reset processing flag
        Promise.resolve().then(() => {
          processingRef.current = false;
        });

        // Reset input after a delay
        setTimeout(() => {
          if (fileInputRef.current && updatedUrls.length < 4) {
            fileInputRef.current.value = '';
            setFileInputKey((prev) => prev + 1);
          }
        }, 250);

        return updatedFiles;
      });

      // Return current URLs - the actual update happens via Promise.resolve().then() inside setFiles
      return prevUrls;
    });
  }

  function removeImage(index: number) {
    const urlToRemove = imageUrls[index];
    
    // If it's a blob URL (new photo), revoke it and remove from files array
    if (typeof urlToRemove === 'string' && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
      // Find which file index this corresponds to (count blob URLs before this index)
      setFiles((prevFiles) => {
        const blobUrlsBefore = imageUrls.slice(0, index).filter((url) => typeof url === 'string' && url.startsWith('blob:')).length;
        const fileIndex = blobUrlsBefore;
        const updatedFiles = prevFiles.filter((_, i) => i !== fileIndex);
        filesRef.current = updatedFiles; // Keep ref in sync
        console.log('[AssetForm] Removed file at index', fileIndex, 'Remaining files:', updatedFiles.length);
        return updatedFiles;
      });
    }

    // Remove from preview URLs
    setImageUrls((prevUrls) => {
      const updatedUrls = prevUrls.filter((_, i) => i !== index);
      console.log('[AssetForm] Removed image URL at index', index, 'Remaining URLs:', updatedUrls.length);
      return updatedUrls;
    });
  }

  return (
    <form onSubmit={submit} className="asset-form">
      {loading && (
        <div className="form-loading-overlay" aria-live="polite" aria-busy="true">
          <div className="form-loading-spinner"></div>
          <p>{t('form.saving')}...</p>
        </div>
      )}
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="make" className="form-label">
            {t('asset.make')} {t('form.required')}
          </label>
          <input
            id="make"
            type="text"
            placeholder={t('asset.makePlaceholder')}
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="form-input"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="model" className="form-label">
            {t('asset.model')} {t('form.required')}
          </label>
          <input
            id="model"
            type="text"
            placeholder={t('asset.modelPlaceholder')}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="form-input"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="serialNumber" className="form-label">
            {t('asset.serialNumber')}
          </label>
          <input
            id="serialNumber"
            type="text"
            placeholder={t('asset.serialNumberPlaceholder')}
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="form-input"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">
            {t('asset.category')}
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-select"
            disabled={loading}
          >
            <option value="">{t('asset.selectCategory')}</option>
            <option value="Electrical">{t('categories.electrical')}</option>
            <option value="Fitness">{t('categories.fitness')}</option>
            <option value="Furniture">{t('categories.furniture')}</option>
            <option value="Instrument">{t('categories.instrument')}</option>
            <option value="Jewellery">{t('categories.jewellery')}</option>
            <option value="Tools">{t('categories.tools')}</option>
            <option value="Transport">{t('categories.transport')}</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="datePurchased" className="form-label">
            {t('asset.datePurchased')}
          </label>
          <input
            id="datePurchased"
            type="date"
            value={datePurchased}
            onChange={(e) => setDatePurchased(e.target.value)}
            className="form-input"
            max={new Date().toISOString().split('T')[0]} // Can't be in the future
            disabled={loading}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="value" className="form-label">
            {t('asset.estimatedValue')} ({currencySymbol}) {t('form.required')}
          </label>
          <div className="value-input-group">
            <input
              id="value"
              type="number"
              placeholder={t('asset.valuePlaceholder')}
              value={value}
              onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
              className="form-input"
              min="0"
              step="0.01"
              required
              disabled={loading || estimating}
            />
            {!initialAsset && (
              <button
                type="button"
                onClick={handleEstimatePrice}
                className="btn btn-secondary estimate-btn"
                disabled={loading || estimating || !make || !model}
                title={t('asset.estimatePriceTooltip') || 'Estimate current market value based on make, model, category, and age'}
              >
                {estimating ? (t('asset.estimating') || 'Estimating...') : (t('asset.estimatePrice') || 'Estimate Price')}
              </button>
            )}
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="description" className="form-label">
            {t('asset.description')}
          </label>
          <textarea
            id="description"
            placeholder={t('asset.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            rows={4}
            disabled={loading}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="image" className="form-label">
            {t('form.assetImages')}
          </label>
          <div className="camera-controls">
            <div className="file-input-wrapper">
              <input
                key={fileInputKey}
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="form-file-hidden"
                disabled={loading || imageUrls.length >= 4}
              />
              <label htmlFor="image" className={`custom-file-button ${loading || imageUrls.length >= 4 ? 'disabled' : ''}`}>
                {t('form.chooseFile')}
              </label>
              <span className="file-name-display">
                {selectedFileName || t('form.noFileChosen')}
              </span>
            </div>
            {imageUrls.length >= 4 && (
              <span className="max-photos-message">{t('form.maxPhotosReached')}</span>
            )}
            {imageUrls.length > 0 && imageUrls.length < 4 && (
              <span className="photo-count-message">
                {t('form.photosTakenMessage', { count: imageUrls.length.toString() })}
              </span>
            )}
          </div>
          {imageUrls.length > 0 && (
            <div className="image-preview-grid">
              {imageUrls.slice(0, 4).map((url, index) => {
                // Extract display URL: use blob URL if string, or high-res URL if ImageUrls object
                const displayUrl = typeof url === 'string' ? url : url.high;
                return (
                  <div className="image-preview" key={index}>
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                      aria-label={t('form.removePhoto') + ` ${index + 1}`}
                      disabled={loading}
                    >
                      ×
                    </button>
                    <img src={displayUrl} alt={`Asset preview ${index + 1}`} className="preview-image" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? t('form.saving') : initialAsset ? t('assets.updateAsset') : t('assets.addAsset')}
        </button>
      </div>
    </form>
  );
}
