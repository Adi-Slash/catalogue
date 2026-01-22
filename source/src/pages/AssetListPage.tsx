import { useEffect, useState } from 'react'
import { getAssets, createAsset, deleteAsset } from '../api/assets'
import AssetCard from '../components/AssetCard'
import AssetForm from '../components/AssetForm'
import type { Asset, NewAsset } from '../types/asset'
import { useNavigate, Link } from 'react-router-dom'

const HOUSEHOLD = 'house-1'
const CATEGORIES = ['All', 'Electrical', 'Jewelry', 'Furniture', 'Instrument', 'Tools', 'Fitness']

export default function AssetListPage() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('All')

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
    try {
      await deleteAsset(id, HOUSEHOLD)
      setAssets(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete asset')
    }
  }

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0)

  const filteredAssets = activeTab === 'All' 
    ? assets 
    : assets.filter(a => a.category === activeTab)

  const tabValue = activeTab === 'All' 
    ? totalValue 
    : filteredAssets.reduce((sum, a) => sum + a.value, 0)

  return (
    <div style={{ maxWidth: 720, margin: '24px auto' }}>
      <h2>Assets</h2>
      <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 6 }}>
        <strong>Total Value: ${totalValue.toFixed(2)}</strong>
      </div>
      <Link to="/">Home</Link>
      <AssetForm householdId={HOUSEHOLD} onCreate={handleCreate} />
      
      {/* Category Tabs */}
      <div style={{ marginTop: 16, marginBottom: 16, borderBottom: '1px solid #ddd' }}>
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeTab === category ? '#007bff' : 'transparent',
              color: activeTab === category ? 'white' : '#007bff',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              marginRight: 4,
              fontWeight: activeTab === category ? 'bold' : 'normal'
            }}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 6 }}>
        <strong>{activeTab} Assets Value: ${tabValue.toFixed(2)}</strong>
      </div>
      
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && filteredAssets.length === 0 && (
        <div>No {activeTab === 'All' ? '' : activeTab.toLowerCase() + ' '}assets yet</div>
      )}
      <div>
        {filteredAssets.map(a => (
          <AssetCard key={a.id} asset={a} onDelete={handleDelete} onClick={() => navigate(`/assets/${a.id}`)} />
        ))}
      </div>
    </div>
  )
}
