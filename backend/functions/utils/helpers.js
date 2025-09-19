const admin = require("firebase-admin");

// Firestore timestamp → ISO string
function tsToIso(ts) {
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null;
}

// Auth middleware
async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ ok: false, error: "Missing token" });
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

module.exports = { tsToIso, requireAuth };
