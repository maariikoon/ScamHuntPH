const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

async function main() {
  const snap = await db.collection("reports").get();
  const batch = db.batch();
  let count = 0;

  snap.forEach((doc: { data: () => {}; ref: any; }) => {
    const d: any = doc.data() || {};
    const hasDecision = Object.prototype.hasOwnProperty.call(d, "decision");
    const typeVal = d?.decision?.type;

    // If no decision map at all, or type missing, set null.
    if (!hasDecision || typeof typeVal === "undefined") {
      const decision = { ...(d.decision || {}), type: null };
      batch.set(doc.ref, { decision }, { merge: true });
      count++;
    }
  });

  if (count > 0) await batch.commit();
  console.log(`Backfilled decision.type = null on ${count} docs`);
}

main().catch(console.error);
