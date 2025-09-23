const express = require("express");
const admin = require("firebase-admin");
const { tsToIso, requireAuth } = require("../utils/helpers");
const corsMiddleware = require("../middleware/cors");

const app = express();
const db = admin.firestore();
app.use(corsMiddleware);

// ========================================================================
// ANALYTICS ROUTES
// ========================================================================

console.log("📩 POST /analytics handler registered");
// 🔹 Overview endpoint
app.get("/overview", requireAuth, async (req, res) => {
  try {
    // Reports from last 12 months
    const from = new Date();
    from.setMonth(from.getMonth() - 12);

    const reportsSnap = await db
      .collection("reports")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(from))
      .get();

    const reports = reportsSnap.docs.map((doc) => {
      const v = doc.data();
      return {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
      };
    });

    // Users collection
    let users = [];
    try {
      const usersSnap = await db.collection("users").get();
      users = usersSnap.docs.map((doc) => {
        const v = doc.data();
        return {
          id: doc.id,
          email: v.email || "",
          active: v.active || false,
          lastActiveAt: tsToIso(v.lastActiveAt),
        };
      });
    } catch (err) {
      console.warn("⚠️ No users collection found:", err.message);
    }

    return res.json({ ok: true, data: { reports, users } });
  } catch (e) {
    console.error("❌ Analytics error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = app;
