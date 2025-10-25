// backend/functions/index.js
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
const reports = require("./routes/reports");     
const analytics = require("./routes/analytics"); 
const notifications = require("./routes/notifications");
const users = require("./routes/users");
const publicreports = require("./routes/publicreports");
const logaction = require("./routes/logaction");

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
    routes: ["/reports", "/analytics", "/lessons", "/notifications", "/admin/users", "/publicreports"],
  });
});

// Mount routers
api.use("/reports", reports);
api.use("/analytics", analytics);
api.use("/lessons", lessons);
api.use("/notifications", notifications);
api.use("/admin/users", users);
api.use("/publicreports", publicreports);
api.use("/logaction", logaction);

// JSON 404 (helps catch wrong paths/URLs from the frontend)
api.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found", path: req.path });
});

// Export the consolidated API
exports.api = onRequest(api);

// ------------------------------------------------------------------
// Individual functions -- DO NOT REMOVE
// ------------------------------------------------------------------
exports.reports = onRequest(reports);
exports.analytics = onRequest(analytics);
exports.lessons  = onRequest(lessons);
exports.notifications = onRequest(notifications);
exports.users = onRequest(users);
exports.publicreports = onRequest(publicreports);
exports.logaction = onRequest(logaction);

// Dedicated health endpoint (optional)
exports.health = onRequest((req, res) => {
  res.json({ ok: true, message: "ScamHunt API is alive 🚀" });
});
