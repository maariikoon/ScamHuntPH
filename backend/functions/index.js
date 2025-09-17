const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { getStorage } = require("firebase-admin/storage");

// ===== Global options =====
setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 2,
});

// ===== Firebase Admin =====
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ===== Express app =====
const app = express();
app.use(express.json());

// ===== CORS middleware =====
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const ALLOWED_ORIGINS = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    //"http://localhost:3000",          
    // prod admin URLs:
    //"https://scamhuntph-admin.web.app",
    //"https://scamhuntph-admin.firebaseapp.com",
  ]);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// ===== Helpers =====
function tsToIso(ts) {
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null;
}

async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ ok: false, error: "Missing token" });
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

// ========================================================================
// ROUTES
// ========================================================================

const reportsRoutes = require("./routes/reports");
app.use("/reports", reportsRoutes);

// ===== Export Express API =====
exports.scamhunt = onRequest(app);
