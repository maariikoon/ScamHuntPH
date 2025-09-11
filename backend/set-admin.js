// set-admin.js
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-adminsdk.json"); // your service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function main() {
  try {
    // Fetch user by email
    const user = await admin.auth().getUserByEmail("admin@scamhuntph.gov.ph");

    // Add custom claim "role: admin"
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });

    console.log(`✅ Role 'admin' set for user: ${user.email} (UID: ${user.uid})`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error setting role:", err);
    process.exit(1);
  }
}

main();
