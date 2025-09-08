require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const fs = require('fs');

const { PORT = 4000, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_SERVICE_ACCOUNT } = process.env;

// Init admin
let credential;
if (FIREBASE_SERVICE_ACCOUNT && fs.existsSync(FIREBASE_SERVICE_ACCOUNT)) {
  credential = admin.credential.cert(require(FIREBASE_SERVICE_ACCOUNT));
} else {
  console.warn('Using application default credentials. Set FIREBASE_SERVICE_ACCOUNT in .env for local dev.');
  credential = admin.credential.applicationDefault();
}

admin.initializeApp({
  credential,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const app = express();

const allowlist = [
  'http://localhost:5173',       // Vite admin
  'http://127.0.0.1:5173',
  'http://localhost:19006',      // Expo web devtools
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(null, true); // dev: allow all. Tighten in prod.
  }
}));
app.use(express.json());

// Rate limit: 60 req/min/IP
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Firestore smoke: write
app.post('/test/write', async (req, res) => {
  try {
    const ref = db.collection('smoke').doc();
    await ref.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
    });
    res.json({ ok: true, id: ref.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Firestore smoke: read lessons/ping
app.get('/test/read', async (req, res) => {
  try {
    const snap = await db.collection('lessons').doc('ping').get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: 'lessons/ping missing' });
    res.json({ ok: true, data: snap.data() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
