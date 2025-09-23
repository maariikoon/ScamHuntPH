const express = require("express");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const { getStorage } = require("firebase-admin/storage");
const admin = require("firebase-admin");
const corsMiddleware = require("../middleware/cors");

const app = express();
app.use(corsMiddleware);  // CORS

// 👇 Conditional body parser
app.use((req, res, next) => {
  if (req.is && req.is("multipart/form-data")) return next();
  return express.json()(req, res, next);
});

const upload = multer({ storage: multer.memoryStorage() });
const db = admin.firestore();

// ===== Helpers =====
const { tsToIso, requireAuth, truthy } = require("../utils/helpers");

// ---------------------------------------------------------------------
// Admin guard: accept token claims OR Firestore role docs
// ---------------------------------------------------------------------
async function requireAdmin(req, res, next) {
  try {
    const u = req.user || {};
    const claims = u.claims || u;

    // 1) Prefer custom claims on the token
    if (truthy(u.admin) || truthy(claims.admin)) return next();
    if ((u.role || claims.role) === "superadmin") return next();

    // 2) Fallback to Firestore role documents
    const uid = u.uid;
    if (!uid) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const [adminDoc, userDoc] = await Promise.all([
      db.collection("admins").doc(uid).get().catch(() => null),
      db.collection("users").doc(uid).get().catch(() => null),
    ]);

    if (adminDoc && adminDoc.exists) {
      const ad = adminDoc.data() || {};
      if (truthy(ad.admin) || ad.role === "admin" || ad.role === "superadmin" || truthy(ad.enabled)) {
        return next();
      }
    }

    if (userDoc && userDoc.exists) {
      const ud = userDoc.data() || {};
      if (truthy(ud.admin) || ud.role === "admin" || ud.role === "superadmin") {
        return next();
      }
    }

    return res.status(403).json({ ok: false, error: "Forbidden (admin only)" });
  } catch (e) {
    console.error("requireAdmin error:", e);
    return res.status(500).json({ ok: false, error: "Admin check failed" });
  }
}

// ========================================================================
// REPORT ROUTES
// ========================================================================

// 🔹 Create report (mobile)
console.log("📩 POST /reports handler registered");
app.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const sender = body.sender;
    const message = body.message;
    const category = body.category;
    const region = body.region;
    const evidenceUrls = body.evidenceUrls;

    if (!sender || !message) {
      return res.status(400).json({ ok: false, error: "Sender and message are required" });
    }

    const reportId = uuidv4();

    await db.collection("reports").doc(reportId).set({
      userId: req.user.uid,
      sender: req.user.uid,
      message: message,
      category: category || "Others",
      region: region || "N/A",
      status: "pending",
      attachments: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, id: reportId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Upload evidence (screenshot)
app.post("/uploadUrl", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const raw = typeof body.filename === "string" ? body.filename : "";
    const safeFilename = raw.replace(/[^\w.-]/g, "_") || "upload.jpg";

    const bucket = getStorage().bucket();
    const filePath = "evidence/" + req.user.uid + "/" + Date.now() + "_" + safeFilename;
    const file = bucket.file(filePath);

    const writeRes = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: "image/jpeg",
    });
    const uploadUrl = writeRes[0];

    const readRes = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    const readUrl = readRes[0];

    return res.json({ ok: true, uploadUrl: uploadUrl, readUrl: readUrl });
  } catch (err) {
    console.error("❌ Signed URL error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// 🔹 List reports (admin screen fetch)
app.get("/", requireAuth, async (req, res) => {
  try {
    const qParams = req.query || {};
    const status = qParams.status;
    const limitRaw = Number(qParams.limit);
    const limitVal = Math.min(Math.max(isNaN(limitRaw) ? 50 : limitRaw, 1), 100);
    const cursor = qParams.cursor;

    let q = db.collection("reports").orderBy("createdAt", "desc");
    if (status) q = q.where("status", "==", String(status));
    q = q.limit(limitVal);

    if (cursor) {
      const cursorDoc = await db.collection("reports").doc(String(cursor)).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      } else {
        const d = new Date(String(cursor));
        if (isNaN(d.getTime())) {
          return res.status(400).json({ ok: false, error: "Invalid cursor" });
        }
        q = q.startAfter(admin.firestore.Timestamp.fromDate(d));
      }
    }

    const snap = await q.get();
    const docs = snap.docs || [];
    const data = docs.map((d) => {
      const v = d.data() || {};
      return {
        id: d.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      };
    });

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    const nextCursor = lastDoc ? lastDoc.id : null;

    return res.json({ ok: true, data: data, nextCursor: nextCursor });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Get current user's reports (mobile)
app.get("/my", requireAuth, async (req, res) => {
  try {
    const snapshot = await db
      .collection("reports")
      .where("userId", "==", req.user.uid)
      .get();

    const reports = (snapshot.docs || []).map((doc) => {
      const v = doc.data() || {};
      return {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      };
    });

    res.json({ ok: true, reports: reports });
  } catch (err) {
    console.error("❌ Error fetching user reports:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch reports" });
  }
});

// 🔹 Get single report by ID (admin UI reads details)
app.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await db.collection("reports").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: "Report not found" });
    }

    const v = doc.data() || {};

    res.json({
      ok: true,
      data: {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Update report status (ADMIN) + feedback + push notify
app.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, note } = req.body || {};
    const allowedStatuses = ["pending", "verified", "declined"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }

    const ref = db.collection("reports").doc(req.params.id);
    await ref.update({
      status: String(status),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActionBy: req.user.uid,
      ...(note ? { lastActionNote: String(note) } : {}),
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /reports/:id/status error", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Stats by status
app.get("/stats/all", requireAuth, async (req, res) => {
  try {
    const statuses = ["pending", "verified", "declined"];
    const counts = {};
    await Promise.all(
      statuses.map(async (s) => {
        const agg = await db.collection("reports").where("status", "==", s).count().get();
        const val = agg && agg.data ? agg.data().count : 0;
        counts[s] = val || 0;
      })
    );
    return res.json({ ok: true, data: counts });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = app;
