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

// 🔹 Summary endpoint (lightweight for mobile dashboard)
app.get("/summary", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Count reports by status
    const statuses = ["pending", "verified", "declined"];
    const counts = {};
    await Promise.all(
      statuses.map(async (s) => {
        const snap = await db
          .collection("reports")
          .where("status", "==", s)
          .count()
          .get();
        counts[s] = snap.data().count || 0;
      })
    );

    // Find most reported category (last 30 days)
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const catSnap = await db
      .collection("reports")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(from))
      .get();

    const catCounts = {};
    catSnap.forEach((doc) => {
      const v = doc.data();
      const cat = v.category || "Other";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    let popularCategory = "—";
    if (Object.keys(catCounts).length > 0) {
      popularCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
    }

    // Current user's reports today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySnap = await db
      .collection("reports")
      .where("userId", "==", uid)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(today))
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(tomorrow))
      .get();

    const todayReports = todaySnap.size;

    return res.json({
      ok: true,
      data: {
        verified: counts.verified || 0,
        pending: counts.pending || 0,
        declined: counts.declined || 0,
        popularCategory,
        userReportsToday: todayReports,
      },
    });
  } catch (e) {
    console.error("❌ Analytics summary error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// Existing heavy overview (keep for admin)
app.get("/overview", requireAuth, async (req, res) => {
  try {
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
