const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = require("./firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`,
});

const db = admin.firestore();

// 🔹 POST /reports
app.post("/reports", async (req, res) => {
  try {
    const { sender, message, evidenceUrls } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: "Sender and message are required" });
    }

    // Counter logic
    const counterRef = db.collection("metadata").doc("reportCounter");
    const counterDoc = await counterRef.get();

    let reportNumber = 1;
    if (counterDoc.exists) {
      reportNumber = counterDoc.data().count + 1;
    }

    const reportId = `report_${reportNumber}`;

    // 🔹 Save report with default status "pending"
    await db.collection("reports").doc(reportId).set({
      sender,
      message,
      evidenceUrls: evidenceUrls || [],
      status: "pending", // ✅ new field
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await counterRef.set({ count: reportNumber });

    res.json({ success: true, id: reportId, status: "pending" });
  } catch (err) {
    console.error("❌ Error saving report:", err);
    res.status(500).json({ error: "Failed to save report" });
  }
});


// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, project: serviceAccount.project_id });
});

app.listen(4000, () =>
  console.log("🚀 Backend running at http://localhost:4000")
);
