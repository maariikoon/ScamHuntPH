import { getAuth } from 'firebase/auth';

export async function getFreshIdToken(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken(true); // force refresh
}
