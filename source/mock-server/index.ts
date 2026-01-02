import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const app = express()
app.use(cors())
app.use(express.json())

const DB_PATH = path.join(process.cwd(), 'mock-server', 'db.json')

function readDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(raw)
}

function writeDb(db: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

// Simple auth-like middleware: require `x-household-id` header
app.use((req, res, next) => {
  const householdId = req.header('x-household-id')
  if (!householdId) return res.status(401).json({ error: 'Missing x-household-id header' })
  // attach to request
  ;(req as any).householdId = householdId
  next()
})

app.get('/assets', (req, res) => {
  const db = readDb()
  const householdId = (req as any).householdId
  const items = (db.assets || []).filter((a: any) => a.householdId === householdId)
  res.json(items)
})

app.get('/assets/:id', (req, res) => {
  const db = readDb()
  const householdId = (req as any).householdId
  const asset = (db.assets || []).find((a: any) => a.id === req.params.id && a.householdId === householdId)
  if (!asset) return res.status(404).json({ error: 'Not found' })
  res.json(asset)
})

app.post('/assets', (req, res) => {
  const db = readDb()
  const householdId = (req as any).householdId
  const body = req.body
  if (typeof body.value !== 'number') return res.status(400).json({ error: 'Invalid value' })
  const now = new Date().toISOString()
  const asset = {
    id: uuidv4(),
    householdId,
    make: body.make || '',
    model: body.model || '',
    serialNumber: body.serialNumber || '',
    description: body.description || '',
    value: body.value,
    imageUrl: body.imageUrl || '',
    createdAt: now,
    updatedAt: now,
  }
  db.assets = db.assets || []
  db.assets.push(asset)
  writeDb(db)
  res.status(201).json(asset)
})

app.put('/assets/:id', (req, res) => {
  const db = readDb()
  const householdId = (req as any).householdId
  const idx = (db.assets || []).findIndex((a: any) => a.id === req.params.id && a.householdId === householdId)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const asset = db.assets[idx]
  const body = req.body
  const updated = { ...asset, ...body, updatedAt: new Date().toISOString() }
  db.assets[idx] = updated
  writeDb(db)
  res.json(updated)
})

app.delete('/assets/:id', (req, res) => {
  const db = readDb()
  const householdId = (req as any).householdId
  const idx = (db.assets || []).findIndex((a: any) => a.id === req.params.id && a.householdId === householdId)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const [removed] = db.assets.splice(idx, 1)
  writeDb(db)
  res.json({ deleted: true, id: removed.id })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Mock API server listening on http://localhost:${PORT}`))
