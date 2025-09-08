// requireAuth.js
const admin = require('./firebaseAdmin.cjs'); // ensures admin is initialized

module.exports = async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const m = hdr.match(/^Bearer (.+)$/);
    if (!m) {
      return res.status(401).json({ ok: false, error: 'Missing token' });
    }
    const token = m[1];

    // Verify the Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // contains uid, email (if present), custom claims, etc.
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};
