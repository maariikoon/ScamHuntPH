// middleware/cors.js
module.exports = function corsMiddleware(req, res, next) {
  const origin = req.headers.origin || "";
  const ALLOWED = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://scamhuntph-admin.web.app",
    "https://scamhuntph-admin.firebaseapp.com",
  ]);

  const isAllowed = origin && ALLOWED.has(origin);

  // So CDN/proxies don't mix responses for different origins
  res.setHeader("Vary", "Origin");

  // Handle preflight early
  if (req.method === "OPTIONS") {
    if (!isAllowed) {
      // Reject unknown origins cleanly (prevents confusing browser errors)
      return res.status(403).end();
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,PUT,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400"); // 24h cache for preflight
    return res.status(204).end();
  }

  // Simple requests
  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  // Note: Do NOT send "*" when credentials are allowed.
  // Unknown origins just won't receive CORS headers (browser will block).

  next();
};
