import { useState, useEffect } from 'react';
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
    let finalImageUrls = existingUrls;

    // Upload new files and combine with existing URLs
    if (files.length > 0) {
      try {
        const uploaded = await Promise.all(files.map((f) => uploadImage(f, householdId)));
        finalImageUrls = [...existingUrls, ...uploaded].slice(0, 4);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError('Image upload failed: ' + errorMessage);
        return;
      }
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

    // Count existing images (both existing URLs and new files)
    const currentCount = imageUrls.length;
    const remainingSlots = Math.max(0, 4 - currentCount);
    const filesToAdd = newFiles.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      const updatedFiles = [...files, ...filesToAdd];
      setFiles(updatedFiles);

      // Create preview URLs for new files and add to existing URLs
      const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
      setImageUrls([...imageUrls, ...newPreviews]);
    }

    // Reset the input so it can be used again for another photo
    e.target.value = '';
  }

  function removeImage(index: number) {
    const urlToRemove = imageUrls[index];
    
    // If it's a blob URL (new photo), revoke it and remove from files array
    if (urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
      // Find which file index this corresponds to (count blob URLs before this index)
      const blobUrlsBefore = imageUrls.slice(0, index).filter((url) => url.startsWith('blob:')).length;
      const fileIndex = blobUrlsBefore;
      const updatedFiles = files.filter((_, i) => i !== fileIndex);
      setFiles(updatedFiles);
    }

    // Remove from preview URLs
    const updatedUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updatedUrls);
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
              id="image"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="form-file"
              disabled={files.length >= 4}
            />
            {files.length >= 4 && (
              <span className="max-photos-message">Maximum of 4 photos reached</span>
            )}
            {files.length > 0 && files.length < 4 && (
              <span className="photo-count-message">
                {files.length} of 4 photos taken. Tap to take another photo.
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
