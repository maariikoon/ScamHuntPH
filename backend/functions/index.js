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
// REPORT ROUTES
// ========================================================================

// 🔹 Create report (mobile)
app.post("/reports", async (req, res) => {
  try {
    const { sender, message, category, region, evidenceUrls } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ ok: false, error: "Sender and message are required" });
    }

    const reportId = uuidv4();

    await db.collection("reports").doc(reportId).set({
      sender,
      message,
      category: category || "Others",
      region: region || "N/A",
      status: "pending",
      attachments: evidenceUrls || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, id: reportId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Upload evidence (screenshot)
app.post("/reports/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const bucket = getStorage().bucket();
    const filename = `evidence/${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(filename);

    await file.save(req.file.buffer, { contentType: req.file.mimetype });

    // Signed URL valid until 2030
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    return res.json({ ok: true, url });
  } catch (e) {
    console.error("Upload error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 List reports (admin)
app.get("/reports", requireAuth, async (req, res) => {
  try {
    const { status, limit = 50, cursor } = req.query;
    let q = db.collection("reports").orderBy("createdAt", "desc");

    if (status) q = q.where("status", "==", String(status));
    q = q.limit(Math.min(Math.max(Number(limit) || 50, 1), 100));

    if (cursor) {
      const cursorDoc = await db.collection("reports").doc(String(cursor)).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      } else {
        const d = new Date(cursor);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ ok: false, error: "Invalid cursor" });
        }
        q = q.startAfter(admin.firestore.Timestamp.fromDate(d));
      }
    }

    const snap = await q.get();
    const data = snap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      };
    });

    return res.json({ ok: true, data, nextCursor: snap.docs.at(-1)?.id || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Get single report
app.get("/report/:id", requireAuth, async (req, res) => {
  try {
    const doc = await db.collection("reports").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ ok: false, error: "Not Found" });

    const v = doc.data();
    return res.json({
      ok: true,
      data: {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Update report status
app.patch("/report/:id/status", requireAuth, async (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (!status) return res.status(400).json({ ok: false, error: "Missing status" });

    const ref = db.collection("reports").doc(req.params.id);
    await ref.update({
      status: String(status),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActionBy: req.user.uid,
      ...(note ? { lastActionNote: String(note) } : {}),
    });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Stats by status
app.get("/stats", requireAuth, async (req, res) => {
  try {
    const statuses = ["new", "review", "closed"];
    const counts = {};
    await Promise.all(
      statuses.map(async (s) => {
        const agg = await db.collection("reports").where("status", "==", s).count().get();
        counts[s] = agg.data().count || 0;
      })
    );
    return res.json({ ok: true, data: counts });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// ========================================================================
// FUTURE ROUTES (users, modules, etc.)
// Just add more app.get/app.post/app.patch here
// ========================================================================

// ===== Export Express API =====
exports.scamhunt = onRequest(app);
