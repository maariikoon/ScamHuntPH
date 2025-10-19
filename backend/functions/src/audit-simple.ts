import * as admin from "firebase-admin";
const db = admin.firestore();

/** Minimal audit writer for auth + config changes */
export async function auditLog(p: {
  action: "auth.login" | "auth.logout" | "config.update" | "user.update" | "role.change";
  entity?: string | null;        // e.g., "user/{uid}" or "config/nlp"
  actorEmail?: string | null;
  actorUid?: string | null;
  note?: string | null;          // short message
}) {
  await db.collection("auditLogs").add({
    action: p.action,
    entity: p.entity ?? null,
    actorEmail: p.actorEmail ?? null,
    actorUid: p.actorUid ?? null,
    note: p.note ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
