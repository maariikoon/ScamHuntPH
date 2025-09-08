import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer'; // TODO: remove if unused
import admin from 'firebase-admin';
import { body, validationResult } from 'express-validator'; // TODO: remove if unused
import { Expo } from 'expo-server-sdk';

const app = express();

// Allow override via env, default to local dev
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Set a sane JSON size limit (override with JSON_LIMIT if needed)
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

if (!process.env.BUCKET_NAME) {
  console.warn('BUCKET_NAME is not set. Ensure Firebase Storage bucket is configured.');
}

// Make initializeApp safe across reloads
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.BUCKET_NAME,
  });
} catch (e) {
  if (!/already exists/u.test(String(e?.message || ''))) throw e;
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const bucket = admin.storage().bucket(process.env.BUCKET_NAME);

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN, // optional
});

// Basic health check
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// Export for use in server/bootstrap or tests
export { app, db, bucket, expo };

// ---------- auth middlewares ----------
async function authRequired(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.admin === true) return next();
  return res.status(403).json({ error: 'Admin only' });
}

// ---------- uploads ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ---------- user routes ----------
app.post(
  '/api/reports',
  authRequired,
  upload.single('screenshot'),
  body('type').isString().notEmpty(),
  body('message').isString().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { type, message, phone = '', source = '' } = req.body;
    const uid = req.user.uid;

    // 1) create Firestore doc (id first so we can name the file path)
    const docRef = db.collection('reports').doc();
    const reportId = docRef.id;

    // 2) upload screenshot (optional)
    let evidencePath = '';
    if (req.file) {
      const dest = `evidence/${uid}/${reportId}/${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(dest);
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
          metadata: { userId: uid, reportId },
        },
      });
      evidencePath = dest; // stored path (not publicly readable)
    }

    // 3) write full report
    const now = admin.firestore.FieldValue.serverTimestamp();
    await docRef.set({
      userId: uid,
      type,
      message,
      phone,
      source,
      evidencePath,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    res.json({ ok: true, id: reportId });
  }
);

app.get('/api/my/reports', authRequired, async (req, res) => {
  const snap = await db
    .collection('reports')
    .where('userId', '==', req.user.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(rows);
});

// Device registration for push alerts (Expo)
app.post('/api/register-device', authRequired, body('expoPushToken').isString(), async (req, res) => {
  const { expoPushToken } = req.body;
  const uid = req.user.uid;
  const id = expoPushToken.replace(/[^A-Za-z0-9]/g, '').slice(0, 64); // stable doc id

  await db.collection('userDevices').doc(uid).collection('tokens').doc(id).set({
    expoPushToken,
    platform: req.body.platform || 'unknown',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.json({ ok: true });
});

// ---------- admin routes ----------
app.get('/api/admin/reports', authRequired, adminOnly, async (req, res) => {
  const { status = 'pending', limit = 50 } = req.query;
  const snap = await db
    .collection('reports')
    .where('status', '==', status)
    .orderBy('createdAt', 'desc')
    .limit(Number(limit))
    .get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.patch('/api/admin/reports/:id/status', authRequired, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { status, makePublic = false } = req.body;
  const ref = db.collection('reports').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Not found' });

  await ref.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  if (status === 'approved' && makePublic) {
    // copy minimal public fields
    const r = snap.data();
    await db.collection('publicReports').doc(id).set({
      type: r.type,
      message: r.message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  res.json({ ok: true });
});

app.post('/api/admin/alerts', authRequired, adminOnly, body('title').isString(), body('body').isString(), async (req, res) => {
  const { title, body: bodyText } = req.body;

  // gather all Expo tokens (simple broadcast)
  const tokenSnaps = await db.collectionGroup('tokens').get();
  const tokens = tokenSnaps.docs.map(d => d.data().expoPushToken).filter(t => Expo.isExpoPushToken(t));

  const messages = tokens.map(t => ({ to: t, sound: 'default', title, body: bodyText }));
  const chunks = expo.chunkPushNotifications(messages);

  const receipts = [];
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      receipts.push(...ticketChunk);
    } catch (e) {
      console.error('Push error', e);
    }
  }
  res.json({ ok: true, sent: receipts.length });
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`API running on http://localhost:${process.env.PORT || 4000}`);
});
