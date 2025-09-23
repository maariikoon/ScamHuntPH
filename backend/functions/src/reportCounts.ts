import * as admin from 'firebase-admin';
import { firestore } from 'firebase-functions/v1';

// Safe init (won't double-initialize if another file already did)
if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

export const onReportCreate = firestore
  .document('reports/{id}')
  .onCreate(async (snap) => {
    const senderUid = snap.get('senderUid') as string | undefined;
    if (!senderUid) return;
    await db.doc(`users/${senderUid}`).set(
      { reportCount: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );
  });

export const onReportDelete = firestore
  .document('reports/{id}')
  .onDelete(async (snap) => {
    const senderUid = snap.get('senderUid') as string | undefined;
    if (!senderUid) return;
    await db.doc(`users/${senderUid}`).set(
      { reportCount: admin.firestore.FieldValue.increment(-1) },
      { merge: true }
    );
  });
