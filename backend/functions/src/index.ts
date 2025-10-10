import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

/**
 * 🤖 Auto-verifies new reports with regex-based scoring.
 * Decision policy:
 *   - score >= autoApproveThreshold  -> verified
 *   - score <  autoDeclineThreshold  -> declined (spam)
 *   - otherwise                      -> pending (manual review)
 */
export const onReportCreate = onDocumentCreated(
  {
    document: "reports/{reportId}",
    region: "asia-southeast1",
    memory: "256MiB",
    maxInstances: 3,
    // retry: true,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const ref = snap.ref;
    const data = snap.data() as any;

    // 🚧 require message text
    const message: string | undefined = data?.message;
    if (!message || typeof message !== "string") {
      logger.warn("Skipping: no message");
      return;
    }

    // 🚧 idempotency: skip if already auto-processed
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

    const {
      activeVersion,
      rules = [],
      autoApproveThreshold = 0.85,
      autoPendingThreshold = 0.40,   // ✅ new: middle band marker (for logging/reasoning)
      autoDeclineThreshold = 0.10,   // ✅ stricter: decline only near-zero (spam)
    } = cfg.data() as any;

    // 2) Score with regex rules (fail-soft on bad regex)
    let score = 0;
    const matchedRules: string[] = [];
    const explanations: string[] = [];

    for (const r of rules as Array<any>) {
      try {
        if (!r?.regex) continue;
        const re = new RegExp(String(r.regex), "i");
        if (re.test(message)) {
          score += Number(r.weight) || 0;
          if (r.id) matchedRules.push(String(r.id));
          if (r.explanation) explanations.push(String(r.explanation));
        }
      } catch (e) {
        logger.error("Invalid regex in config rule:", r, e);
      }
    }

    // Clamp score
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(score, 10));

    // 3) Decide
    type Result = "verified" | "declined" | "pending";

    const approveT = Number(autoApproveThreshold ?? 0.85);
    const pendingT = Number(autoPendingThreshold ?? 0.40);
    const declineT = Number(autoDeclineThreshold ?? 0.10);

    let result: Result = "pending";
    let reason = "Needs manual review (medium/low confidence)";

    if (score >= approveT) {
      result = "verified";
      reason = `Auto-approved (score ${score.toFixed(2)} ≥ ${approveT})`;
    } else if (score < declineT) {
      result = "declined"; // treat as spam
      reason = `Auto-declined as spam (score ${score.toFixed(2)} < ${declineT})`;
    } else {
      // pending band; optional: refine the message using pendingT for clarity
      reason =
        score >= pendingT
          ? `Pending (score ${score.toFixed(2)} between ${pendingT}–${approveT})`
          : `Pending (very low confidence but not spam: ${score.toFixed(2)} ≥ ${declineT})`;
    }

    // 4) Write updates (transaction keeps it idempotent under concurrency)
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const cur = fresh.data() as any;

      if (cur?.decision?.type === "auto") return; // someone beat us to it

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
      )}, thresholds: approve=${approveT}, pending=${pendingT}, decline=${declineT})`
    );
  }
);
