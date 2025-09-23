const express = require("express");
const admin = require("firebase-admin");
const corsMiddleware = require("../middleware/cors");

const app = express();
app.use(express.json());
app.use(corsMiddleware);  // 👈 apply CORS here

const db = admin.firestore();

const { tsToIso, requireAuth } = require("../utils/helpers");

// ========================================================================
// LESSONS ROUTES
// ========================================================================

console.log("📩 POST /lessons handler registered");
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
        title: v.title,
        category: v.category,
        published: v.published,
        // ✅ only send shortDescription
        shortDescription: v.shortDescription || "",
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

// ========================================================================
// 🔹 Publish a new lesson + notify all users
// ========================================================================
app.post("/", requireAuth, async (req, res) => {
  try {
    const { title, category, content, shortDescription } = req.body;
    if (!title || !content) {
      return res.status(400).json({ ok: false, error: "Title and content are required" });
    }

    const lessonRef = db.collection("lessons").doc();
    const lesson = {
      title,
      category: category || "other",
      content,
      shortDescription: shortDescription || "",
      published: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await lessonRef.set(lesson);
    console.log("✅ Lesson created:", lessonRef.id, title);

    // 🔔 Create notifications for all users
    const usersSnap = await db.collection("users").get();
    console.log("👥 Users found:", usersSnap.size);
    const batch = db.batch();

    usersSnap.forEach((doc) => {
      console.log("🔔 Creating notification for user:", doc.id);
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: doc.id,
        type: "lesson_published",
        title: "New Lesson 📘",
        message: `${title} is now available.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    });

    await batch.commit();
    console.log("✅ Notifications batch committed");


    return res.json({ ok: true, id: lessonRef.id });
  } catch (e) {
    console.error("❌ Error creating lesson:", e);
    return res.status(500).json({ ok: false, error: "Failed to create lesson" });
  }
});

module.exports = app;
