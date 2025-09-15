// node scripts/grant-admin.js <uid-or-email>
const admin = require("firebase-admin");
(async () => {
  admin.initializeApp();
  const auth = admin.auth();
  const id = process.argv[2];
  const u = id.includes("@") ? await auth.getUserByEmail(id) : await auth.getUser(id);
  await auth.setCustomUserClaims(u.uid, { admin: true }); // or { role: "admin" }
  console.log("granted admin to", u.uid);
})();

