"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncClaims = exports.logAction = exports.logLogout = exports.logLogin = exports.whoAmI = exports.onReportDecisionPropagate = exports.onReportCreate = void 0;
// functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const crypto_1 = require("crypto");
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
function normalizeMessage(msg) {
    return msg
        .normalize("NFKC")
        .replace(/[‘’‚‛]/g, "'")
        .replace(/[“”„‟]/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}
function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function hashMessage(m) {
    return (0, crypto_1.createHash)("sha256").update(m, "utf8").digest("hex");
}
function allowCORS(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
}
function handlePreflight(req, res) {
    allowCORS(res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    return false;
}
async function getCaller(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token)
        throw new Error("Missing Authorization: Bearer <ID_TOKEN>");
    const decoded = await admin.auth().verifyIdToken(token);
    const claims = decoded;
    return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        name: claims.name ?? null,
        role: claims.role ?? null,
        isAdmin: claims.admin === true ||
            (claims.role && ["admin", "superadmin"].includes(claims.role)),
    };
}
async function hasAdminsDoc(uid) {
    const snap = await db.doc(`admins/${uid}`).get();
    return snap.exists;
}
/** Ensure custom claim {admin:true, role:"admin"} if admins/{uid} exists. Returns true if updated now. */
async function ensureAdminClaimsFromDoc(uid) {
    const inAdmins = await hasAdminsDoc(uid);
    if (!inAdmins)
        return false;
    const user = await admin.auth().getUser(uid);
    const current = user.customClaims ?? {};
    if (current.admin === true)
        return false;
    await admin.auth().setCustomUserClaims(uid, { ...current, admin: true, role: "admin" });
    return true;
}
/* =========================
   Firestore Triggers
========================= */
exports.onReportCreate = (0, firestore_1.onDocumentCreated)({
    document: "reports/{reportId}",
    region: REGION,
    memory: "256MiB",
    maxInstances: 3,
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const ref = snap.ref;
    const data = snap.data();
    const rawMessage = data?.message;
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
    const { activeVersion, rules = [], autoApproveThreshold = 0.85, autoPendingThreshold = 0.4, autoDeclineThreshold = 0.1, } = cfg.data();
    const approveT = num(autoApproveThreshold, 0.85);
    const pendingT = num(autoPendingThreshold, 0.4);
    const declineT = num(autoDeclineThreshold, 0.1);
    let score = 0;
    const matchedRules = [];
    const explanations = [];
    for (const r of rules) {
        try {
            if (!r?.regex)
                continue;
            const re = new RegExp(String(r.regex), "iu");
            if (re.test(message)) {
                score += num(r.weight, 0);
                if (r.id)
                    matchedRules.push(String(r.id));
                if (r.explanation)
                    explanations.push(String(r.explanation));
            }
        }
        catch (e) {
            logger.error("Invalid regex in config rule:", r, e);
        }
    }
    score = Math.max(0, Math.min(score, 10));
    let result = "pending";
    let reason = "Needs manual review (medium/low confidence)";
    if (score >= approveT) {
        result = "verified";
        reason = `Auto-approved (score ${score.toFixed(2)} ≥ ${approveT})`;
    }
    else if (score < declineT) {
        result = "declined";
        reason = `Auto-declined (score ${score.toFixed(2)} < ${declineT})`;
    }
    else {
        reason =
            score >= pendingT
                ? `Pending (score ${score.toFixed(2)} between ${pendingT}–${approveT})`
                : `Pending (low confidence ${score.toFixed(2)} ≥ ${declineT})`;
    }
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        const cur = fresh.data();
        if (cur?.decision?.type === "auto")
            return;
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
    logger.info(`✅ onReportCreate: ${event.params.reportId} → ${result} (score=${score.toFixed(2)}, matched=[${matchedRules.join(", ")}])`);
});
exports.onReportDecisionPropagate = (0, firestore_1.onDocumentUpdated)({
    document: "reports/{reportId}",
    region: REGION,
    memory: "256MiB",
    maxInstances: 3,
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const beforeStatus = (before.status || "").toLowerCase();
    const afterStatus = (after.status || "").toLowerCase();
    if (beforeStatus === afterStatus)
        return;
    if (!["verified", "declined"].includes(afterStatus))
        return;
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
        const d = doc.data();
        if (d?.decision?.type === "manual")
            continue;
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
});
/* =========================
   HTTPS Endpoints
========================= */
// Debug: whoami
exports.whoAmI = (0, https_1.onRequest)({ region: REGION }, async (req, res) => {
    if (handlePreflight(req, res))
        return;
    try {
        const caller = await getCaller(req);
        res.json({ ok: true, caller });
    }
    catch (e) {
        res.status(401).send(e?.message ?? "Unauthorized");
    }
});
// POST /logLogin
exports.logLogin = (0, https_1.onRequest)({ region: REGION }, async (req, res) => {
    if (handlePreflight(req, res))
        return;
    if (req.method !== "POST")
        return void res.status(405).send("Method not allowed");
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
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
            ua: req.headers["user-agent"] || null,
            createdAt: now,
        });
        await db.doc(`users/${caller.uid}`).set({ lastLoginAt: now, lastActiveAt: now, status: "online" }, { merge: true });
        res.json({ ok: true, claimsUpdated: Boolean(claimsUpdated) });
    }
    catch (e) {
        res.status(401).send(e?.message ?? "Unauthorized");
    }
});
// POST /logLogout
exports.logLogout = (0, https_1.onRequest)({ region: REGION }, async (req, res) => {
    if (handlePreflight(req, res))
        return;
    if (req.method !== "POST")
        return void res.status(405).send("Method not allowed");
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
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
            ua: req.headers["user-agent"] || null,
            createdAt: now,
        });
        await db.doc(`users/${caller.uid}`).set({ lastActiveAt: now, status: "offline" }, { merge: true });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(401).send(e?.message ?? "Unauthorized");
    }
});
// POST /logAction  body: { action, entity?, note?, ua? }
exports.logAction = (0, https_1.onRequest)({ region: REGION }, async (req, res) => {
    if (handlePreflight(req, res))
        return;
    if (req.method !== "POST")
        return void res.status(405).send("Method not allowed");
    try {
        const caller = await getCaller(req);
        const isAdminNow = caller.isAdmin || (await hasAdminsDoc(caller.uid));
        const now = admin.firestore.FieldValue.serverTimestamp();
        const { action, entity, note, ua } = req.body ?? {};
        await db.collection("auditLogs").add({
            action: action ?? "action.unknown",
            scope: isAdminNow ? "admin" : "user",
            entity: entity ?? null,
            note: note ?? null,
            actorUid: caller.uid,
            actorEmail: caller.email,
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
            ua: ua ?? req.headers["user-agent"] ?? null,
            createdAt: now,
        });
        await db.doc(`users/${caller.uid}`).set({ lastActiveAt: now, status: "online" }, { merge: true });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(401).send(e?.message ?? "Unauthorized");
    }
});
/**
 * POST /syncClaims
 * Body (optional): { uid?: string } — if omitted, syncs caller
 * Promotes if admins/{uid} exists; demotes if not.
 */
exports.syncClaims = (0, https_1.onRequest)({ region: REGION }, async (req, res) => {
    if (handlePreflight(req, res))
        return;
    if (req.method !== "POST")
        return void res.status(405).send("Method not allowed");
    try {
        const caller = await getCaller(req);
        const targetUid = req.body?.uid || caller.uid;
        const user = await admin.auth().getUser(targetUid);
        const current = user.customClaims || {};
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
    }
    catch (e) {
        res.status(401).send(e?.message ?? "Unauthorized");
    }
});
