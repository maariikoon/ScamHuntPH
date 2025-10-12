import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { createHash } from "crypto";

admin.initializeApp();
const db = admin.firestore();

/** Helpers */
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

/**
 * 🤖 On create: score via regex, cache decision, and reuse duplicates instantly.
 * Policy:
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
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const ref = snap.ref;
    const data = snap.data() as any;

    // 🚧 require message text
    const rawMessage: string | undefined = data?.message;
    if (!rawMessage || typeof rawMessage !== "string") {
      logger.warn("Skipping: no message");
      return;
    }
    const message = normalizeMessage(rawMessage);
    const messageHash = hashMessage(message);

    // 🚧 idempotency: skip if already auto-processed
    if (data?.decision?.type === "auto") {
      logger.info("Already auto-processed; skipping", data?.decision);
      return;
    }

    // ♻️ Fast path: cache (exact same text)
    const cacheRef = db.collection("nlpCache").doc(messageHash);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const c = cacheSnap.data() as any;
      if (c?.decision?.result && c?.decision?.result !== "pending") {
        await snap.ref.update({
          nlp: c.nlp ?? null,
          decision: {
            ...c.decision,
            type: "auto-from-cache",
          },
          status: c.decision.result,
          lastActionBy: "system",
          messageHash,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          reusedFrom: c.lastReportId ?? null,
        });
        logger.info(`♻️ Duplicate via cache: ${event.params.reportId} → ${c.decision.result}`);
        return;
      }
    }

    // 🔍 Fallback: reuse any previous report with same hash (verified/declined)
    const dupQ = await db
      .collection("reports")
      .where("messageHash", "==", messageHash)
      .where("status", "in", ["verified", "declined"])
      .limit(1)
      .get();

    if (!dupQ.empty) {
      const prev = dupQ.docs[0].data() as any;
      const prevStatus = prev.status;
      await snap.ref.update({
        nlp: prev.nlp ?? null,
        decision: {
          ...(prev.decision ?? {}),
          type: "auto-from-prev",
          result: prevStatus,
          reason: `Reused previous decision from ${dupQ.docs[0].id}`,
        },
        status: prevStatus,
        lastActionBy: "system",
        messageHash,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        reusedFrom: dupQ.docs[0].id,
      });
      logger.info(`♻️ Duplicate via previous report: ${event.params.reportId} → ${prevStatus}`);
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
      autoPendingThreshold = 0.40,
      autoDeclineThreshold = 0.10,
    } = cfg.data() as any;

    const approveT = num(autoApproveThreshold, 0.85);
    const pendingT = num(autoPendingThreshold, 0.40);
    const declineT = num(autoDeclineThreshold, 0.10);

    // 2) Score with regex rules (Unicode + case-insensitive)
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

    // Clamp score
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(score, 10));

    // 3) Decide
    type Result = "verified" | "declined" | "pending";
    let result: Result = "pending";
    let reason = "Needs manual review (medium/low confidence)";

    if (score >= approveT) {
      result = "verified";
      reason = `Auto-approved (score ${score.toFixed(2)} ≥ ${approveT})`;
    } else if (score < declineT) {
      result = "declined";
      reason = `Auto-declined as spam (score ${score.toFixed(2)} < ${declineT})`;
    } else {
      reason =
        score >= pendingT
          ? `Pending (score ${score.toFixed(2)} between ${pendingT}–${approveT})`
          : `Pending (very low confidence but not spam: ${score.toFixed(2)} ≥ ${declineT})`;
    }

    // 4) Write updates (transaction keeps it idempotent)
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
        messageHash,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // 5) Cache for future identical SMS
    await db.collection("nlpCache").doc(messageHash).set(
      {
        nlp: { score, matchedRules, explanations },
        decision: {
          type: "auto",
          result,
          reason,
          nlpVersion: activeVersion ?? null,
        },
        lastReportId: event.params.reportId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info(
      `✅ onReportCreate: ${event.params.reportId} → ${result} (score=${score.toFixed(
        2
      )}, approve=${approveT}, pending=${pendingT}, decline=${declineT}, matched=[${matchedRules.join(
        ", "
      )}], hash=${messageHash.slice(0, 8)}...)`
    );
  }
);

/**
 * 🔁 Propagate ANY verified/declined decision (manual OR auto) to all PENDING duplicates,
 *     and cache it in nlpCache for instant future decisions.
 */
export const onReportDecisionPropagate = onDocumentUpdated(
  {
    document: "reports/{reportId}",
    region: "asia-southeast1",
    memory: "256MiB",
    maxInstances: 3,
  },
  async (event) => {
    const before = event.data?.before.data() as any | undefined;
    const after = event.data?.after.data() as any | undefined;
    if (!before || !after) return;

    const beforeStatus = (before.status || "").toLowerCase();
    const afterStatus  = (after.status  || "").toLowerCase();
    if (beforeStatus === afterStatus) return;
    if (afterStatus !== "verified" && afterStatus !== "declined") return;

    // Ensure we have a messageHash
    let messageHash: string | undefined = after?.messageHash;
    const rawMessage: string | undefined = after?.message;
    if (!messageHash && typeof rawMessage === "string") {
      messageHash = hashMessage(normalizeMessage(rawMessage));
      try { await event.data!.after.ref.update({ messageHash }); } catch (e) {
        logger.warn("Could not backfill messageHash on source doc:", e);
      }
    }
    if (!messageHash) return;

    const sourceId = event.params.reportId;
    const decisionObj = {
      type: after?.decision?.type || "auto",
      result: afterStatus,
      reason: (after?.decision?.reason || "Decision changed") + " (propagated)",
      nlpVersion: after?.decision?.nlpVersion ?? null,
    };

    // 1) Cache it
    await db.collection("nlpCache").doc(messageHash).set(
      {
        nlp: after?.nlp ?? null,
        decision: decisionObj,
        lastReportId: sourceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 2) Fan out to PENDING duplicates (do not override manual decisions)
    const writer = db.bulkWriter();
    let processed = 0;

    async function fanoutPage(startAfter?: FirebaseFirestore.QueryDocumentSnapshot) {
      let q: FirebaseFirestore.Query = db
        .collection("reports")
        .where("messageHash", "==", messageHash)
        .where("status", "==", "pending")
        .limit(300);

      if (startAfter) q = q.startAfter(startAfter);
      const snap = await q.get();

      for (const doc of snap.docs) {
        const d = doc.data() as any;
        if (d?.decision?.type === "manual") continue; // never override manual

        writer.update(doc.ref, {
          status: afterStatus,
          decision: {
            type: "auto-from-propagate",
            by: "system",
            result: afterStatus,
            reason: `Propagated from ${sourceId}`,
            nlpVersion: after?.decision?.nlpVersion ?? null,
            sourceId,
          },
          lastActionBy: "system",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          reusedFrom: sourceId,
        });
        processed++;
      }

      if (!snap.empty && snap.size === 300) {
        await fanoutPage(snap.docs[snap.docs.length - 1]);
      }
    }

    await fanoutPage();
    await writer.close();

    logger.info(
      `🔁 Propagated ${afterStatus} from ${sourceId} to ${processed} pending duplicate(s) for hash=${messageHash.slice(0, 8)}...`
    );
  }
);
