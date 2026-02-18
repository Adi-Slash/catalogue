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
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserPreferences {
  id: string; // userId
  userId: string;
  darkMode: boolean;
  language?: string; // Language code: 'en' | 'fr' | 'de' | 'ja'
  updatedAt: string;
}

interface Database {
  assets: Asset[];
  userPreferences: UserPreferences[];
}

declare module 'express-serve-static-core' {
  interface Request {
    householdId: string;
  }
}

const app = express();
// Configure CORS to allow specific origin with credentials
// When credentials: 'include' is used, we cannot use wildcard '*'
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server default port
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-household-id'],
}));
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

// Simple auth-like middleware: require `x-household-id` header (except for user preferences and chat)
app.use((req, res, next) => {
  // Skip auth for user preferences endpoints and chat
  if (req.path.startsWith('/user/preferences') || req.path === '/chat') {
    return next();
  }
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
  const bodyImageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls
    : body.imageUrl
    ? [body.imageUrl]
    : [];
  const asset: Asset = {
    id: uuidv4(),
    householdId,
    make: body.make || '',
    model: body.model || '',
    serialNumber: body.serialNumber || '',
    description: body.description || '',
    category: body.category || '',
    value: body.value,
    imageUrl: bodyImageUrls[0] || '',
    imageUrls: bodyImageUrls,
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

// User Preferences endpoints
app.get('/user/preferences', (req, res) => {
  const db = readDb();
  // For local dev, use x-household-id as userId
  const userId = req.header('x-household-id') || 'local-user';
  const preferences = (db.userPreferences || []).find((p) => p.userId === userId);
  
  if (preferences) {
    res.json(preferences);
  } else {
    // Return default preferences
    const defaultPreferences: UserPreferences = {
      id: userId,
      userId: userId,
      darkMode: false,
      language: undefined,
      updatedAt: new Date().toISOString(),
    };
    res.json(defaultPreferences);
  }
});

app.put('/user/preferences', (req, res) => {
  const db = readDb();
  // For local dev, use x-household-id as userId
  const userId = req.header('x-household-id') || 'local-user';
  const body = req.body;
  
  db.userPreferences = db.userPreferences || [];
  const existingIdx = db.userPreferences.findIndex((p) => p.userId === userId);
  
  // Get existing preferences to preserve values not being updated
  const existing = (db.userPreferences || []).find((p) => p.userId === userId);
  
  const preferences: UserPreferences = {
    id: userId,
    userId: userId,
    darkMode: body.darkMode !== undefined ? body.darkMode : (existing?.darkMode ?? false),
    language: body.language !== undefined ? body.language : (existing?.language ?? undefined),
    updatedAt: new Date().toISOString(),
  };
  
  if (existingIdx >= 0) {
    db.userPreferences[existingIdx] = preferences;
  } else {
    db.userPreferences.push(preferences);
  }
  
  writeDb(db);
  res.json(preferences);
});

// Chat endpoint for insurance advice
app.post('/chat', (req, res) => {
  const body = req.body;
  const { message, assets = [] } = body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid message' });
  }

  // Mock insurance advice response
  const totalValue = assets.reduce((sum: number, a: any) => sum + (a.value || 0), 0);
  const lowerMessage = message.toLowerCase();

  let response = '';

  if (lowerMessage.includes('coverage') || lowerMessage.includes('cover')) {
    response = `Based on your ${assets.length} asset(s) totaling $${totalValue.toLocaleString()}, I recommend:

1. **Home Contents Insurance**: Covers most household items including electronics, furniture, and tools. Typically covers theft, fire, and water damage.

2. **Valuable Items Insurance**: For high-value items (usually over $1,000-$2,000), consider scheduling them separately for full replacement value coverage.

3. **Coverage Amount**: Ensure your policy limit covers your total portfolio value ($${totalValue.toLocaleString()}).

Would you like advice on any specific category of assets?`;
  } else if (lowerMessage.includes('premium') || lowerMessage.includes('cost')) {
    response = `Insurance premiums vary based on several factors:

1. **Total Coverage Amount**: Your portfolio value of $${totalValue.toLocaleString()} will influence premium costs.

2. **Deductible**: Higher deductibles typically lower premiums but increase out-of-pocket costs.

3. **Item Types**: High-value electronics, jewellery, and instruments may increase premiums.

Average home contents insurance costs $50-$200/month depending on coverage. For specific quotes, contact insurance providers directly.`;
  } else if (lowerMessage.includes('deductible')) {
    response = `A deductible is the amount you pay out-of-pocket before insurance coverage kicks in.

**Choosing a Deductible:**

- **Low Deductible ($250-$500)**: Higher premiums, but less out-of-pocket when filing claims.

- **High Deductible ($1,000-$2,500)**: Lower premiums, but more out-of-pocket per claim.

**Recommendation**: For a portfolio worth $${totalValue.toLocaleString()}, consider a $500-$1,000 deductible as a balance between premium cost and coverage accessibility.`;
  } else {
    response = `I'm here to help with insurance advice for your assets! 

You currently have ${assets.length} asset(s) in your catalog${totalValue > 0 ? ` worth $${totalValue.toLocaleString()}` : ''}.

I can help with:
- Coverage recommendations
- Understanding deductibles
- Filing claims
- Premium costs
- Specific asset categories

What would you like to know?`;
  }

  res.json({ response });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mock API server listening on http://localhost:${PORT}`));
