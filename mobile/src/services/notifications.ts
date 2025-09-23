import { auth } from "@/src/firebase";

const API_BASE_URL = "https://notifications-bcvrqgcc6a-as.a.run.app"; 

export async function fetchNotifications() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE_URL}/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Failed to fetch notifications");
  return data.notifications;
}

export async function markNotificationRead(id: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const token = await user.getIdToken();

  await fetch(`${API_BASE_URL}/${id}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
}
