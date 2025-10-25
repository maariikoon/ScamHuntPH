"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
exports.logAction = (0, https_1.onRequest)({ region: "asia-southeast1", cors: true }, // <- region & CORS here (v2)
async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    const { action, scope, entity, note, actorUid, actorEmail, ua } = req.body ?? {};
    await db.collection("auditLogs").add({
        action,
        scope: scope ?? "user",
        entity: entity ?? null,
        note: note ?? null,
        actorUid: actorUid ?? null,
        actorEmail: actorEmail ?? null,
        ip: req.headers["x-forwarded-for"] ?? req.ip ?? null,
        ua: ua ?? req.get("user-agent") ?? null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
});
