// src/Root.tsx
import React from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebase';
import AppRouter from '@/router';
import { AuthProvider } from '@/auth';

export default function Root() {
  const [user, setUser] = React.useState<User | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) await u.getIdTokenResult(true).catch(() => {});
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) return null;

  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <AuthProvider>
        <AppRouter user={user} />
      </AuthProvider>
    </MantineProvider>
  );
}
