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
    const decoded = await admin.auth().verifyIdToken(idToken); // includes custom claims

    // decoded already contains uid + any custom claims you set via setCustomUserClaims
    const claims = decoded;

    // Normalize role/admin flags so routes can read consistently
    const role = claims.role || claims.roles || null;
    const isAdmin =
      truthy(claims.admin) || role === "superadmin";

    // Attach to request
    req.user = decoded;           // original decoded token (has uid, email, etc.)
    req.user.claims = claims;     // convenience alias
    req.user.admin = isAdmin;     // normalized boolean flag
    if (!req.user.role && role) {
      req.user.role = role;
    }

    return next();
  } catch (err) {
    console.error("requireAuth verifyIdToken error:", err);
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

module.exports = { tsToIso, requireAuth, truthy };
