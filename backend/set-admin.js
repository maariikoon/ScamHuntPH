// backend/set-admin.js
const admin = require('firebase-admin');
const svc = require('./firebase-service-account.json'); // put your service account JSON here

admin.initializeApp({ credential: admin.credential.cert(svc) });

async function main() {
  const uid = 'PASTE_ADMIN_UID_HERE';
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`Set { admin: true } for UID: ${uid}`);
}
main().catch(console.error);
