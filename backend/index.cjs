const express = require("express");
const admin = require("firebase-admin");

const app = express();

// Initialize using service account
const serviceAccount = require("./firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`,
});

const db = admin.firestore();

// Test route
app.get("/health", (req, res) => {
  res.json({ ok: true, project: serviceAccount.project_id });
});

app.listen(4000, () => console.log("🚀 Backend running at http://localhost:4000"));
