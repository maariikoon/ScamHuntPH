// functions/src/index.ts
import * as admin from "firebase-admin";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onRequest, Request } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { createHash } from "crypto";

/* =========================
   Init
========================= */
admin.initializeApp();
const db = admin.firestore();

/* =========================
   Config
========================= */
const REGION = "asia-southeast1";

/* =========================
   Helpers
========================= */
function normalizeMessage(msg: string): string {
  return msg
    .normalize("NFKC")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
function num(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function hashMessage(m: string) {
  return createHash("sha256").update(m, "utf8").digest("hex");
}

function allowCORS(res: any) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
}
function handlePreflight(req: Request, res: any) {
  allowCORS(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

async function getCaller(req: Request) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Missing Authorization: Bearer <ID_TOKEN>");

  const decoded = await admin.auth().verifyIdToken(token);
  const claims = decoded as any;

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: (claims.name as string) ?? null,
    role: (claims.role as string) ?? null,
    isAdmin:
      claims.admin === true ||
      (claims.role && ["admin", "superadmin"].includes(claims.role as string)),
  };
}

async function hasAdminsDoc(uid: string): Promise<boolean> {
  const snap = await db.doc(`admins/${uid}`).get();
  return snap.exists;
}

/** Ensure custom claim {admin:true, role:"admin"} if admins/{uid} exists. Returns true if updated now. */
async function ensureAdminClaimsFromDoc(uid: string): Promise<boolean> {
  const inAdmins = await hasAdminsDoc(uid);
  if (!inAdmins) return false;

  const user = await admin.auth().getUser(uid);
  const current = (user.customClaims as Record<string, any>) ?? {};
  if (current.admin === true) return false;

  await admin.auth().setCustomUserClaims(uid, { ...current, admin: true, role: "admin" });
  return true;
}

/* =========================
   Firestore Triggers
========================= */

export const onReportCreate = onDocumentCreated(
  {
    document: "reports/{reportId}",
    region: REGION,
    memory: "256MiB",
    maxInstances: 3,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const ref = snap.ref;
    const data = snap.data() as any;

    const rawMessage: string | undefined = data?.message;
    if (!rawMessage || typeof rawMessage !== "string") {
      logger.warn("Skipping: no message");
      return;
    }
    const message = normalizeMessage(rawMessage);

    if (data?.decision?.type === "auto") {
      logger.info("Already auto-processed; skipping", data?.decision);
      return;
    }

    const cfg = await db.doc("config/nlp").get();
    if (!cfg.exists) {
      logger.error("config/nlp missing — cannot score");
      return;
    }

    const {
      activeVersion,
      rules = [],
      autoApproveThreshold = 0.85,
      autoPendingThreshold = 0.4,
      autoDeclineThreshold = 0.1,
    } = cfg.data() as any;

    const approveT = num(autoApproveThreshold, 0.85);
    const pendingT = num(autoPendingThreshold, 0.4);
    const declineT = num(autoDeclineThreshold, 0.1);

    let score = 0;
    const matchedRules: string[] = [];
    const explanations: string[] = [];
    for (const r of rules as Array<any>) {
      try {
        if (!r?.regex) continue;
        const re = new RegExp(String(r.regex), "iu");
        if (re.test(message)) {
          score += num(r.weight, 0);
          if (r.id) matchedRules.push(String(r.id));
          if (r.explanation) explanations.push(String(r.explanation));
        }
      } catch (e) {
        logger.error("Invalid regex in config rule:", r, e);
      }
    }

    score = Math.max(0, Math.min(score, 10));
    type Result = "verified" | "declined" | "pending";
    let result: Result = "pending";
    let reason = "Needs manual review (medium/low confidence)";

    if (score >= approveT) {
      result = "verified";
      reason = `Auto-approved (score ${score.toFixed(2)} ≥ ${approveT})`;
    } else if (score < declineT) {
      result = "declined";
      reason = `Auto-declined (score ${score.toFixed(2)} < ${declineT})`;
    } else {
      reason =
        score >= pendingT
          ? `Pending (score ${score.toFixed(2)} between ${pendingT}–${approveT})`
          : `Pending (low confidence ${score.toFixed(2)} ≥ ${declineT})`;
    }

    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const cur = fresh.data() as any;
      if (cur?.decision?.type === "auto") return;
      tx.update(ref, {
        nlp: { score, matchedRules, explanations },
        decision: {
          type: "auto",
          by: "system",
          result,
          reason,
          nlpVersion: activeVersion ?? null,
        },
        status: result,
        lastActionBy: "system",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    logger.info(
      `✅ onReportCreate: ${event.params.reportId} → ${result} (score=${score.toFixed(
        2
      )}, matched=[${matchedRules.join(", ")}])`
    );
  }
);

export const onReportDecisionPropagate = onDocumentUpdated(
  {
    document: "reports/{reportId}",
    region: REGION,
    memory: "256MiB",
    maxInstances: 3,
  },
  async (event) => {
    const before = event.data?.before.data() as any;
    const after = event.data?.after.data() as any;
    if (!before || !after) return;

    const beforeStatus = (before.status || "").toLowerCase();
    const afterStatus = (after.status || "").toLowerCase();
    if (beforeStatus === afterStatus) return;
    if (!["verified", "declined"].includes(afterStatus)) return;

    const sourceId = event.params.reportId;
    const decisionObj = {
      type: after?.decision?.type || "auto",
      result: afterStatus,
      reason: (after?.decision?.reason || "Decision changed") + " (propagated)",
      nlpVersion: after?.decision?.nlpVersion ?? null,
    };

    const writer = db.bulkWriter();
    let processed = 0;
    const snap = await db
      .collection("reports")
      .where("status", "==", "pending")
      .limit(300)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data() as any;
      if (d?.decision?.type === "manual") continue;
      writer.update(doc.ref, {
        status: afterStatus,
        decision: {
          ...decisionObj,
          type: "auto-from-propagate",
          by: "system",
          sourceId,
        },
        lastActionBy: "system",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        reusedFrom: sourceId,
      });
      processed++;
    }

    await writer.close();
    logger.info(`🔁 Propagated ${afterStatus} from ${sourceId} to ${processed} pending reports`);
  }
);

/* =========================
   HTTPS Endpoints
========================= */

// Debug: whoami
export const whoAmI = onRequest({ region: REGION }, async (req, res) => {
  if (handlePreflight(req, res)) return;
  try {
    const caller = await getCaller(req);
    res.json({ ok: true, caller });
  } catch (e: any) {
    res.status(401).send(e?.message ?? "Unauthorized");
  }
});

// POST /logLogin
export const logLogin = onRequest({ region: REGION }, async (req, res) => {
  if (handlePreflight(req, res)) return;
  if (req.method !== "POST") return void res.status(405).send("Method not allowed");

  try {
    const caller = await getCaller(req);

    // keep claims in sync with admins/{uid} (no self-grant)
    const claimsUpdated = await ensureAdminClaimsFromDoc(caller.uid);
    const isAdminNow = caller.isAdmin || (await hasAdminsDoc(caller.uid));

    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("auditLogs").add({
      action: "auth.login",
      scope: isAdminNow ? "admin" : "user",
      entity: "web-admin",
      note: "Signed in",
      actorUid: caller.uid,
      actorEmail: caller.email,
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      ua: (req.headers["user-agent"] as string) || null,
      createdAt: now,
    });

    await db.doc(`users/${caller.uid}`).set(
      { lastLoginAt: now, lastActiveAt: now, status: "online" },
      { merge: true }
    );

    res.json({ ok: true, claimsUpdated: Boolean(claimsUpdated) });
  } catch (e: any) {
    res.status(401).send(e?.message ?? "Unauthorized");
  }
});

// POST /logLogout
export const logLogout = onRequest({ region: REGION }, async (req, res) => {
  if (handlePreflight(req, res)) return;
  if (req.method !== "POST") return void res.status(405).send("Method not allowed");

  try {
    const caller = await getCaller(req);
    const isAdminNow = caller.isAdmin || (await hasAdminsDoc(caller.uid));
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("auditLogs").add({
      action: "auth.logout",
      scope: isAdminNow ? "admin" : "user",
      entity: "web-admin",
      note: "Signed out",
      actorUid: caller.uid,
      actorEmail: caller.email,
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      ua: (req.headers["user-agent"] as string) || null,
      createdAt: now,
    });

    await db.doc(`users/${caller.uid}`).set(
      { lastActiveAt: now, status: "offline" },
      { merge: true }
    );

    res.json({ ok: true });
  } catch (e: any) {
    res.status(401).send(e?.message ?? "Unauthorized");
  }
});

// POST /logAction  body: { action, entity?, note?, ua? }
export const logAction = onRequest({ region: REGION }, async (req, res) => {
  if (handlePreflight(req, res)) return;
  if (req.method !== "POST") return void res.status(405).send("Method not allowed");

  try {
    const caller = await getCaller(req);
    const isAdminNow = caller.isAdmin || (await hasAdminsDoc(caller.uid));
    const now = admin.firestore.FieldValue.serverTimestamp();

    const { action, entity, note, ua } = (req.body as any) ?? {};

    await db.collection("auditLogs").add({
      action: action ?? "action.unknown",
      scope: isAdminNow ? "admin" : "user",
      entity: entity ?? null,
      note: note ?? null,
      actorUid: caller.uid,
      actorEmail: caller.email,
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      ua: ua ?? (req.headers["user-agent"] as string) ?? null,
      createdAt: now,
    });

    await db.doc(`users/${caller.uid}`).set(
      { lastActiveAt: now, status: "online" },
      { merge: true }
    );

    res.json({ ok: true });
  } catch (e: any) {
    res.status(401).send(e?.message ?? "Unauthorized");
  }
});

/**
 * POST /syncClaims
 * Body (optional): { uid?: string } — if omitted, syncs caller
 * Promotes if admins/{uid} exists; demotes if not.
 */
export const syncClaims = onRequest({ region: REGION }, async (req, res): Promise<void> => {
  if (handlePreflight(req, res)) return;
  if (req.method !== "POST") return void res.status(405).send("Method not allowed");

  try {
    const caller = await getCaller(req);
    const targetUid = (req.body as any)?.uid || caller.uid;

    const user = await admin.auth().getUser(targetUid);
    const current = (user.customClaims as Record<string, any>) || {};
    const inAdmins = await hasAdminsDoc(targetUid);

    if (inAdmins && current.admin !== true) {
      await admin.auth().setCustomUserClaims(targetUid, { ...current, admin: true, role: "admin" });
      return void res.json({ ok: true, changed: "promoted" });
    }

    if (!inAdmins && current.admin === true) {
      const { admin: _drop, role: _dropRole, ...rest } = current;
      await admin.auth().setCustomUserClaims(targetUid, { ...rest });
      return void res.json({ ok: true, changed: "demoted" });
    }

    return void res.json({ ok: true, changed: "none" });
  } catch (e: any) {
    res.status(401).send(e?.message ?? "Unauthorized");
  }
});
