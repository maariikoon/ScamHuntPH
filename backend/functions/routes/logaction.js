// backend/functions/routes/logaction.js
const express = require("express");
const admin = require("firebase-admin");
const corsMiddleware = require("../middleware/cors");

const app = express();
app.use(corsMiddleware);  // CORS
app.use(express.json());

const db = admin.firestore();

// ===== Helpers =====
const { requireAuth } = require("../utils/helpers");

// ---------------------------------------------------------------------
// Check if user is admin (from token claims OR Firestore)
// ---------------------------------------------------------------------
async function isAdmin(uid, claims) {
  try {
    // 1) Check token claims first
    if (claims.admin === true) return true;
    if (claims.role === "admin" || claims.role === "superadmin") return true;

    // 2) Fallback to Firestore documents
    const [adminDoc, userDoc] = await Promise.all([
      db.collection("admins").doc(uid).get().catch(() => null),
      db.collection("users").doc(uid).get().catch(() => null),
    ]);

    if (adminDoc && adminDoc.exists) {
      const ad = adminDoc.data() || {};
      if (ad.admin === true || ad.role === "admin" || ad.role === "superadmin" || ad.enabled === true) {
        return true;
      }
    }

    if (userDoc && userDoc.exists) {
      const ud = userDoc.data() || {};
      if (ud.admin === true || ud.role === "admin" || ud.role === "superadmin") {
        return true;
      }
    }

    return false;
  } catch (e) {
    console.error("isAdmin check error:", e);
    return false;
  }
}

// ========================================================================
// LOG ACTION ROUTE
// ========================================================================

// 📹 POST / - Log an action to auditLogs
console.log("📩 POST /logAction handler registered");
app.post("/", requireAuth, async (req, res) => {
  try {
    const { action, entity, note, ua } = req.body || {};
    const user = req.user || {};

    // Determine scope (admin or user)
    const isAdminUser = await isAdmin(user.uid, user.claims || {});
    const scope = isAdminUser ? "admin" : "user";

    // Write to auditLogs collection
    await db.collection("auditLogs").add({
      action: action || "action.unknown",
      scope: scope,
      entity: entity || null,
      note: note || null,
      actorUid: user.uid,
      actorEmail: user.email || null,
      ip: req.headers["x-forwarded-for"] || req.ip || null,
      ua: ua || req.get("user-agent") || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Logged action: ${action} by ${user.email || user.uid} (scope: ${scope})`);

    // Update user lastActiveAt
    await db.doc(`users/${user.uid}`).set(
      {
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "online",
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ logAction error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = app;