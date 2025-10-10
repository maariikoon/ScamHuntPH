// src/services/functions.ts
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase"; // ✅ now valid

export async function reviewReport(
  reportId: string,
  action: "verify" | "decline",
  feedback?: string
) {
  const fn = httpsCallable(functions, "reviewReport");
  return fn({ reportId, action, feedback });
}
