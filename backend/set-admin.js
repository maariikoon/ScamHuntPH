// set-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function main() {
  // Option A: use email
  const email = 'admin@admin.com';

  // Option B: use UID (safer if you already have it)
  const uid = 'VgpzPPtY0zU6SCaH2hDkvgOU9Wj1';

  try {
    // You can pick one of the two lines below:
    // const user = await admin.auth().getUserByEmail(email);
    const user = await admin.auth().getUser(uid);

    // Add a custom claim (role)
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

    console.log(`✅ Role 'admin' set for user: ${user.email} (UID: ${user.uid})`);
  } catch (err) {
    console.error('❌ Error setting role:', err);
  }
}

main();

