const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
const express = require("express");

// ===== Global options =====
setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 2,
});

// ===== Firebase Admin =====
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: "scamhuntph-b3485.firebasestorage.app",
  });
}
const db = admin.firestore();


// Health check
const health = express();
health.get("/", (req, res) => {
  res.json({ ok: true, message: "ScamHunt API is alive 🚀" });
});
exports.health = onRequest(health);

// ========================================================================
// ROUTES
// ========================================================================


// ===== Import standalone route apps =====
const lessons = require("./routes/lessons");
const reports = require("./routes/reports");
const analytics = require("./routes/analytics");


// Export each as a separate Firebase Function
exports.lessons = onRequest(lessons);
exports.reports = onRequest(reports);
exports.analytics = onRequest(analytics);
