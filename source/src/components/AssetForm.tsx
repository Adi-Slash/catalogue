import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { uploadImage } from '../api/assets'
import type { NewAsset, Asset } from '../types/asset'

type Props = {
  householdId: string
  onCreate: (payload: NewAsset) => Promise<void>
  onUpdate?: (payload: Partial<NewAsset>) => Promise<void>
  initialAsset?: Asset
}

export default function AssetForm({ householdId, onCreate, onUpdate, initialAsset }: Props) {
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [value, setValue] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialAsset) {
      setMake(initialAsset.make)
      setModel(initialAsset.model)
      setValue(initialAsset.value)
      setImageUrl(initialAsset.imageUrl || '')
    }
  }, [initialAsset])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!make || !model || value === '') {
      setError('Make, model and value are required')
      return
    }
    let finalImageUrl = imageUrl
    if (file) {
      try {
        finalImageUrl = await uploadImage(file, householdId)
      } catch (err: any) {
        setError('Image upload failed: ' + err.message)
        return
      }
    }
    const payload: Partial<NewAsset> = {
      householdId,
      make,
      model,
      value: Number(value),
      imageUrl: finalImageUrl,
    }
    setLoading(true)
    try {
      if (initialAsset && onUpdate) {
        await onUpdate(payload)
      } else {
        await onCreate(payload as NewAsset)
      }
      // Reset form on success
      if (!initialAsset) {
        setMake('')
        setModel('')
        setValue('')
        setFile(null)
        setImageUrl('')
      }
    } catch (err: any) {
      setError(err?.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const url = URL.createObjectURL(selectedFile)
      setImageUrl(url)
    }
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 16 }}>
      <div>
        <input placeholder="Make" value={make} onChange={e => setMake(e.target.value)} />
      </div>
      <div>
        <input placeholder="Model" value={model} onChange={e => setModel(e.target.value)} />
      </div>
      <div>
        <input placeholder="Estimated value" type="number" value={value as any} onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))} />
      </div>
      <div>
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
      </div>
      {imageUrl && (
        <div>
          <img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200 }} />
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={loading} style={{ padding: '6px 12px' }}>
          {loading ? 'Saving…' : initialAsset ? 'Update Asset' : 'Add Asset'}
        </button>
      </div>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </form>
  )
}
