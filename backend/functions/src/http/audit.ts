import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { auditLog } from "../audit-simple";

export const logLogin = functions.onRequest(async (req, res) => {
  const idToken = (req.headers.authorization || "").replace("Bearer ", "");
  const decoded = await admin.auth().verifyIdToken(idToken);
  await auditLog({
    action: "auth.login",
    entity: `user/${decoded.uid}`,
    actorEmail: decoded.email ?? null,
    actorUid: decoded.uid,
    note: "Web admin",
  });
  res.status(204).end();
});

export const logLogout = functions.onRequest(async (req, res) => {
  const idToken = (req.headers.authorization || "").replace("Bearer ", "");
  const decoded = await admin.auth().verifyIdToken(idToken);
  await auditLog({
    action: "auth.logout",
    entity: `user/${decoded.uid}`,
    actorEmail: decoded.email ?? null,
    actorUid: decoded.uid,
    note: "Web admin",
  });
  res.status(204).end();
});
