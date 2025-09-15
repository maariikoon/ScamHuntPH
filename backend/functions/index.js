// functions/index.js (CommonJS, Gen2)
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2/options");
const admin = require("firebase-admin");

// ===== Global options =====
setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 2,
  // memory: "256MiB",
  // concurrency: 80,
});

// ===== Firebase Admin =====
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ===== CORS (whitelist your admin UI domains) =====
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",


  "http://127.0.0.1:5173",
  // prod admin URLs:
  // "https://scamhuntph-admin.web.app",
  // "https://scamhuntph-admin.firebaseapp.com",
]);


// eslint-disable-next-line valid-jsdoc
/** Set CORS + cache headers */
function setCors(res, origin, methods = "GET,POST,PATCH,OPTIONS") {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  // eslint-disable-next-line max-len
  res.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
  res.set("Access-Control-Allow-Credentials", "true");
  // Allow common cases + both casings
  // eslint-disable-next-line max-len
  res.set("Access-Control-Allow-Headers", "Authorization, authorization, Content-Type, content-type");
  res.set("Access-Control-Allow-Methods", methods);
  res.set("Access-Control-Max-Age", "7200");
  res.set("Cache-Control", "no-store");
}

// eslint-disable-next-line valid-jsdoc
/** Parse URL helper (safer than req.query/req.path alone) */
function parseUrl(req) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  return {url, search: url.searchParams, path: url.pathname};
}

// eslint-disable-next-line valid-jsdoc
/** Auth helper (Firebase ID token in Authorization: Bearer <token>) */
async function requireAuth(req, res) {
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer (.+)$/);
  if (!m) {
    res.status(401).json({ok: false, error: "Missing token"});
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    return decoded;
  } catch (err) {
    res.status(401).json({ok: false, error: "Invalid token"});
    return null;
  }
}

// eslint-disable-next-line valid-jsdoc
/** Serialize Firestore Timestamp to ISO (nullable) */
function tsToIso(ts) {
  // eslint-disable-next-line max-len
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null;
}

/* ========================================================================
   GET /reports?status=...&limit=50&cursor=<docId or ISO or millis>
   Lists reports ordered by createdAt desc, with optional status filter
   and cursor pagination (docId OR createdAt time-based).
   ======================================================================== */
exports.reports = onRequest({cors: false}, async (req, res) => {
  const origin = req.headers.origin;
  setCors(res, origin, "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).send("");
  // eslint-disable-next-line max-len
  if (req.method !== "GET") return res.status(405).json({ok: false, error: "Method Not Allowed"});

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const {search} = parseUrl(req);
    const status = search.get("status");
    const limitParam = Number(search.get("limit") || 50);
    // eslint-disable-next-line max-len
    const limit = Math.min(Math.max(isFinite(limitParam) ? limitParam : 50, 1), 100);
    const cursor = search.get("cursor");

    let q = db.collection("reports").orderBy("createdAt", "desc");
    if (status) q = q.where("status", "==", String(status));
    q = q.limit(limit);

    if (cursor) {
      // Accept a docId OR a createdAt value (ISO or millis)
      // eslint-disable-next-line max-len
      const cursorDoc = await db.collection("reports").doc(String(cursor)).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      } else {
        let ts;
        if (/^\d+$/.test(cursor)) {
          // millis
          const ms = Number(cursor);
          // eslint-disable-next-line max-len
          if (!Number.isFinite(ms)) return res.status(400).json({ok: false, error: "Invalid cursor"});
          ts = admin.firestore.Timestamp.fromMillis(ms);
        } else {
          const d = new Date(cursor);
          // eslint-disable-next-line max-len
          if (isNaN(d.getTime())) return res.status(400).json({ok: false, error: "Invalid cursor"});
          ts = admin.firestore.Timestamp.fromDate(d);
        }
        q = q.startAfter(ts);
      }
    }

    const snap = await q.get();
    const data = snap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        ...v,
        createdAt: tsToIso(v.createdAt),
        updatedAt: tsToIso(v.updatedAt),
      };
    });

    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last ? last.id : null;

    return res.json({ok: true, data, nextCursor});
  } catch (e) {
    return res.status(500).json({ok: false, error: String(e)});
  }
});

/* ========================================================================
   GET /report/:id
   Fetch a single report by id
   ======================================================================== */
exports.report = onRequest({cors: false}, async (req, res) => {
  const origin = req.headers.origin;
  setCors(res, origin, "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).send("");
  // eslint-disable-next-line max-len
  if (req.method !== "GET") return res.status(405).json({ok: false, error: "Method Not Allowed"});

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const {path} = parseUrl(req); // e.g., /report/ABC123
    const parts = path.split("/").filter(Boolean); // ["report", ":id"]
    const id = parts[1];
    if (!id) return res.status(400).json({ok: false, error: "Missing id"});

    const doc = await db.collection("reports").doc(id).get();
    // eslint-disable-next-line max-len
    if (!doc.exists) return res.status(404).json({ok: false, error: "Not Found"});

    const v = doc.data();
    return res.json({
      ok: true,
      // eslint-disable-next-line max-len
      data: {id: doc.id, ...v, createdAt: tsToIso(v.createdAt), updatedAt: tsToIso(v.updatedAt)},
    });
  } catch (e) {
    return res.status(500).json({ok: false, error: String(e)});
  }
});

/* ========================================================================
   PATCH /report/:id/status
   Body: { status: "new|review|closed", note?: string }
   Updates status + audit fields
   ======================================================================== */
exports.reportStatus = onRequest({cors: false}, async (req, res) => {
  const origin = req.headers.origin;
  setCors(res, origin, "PATCH, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).send("");
  // eslint-disable-next-line max-len
  if (req.method !== "PATCH") return res.status(405).json({ok: false, error: "Method Not Allowed"});

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const {path} = parseUrl(req); // e.g., /report/ABC123/status
    // eslint-disable-next-line max-len
    const parts = path.split("/").filter(Boolean); // ["report", ":id", "status"]
    const id = parts[1];
    if (!id) return res.status(400).json({ok: false, error: "Missing id"});

    const {status, note} = req.body || {};
    // eslint-disable-next-line max-len
    if (!status) return res.status(400).json({ok: false, error: "Missing status"});

    const ref = db.collection("reports").doc(id);
    await ref.update({
      status: String(status),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActionBy: user.uid,
      ...(note ? {lastActionNote: String(note)} : {}),
    });

    return res.json({ok: true});
  } catch (e) {
    return res.status(500).json({ok: false, error: String(e)});
  }
});

/* ========================================================================
   GET /stats
   Quick counts by status: { new, review, closed }
   ======================================================================== */
exports.stats = onRequest({cors: false}, async (req, res) => {
  const origin = req.headers.origin;
  setCors(res, origin, "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).send("");
  // eslint-disable-next-line max-len
  if (req.method !== "GET") return res.status(405).json({ok: false, error: "Method Not Allowed"});

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const statuses = ["new", "review", "closed"];
    const counts = {};
    await Promise.all(
        statuses.map(async (s) => {
          // eslint-disable-next-line max-len
          const agg = await db.collection("reports").where("status", "==", s).count().get();
          counts[s] = agg.data().count || 0;
        }),
    );
    return res.json({ok: true, data: counts});
  } catch (e) {
    return res.status(500).json({ok: false, error: String(e)});
  }
});