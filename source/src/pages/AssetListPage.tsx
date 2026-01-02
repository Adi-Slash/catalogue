import { useEffect, useState } from 'react'
import { getAssets, createAsset, deleteAsset } from '../api/assets'
import AssetCard from '../components/AssetCard'
import AssetForm from '../components/AssetForm'
import type { Asset, NewAsset } from '../types/asset'
import { Link } from 'react-router-dom'

const HOUSEHOLD = 'house-1'

export default function AssetListPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const a = await getAssets(HOUSEHOLD)
      setAssets(a)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(payload: NewAsset) {
    const created = await createAsset(payload)
    setAssets(prev => [created, ...prev])
  }

  async function handleDelete(id: string) {
    await deleteAsset(id, HOUSEHOLD)
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0)

  return (
    <div style={{ maxWidth: 720, margin: '24px auto' }}>
      <h2>Assets</h2>
      <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 6 }}>
        <strong>Total Value: ${totalValue.toFixed(2)}</strong>
      </div>
      <Link to="/">Home</Link>
      <AssetForm householdId={HOUSEHOLD} onCreate={handleCreate} />
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && assets.length === 0 && <div>No assets yet</div>}
      <div>
        {assets.map(a => (
          <Link key={a.id} to={`/assets/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <AssetCard asset={a} onDelete={handleDelete} />
          </Link>
        ))}
      </div>
    </div>
  )
}
