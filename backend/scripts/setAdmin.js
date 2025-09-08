import admin from 'firebase-admin';
admin.initializeApp({ credential: admin.credential.applicationDefault() });

const [,, uid, flag] = process.argv;
if (!uid) {
  console.log('Usage: node scripts/setAdmin.js <uid> [true|false]');
  process.exit(1);
}
const isAdmin = String(flag ?? 'true') === 'true';
await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
console.log(`User ${uid} admin=${isAdmin}`);
process.exit(0);
