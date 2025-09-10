// index.cjs
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Add Firestore admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// health route
app.get('/health', (_req, res) => res.json({ ok: true }));

// POST /reports: create and store in Firestore
app.post('/reports', async (req, res) => {
  const { messageText, sender, severity, evidenceUrls } = req.body;

  if (!messageText) {
    return res.status(400).json({ error: 'messageText is required' });
  }

  try {
    const docRef = await db.collection('reports').add({
      messageText,
      sender,
      severity,
      evidenceUrls,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user?.uid || null // if you verify auth
    });

    return res.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error('Failed to save report to Firestore:', error);
    return res.status(500).json({ error: 'Server error saving report' });
  }
});

// Fallback to handle undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend up on :' + PORT));
