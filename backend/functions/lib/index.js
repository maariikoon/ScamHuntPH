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
exports.onReportCreate = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
admin.initializeApp();
const db = admin.firestore();
/**
 * 🤖 Auto-verifies new reports with regex-based scoring.
 * - v2 Firestore trigger (asia-southeast1)
 * - Idempotent: skips if decision already set
 * - Uses config/nlp for thresholds & rules
 */
exports.onReportCreate = (0, firestore_1.onDocumentCreated)({
    document: "reports/{reportId}",
    region: "asia-southeast1",
    memory: "256MiB",
    maxInstances: 3,
    // retry: true, // uncomment if you want automatic retries on failure
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const ref = snap.ref;
    const data = snap.data();
    // 🚧 guard: require message text
    const message = data?.message;
    if (!message || typeof message !== "string") {
        logger.warn("Skipping: no message");
        return;
    }
    // 🚧 idempotency: skip if already processed
    if (data?.decision?.type === "auto") {
        logger.info("Already auto-processed; skipping", data?.decision);
        return;
    }
    // 1) Load NLP config
    const cfg = await db.doc("config/nlp").get();
    if (!cfg.exists) {
        logger.error("config/nlp missing — cannot score");
        return;
    }
    const { activeVersion, rules = [], autoApproveThreshold = 0.85, autoDeclineThreshold = 0.15, } = cfg.data();
    // 2) Score with regex rules (fail-soft on bad regex)
    let score = 0;
    const matchedRules = [];
    const explanations = [];
    for (const r of rules) {
        try {
            if (!r?.regex)
                continue;
            const re = new RegExp(String(r.regex), "i");
            if (re.test(message)) {
                score += Number(r.weight) || 0;
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
    // Clamp score to sane bounds
    if (!Number.isFinite(score))
        score = 0;
    score = Math.max(0, Math.min(score, 10));
    const result = score >= Number(autoApproveThreshold || 0.85)
        ? "verified"
        : score < Number(autoDeclineThreshold || 0.15)
            ? "declined"
            : "pending";
    // 4) Write updates (transaction keeps it idempotent under concurrency)
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        const cur = fresh.data();
        // another guard: skip if someone already set a decision meanwhile
        if (cur?.decision?.type === "auto")
            return;
        tx.update(ref, {
            nlp: { score, matchedRules, explanations },
            decision: {
                type: "auto",
                by: "system",
                result,
                reason: result === "verified"
                    ? "High NLP score"
                    : result === "declined"
                        ? "Low NLP score"
                        : "Unclear",
                nlpVersion: activeVersion ?? null,
            },
            status: result,
            lastActionBy: "system",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    logger.info(`✅ onReportCreate: ${event.params.reportId} → ${result} (score=${score})`);
});
