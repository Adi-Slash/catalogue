import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

interface Asset {
  id: string;
  householdId: string;
  make: string;
  model: string;
  serialNumber?: string;
  description?: string;
  category?: string;
  value: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Database {
  assets: Asset[];
}

declare module 'express-serve-static-core' {
  interface Request {
    householdId: string;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(process.cwd(), 'mock-server', 'db.json');
const UPLOAD_DIR = path.join(process.cwd(), 'mock-server', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve uploaded images
app.use('/uploads', express.static(UPLOAD_DIR));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({ storage });

// Upload endpoint (before auth middleware)
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

function readDb(): Database {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(db: Database) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// Simple auth-like middleware: require `x-household-id` header
app.use((req, res, next) => {
  const householdId = req.header('x-household-id');
  if (!householdId) return res.status(401).json({ error: 'Missing x-household-id header' });
  // attach to request
  req.householdId = householdId;
  next();
});

app.get('/assets', (req, res) => {
  const db = readDb();
  const householdId = req.householdId;
  const items = (db.assets || []).filter((a) => a.householdId === householdId);
  res.json(items);
});

app.get('/assets/:id', (req, res) => {
  const db = readDb();
  const householdId = req.householdId;
  const asset = (db.assets || []).find(
    (a) => a.id === req.params.id && a.householdId === householdId
  );
  if (!asset) return res.status(404).json({ error: 'Not found' });
  res.json(asset);
});

app.post('/assets', (req, res) => {
  const db = readDb();
  const householdId = req.householdId;
  const body = req.body;
  if (typeof body.value !== 'number') return res.status(400).json({ error: 'Invalid value' });
  const now = new Date().toISOString();
  const asset: Asset = {
    id: uuidv4(),
    householdId,
    make: body.make || '',
    model: body.model || '',
    serialNumber: body.serialNumber || '',
    description: body.description || '',
    category: body.category || '',
    value: body.value,
    imageUrl: body.imageUrl || '',
    createdAt: now,
    updatedAt: now,
  };
  db.assets = db.assets || [];
  db.assets.push(asset);
  writeDb(db);
  res.status(201).json(asset);
});

app.put('/assets/:id', (req, res) => {
  const db = readDb();
  const householdId = req.householdId;
  const idx = (db.assets || []).findIndex(
    (a) => a.id === req.params.id && a.householdId === householdId
  );
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const asset = db.assets[idx];
  const body = req.body;
  const updated = { ...asset, ...body, updatedAt: new Date().toISOString() };
  db.assets[idx] = updated;
  writeDb(db);
  res.json(updated);
});

app.delete('/assets/:id', (req, res) => {
  const db = readDb();
  const householdId = req.householdId;
  const idx = (db.assets || []).findIndex(
    (a) => a.id === req.params.id && a.householdId === householdId
  );
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const [removed] = db.assets.splice(idx, 1);
  writeDb(db);
  res.json({ deleted: true, id: removed.id });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mock API server listening on http://localhost:${PORT}`));
