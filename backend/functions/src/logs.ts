import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

export const logAction = onRequest(
  { region: "asia-southeast1", cors: true },   // <- region & CORS here (v2)
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
      ip: (req.headers["x-forwarded-for"] as string) ?? (req as any).ip ?? null,
      ua: ua ?? req.get("user-agent") ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.json({ ok: true });
  }
);
