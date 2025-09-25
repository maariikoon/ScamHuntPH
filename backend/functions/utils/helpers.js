// backend/functions/utils/helpers.js
const admin = require("firebase-admin");

// Firestore timestamp → ISO string
function tsToIso(ts) {
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null;
}

// Treat several representations as "true"
function truthy(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * requireAuth
 * - Verifies Bearer ID token
 * - Attaches decoded token to req.user
 * - Mirrors token to req.user.claims for convenience
 * - Normalizes admin/role so downstream guards can read them reliably
 */
async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ ok: false, error: "Missing token" });

  try {
    const idToken = m[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    const claims = decoded;
    const role = claims.role || claims.roles || null;
    const isAdmin = truthy(claims.admin) || role === "superadmin";

    // Attach to request
    req.user = decoded;
    req.user.claims = claims;
    req.user.admin = isAdmin;
    if (!req.user.role && role) {
      req.user.role = role;
    }

    // ✅ Update lastActiveAt in Firestore
    try {
      const db = admin.firestore();
      await db.collection("users").doc(decoded.uid).set(
        {
          email: decoded.email || "",
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (updateErr) {
      console.warn("⚠️ Failed to update lastActiveAt for user", decoded.uid, updateErr);
      // Don’t block the request if this fails
    }

    return next();
  } catch (err) {
    console.error("requireAuth verifyIdToken error:", err);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

module.exports = { tsToIso, requireAuth, truthy };
