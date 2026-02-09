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
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
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
      setImageUrl(initialAsset.imageUrl || '');
    }
  }, [initialAsset]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!make || !model || value === '') {
      setError('Make, model and value are required');
      return;
    }
    let finalImageUrl = imageUrl;
    if (file) {
      try {
        finalImageUrl = await uploadImage(file, householdId);
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
      imageUrl: finalImageUrl,
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
        setMake('');
        setModel('');
        setSerialNumber('');
        setDescription('');
        setCategory('');
        setValue('');
        setFile(null);
        setImageUrl('');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setImageUrl(url);
    }
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
            Asset Image
          </label>
          <input
            id="image"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="form-file"
          />
          {imageUrl && (
            <div className="image-preview">
              <img src={imageUrl} alt="Asset preview" className="preview-image" />
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
