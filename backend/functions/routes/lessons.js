const express = require("express");
const admin = require("firebase-admin");
const corsMiddleware = require("../middleware/cors");

const app = express();
app.use(express.json());
app.use(corsMiddleware);  // 👈 apply CORS here

const db = admin.firestore();

const { tsToIso } = require("../utils/helpers");

// 🔹 Get all published lessons
app.get("/", async (req, res) => {
  try {
    const snap = await db
      .collection("lessons")
      .where("published", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const lessons = snap.docs.map((doc) => {
      const v = doc.data();
      return {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      };
    });

    return res.json({ ok: true, lessons });
  } catch (e) {
    console.error("❌ Error fetching lessons:", e);
    return res.status(500).json({ ok: false, error: "Failed to fetch lessons" });
  }
});

// 🔹 Get single lesson by ID (only if published)
app.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("lessons").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: "Lesson not found" });
    }

    const v = doc.data();
    if (!v.published) {
      return res.status(403).json({ ok: false, error: "Lesson not published" });
    }

    return res.json({
      ok: true,
      lesson: {
        id: doc.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      },
    });
  } catch (e) {
    console.error("❌ Error fetching lesson:", e);
    return res.status(500).json({ ok: false, error: "Failed to fetch lesson" });
  }
});

module.exports = app;
