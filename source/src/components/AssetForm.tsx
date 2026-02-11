import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { uploadImage } from '../api/assets';
import type { NewAsset, Asset } from '../types/asset';
import './AssetForm.css';

type Props = {
  householdId: string;
  onCreate: (payload: NewAsset) => Promise<void>;
  onUpdate?: (payload: Partial<NewAsset>) => Promise<void>;
  initialAsset?: Asset;
};

export default function AssetForm({ householdId, onCreate, onUpdate, initialAsset }: Props) {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [value, setValue] = useState<number | ''>('');
  // Support up to four images per asset
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]); // Mix of existing URLs (strings) and blob URLs for new photos
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0); // Key to force input reset on mobile
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAsset) {
      setMake(initialAsset.make);
      setModel(initialAsset.model);
      setSerialNumber(initialAsset.serialNumber || '');
      setDescription(initialAsset.description || '');
      setCategory(initialAsset.category || '');
      setValue(initialAsset.value);
      const existing =
        (initialAsset.imageUrls && initialAsset.imageUrls.length > 0 && initialAsset.imageUrls) ||
        (initialAsset.imageUrl ? [initialAsset.imageUrl] : []);
      setImageUrls(existing);
    }
  }, [initialAsset]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!make || !model || value === '') {
      setError('Make, model and value are required');
      return;
    }
    // Separate existing URLs (strings) from new blob URLs (files to upload)
    const existingUrls = imageUrls.filter((url) => !url.startsWith('blob:'));
    const blobUrls = imageUrls.filter((url) => url.startsWith('blob:'));
    console.log('[AssetForm] Submitting. Existing URLs:', existingUrls.length, 'Blob URLs:', blobUrls.length, 'Files:', files.length);
    
    // Validation: blob URLs should match files count (each blob URL should have a corresponding file)
    if (blobUrls.length !== files.length) {
      console.warn('[AssetForm] Mismatch detected! Blob URLs:', blobUrls.length, 'but Files:', files.length);
      // If we have more blob URLs than files, we might have lost some files
      // If we have more files than blob URLs, we might have extra files
      // For now, proceed with what we have, but log the issue
    }
    
    let finalImageUrls = existingUrls;

    // Upload new files and combine with existing URLs
    if (files.length > 0) {
      try {
        console.log('[AssetForm] Uploading', files.length, 'files...');
        const uploaded = await Promise.all(files.map((f, idx) => {
          console.log('[AssetForm] Uploading file', idx + 1, 'of', files.length, '-', f.name, f.size, 'bytes');
          return uploadImage(f, householdId);
        }));
        console.log('[AssetForm] Uploaded', uploaded.length, 'images. URLs:', uploaded);
        finalImageUrls = [...existingUrls, ...uploaded].slice(0, 4);
        console.log('[AssetForm] Final image URLs count:', finalImageUrls.length);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[AssetForm] Upload error:', err);
        setError('Image upload failed: ' + errorMessage);
        return;
      }
    } else if (blobUrls.length > 0) {
      // We have blob URLs but no files - this shouldn't happen, but log it
      console.warn('[AssetForm] Warning: Have blob URLs but no files to upload. Blob URLs will be lost.');
    }
    const payload: Partial<NewAsset> = {
      householdId,
      make,
      model,
      serialNumber: serialNumber || undefined,
      description: description || undefined,
      category: category || undefined,
      value: Number(value),
      imageUrl: finalImageUrls[0],
      imageUrls: finalImageUrls,
    };
    setLoading(true);
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
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        setMake('');
        setModel('');
        setSerialNumber('');
        setDescription('');
        setCategory('');
        setValue('');
        setFiles([]);
        setImageUrls([]);
        // Reset file input key to allow fresh captures
        setFileInputKey(0);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    // Count total images: existing URLs (when editing) + new files already captured
    const totalImageCount = imageUrls.length;
    const remainingSlots = Math.max(0, 4 - totalImageCount);
    
    if (remainingSlots === 0) {
      // Already at max, reset input and return
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Take only as many files as we have slots remaining
    const filesToAdd = newFiles.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      // Add new files to the files array
      setFiles((prevFiles) => {
        const updatedFiles = [...prevFiles, ...filesToAdd];
        console.log('[AssetForm] Added files. Total files:', updatedFiles.length, 'New files:', filesToAdd.length);
        return updatedFiles;
      });

      // Create preview URLs (blob URLs) for new files and add to existing URLs
      const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
      const newTotalCount = imageUrls.length + newPreviews.length;
      
      setImageUrls((prevUrls) => {
        const updatedUrls = [...prevUrls, ...newPreviews];
        console.log('[AssetForm] Added image URLs. Total URLs:', updatedUrls.length, 'New previews:', newPreviews.length);
        return updatedUrls;
      });

      // Reset the input so it can be used again for another photo
      // On mobile devices, use a key to force input recreation for reliable sequential camera captures
      setTimeout(() => {
        if (fileInputRef.current && newTotalCount < 4) {
          fileInputRef.current.value = '';
          // Increment key to force input reset on mobile (helps with sequential camera captures)
          setFileInputKey((prev) => prev + 1);
        }
      }, 100);
    } else {
      // No files added (shouldn't happen), but reset input anyway
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 0);
    }
  }

  function removeImage(index: number) {
    const urlToRemove = imageUrls[index];
    
    // If it's a blob URL (new photo), revoke it and remove from files array
    if (urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
      // Find which file index this corresponds to (count blob URLs before this index)
      setFiles((prevFiles) => {
        const blobUrlsBefore = imageUrls.slice(0, index).filter((url) => url.startsWith('blob:')).length;
        const fileIndex = blobUrlsBefore;
        const updatedFiles = prevFiles.filter((_, i) => i !== fileIndex);
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
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="make" className="form-label">
            Make *
          </label>
          <input
            id="make"
            type="text"
            placeholder="e.g., Apple, Rolex, Steinway"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="model" className="form-label">
            Model *
          </label>
          <input
            id="model"
            type="text"
            placeholder="e.g., iPhone 15, Submariner, Model D"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="serialNumber" className="form-label">
            Serial Number
          </label>
          <input
            id="serialNumber"
            type="text"
            placeholder="Optional serial or reference number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-select"
          >
            <option value="">Select Category</option>
            <option value="Electrical">Electrical</option>
            <option value="Fitness">Fitness</option>
            <option value="Furniture">Furniture</option>
            <option value="Instrument">Instrument</option>
            <option value="Jewellery">Jewellery</option>
            <option value="Tools">Tools</option>
            <option value="Transport">Transport</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="value" className="form-label">
            Estimated Value (£) *
          </label>
          <input
            id="value"
            type="number"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
            className="form-input"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            placeholder="Additional details about the asset..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            rows={4}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="image" className="form-label">
            Asset Images (up to 4)
          </label>
          <div className="camera-controls">
            <input
              key={fileInputKey}
              ref={fileInputRef}
              id="image"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="form-file"
              disabled={imageUrls.length >= 4}
            />
            {imageUrls.length >= 4 && (
              <span className="max-photos-message">Maximum of 4 photos reached</span>
            )}
            {imageUrls.length > 0 && imageUrls.length < 4 && (
              <span className="photo-count-message">
                {imageUrls.length} of 4 photos taken. Tap to take another photo.
              </span>
            )}
          </div>
          {imageUrls.length > 0 && (
            <div className="image-preview-grid">
              {imageUrls.slice(0, 4).map((url, index) => (
                <div className="image-preview" key={index}>
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    ×
                  </button>
                  <img src={url} alt={`Asset preview ${index + 1}`} className="preview-image" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Saving...' : initialAsset ? 'Update Asset' : 'Add Asset'}
        </button>
      </div>
    </form>
  );
}
