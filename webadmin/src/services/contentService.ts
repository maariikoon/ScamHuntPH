// src/services/contentService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  getCountFromServer,
  limit as qLimit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";

/** ===== Types ===== */
export type Lesson = {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type NewLesson = Omit<Lesson, "id" | "createdAt" | "updatedAt">;

/** ===== Collection Ref ===== */
const LESSONS = collection(db, "lessons");

/** Small helper: Firestore Timestamp/Date -> Date|null */
function tsToDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  // Support objects with .toDate()
  // @ts-expect-error runtime guard
  if (typeof v === "object" && v?.toDate) return v.toDate();
  return null;
}

/** Map Firestore doc => Lesson */
function toLesson(
  snap:
    | QueryDocumentSnapshot<DocumentData>
    | { id: string; data: () => DocumentData }
): Lesson {
  const d = snap.data() || {};
  return {
    id: snap.id,
    title: d.title ?? "Untitled",
    content: d.content ?? "",
    category: d.category ?? "other",
    published: !!d.published,
    createdAt: tsToDate(d.createdAt),
    updatedAt: tsToDate(d.updatedAt),
  };
}

/** ===== CRUD for Admin Web ===== */

/** Create a lesson (defaults to unpublished) */
export async function addLesson(input: Partial<NewLesson>) {
  const payload = {
    title: input.title ?? "Untitled",
    content: input.content ?? "",
    category: input.category ?? "other",
    published: Boolean(input.published) || false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(LESSONS, payload);
  return ref.id;
}

/** Get all lessons (admin). Ordered by createdAt desc. */
export async function getLessons(): Promise<Lesson[]> {
  const qRef = query(LESSONS, orderBy("createdAt", "desc"));
  const snaps = await getDocs(qRef);
  return snaps.docs.map(toLesson);
}

/** Optional: server-side paging */
export async function getLessonsPage(opts?: {
  pageSize?: number;
  category?: string | null;
  publishedOnly?: boolean;
  startAfterDocId?: string; // pass last doc id from previous page
}): Promise<{ items: Lesson[]; lastId: string | null }> {
  const pageSize = opts?.pageSize ?? 10;

  const parts: QueryConstraint[] = [];
  if (opts?.category) parts.push(where("category", "==", opts.category));
  if (opts?.publishedOnly) parts.push(where("published", "==", true));

  let qBase = query(LESSONS, orderBy("createdAt", "desc"), ...parts);

  if (opts?.startAfterDocId) {
    const lastSnap = await getDoc(doc(db, "lessons", opts.startAfterDocId));
    if (lastSnap.exists()) qBase = query(qBase, startAfter(lastSnap));
  }

  const qFinal = query(qBase, qLimit(pageSize));
  const snaps = await getDocs(qFinal);
  const items = snaps.docs.map(toLesson);
  const lastId = snaps.docs.length ? snaps.docs[snaps.docs.length - 1].id : null;
  return { items, lastId };
}

/** Update fields on a lesson */
export async function updateLesson(
  id: string,
  patch: Partial<Omit<Lesson, "id">>
) {
  const ref = doc(db, "lessons", id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

/** Delete a lesson */
export async function deleteLesson(id: string) {
  await deleteDoc(doc(db, "lessons", id));
}

/** Publish / Unpublish convenience helpers */
export async function publishLesson(id: string) {
  await updateLesson(id, { published: true });
}
export async function unpublishLesson(id: string) {
  await updateLesson(id, { published: false });
}

/** ===== Read API for Mobile App (published only) ===== */

/** Get published lessons (optionally by category, limited for mobile feed) */
export async function getPublishedLessons(opts?: {
  category?: string;
  max?: number; // default 20
}): Promise<Lesson[]> {
  const parts: QueryConstraint[] = [where("published", "==", true)];
  if (opts?.category) parts.push(where("category", "==", opts.category));

  const qFinal = query(
    LESSONS,
    ...parts,
    orderBy("createdAt", "desc"),
    qLimit(opts?.max ?? 20)
  );

  const snaps = await getDocs(qFinal);
  return snaps.docs.map(toLesson);
}

/** ===== Additions ===== */

/** Get single lesson by id */
export async function getLesson(id: string): Promise<Lesson | null> {
  const s = await getDoc(doc(db, "lessons", id));
  return s.exists() ? toLesson({ id: s.id, data: () => s.data()! }) : null;
}

/** Header KPI counts */
export async function getLessonCounts() {
  const totalSnap = await getCountFromServer(LESSONS);
  const pubQ = query(LESSONS, where("published", "==", true));
  const pubSnap = await getCountFromServer(pubQ);
  const total = totalSnap.data().count;
  const published = pubSnap.data().count;
  return {
    total,
    published,
    drafts: total - published,
  };
}
