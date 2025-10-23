const LOG_ENDPOINT = import.meta.env.VITE_LOG_ACTION_URL!;

type LogScope = "admin" | "user";

export async function logAction(params: {
  action: string;
  scope?: LogScope;
  entity?: string | null;
  note?: string | null;
  actorUid?: string | null;
  actorEmail?: string | null;
  ua?: string | null;
  idToken?: string | null; // only if you turned on token verification
}) {
  try {
    await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(params.idToken ? { Authorization: `Bearer ${params.idToken}` } : {}),
      },
      body: JSON.stringify({
        action: params.action,
        scope: params.scope ?? "admin",      // default for web-admin
        entity: params.entity ?? "web-admin",
        note: params.note ?? null,
        actorUid: params.actorUid ?? null,
        actorEmail: params.actorEmail ?? null,
        ua: params.ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : null),
      }),
    });
  } catch (e) {
    console.warn("logAction error", e);
  }
}

export async function logLogin(user: { uid: string; email: string | null }, idToken?: string) {
  return logAction({
    action: "auth.login",
    entity: "web-admin",
    note: "Signed in",
    actorUid: user.uid,
    actorEmail: user.email,
    idToken: idToken ?? null,
  });
}

export async function logLogout(user: { uid: string; email: string | null }, idToken?: string) {
  return logAction({
    action: "auth.logout",
    entity: "web-admin",
    note: "Signed out",
    actorUid: user.uid,
    actorEmail: user.email,
    idToken: idToken ?? null,
  });
}

export async function logConfigUpdate(user: { uid: string; email: string | null }, note?: string) {
  return logAction({
    action: "config.update",
    entity: "settings",
    note: note ?? "Updated configuration",
    actorUid: user.uid,
    actorEmail: user.email,
  });
}
