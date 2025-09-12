const functions = require("firebase-functions");
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const {v4: uuidv4} = require("uuid");


const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// 🔹 POST /reports
app.post("/reports", async (req, res) => {
  try {
    const {sender, message, evidenceUrls, category, region} = req.body;


    if (!sender || !message) {
      return res.status(400).json({error: "Sender and message are required"});
    }

    // Counter logic
    const counterRef = db.collection("metadata").doc("reportCounter");
    const counterDoc = await counterRef.get();

    let reportNumber = 1;
    if (counterDoc.exists) {
      reportNumber = counterDoc.data().count + 1;
    }

    const reportId = uuidv4();

    // 🔹 Save report with default status "pending"
    await db.collection("reports").doc(reportId).set({
      sender,
      message,
      evidenceUrls: evidenceUrls || [],
      category: category || "Others", // ✅ default
      region: region || "N/A", // ✅ default
      status: "pending", // admin will change later
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await counterRef.set({count: reportNumber});

    res.json({success: true, id: reportId, status: "pending"});
  } catch (err) {
    console.error("❌ Error saving report:", err);
    res.status(500).json({error: "Failed to save report"});
  }
});

// 🔹 Health check
app.get("/health", (req, res) => {
  res.json({ok: true, project: process.env.GCLOUD_PROJECT});
});

// 🚀 Export Express app as Firebase Function (no app.listen!)
exports.api = functions.https.onRequest(app);
