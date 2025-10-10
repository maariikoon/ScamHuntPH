import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export async function submitReport({
  message,
  category,
  region,
  attachments,
  notifyToken,
}: {
  message: string;
  category: string;
  region: string;
  attachments: any[];
  notifyToken?: string;
}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Login required");

  await addDoc(collection(db, "reports"), {
    message,
    category,
    region,
    attachments: attachments ?? [],
    userId: user.uid,
    ...(notifyToken ? { notifyToken } : {}),
    // Do NOT include system fields here
  });
}
