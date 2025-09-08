require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');

const { FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_SERVICE_ACCOUNT } = process.env;

let credential;
if (FIREBASE_SERVICE_ACCOUNT && fs.existsSync(FIREBASE_SERVICE_ACCOUNT)) {
  credential = admin.credential.cert(require(FIREBASE_SERVICE_ACCOUNT));
} else {
  credential = admin.credential.applicationDefault();
}

admin.initializeApp({
  credential,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();

(async () => {
  const batch = db.batch();
  const ping = db.collection('lessons').doc('ping');
  batch.set(ping, {
    title: 'Ping',
    body: 'pong',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const intro = db.collection('lessons').doc('intro');
  batch.set(intro, {
    title: 'Welcome',
    body: 'ScamHunt PH intro',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await batch.commit();
  console.log('Seeded lessons/ping and lessons/intro');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
