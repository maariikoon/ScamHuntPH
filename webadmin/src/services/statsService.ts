// src/services/statsService.ts
import { db } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export type Stats = {
  totalReports?: number;
  pendingReviews?: number;
  verifiedReports?: number;
  activeThreats?: number;
  threatsBlocked?: number;
  activeUsers?: number;
  updatedAt?: Date;
};

export function subscribeStats(
  onData: (s: Stats) => void,
  onError?: (e: unknown) => void
) {
  const ref = doc(db, "meta", "stats");
  return onSnapshot(ref, (snap) => onData((snap.data() as Stats) ?? {}), onError);
}
