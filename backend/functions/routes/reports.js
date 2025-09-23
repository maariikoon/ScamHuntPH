const express = require("express");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const { getStorage } = require("firebase-admin/storage");
const admin = require("firebase-admin");
const corsMiddleware = require("../middleware/cors");


const app = express();
app.use(corsMiddleware);  //  CORS here

// 👇 Conditional body parser
app.use((req, res, next) => {
  if (req.is("multipart/form-data")) {
    // skip JSON parsing for uploads
    return next();
  }
  return express.json()(req, res, next);
});

const upload = multer({ storage: multer.memoryStorage() });
const db = admin.firestore();

// ===== Helpers =====
const { tsToIso, requireAuth } = require("../utils/helpers");

// ========================================================================
// REPORT ROUTES
// ========================================================================

// 🔹 Create report (mobile)
console.log("📩 POST /reports handler registered");
app.post("/", requireAuth, async (req, res) => {
  try {
    const { sender, message, category, region, evidenceUrls } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ ok: false, error: "Sender and message are required" });
    }

    const reportId = uuidv4();

    await db.collection("reports").doc(reportId).set({
      userId: req.user.uid,
      sender: req.user.uid,
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
app.post("/uploadUrl", requireAuth, async (req, res) => {
  try {
    const { filename } = req.body || {};
    const safeFilename = filename?.replace(/[^\w.-]/g, "_") || "upload.jpg";

    const bucket = getStorage().bucket();
    const filePath = `evidence/${req.user.uid}/${Date.now()}_${safeFilename}`;
    const file = bucket.file(filePath);

    // Signed URL for uploading
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 min validity
      contentType: "image/jpeg",
    });

    // Signed URL for later reading (long term)
    const [readUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ ok: true, uploadUrl, readUrl });
  } catch (err) {
    console.error("❌ Signed URL error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});


// 🔹 List reports (admin)
app.get("/", requireAuth, async (req, res) => {
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

// Get current user's reports
app.get("/my", requireAuth, async (req, res) => {
  try {
    const snapshot = await db
      .collection("reports")
      .where("userId", "==", req.user.uid)
      .get();

    const reports = snapshot.docs.map(doc => {
      const v = doc.data();
      return {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      };
    });

    res.json({ ok: true, reports });
  } catch (err) {
    console.error("❌ Error fetching user reports:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch reports" });
  }
});

// 🔹 Get single report by ID
app.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("reports").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: "Report not found" });
    }

    const v = doc.data();

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

// 🔹 Update report status
app.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status, note, feedback, category } = req.body || {};
    const allowedStatuses = ["pending", "verified", "declined"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }

    const ref = db.collection("reports").doc(req.params.id);

    await ref.update({
      status: String(status),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActionBy: req.user.uid, // admin ID
      ...(note ? { lastActionNote: String(note) } : {}),
      ...(feedback ? { feedback: String(feedback) } : {}),
      ...(category ? { category: String(category) } : {}), // allow category change
    });

    return res.json({ ok: true });
  } catch (e) {
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
        counts[s] = agg.data().count || 0;
      })
    );
    return res.json({ ok: true, data: counts });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});



module.exports = app;
