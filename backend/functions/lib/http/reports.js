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
exports.reports = exports.declineReport = exports.verifyReport = void 0;
exports.listReports = listReports;
// functions/src/http/reports.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const audit_1 = require("../audit");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
/* ------------------------ Auth helper ------------------------ */
async function getActor(req) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;
    if (!token)
        throw new Error("Missing Authorization Bearer token");
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email ?? null;
    const userRole = decoded.role ??
        (decoded.admin ? "admin" : null) ??
        decoded.customClaims?.role ??
        null;
    return { uid, email, userRole };
}
/* ---------------- Verify/Decline core operation --------------- */
async function applyDecision(req, reportId, decision) {
    const { uid, email, userRole } = await getActor(req);
    const user = { email }; // to match your snippet exactly
    const ref = db.collection("reports").doc(reportId);
    const snap = await ref.get();
    if (!snap.exists) {
        return { ok: false, code: 404, error: "Report not found" };
    }
    const old = snap.data() || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    // Update as a MANUAL decision
    await ref.update({
        status: decision,
        updatedAt: now,
        lastActionBy: uid,
        decision: {
            ...(old.decision || {}),
            type: "manual",
            by: uid,
            at: now,
            reason: req.body?.reason ?? "Manual decision",
            nlpVersion: old?.decision?.nlpVersion ?? null,
        },
    });
    // Read updated doc for logging fields
    const newDocSnap = await ref.get();
    const newDoc = newDocSnap.data() || {};
    // ---------- EXACT AUDIT PAYLOAD YOU REQUESTED ----------
    await (0, audit_1.logAudit)({
        action: `report.${decision}`, // "report.verify" | "report.decline"
        entityType: "report",
        entityId: reportId,
        actor: { uid: uid, email: user.email, role: userRole },
        context: { ip: req.ip, ua: req.get("user-agent") ?? "", source: "webadmin" },
        status: "success",
        reason: req.body?.reason ?? "Manual decision",
        before: { status: old.status, category: old.category },
        after: { status: decision, category: newDoc?.category },
        nlpVersion: newDoc?.decision?.nlpVersion ?? null,
    });
    // -------------------------------------------------------
    return { ok: true, data: { id: reportId, status: decision } };
}
/* ---------------------- HTTP handlers ----------------------- */
// POST verify:  .../verifyReport?id=<reportId>
exports.verifyReport = (0, https_1.onRequest)({ region: "asia-southeast1" }, async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).json({ ok: false, error: "Method Not Allowed" });
            return;
        }
        const reportId = req.query.id || req.body?.id;
        if (!reportId) {
            res.status(400).json({ ok: false, error: "Missing report id" });
            return;
        }
        const result = await applyDecision(req, reportId, "verified");
        if (!result.ok) {
            res.status(result.code || 500).json(result);
            return;
        }
        res.json(result); // <-- no `return res.json(...)`
    }
    catch (err) {
        // best-effort failure audit (optional)
        try {
            const { uid, email, userRole } = await getActor(req).catch(() => ({
                uid: "unknown",
                email: null,
                userRole: null,
            }));
            await (0, audit_1.logAudit)({
                action: "report.verify",
                entityType: "report",
                entityId: req.query.id || req.body?.id || "unknown",
                actor: { uid, email, role: userRole },
                context: { ip: req.ip, ua: req.get("user-agent") ?? "", source: "webadmin" },
                status: "failure",
                reason: err?.message ?? "Unknown error",
            });
        }
        catch { }
        res.status(500).json({ ok: false, error: err?.message || "Internal error" });
    }
});
// POST decline: .../declineReport?id=<reportId>
exports.declineReport = (0, https_1.onRequest)({ region: "asia-southeast1" }, async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).json({ ok: false, error: "Method Not Allowed" });
            return;
        }
        const reportId = req.query.id || req.body?.id;
        if (!reportId) {
            res.status(400).json({ ok: false, error: "Missing report id" });
            return;
        }
        const result = await applyDecision(req, reportId, "declined");
        if (!result.ok) {
            res.status(result.code || 500).json(result);
            return;
        }
        res.json(result); // <-- no `return`
    }
    catch (err) {
        // best-effort failure audit (optional)
        try {
            const { uid, email, userRole } = await getActor(req).catch(() => ({
                uid: "unknown",
                email: null,
                userRole: null,
            }));
            await (0, audit_1.logAudit)({
                action: "report.decline",
                entityType: "report",
                entityId: req.query.id || req.body?.id || "unknown",
                actor: { uid, email, role: userRole },
                context: { ip: req.ip, ua: req.get("user-agent") ?? "", source: "webadmin" },
                status: "failure",
                reason: err?.message ?? "Unknown error",
            });
        }
        catch { }
        res.status(500).json({ ok: false, error: err?.message || "Internal error" });
    }
});
/* ---------------------- Your existing listReports ----------------------- */
// GET /?status=&sender=&from=&to=&limit=&decisionType=
async function listReports(req, res) {
    try {
        const { status, sender, from, to, limit, decisionType } = req.query;
        let q = db.collection("reports");
        // status filter
        if (status)
            q = q.where("status", "==", status);
        // decisionType filter
        if (decisionType === "auto" || decisionType === "manual") {
            q = q.where("decision.type", "==", decisionType);
        }
        else if (decisionType === "none") {
            q = q.where("decision.type", "==", null);
        }
        // date range (createdAt is Firestore Timestamp or ISO string)
        if (from) {
            const fromDate = new Date(from);
            if (!isNaN(fromDate.getTime()))
                q = q.where("createdAt", ">=", fromDate);
        }
        if (to) {
            const toDate = new Date(to);
            if (!isNaN(toDate.getTime()))
                q = q.where("createdAt", "<=", toDate);
        }
        // NOTE: "contains" search on sender isn't supported server-side.
        // If you need prefix search, maintain `sender_lc` and do >= / < nextPrefix.
        // order + limit (optional)
        q = q.orderBy("createdAt", "desc");
        const max = Math.min(parseInt(String(limit || "200"), 10) || 200, 500);
        const snap = await q.limit(max).get();
        const data = snap.docs.map((d) => {
            const v = d.data();
            const decision = v.decision || {};
            return {
                id: d.id,
                createdAt: v.createdAt ? (v.createdAt.toDate?.() ?? v.createdAt) : null,
                updatedAt: v.updatedAt ? (v.updatedAt.toDate?.() ?? v.updatedAt) : null,
                status: v.status || null,
                sender: v.sender || v.userId || null,
                decisionType: decision?.type ?? null, // "auto" | "manual" | null
                nlpScore: v.nlp?.score ?? null,
            };
        });
        // client-side can still apply sender substring filter if provided
        res.json({ ok: true, data });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message || "Internal error" });
    }
}
// Keep this export after the function so TS resolves cleanly in any build mode
exports.reports = (0, https_1.onRequest)({ region: "asia-southeast1" }, listReports);
