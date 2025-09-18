const express = require("express");
const admin = require("firebase-admin");

const router = express.Router();
const db = admin.firestore();

// helper: Firestore timestamp → ISO string
function tsToIso(ts) {
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null;
}

// 🔹 Get all published lessons
router.get("/", async (req, res) => {
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
router.get("/:id", async (req, res) => {
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

module.exports = router;
