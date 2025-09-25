const express = require("express");
const admin = require("firebase-admin");
const { requireAuth, tsToIso } = require("../utils/helpers");
const corsMiddleware = require("../middleware/cors");

const app = express();
app.use(corsMiddleware);
app.use(express.json());

const db = admin.firestore();
const ADMIN_ROLES = ["super_admin", "admin", "analyst", "viewer"];

/* ---------- Helpers ---------- */
async function getReportCount(uid) {
  try {
    const snap = await db.collection("reports")
      .where("userId", "==", uid)
      .get();
    return snap.size;
  } catch {
    return 0;
  }
}

function normalizeUser(uid, uDoc, aDoc, authRec) {
  const u = uDoc?.data?.() || {};
  const a = aDoc?.data?.() || {};

  return {
    id: uid,
    email: a.email || u.email || authRec?.email || "",
    displayName: a.displayName || u.displayName || authRec?.displayName || "",
    role: a.role || u.role || "user",
    status: a.status || u.status || (authRec?.disabled ? "suspended" : "active"),
    lastLoginAt: tsToIso(authRec?.metadata?.lastSignInTime),
    lastActiveAt: tsToIso(u.lastActiveAt || a.lastActiveAt),
    reportCount: 0, // filled later
  };
}

async function fetchUser(uid) {
  const [uDoc, aDoc, authRec] = await Promise.all([
    db.collection("users").doc(uid).get().catch(() => null),
    db.collection("admins").doc(uid).get().catch(() => null),
    admin.auth().getUser(uid).catch(() => null),
  ]);
  return normalizeUser(uid, uDoc, aDoc, authRec);
}

/* ---------- Shared list handler ---------- */
async function listHandler(req, res) {
  try {
    const { q = "", role = "", status = "" } = req.body || req.query || {};

    const [usersSnap, adminsSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("admins").get(),
    ]);

    const uids = new Set([...usersSnap.docs.map(d => d.id), ...adminsSnap.docs.map(d => d.id)]);
    const rows = [];

    for (const uid of uids) {
      const row = await fetchUser(uid);
      row.reportCount = await getReportCount(uid);
      rows.push(row);
    }

    // Filter
    let items = rows;
    if (q) {
      const qLower = String(q).toLowerCase();
      items = items.filter(
        u => u.email.toLowerCase().includes(qLower) ||
             (u.displayName || "").toLowerCase().includes(qLower)
      );
    }
    if (role) items = items.filter(u => u.role === role);
    if (status) items = items.filter(u => u.status === status);

    return res.json({ ok: true, data: { items, total: items.length } });
  } catch (e) {
    console.error("❌ Users list error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

/* ---------- Routes ---------- */

// Support POST /admin/users:list (with colon)
app.post(":list", requireAuth, listHandler);

// Support POST /admin/users/list (with slash)
app.post("/list", requireAuth, listHandler);

// Also support GET /admin/users?...
app.get("/", requireAuth, listHandler);

// GET /admin/users/:id
app.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = await fetchUser(req.params.id);
    user.reportCount = await getReportCount(req.params.id);
    return res.json({ ok: true, data: user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /admin/users (create admin)
app.post("/", requireAuth, async (req, res) => {
  try {
    const { email, displayName, role = "admin" } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "Email required" });

    const userRec = await admin.auth().createUser({ email, displayName });
    await db.collection("admins").doc(userRec.uid).set({
      email,
      displayName,
      role,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, data: { id: userRec.uid } });
  } catch (e) {
    console.error("❌ Create admin error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /admin/users/:id/reset
app.post("/:id/reset", requireAuth, async (req, res) => {
  try {
    const uid = req.params.id;
    const userRec = await admin.auth().getUser(uid);
    if (!userRec.email) throw new Error("No email for user");

    const link = await admin.auth().generatePasswordResetLink(userRec.email);
    return res.json({ ok: true, data: { resetLink: link } });
  } catch (e) {
    console.error("❌ Reset error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /admin/users/:id/role
app.post("/:id/role", requireAuth, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ ok: false, error: "Missing role" });

    const uid = req.params.id;
    if (ADMIN_ROLES.includes(role)) {
      await db.collection("admins").doc(uid).set({ role }, { merge: true });
    } else {
      await db.collection("users").doc(uid).set({ role: "user" }, { merge: true });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ Role update error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /admin/users/:id/suspend
app.post("/:id/suspend", requireAuth, async (req, res) => {
  try {
    const uid = req.params.id;
    await Promise.all([
      db.collection("users").doc(uid).set({ status: "suspended" }, { merge: true }),
      db.collection("admins").doc(uid).set({ status: "suspended" }, { merge: true }),
      admin.auth().updateUser(uid, { disabled: true }).catch(() => {}),
    ]);
    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ Suspend error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /admin/users/:id/reactivate
app.post("/:id/reactivate", requireAuth, async (req, res) => {
  try {
    const uid = req.params.id;
    await Promise.all([
      db.collection("users").doc(uid).set({ status: "active" }, { merge: true }),
      db.collection("admins").doc(uid).set({ status: "active" }, { merge: true }),
      admin.auth().updateUser(uid, { disabled: false }).catch(() => {}),
    ]);
    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ Reactivate error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = app;
