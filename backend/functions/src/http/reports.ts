import { onRequest } from "firebase-functions/v2/https";
export const reports = onRequest({ region: "asia-southeast1" }, listReports);
import * as admin from "firebase-admin";
import { Request, Response } from "express";

const db = admin.firestore();

// GET /?status=&sender=&from=&to=&limit=&decisionType=
export async function listReports(req: Request, res: Response) {
  try {
    const { status, sender, from, to, limit, decisionType } = req.query as {
      status?: string;
      sender?: string;
      from?: string;
      to?: string;
      limit?: string;
      decisionType?: "auto" | "manual" | "none";
    };

    let q: FirebaseFirestore.Query = db.collection("reports");

    // status filter
    if (status) q = q.where("status", "==", status);

    // decisionType filter
    // We normalize decision.type on every write/backfill (see step 3).
    if (decisionType === "auto" || decisionType === "manual") {
      q = q.where("decision.type", "==", decisionType);
    } else if (decisionType === "none") {
      // Firestore can match null (field must exist and be null).
      // Make sure backfill sets decision.type = null for unreviewed docs.
      q = q.where("decision.type", "==", null);
    }

    // date range (createdAt is Firestore Timestamp or ISO string)
    if (from) q = q.where("createdAt", ">=", new Date(from));
    if (to)   q = q.where("createdAt", "<=", new Date(to));

    // NOTE: "contains" search on sender isn't supported server-side.
    // We'll do a client-side includes() like you already do.
    // If you want server-side prefix search, keep a `sender_lc` field and query with >= / < nextPrefix.

    // order + limit (optional)
    q = q.orderBy("createdAt", "desc");
    const max = Math.min(parseInt(limit || "200", 10), 500);
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

    // client-side will still apply sender substring filter if provided
    res.json({ ok: true, data });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
