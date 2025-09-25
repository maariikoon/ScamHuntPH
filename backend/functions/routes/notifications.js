// functions/routes/notifications.js
const express = require("express");
const admin = require("firebase-admin");
const { requireAuth, tsToIso } = require("../utils/helpers");
const corsMiddleware = require("../middleware/cors");

const app = express();
app.use(corsMiddleware);

const db = admin.firestore();

// ========================================================================
// NOTIFICATIONS ROUTES
// ========================================================================

// 🔹 Get current user's notifications (last 7 days)
app.get("/my", requireAuth, async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const snap = await db
      .collection("notifications")
      .where("userId", "==", req.user.uid)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(cutoff))
      .orderBy("createdAt", "desc")
      .get();

    const list = snap.docs.map((doc) => {
      const v = doc.data();
      return {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
      };
    });

    res.json({ ok: true, notifications: list });
  } catch (e) {
    console.error("❌ Notifications fetch error:", e);
    res.status(500).json({ ok: false, error: "Failed to fetch notifications" });
  }
});

// 🔹 Mark notification as read
app.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const ref = db.collection("notifications").doc(req.params.id);
    await ref.update({ read: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 🔹 Delete old notifications (optional cleanup if you want)
app.delete("/cleanup", async (_req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const snap = await db
      .collection("notifications")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoff))
      .get();

    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({ ok: true, deleted: snap.size });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = app;
