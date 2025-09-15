const admin = require('firebase-admin');

/** Verify Firebase ID token and require admin=true custom claim */
module.exports = async function requireAdmin(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const m = hdr.match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ ok: false, error: 'Missing token' });

    const decoded = await admin.auth().verifyIdToken(m[1]);
    if (!decoded?.admin) return res.status(403).json({ ok: false, error: 'Admins only' });

    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
};
