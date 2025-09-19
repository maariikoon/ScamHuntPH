// middleware/cors.js
module.exports = function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const ALLOWED_ORIGINS = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    //"http://localhost:3000",
    //"https://scamhuntph-admin.web.app",
    //"https://scamhuntph-admin.firebaseapp.com",
  ]);

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
};
