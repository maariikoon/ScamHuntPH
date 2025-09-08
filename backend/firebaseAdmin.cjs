// firebaseAdmin.cjs
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Resolve service account JSON path
const keyPath =
  process.env.FIREBASE_SERVICE_ACCOUNT
    ? path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS
      : path.resolve(__dirname, 'firebase-service-account.json');

// Load the JSON credentials (throw helpful error if missing)
if (!fs.existsSync(keyPath)) {
  console.error(`Missing service account JSON at: ${keyPath}
- Put the key in backend/ or
- Set FIREBASE_SERVICE_ACCOUNT (relative to this file) or
- Set GOOGLE_APPLICATION_CREDENTIALS (absolute path)`);
  process.exit(1);
}

const serviceAccount = require(keyPath);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Optional but handy if you use Storage:
    storageBucket: process.env.BUCKET_NAME || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
  });
  console.log('[firebase-admin] initialized.');
}

module.exports = admin;
