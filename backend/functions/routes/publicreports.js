// backend/functions/publicreports.js
const express = require("express");
const admin = require("firebase-admin");
const corsMiddleware = require("../middleware/cors");
const { tsToIso } = require("../utils/helpers");

const app = express();
app.use(corsMiddleware); 

const db = admin.firestore();

// 🔹 Public Reports (no token required)
app.get("/", async (req, res) => {
  try {
    const qParams = req.query || {};
    const category = qParams.category;
    const days = Number(qParams.days);
    const limitRaw = Number(qParams.limit);
    const limitVal = Math.min(Math.max(isNaN(limitRaw) ? 50 : limitRaw, 1), 100);

    let q = db.collection("reports")
      .where("status", "==", "verified")
      .orderBy("createdAt", "desc")
      .limit(limitVal);

    if (category && category !== "All") {
      q = q.where("category", "==", String(category));
    }

    if (!isNaN(days) && days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      q = q.where("createdAt", ">=", admin.firestore.Timestamp.fromDate(from));
    }

    const snap = await q.get();
    const data = (snap.docs || []).map((d) => {
      const v = d.data() || {};
      return {
        id: d.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      };
    });

    return res.json({ ok: true, data });
  } catch (e) {
    console.error("❌ Error in GET /publicreports:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = app;
