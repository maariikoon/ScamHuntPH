// functions/src/audit.ts
import * as admin from "firebase-admin";
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export async function logAudit(payload: {
  action: string;
  entityType: string;
  entityId: string;
  actor: { uid: string; email?: string | null; role?: string | null };
  context?: { ip?: string | null; ua?: string | null; source?: string | null };
  status: "success" | "failure";
  reason?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  nlpVersion?: string | null;
}) {
  await db.collection("auditLogs").add({
    ...payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
