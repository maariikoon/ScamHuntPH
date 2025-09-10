const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Enable ignoring undefined values
db.settings({ ignoreUndefinedProperties: true });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health-check route
app.get('/health', (_req, res) => res.json({ ok: true }));

// POST /reports: store reports in Firestore
app.post('/reports', async (req, res) => {
  const { messageText, sender, severity, evidenceUrls } = req.body;

  if (!messageText) {
    return res.status(400).json({ error: 'messageText is required' });
  }

  try {
    const docRef = await db.collection('reports').add({
      messageText,
      sender,
      severity,      // If undefined, Firestore will skip it now
      evidenceUrls,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user?.uid || null
    });

    return res.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error('Failed to save report to Firestore:', error);
    return res.status(500).json({ error: 'Server error saving report' });
  }
});

// Handle undefined routes gracefully
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend up on :' + PORT));
