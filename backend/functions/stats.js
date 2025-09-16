// functions/stats.js
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onUserCreated, onUserDeleted } = require("firebase-functions/v2/auth");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "asia-southeast1" });

const db = admin.firestore();
const STATS_PATH = "meta/stats";

// Create once (do NOT reset counters on each trigger)
async function getOrCreateStatsRef() {
  const ref = db.doc(STATS_PATH);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      totalReports: 0,
      pendingReviews: 0,
      verifiedReports: 0,
      activeThreats: 0,
      threatsBlocked: 0,
      activeUsers: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  return ref;
}

const ts = () => ({ updatedAt: admin.firestore.FieldValue.serverTimestamp() });
const inc = (field, by) => ({ [field]: admin.firestore.FieldValue.increment(by) });

function statusToCounter(status) {
  switch (status) {
    case "pending":  return "pendingReviews";
    case "verified": return "verifiedReports";
    case "active":   return "activeThreats";
    case "blocked":  return "threatsBlocked";
    default:         return null;
  }
}

exports.onReportWrite = onDocumentWritten("reports/{reportId}", async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after  = event.data?.after?.exists  ? event.data.after.data()  : null;

  const statsRef = await getOrCreateStatsRef();
  const changes = [];

  // Total reports
  if (!before && after) changes.push(inc("totalReports", 1));   // created
  if (before && !after) changes.push(inc("totalReports", -1));  // deleted

  // Per-status buckets
  const b = before ? statusToCounter(before.status) : null;
  const a = after  ? statusToCounter(after.status)  : null;

  if (!before && a)            changes.push(inc(a, 1));         // create w/ status
  else if (!after && b)        changes.push(inc(b, -1));        // delete w/ status
  else if (b !== a) {
    if (b) changes.push(inc(b, -1));
    if (a) changes.push(inc(a, 1));
  }

  // Nothing to change? Just bump timestamp (optional)
  if (changes.length === 0) {
    await statsRef.set(ts(), { merge: true });
    return;
  }

  const payload = Object.assign({}, ...changes, ts());
  await statsRef.set(payload, { merge: true });
});

exports.onUserCreated = onUserCreated(async () => {
  const ref = await getOrCreateStatsRef();
  await ref.set(Object.assign({}, inc("activeUsers", 1), ts()), { merge: true });
});

exports.onUserDeleted = onUserDeleted(async () => {
  const ref = await getOrCreateStatsRef();
  await ref.set(Object.assign({}, inc("activeUsers", -1), ts()), { merge: true });
});
