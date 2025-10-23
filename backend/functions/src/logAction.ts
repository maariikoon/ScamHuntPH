import { onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

export const logAction = onRequest({ region: "asia-southeast1" }, async (req: Request, res: Response) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }

  const { action, scope, entity, note, actorUid, actorEmail, ua } = (req.body ?? {}) as {
    action?: string; scope?: "admin" | "user"; entity?: string | null; note?: string | null;
    actorUid?: string | null; actorEmail?: string | null; ua?: string | null;
  };

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
});
