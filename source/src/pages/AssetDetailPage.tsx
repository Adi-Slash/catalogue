import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getAsset, updateAsset, deleteAsset } from '../api/assets'
import AssetForm from '../components/AssetForm'
import type { Asset } from '../types/asset'

const HOUSEHOLD = 'house-1'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function AssetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const a = await getAsset(id, HOUSEHOLD)
      setAsset(a)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleUpdate(payload: Partial<Asset>) {
    if (!asset) return
    const updated = await updateAsset(asset.id, payload, HOUSEHOLD)
    setAsset(updated)
    setEditing(false)
  }

  async function handleDelete() {
    if (!asset) return
    if (!window.confirm('Are you sure you want to delete this asset?')) return
    await deleteAsset(asset.id, HOUSEHOLD)
    navigate('/assets')
  }

  if (loading) return <div>Loading…</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!asset) return <div>Not found</div>

  const imageUrl = asset.imageUrl?.startsWith('http') ? asset.imageUrl : `${API_BASE}${asset.imageUrl}`

  return (
    <div style={{ maxWidth: 720, margin: '24px auto' }}>
      <h2>Asset Details</h2>
      <Link to="/assets">Back to list</Link>
      <div style={{ marginTop: 16 }}>
        {!editing ? (
          <>
            <div><strong>Make:</strong> {asset.make}</div>
            <div><strong>Model:</strong> {asset.model}</div>
            <div><strong>Serial:</strong> {asset.serialNumber}</div>
            <div><strong>Description:</strong> {asset.description}</div>
            <div><strong>Category:</strong> {asset.category}</div>
            <div><strong>Value:</strong> ${asset.value.toFixed(2)}</div>
            <div><strong>Created:</strong> {new Date(asset.createdAt).toLocaleString()}</div>
            <div><strong>Updated:</strong> {new Date(asset.updatedAt).toLocaleString()}</div>
            {asset.imageUrl && <div><img src={imageUrl} alt="asset" style={{ maxWidth: '100%', marginTop: 8 }} /></div>}
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setEditing(true)} style={{ padding: '6px 12px', marginRight: 8 }}>Edit</button>
              <button onClick={handleDelete} style={{ padding: '6px 12px', background: '#e74c3c', color: 'white', border: 'none' }}>Delete</button>
            </div>
          </>
        ) : (
          <AssetForm
            householdId={HOUSEHOLD}
            onCreate={() => Promise.resolve()} // Not used in edit
            onUpdate={handleUpdate}
            initialAsset={asset}
          />
        )}
      </div>
    </div>
  )
}
