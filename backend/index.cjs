// backend/index.cjs
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const admin = require("firebase-admin");
const argon2 = require("argon2");
const crypto = require("crypto");
const morgan = require("morgan");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const app = express();

// --- Firebase Admin init (your filename kept) ---
const serviceAccount = require("./firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`,
});
const db = admin.firestore();

// --- Config / Security constants ---
const PORT = process.env.PORT || 4000;
const WEBADMIN_ORIGIN = process.env.WEBADMIN_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "change-me-now";
const SESSION_COOKIE = "admin_session";
const CSRF_COOKIE = "csrf_token";
const COOKIE_SECURE = process.env.COOKIE_SECURE !== "false"; // set COOKIE_SECURE=false for local http

// --- Load JSON configs (categories, alerts) ---
function safeJson(file, fallback) {
  try { return require(file); } catch { return fallback; }
}
const categoriesCfg = safeJson(
  path.join(__dirname, "data", "scam_categories.json"),
  { categories: ["gcash_scam","phishing","delivery_fraud","investment_scam","loan_scam","identity_theft","other"],
    regions: ["NCR","CAR","Region I","Region II","Region III","Region IV-A","MIMAROPA","Region V","Region VI","Region VII","Region VIII","Region IX","Region X","Region XI","Region XII","Region XIII","BARMM","N/A"] }
);
const alertsCfg = safeJson(
  path.join(__dirname, "data", "alerts_config.json"),
  { enabled: true, thresholds: { spikePerHour: 25, sameSenderPer15m: 5 }, checkEveryMinutes: 5 }
);

// --- Express middlewares ---
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: WEBADMIN_ORIGIN,
    credentials: true,
  })
);
app.use(morgan("tiny"));

// --- Helpers ---
const newCsrf = () => crypto.randomBytes(32).toString("hex");
const signSession = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "2h", issuer: "scamhuntph" });

const readToken = (req) => {
  const hdr = req.headers.authorization || "";
  const m = hdr.match(/^Bearer (.+)$/);
  if (m) return m[1];
  return req.cookies[SESSION_COOKIE] || null;
};

async function auditLog(action, details, actor, extra = {}) {
  try {
    await db.collection("audit_logs").add({
      action,
      details: details || null,
      actor: actor || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    });
  } catch { /* avoid breaking the request on audit errors */ }
}

// --- Validation / Policy ---
const PasswordPolicy = z
  .string()
  .min(8, "min 8 chars")
  .refine((s) => /[A-Z]/.test(s), "need uppercase")
  .refine((s) => /[a-z]/.test(s), "need lowercase")
  .refine((s) => /\d/.test(s), "need number")
  .refine((s) => /[^A-Za-z0-9]/.test(s), "need symbol");

const CreateAdminSchema = z.object({
  email: z.string().email(),
  password: PasswordPolicy,
  role: z.enum(["admin", "superadmin"]).default("admin"),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: PasswordPolicy,
});

const ResetPasswordSchema = z.object({
  email: z.string().email(),
  newPassword: PasswordPolicy,
  mustChange: z.boolean().default(true),
});

// --- Guards ---
function requireAdmin(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ ok: false, error: "Missing token" });
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: "scamhuntph" });
    if (!["admin", "superadmin"].includes(decoded.role)) {
      return res.status(403).json({ ok: false, error: "Insufficient role" });
    }
    req.session = decoded; // { sub, email, role, mustChange? }
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid/expired token" });
  }
}

function requireSuperadmin(req, res, next) {
  if (req.session?.role !== "superadmin") {
    return res.status(403).json({ ok: false, error: "Superadmin only" });
  }
  next();
}

// CSRF for state-changing
function requireCsrf(req, res, next) {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next();
  const header = req.headers["x-csrf-token"];
  const cookie = req.cookies[CSRF_COOKIE];
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ ok: false, error: "CSRF validation failed" });
  }
  next();
}
app.use(requireCsrf);

// --- Rate limiters ---
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

// --- Model helpers ---
function projectAdmin(doc) {
  if (!doc.exists) return null;
  const d = doc.data();
  return {
    id: doc.id,
    email: d.email,
    role: d.role || "admin",
    disabled: !!d.disabled,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
  };
}

// =========== Core Routes ===========

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, project: serviceAccount.project_id });
});

// CSRF token (get cookie + use header X-CSRF-Token on POST/PATCH/DELETE)
app.get("/csrf", (req, res) => {
  const token = newCsrf();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.json({ ok: true, token });
});

// Login (checks Firestore /admins/{email})
app.post("/admin/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email & password required" });
    }

    const id = String(email).toLowerCase();
    const snap = await db.collection("admins").doc(id).get();
    if (!snap.exists) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const adminUser = snap.data();
    if (adminUser.disabled) return res.status(403).json({ ok: false, error: "Account disabled" });

    const ok = await argon2.verify(adminUser.passwordHash, password);
    if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const mustChange = !!adminUser.passwordMustChange;

    const token = signSession({
      sub: snap.id,
      email: adminUser.email,
      role: adminUser.role || "admin",
      mustChange,
    });

    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "strict",
      path: "/",
      maxAge: 2 * 60 * 60 * 1000,
    });

    // rotate CSRF after login
    const csrf = newCsrf();
    res.cookie(CSRF_COOKIE, csrf, {
      httpOnly: false,
      secure: COOKIE_SECURE,
      sameSite: "strict",
      path: "/",
      maxAge: 2 * 60 * 60 * 1000,
    });

    await auditLog("login_success", { email: adminUser.email }, adminUser.email, {
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
    });

    res.json({ ok: true, role: adminUser.role || "admin", mustChange });
  } catch (e) {
    await auditLog("login_error", { error: String(e) }, null);
    res.status(500).json({ ok: false, error: "Login failed" });
  }
});

// Logout
app.post("/admin/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// Me
app.get("/admin/me", requireAdmin, async (req, res) => {
  const me = await db.collection("admins").doc(req.session.sub).get();
  const out = projectAdmin(me);
  if (!out) return res.status(404).json({ ok: false, error: "Not found" });
  res.json({ ok: true, admin: out });
});

// Create Admin (superadmin only)
app.post("/admin/create", requireAdmin, requireSuperadmin, async (req, res) => {
  try {
    const parsed = CreateAdminSchema.safeParse(req.body || {});
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({ ok: false, error: msg || "Invalid input" });
    }
    const { email, password, role } = parsed.data;
    const id = String(email).toLowerCase();

    const docRef = db.collection("admins").doc(id);
    const exist = await docRef.get();
    if (exist.exists) return res.status(409).json({ ok: false, error: "Admin already exists" });

    const hash = await argon2.hash(password, { type: argon2.argon2id });

    await docRef.set({
      email,
      passwordHash: hash,
      role,
      disabled: false,
      passwordMustChange: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await auditLog("create_admin", { email, role }, req.session.email || req.session.sub, {
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
    });

    res.json({ ok: true, admin: { id, email, role, disabled: false } });
  } catch {
    res.status(500).json({ ok: false, error: "Create failed" });
  }
});

// Change own password
app.post("/admin/change-password", requireAdmin, async (req, res) => {
  try {
    const parsed = ChangePasswordSchema.safeParse(req.body || {});
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({ ok: false, error: msg || "Invalid input" });
    }
    const { currentPassword, newPassword } = parsed.data;

    const docRef = db.collection("admins").doc(req.session.sub);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: "Account not found" });

    const data = snap.data();
    if (data.disabled) return res.status(403).json({ ok: false, error: "Account disabled" });

    const ok = await argon2.verify(data.passwordHash, currentPassword);
    if (!ok) return res.status(401).json({ ok: false, error: "Current password incorrect" });

    if (await argon2.verify(data.passwordHash, newPassword)) {
      return res.status(400).json({ ok: false, error: "New password must be different" });
    }

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await docRef.set(
      {
        passwordHash: newHash,
        passwordMustChange: false,
        passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await auditLog("change_password_self", { email: req.session.email }, req.session.email || req.session.sub, {
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "Change failed" });
  }
});

// Superadmin reset password
app.post("/admin/reset-password", requireAdmin, requireSuperadmin, async (req, res) => {
  try {
    const parsed = ResetPasswordSchema.safeParse(req.body || {});
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({ ok: false, error: msg || "Invalid input" });
    }
    const { email, newPassword, mustChange } = parsed.data;
    const id = String(email).toLowerCase();

    const docRef = db.collection("admins").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: "Admin not found" });

    const d = snap.data();
    if (d.disabled) return res.status(403).json({ ok: false, error: "Account disabled" });

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await docRef.set(
      {
        passwordHash: newHash,
        passwordMustChange: !!mustChange,
        passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await auditLog("reset_password_superadmin", { target: email, mustChange: !!mustChange }, req.session.email || req.session.sub, {
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "Reset failed" });
  }
});

// Read any admin by docId (superadmin only)
app.get("/admin/admins/:id", requireAdmin, requireSuperadmin, async (req, res) => {
  const id = String(req.params.id).toLowerCase();
  const doc = await db.collection("admins").doc(id).get();
  const out = projectAdmin(doc);
  if (!out) return res.status(404).json({ ok: false, error: "Not found" });
  res.json({ ok: true, admin: out });
});

// ======= FR9 / FR12 / FR13 / FR14 endpoints =======

// List reports with filters
// GET /reports?status=pending&category=gcash_scam&region=NCR&limit=50
app.get("/reports", requireAdmin, async (req, res) => {
  try {
    const { status, category, region, limit = 50 } = req.query;
    let q = db.collection("reports").orderBy("createdAt", "desc");
    if (status)   q = q.where("status", "==", String(status));
    if (category) q = q.where("category", "==", String(category));
    if (region)   q = q.where("region", "==", String(region));

    const snap = await q.limit(Number(limit)).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get single report
app.get("/reports/:id", requireAdmin, async (req, res) => {
  const doc = await db.collection("reports").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ ok: false, error: "Not found" });
  res.json({ ok: true, item: { id: doc.id, ...doc.data() } });
});

// Create report (admin-curated). CSRF required.
app.post("/reports", requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const ref = await db.collection("reports").add({
      sender: body.sender || "Unknown",
      category: body.category || "other",
      region: body.region || "N/A",
      status: "pending",
      isActiveThreat: !!body.isActiveThreat,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await auditLog("report_create_admin", { reportId: ref.id }, req.session.email);
    res.json({ ok: true, id: ref.id });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Change status / recategorize (verify / reject / block). CSRF required.
app.patch("/reports/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status, category, reason } = req.body || {};
    const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (status) update.status = status;
    if (category) update.category = category;

    const ref = db.collection("reports").doc(req.params.id);
    await ref.set(update, { merge: true });

    await auditLog("report_status_change", { reportId: ref.id, status, category, reason: reason || null }, req.session.email);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Simple analytics summary (tiles + charts)
app.get("/stats/summary", requireAdmin, async (_req, res) => {
  try {
    const col = db.collection("reports");
    const statuses = ["pending","verified","rejected","blocked"];
    const counts = await Promise.all(statuses.map(s => col.where("status","==",s).count().get()));
    const [pending, verified, rejected, blocked] = counts.map(c => c.data().count);

    // quick sample for byCategory/byRegion (last 500)
    const snap = await col.orderBy("createdAt","desc").limit(500).get();
    const byCategory = {};
    const byRegion = {};
    snap.forEach(d => {
      const { category="other", region="N/A" } = d.data();
      byCategory[category] = (byCategory[category]||0)+1;
      byRegion[region] = (byRegion[region]||0)+1;
    });

    res.json({ ok: true, pending, verified, rejected, blocked, byCategory, byRegion });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Recent audit logs
app.get("/audit", requireAdmin, async (_req, res) => {
  const snap = await db.collection("audit_logs").orderBy("at","desc").limit(200).get();
  res.json({ ok: true, items: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
});

// Backwards-compat example (optional): verify endpoint
app.post("/admin/reports/:id/verify", requireAdmin, async (req, res) => {
  await db.collection("reports").doc(req.params.id).set({ status: "verified", updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  await auditLog("report_status_change", { reportId: req.params.id, status: "verified" }, req.session.email);
  res.json({ ok: true });
});

// ======= FR14: basic anomaly checks (cron) =======
async function runAnomalyChecks() {
  if (!alertsCfg.enabled) return;
  const now = Date.now();
  const since = new Date(now - 60 * 60 * 1000); // last hour
  const snap = await db.collection("reports").where("createdAt", ">=", since).get();
  const total = snap.size;

  let sameSenderHit = false;
  const bySender = {};
  snap.forEach(d => {
    const s = (d.data().sender || "Unknown").trim();
    bySender[s] = (bySender[s] || 0) + 1;
    if (bySender[s] >= alertsCfg.thresholds.sameSenderPer15m) sameSenderHit = true;
  });

  if (total >= alertsCfg.thresholds.spikePerHour || sameSenderHit) {
    await db.collection("alerts").add({
      kind: "anomaly",
      totalLastHour: total,
      sameSenderHit,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
    await auditLog("anomaly_detected", { totalLastHour: total, sameSenderHit }, "system");
  }
}
cron.schedule(`*/${alertsCfg.checkEveryMinutes} * * * *`, runAnomalyChecks);

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
