// src/services/contentService.ts
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  QueryConstraint,
  query,
} from "firebase/firestore";

const lessonsRef = collection(db, "lessons");

// Get all lessons (with optional filters, e.g. category)
export async function getLessons(constraints: QueryConstraint[] = []) {
  const q = constraints.length ? query(lessonsRef, ...constraints) : lessonsRef;
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Add lesson
export async function addLesson(data: {
  title: string;
  content: string;
  category: string;
}) {
  return await addDoc(lessonsRef, {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// Update lesson
interface LessonData {
  title: string;
  content: string;
  category: string;
}

export async function updateLesson(id: string, data: Partial<LessonData>) {
  const docRef = doc(db, "lessons", id);
  return await updateDoc(docRef, { ...data, updatedAt: new Date() });
}

// Delete lesson
export async function deleteLesson(id: string) {
  const docRef = doc(db, "lessons", id);
  return await deleteDoc(docRef);
}
