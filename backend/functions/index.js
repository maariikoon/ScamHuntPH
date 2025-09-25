// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
const express = require("express");
const corsMiddleware = require("./middleware/cors");

// ===== Global options =====
setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 2,
});

// ===== Firebase Admin =====
// Use the BUCKET NAME (appspot.com), not the public host firebasestorage.app
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: "scamhuntph-b3485-2n5bd",
  });
}

// ===== Import standalone route apps =====
const lessons = require("./routes/lessons");     // exports an express app
const reports = require("./routes/reports");     // exports an express app
const analytics = require("./routes/analytics"); // exports an express app
const notifications = require("./routes/notifications");

// ------------------------------------------------------------------
// One consolidated API surface (recommended)
// ------------------------------------------------------------------
const api = express();
api.use(corsMiddleware);

// Simple root + health
api.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "ScamHunt API v1 🚀",
    routes: ["/reports", "/analytics", "/lessons"],
  });
});

// Mount routers
api.use("/reports", reports);
api.use("/analytics", analytics);
api.use("/lessons", lessons);
api.use("/notifications", notifications);

// JSON 404 (helps catch wrong paths/URLs from the frontend)
api.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found", path: req.path });
});

// Export the consolidated API
exports.api = onRequest(api);

// ------------------------------------------------------------------
// (Optional) Keep the individual functions too
// ------------------------------------------------------------------
exports.reports = onRequest(reports);
exports.analytics = onRequest(analytics);
exports.lessons  = onRequest(lessons);
exports.notifications = onRequest(notifications);

// Dedicated health endpoint (optional)
exports.health = onRequest((req, res) => {
  res.json({ ok: true, message: "ScamHunt API is alive 🚀" });
});
