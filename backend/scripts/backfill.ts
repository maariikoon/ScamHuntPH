// backend/scripts/backfill.ts
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

(async () => {
  console.log("Starting backfill...");
  const snap = await db.collection("reports").get();
  const batch = db.batch();

  interface NLP {
    score: number;
    matchedRules: string[];
    explanations: string[];
  }

  interface Decision {
    type: string;
    by: string;
    at: FirebaseFirestore.FieldValue;
    reason: string;
    nlpVersion: string;
  }

  interface Updates {
    createdAt?: FirebaseFirestore.FieldValue;
    updatedAt: FirebaseFirestore.FieldValue;
    status?: string;
    lastActionBy?: string;
    nlp?: NLP;
    decision?: Decision;
  }

  snap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const d: FirebaseFirestore.DocumentData = doc.data();
    const updates: Updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (!d.createdAt) updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    if (!d.status) updates.status = "pending";
    if (!d.lastActionBy) updates.lastActionBy = "system";
    if (!d.nlp)
      updates.nlp = { score: 0, matchedRules: [], explanations: [] };
    if (!d.decision)
      updates.decision = {
        type: "auto",
        by: "system",
        at: admin.firestore.FieldValue.serverTimestamp(),
        reason: "Backfilled",
        nlpVersion: "rules-unknown",
      };

    batch.set(doc.ref, updates, { merge: true });
  });

  await batch.commit();
  console.log("✅ Backfill complete!");
})();
