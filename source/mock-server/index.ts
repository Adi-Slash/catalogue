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
  const { message, assets = [], language = 'en' } = body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid message' });
  }

  // Mock insurance advice response
  const totalValue = assets.reduce((sum: number, a: any) => sum + (a.value || 0), 0);
  const lowerMessage = message.toLowerCase();

  // Localized responses for mock server (simplified - OpenAI handles full localization)
  const localizedResponses: Record<string, Record<string, string>> = {
    en: {
      default: `I'm here to help with insurance advice for your assets! 

You currently have ${assets.length} asset(s) in your catalog${totalValue > 0 ? ` worth $${totalValue.toLocaleString()}` : ''}.

I can help with:
- Coverage recommendations
- Understanding deductibles
- Filing claims
- Premium costs
- Specific asset categories

What would you like to know?`,
      coverage: `Based on your ${assets.length} asset(s) totaling $${totalValue.toLocaleString()}, I recommend:

1. **Home Contents Insurance**: Covers most household items including electronics, furniture, and tools. Typically covers theft, fire, and water damage.

2. **Valuable Items Insurance**: For high-value items (usually over $1,000-$2,000), consider scheduling them separately for full replacement value coverage.

3. **Coverage Amount**: Ensure your policy limit covers your total portfolio value ($${totalValue.toLocaleString()}).

Would you like advice on any specific category of assets?`,
      premium: `Insurance premiums vary based on several factors:

1. **Total Coverage Amount**: Your portfolio value of $${totalValue.toLocaleString()} will influence premium costs.

2. **Deductible**: Higher deductibles typically lower premiums but increase out-of-pocket costs.

3. **Item Types**: High-value electronics, jewellery, and instruments may increase premiums.

Average home contents insurance costs $50-$200/month depending on coverage. For specific quotes, contact insurance providers directly.`,
      deductible: `A deductible is the amount you pay out-of-pocket before insurance coverage kicks in.

**Choosing a Deductible:**

- **Low Deductible ($250-$500)**: Higher premiums, but less out-of-pocket when filing claims.

- **High Deductible ($1,000-$2,500)**: Lower premiums, but more out-of-pocket per claim.

**Recommendation**: For a portfolio worth $${totalValue.toLocaleString()}, consider a $500-$1,000 deductible as a balance between premium cost and coverage accessibility.`,
    },
    fr: {
      default: `Je suis là pour vous aider avec des conseils d'assurance pour vos actifs !

Vous avez actuellement ${assets.length} actif(s) dans votre catalogue${totalValue > 0 ? ` d'une valeur de ${totalValue.toLocaleString()} $` : ''}.

Je peux aider avec :
- Recommandations de couverture
- Comprendre les franchises
- Déposer des réclamations
- Coûts des primes
- Catégories d'actifs spécifiques

Que souhaitez-vous savoir ?`,
      coverage: `Sur la base de vos ${assets.length} actif(s) totalisant ${totalValue.toLocaleString()} $, je recommande :

1. **Assurance Contenu Ménager** : Couvre la plupart des articles ménagers, y compris l'électronique, les meubles et les outils. Couvre généralement le vol, l'incendie et les dégâts des eaux.

2. **Assurance Articles de Valeur** : Pour les articles de grande valeur (généralement plus de 1 000 $ à 2 000 $), envisagez de les programmer séparément pour une couverture de valeur de remplacement complète.

3. **Montant de Couverture** : Assurez-vous que la limite de votre police couvre la valeur totale de votre portefeuille (${totalValue.toLocaleString()} $).

Souhaitez-vous des conseils sur une catégorie spécifique d'actifs ?`,
      premium: `Les primes d'assurance varient selon plusieurs facteurs :

1. **Montant Total de Couverture** : La valeur de votre portefeuille de ${totalValue.toLocaleString()} $ influencera les coûts des primes.

2. **Franchise** : Des franchises plus élevées réduisent généralement les primes mais augmentent les coûts à votre charge.

3. **Types d'Articles** : L'électronique, les bijoux et les instruments de grande valeur peuvent augmenter les primes.

L'assurance contenu ménager coûte en moyenne 50 $ à 200 $/mois selon la couverture. Pour des devis spécifiques, contactez directement les assureurs.`,
      deductible: `Une franchise est le montant que vous payez de votre poche avant que la couverture d'assurance ne s'applique.

**Choisir une Franchise :**

- **Franchise Faible (250 $ à 500 $)** : Primes plus élevées, mais moins de frais à votre charge lors du dépôt de réclamations.

- **Franchise Élevée (1 000 $ à 2 500 $)** : Primes plus faibles, mais plus de frais à votre charge par réclamation.

**Recommandation** : Pour un portefeuille d'une valeur de ${totalValue.toLocaleString()} $, envisagez une franchise de 500 $ à 1 000 $ comme équilibre entre le coût de la prime et l'accessibilité de la couverture.`,
    },
    de: {
      default: `Ich bin hier, um Ihnen bei Versicherungsberatung für Ihre Vermögenswerte zu helfen!

Sie haben derzeit ${assets.length} Vermögenswert(e) in Ihrem Katalog${totalValue > 0 ? ` im Wert von ${totalValue.toLocaleString()} $` : ''}.

Ich kann helfen bei:
- Deckungsempfehlungen
- Verständnis von Selbstbehalten
- Schadensmeldungen
- Prämienkosten
- Spezifischen Vermögenswertkategorien

Was möchten Sie wissen?`,
      coverage: `Basierend auf Ihren ${assets.length} Vermögenswert(en) im Gesamtwert von ${totalValue.toLocaleString()} $ empfehle ich:

1. **Hausratversicherung** : Deckt die meisten Haushaltsgegenstände einschließlich Elektronik, Möbel und Werkzeuge. Deckt typischerweise Diebstahl, Feuer und Wasserschäden ab.

2. **Wertgegenstände-Versicherung** : Für hochwertige Gegenstände (normalerweise über 1.000 $ bis 2.000 $) sollten Sie diese separat planen, um eine vollständige Neuwertdeckung zu erhalten.

3. **Deckungsbetrag** : Stellen Sie sicher, dass Ihre Policengrenze den Gesamtwert Ihres Portfolios (${totalValue.toLocaleString()} $) abdeckt.

Möchten Sie Ratschläge zu einer bestimmten Kategorie von Vermögenswerten?`,
      premium: `Versicherungsprämien variieren je nach mehreren Faktoren:

1. **Gesamtdeckungsbetrag** : Ihr Portfoliowert von ${totalValue.toLocaleString()} $ wird die Prämienkosten beeinflussen.

2. **Selbstbehalt** : Höhere Selbstbehalte senken normalerweise die Prämien, erhöhen aber die Kosten aus eigener Tasche.

3. **Artikeltypen** : Hochwertige Elektronik, Schmuck und Instrumente können die Prämien erhöhen.

Die durchschnittlichen Kosten für Hausratversicherungen liegen je nach Deckung bei 50 $ bis 200 $/Monat. Für spezifische Angebote kontaktieren Sie Versicherungsanbieter direkt.`,
      deductible: `Ein Selbstbehalt ist der Betrag, den Sie aus eigener Tasche zahlen, bevor die Versicherungsdeckung greift.

**Selbstbehalt Wählen:**

- **Niedriger Selbstbehalt (250 $ bis 500 $)** : Höhere Prämien, aber weniger Kosten aus eigener Tasche bei Schadensmeldungen.

- **Hoher Selbstbehalt (1.000 $ bis 2.500 $)** : Niedrigere Prämien, aber mehr Kosten aus eigener Tasche pro Schadensfall.

**Empfehlung** : Für ein Portfolio im Wert von ${totalValue.toLocaleString()} $ sollten Sie einen Selbstbehalt von 500 $ bis 1.000 $ als Balance zwischen Prämienkosten und Deckungszugänglichkeit in Betracht ziehen.`,
    },
    ja: {
      default: `資産の保険に関するアドバイスをお手伝いします！

現在、カタログに ${assets.length} 件の資産があります${totalValue > 0 ? `（総額 ${totalValue.toLocaleString()} $）` : ''}。

以下のことについてお手伝いできます：
- カバレッジの推奨事項
- 免責金額の理解
- 請求の提出
- 保険料のコスト
- 特定の資産カテゴリ

何について知りたいですか？`,
      coverage: `合計 ${totalValue.toLocaleString()} $ の ${assets.length} 件の資産に基づいて、以下をお勧めします：

1. **家庭用品保険**：電子機器、家具、工具を含むほとんどの家庭用品をカバーします。通常、盗難、火災、水害をカバーします。

2. **高価品保険**：高価なアイテム（通常 $1,000 ～ $2,000 以上）については、完全な交換価値カバレッジのために個別にスケジュールすることを検討してください。

3. **カバレッジ金額**：ポリシーの制限がポートフォリオの総額（${totalValue.toLocaleString()} $）をカバーしていることを確認してください。

特定の資産カテゴリについてアドバイスが必要ですか？`,
      premium: `保険料はいくつかの要因によって異なります：

1. **総カバレッジ金額**：${totalValue.toLocaleString()} $ のポートフォリオ価値が保険料のコストに影響します。

2. **免責金額**：免責金額が高いほど、通常は保険料が下がりますが、自己負担額が増加します。

3. **アイテムタイプ**：高価な電子機器、宝石、楽器は保険料を増加させる可能性があります。

家庭用品保険の平均コストは、カバレッジに応じて月額 $50 ～ $200 です。具体的な見積もりについては、保険会社に直接お問い合わせください。`,
      deductible: `免責金額は、保険カバレッジが適用される前に自己負担で支払う金額です。

**免責金額の選択：**

- **低い免責金額（$250 ～ $500）**：保険料は高くなりますが、請求時の自己負担額は少なくなります。

- **高い免責金額（$1,000 ～ $2,500）**：保険料は低くなりますが、請求ごとの自己負担額は多くなります。

**推奨事項**：${totalValue.toLocaleString()} $ の価値のあるポートフォリオの場合、保険料コストとカバレッジのアクセシビリティのバランスとして、$500 ～ $1,000 の免責金額を検討してください。`,
    },
  };

  const responses = localizedResponses[language] || localizedResponses.en;
  let response = '';

  if (lowerMessage.includes('coverage') || lowerMessage.includes('cover') || lowerMessage.includes('couverture') || lowerMessage.includes('deckung') || lowerMessage.includes('カバレッジ')) {
    response = responses.coverage || responses.default;
  } else if (lowerMessage.includes('premium') || lowerMessage.includes('cost') || lowerMessage.includes('primes') || lowerMessage.includes('prämien') || lowerMessage.includes('保険料')) {
    response = responses.premium || responses.default;
  } else if (lowerMessage.includes('deductible') || lowerMessage.includes('franchise') || lowerMessage.includes('selbstbehalt') || lowerMessage.includes('免責')) {
    response = responses.deductible || responses.default;
  } else {
    response = responses.default;
  }

  res.json({ response });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mock API server listening on http://localhost:${PORT}`));
